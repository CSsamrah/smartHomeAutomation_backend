/**
 * DashboardService
 *
 * Design Patterns:
 *  • SERVICE LAYER  — all dashboard aggregation logic isolated here
 *  • FACADE         — one call fans out to Device, Alert, EnergyRecord,
 *                     Event, AutomationRule; callers see none of that
 *  • SINGLETON      — one shared instance per process
 *
 * All sub-queries are fired in parallel (Promise.all) so the round-trip
 * is bounded by the slowest single query, not the sum of all queries.
 *
 * DB design note:
 *   Device and EnergyRecord have no direct `home` reference, so we first
 *   resolve roomIds for the home and use them as a secondary filter.
 *   Adding a `home` field to those two collections would eliminate this
 *   extra hop on every dashboard load.
 */

const Home           = require('../models/Home');
const Room           = require('../models/Room');
const Device         = require('../models/Device');
const Alert          = require('../models/Alert');
const EnergyRecord   = require('../models/EnergyRecord');
const Event          = require('../models/Event');
const AutomationRule = require('../models/AutomationRule');

const { NotFoundError, AuthorizationError } = require('../utils/AppError');

const DEVICE_STATUSES = ['ON', 'OFF', 'IDLE', 'FAULT'];
const DEVICE_TYPES    = ['AC', 'FAN', 'LIGHT'];

class DashboardService {
  constructor() {
    if (DashboardService._instance) return DashboardService._instance;
    DashboardService._instance = this;
  }

  /**
   * Build the full dashboard summary for one home.
   * Verifies that requestingUserId is the admin or a resident before proceeding.
   *
   * @param {string|ObjectId} homeId
   * @param {string|ObjectId} requestingUserId
   */
  async getSummary(homeId, requestingUserId) {
    // ── 1. Load home + verify access ────────────────────────────────────────
    const home = await Home.findById(homeId)
      .populate('admin', 'name email')
      .lean();

    if (!home) throw new NotFoundError('Home not found.', 'HOME_NOT_FOUND');

    const uid        = requestingUserId.toString();
    const isAdmin    = home.admin._id.toString() === uid;
    const isResident = (home.residents || []).some((r) => r.toString() === uid);

    if (!isAdmin && !isResident) {
      throw new AuthorizationError(
        'You do not have access to this home.',
        'HOME_ACCESS_DENIED'
      );
    }

    // ── 2. Resolve room / device IDs (used by several queries below) ────────
    const rooms    = await Room.find({ home: homeId, isActive: true }).select('_id').lean();
    const roomIds  = rooms.map((r) => r._id);

    const devices  = await Device.find({ room: { $in: roomIds }, isActive: true })
      .select('_id status type')
      .lean();
    const deviceIds = devices.map((d) => d._id);

    const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'

    // ── 3. Fire all sub-queries in parallel ──────────────────────────────────
    const [
      unreadAlerts,
      criticalAlerts,
      energyToday,
      liveEnergy,
      recentEvents,
      activeRules,
      totalRules,
    ] = await Promise.all([

      Alert.countDocuments({ isRead: false }),

      Alert.countDocuments({ isRead: false, severity: 'critical' }),

      // Closed energy sessions for today, scoped to this home's rooms
      EnergyRecord.aggregate([
        { $match: { room: { $in: roomIds }, date: today, endedAt: { $ne: null } } },
        { $group: { _id: null, total: { $sum: '$energyKwh' } } },
      ]),

      // Open (live) sessions — estimate current draw by joining device wattage
      EnergyRecord.aggregate([
        { $match: { room: { $in: roomIds }, endedAt: null } },
        {
          $lookup: {
            from:         'devices',
            localField:   'device',
            foreignField: '_id',
            as:           'deviceDoc',
          },
        },
        { $unwind: { path: '$deviceDoc', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id:       null,
            sessions:  { $sum: 1 },
            totalWatt: { $sum: '$deviceDoc.powerRatingWatt' },
          },
        },
      ]),

      // 10 most recent events for devices belonging to this home
      Event.find({ device: { $in: deviceIds } })
        .sort({ timestamp: -1 })
        .limit(10)
        .populate('user', 'name')
        .select('deviceName action triggeredBy user timestamp')
        .lean(),

      AutomationRule.countDocuments({ isActive: true }),

      AutomationRule.countDocuments({}),
    ]);

    // ── 4. Compute device breakdowns from the in-memory array ────────────────
    // (avoids a separate aggregate round-trip just to group by status/type)
    const byStatus = DEVICE_STATUSES.reduce((acc, s) => {
      acc[s.toLowerCase()] = devices.filter((d) => d.status === s).length;
      return acc;
    }, {});

    const byType = DEVICE_TYPES.reduce((acc, t) => {
      acc[t.toLowerCase()] = devices.filter((d) => d.type === t).length;
      return acc;
    }, {});

    // ── 5. Assemble and return DTO ────────────────────────────────────────────
    return {
      home: {
        id:        home._id,
        name:      home.name,
        address:   home.address,
        admin:     home.admin,
        residents: (home.residents || []).length,
        rooms:     rooms.length,
      },
      devices: {
        total:    devices.length,
        byStatus,
        byType,
      },
      energy: {
        todayKwh:        +(energyToday[0]?.total ?? 0).toFixed(4),
        liveSessions:    liveEnergy[0]?.sessions   ?? 0,
        liveWattage:     liveEnergy[0]?.totalWatt  ?? 0,
      },
      alerts: {
        unread:   unreadAlerts,
        critical: criticalAlerts,
      },
      automations: {
        total:  totalRules,
        active: activeRules,
      },
      recentEvents,
    };
  }
}

module.exports = new DashboardService();