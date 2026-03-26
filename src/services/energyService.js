/**
 * EnergyService  (Module 7 — Energy Analytics)
 *
 * Design Patterns:
 *  • SERVICE LAYER  — all energy analytics logic isolated here
 *  • REPOSITORY     — DB access only through EnergyRecord + Device + Room models
 *  • SINGLETON      — one shared instance per process
 *
 * EnergyRecord is append-only.  This service only reads it — never mutates.
 * Records are written by the DeviceService / IoT feedback handler when
 * devices turn OFF or periodically for long-running sessions.
 *
 * DB design note (reiterated from seed.js comments):
 *   Adding a `home` field to EnergyRecord would remove the room-lookup hop
 *   that prefixes every home-scoped aggregation below.
 */

const mongoose     = require('mongoose');
const Room         = require('../models/Room');
const Device       = require('../models/Device');
const EnergyRecord = require('../models/EnergyRecord');

const { NotFoundError } = require('../utils/AppError');

const oid = (id) => new mongoose.Types.ObjectId(id.toString());

class EnergyService {
  constructor() {
    if (EnergyService._instance) return EnergyService._instance;
    EnergyService._instance = this;
  }

  // ── Home-level summaries ───────────────────────────────────────────────────

  /**
   * Daily energy summary for an entire home, broken down by room.
   *
   * @param {string} homeId
   * @param {string} date   'YYYY-MM-DD' — defaults to today
   */
  async getDailySummary(homeId, date) {
    const today   = date || new Date().toISOString().split('T')[0];
    const roomIds = await this._getRoomIds(homeId);

    const byRoom = await EnergyRecord.aggregate([
      { $match: { room: { $in: roomIds }, date: today } },
      {
        $group: {
          _id:                 '$room',
          totalKwh:            { $sum: '$energyKwh' },
          totalDurationSecs:   { $sum: '$durationSeconds' },
          sessionCount:        { $sum: 1 },
        },
      },
      {
        $lookup: {
          from:         'rooms',
          localField:   '_id',
          foreignField: '_id',
          as:           'roomDoc',
        },
      },
      { $unwind: '$roomDoc' },
      {
        $project: {
          _id:               0,
          roomId:            '$_id',
          roomName:          '$roomDoc.name',
          totalKwh:          { $round: ['$totalKwh', 4] },
          totalDurationSecs: 1,
          sessionCount:      1,
        },
      },
      { $sort: { totalKwh: -1 } },
    ]);

    const totalKwh = byRoom.reduce((acc, r) => acc + r.totalKwh, 0);

    return {
      date:     today,
      homeId,
      totalKwh: +totalKwh.toFixed(4),
      byRoom,
    };
  }

  /**
   * Weekly energy summary — one data point per day for a 7-day window.
   * Fills missing days with 0 so frontend charts always get 7 points.
   *
   * @param {string} homeId
   * @param {string} weekStart  'YYYY-MM-DD' — Monday of the target week
   *                            Defaults to Monday of the current week.
   */
  async getWeeklySummary(homeId, weekStart) {
    const startDate = weekStart || this._currentWeekMonday();
    const days      = this._buildDateRange(startDate, 7);
    const roomIds   = await this._getRoomIds(homeId);

    const rows = await EnergyRecord.aggregate([
      { $match: { room: { $in: roomIds }, date: { $in: days } } },
      { $group: { _id: '$date', totalKwh: { $sum: '$energyKwh' } } },
    ]);

    const rowMap = Object.fromEntries(rows.map((r) => [r._id, r.totalKwh]));

    const byDay = days.map((day) => ({
      date:     day,
      totalKwh: +(rowMap[day] ?? 0).toFixed(4),
    }));

    const weeklyTotal = byDay.reduce((acc, d) => acc + d.totalKwh, 0);

    return {
      weekStart:  startDate,
      weekEnd:    days[6],
      homeId,
      totalKwh:   +weeklyTotal.toFixed(4),
      byDay,
    };
  }

  /**
   * Live energy sessions — EnergyRecords where endedAt is null.
   * Estimates current kWh draw from device's powerRatingWatt × elapsed time.
   * Used for the real-time power monitor panel.
   *
   * Scoped to a specific home's rooms.
   * @param {string} homeId
   */
  async getLiveSessions(homeId) {
    const roomIds = await this._getRoomIds(homeId);

    const records = await EnergyRecord.find({
      room:    { $in: roomIds },
      endedAt: null,
    })
      .populate('device', 'name type powerRatingWatt status')
      .populate('room',   'name')
      .sort({ startedAt: 1 })
      .lean();

    const now = Date.now();

    return records.map((r) => {
      const elapsedSecs = Math.floor((now - new Date(r.startedAt).getTime()) / 1000);
      const watt        = r.device?.powerRatingWatt ?? 0;
      const liveKwh     = (watt * elapsedSecs) / 3_600_000;

      return {
        recordId:       r._id,
        device:         r.device,
        room:           r.room,
        startedAt:      r.startedAt,
        elapsedSeconds: elapsedSecs,
        liveKwh:        +liveKwh.toFixed(6),
        watt,
      };
    });
  }

  // ── Device-level ───────────────────────────────────────────────────────────

  /**
   * Energy history for a single device, optionally filtered by date range.
   * Returns both individual records and rolled-up totals.
   *
   * @param {string} deviceId
   * @param {{ startDate?: string, endDate?: string }} opts
   */
  async getDeviceEnergy(deviceId, { startDate, endDate } = {}) {
    const device = await Device.findById(deviceId).lean();
    if (!device) throw new NotFoundError('Device not found.', 'DEVICE_NOT_FOUND');

    const filter = { device: oid(deviceId) };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = startDate;
      if (endDate)   filter.date.$lte = endDate;
    }

    const records = await EnergyRecord.find(filter)
      .sort({ date: -1, startedAt: -1 })
      .lean();

    const totalKwh      = records.reduce((acc, r) => acc + (r.energyKwh      || 0), 0);
    const totalDuration = records.reduce((acc, r) => acc + (r.durationSeconds || 0), 0);
    const openSessions  = records.filter((r) => !r.endedAt).length;

    return {
      device: {
        id:              device._id,
        name:            device.name,
        type:            device.type,
        powerRatingWatt: device.powerRatingWatt,
      },
      summary: {
        totalKwh:        +totalKwh.toFixed(4),
        totalDurationSecs: totalDuration,
        sessionCount:    records.length,
        openSessions,
      },
      records,
    };
  }

  // ── Room-level ─────────────────────────────────────────────────────────────

  /**
   * Energy breakdown for a single room, grouped by device.
   *
   * @param {string} roomId
   * @param {{ startDate?: string, endDate?: string }} opts
   */
  async getRoomEnergy(roomId, { startDate, endDate } = {}) {
    const filter = { room: oid(roomId) };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = startDate;
      if (endDate)   filter.date.$lte = endDate;
    }

    const byDevice = await EnergyRecord.aggregate([
      { $match: filter },
      {
        $group: {
          _id:                '$device',
          totalKwh:           { $sum: '$energyKwh' },
          totalDurationSecs:  { $sum: '$durationSeconds' },
          sessionCount:       { $sum: 1 },
        },
      },
      {
        $lookup: {
          from:         'devices',
          localField:   '_id',
          foreignField: '_id',
          as:           'deviceDoc',
        },
      },
      { $unwind: { path: '$deviceDoc', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id:               0,
          deviceId:          '$_id',
          deviceName:        '$deviceDoc.name',
          deviceType:        '$deviceDoc.type',
          totalKwh:          { $round: ['$totalKwh', 4] },
          totalDurationSecs: 1,
          sessionCount:      1,
        },
      },
      { $sort: { totalKwh: -1 } },
    ]);

    const totalKwh = byDevice.reduce((acc, d) => acc + d.totalKwh, 0);

    return {
      roomId,
      totalKwh: +totalKwh.toFixed(4),
      byDevice,
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /** Resolve room ObjectIds for a given homeId. */
  async _getRoomIds(homeId) {
    const rooms = await Room.find({ home: homeId, isActive: true }).select('_id').lean();
    return rooms.map((r) => r._id);
  }

  /** Build an array of N 'YYYY-MM-DD' strings starting from startDate. */
  _buildDateRange(startDate, count) {
    const dates = [];
    const base  = new Date(startDate);
    for (let i = 0; i < count; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }

  /** Monday of the current week as 'YYYY-MM-DD'. */
  _currentWeekMonday() {
    const today = new Date();
    const day   = today.getDay() || 7;           // Sunday → 7
    today.setDate(today.getDate() - day + 1);    // back to Monday
    return today.toISOString().split('T')[0];
  }
}

module.exports = new EnergyService();