/**
 * DashboardController  (Module 6 — Dashboard)
 *
 * Design Patterns:
 *  • TEMPLATE METHOD (via BaseController) — this.handle() wraps every method
 *  • MVC CONTROLLER  — thin HTTP adapter; all logic in DashboardService
 *
 * Routes:
 *   GET /api/dashboard            → getSummary (resolves homeId from user context)
 *   GET /api/dashboard/:homeId    → getSummaryById (admin explicit homeId)
 */

const BaseController   = require('./baseController');
const dashboardService = require('../services/dashboardService');
const homeService      = require('../services/homeService');

class DashboardController extends BaseController {

  /**
   * GET /api/dashboard
   *
   * Automatically resolves the caller's home:
   *   ADMIN    → the home they own
   *   RESIDENT → the home they belong to
   *
   * This avoids requiring the client to know the homeId in advance,
   * which is the normal case for the main dashboard view.
   */
  async getSummary(req, res) {
    let homeId;

    if (req.user.role === 'ADMIN') {
      const home = await homeService.getMyHome(req.user._id);
      homeId = home.id;
    } else {
      const home = await homeService.getResidentHome(req.user._id);
      homeId = home.id;
    }

    const summary = await dashboardService.getSummary(homeId, req.user._id);
    return this.ok(res, 'Dashboard summary fetched.', summary);
  }

  /**
   * GET /api/dashboard/:homeId
   *
   * Allows an admin to explicitly fetch summary for a given homeId.
   * DashboardService re-validates access, so this is safe.
   */
  async getSummaryById(req, res) {
    const summary = await dashboardService.getSummary(
      req.params.homeId,
      req.user._id
    );
    return this.ok(res, 'Dashboard summary fetched.', summary);
  }
}

const controller = new DashboardController();
module.exports   = controller;



// const Room         = require('../models/Room');
// const Device       = require('../models/Device');
// const EnergyRecord = require('../models/EnergyRecord');
// const Event = require('../models/Event');
// const Alert = require('../models/Alert');
 
// // GET /api/dashboard/summary
// exports.getSummary = async (req, res) => {
//   try {
//     const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
 
//     const [total_rooms, total_devices, active_devices, energyResult] = await Promise.all([
//       Room.countDocuments(),
//       Device.countDocuments({ isActive: true }),
//       Device.countDocuments({ status: 'ON', isActive: true }),
//       EnergyRecord.aggregate([
//         { $match: { date: today } },
//         { $group: { _id: null, total: { $sum: '$energyKwh' } } }
//       ])
//     ]);
 
//     // energyResult is an array — get the total or default to 0
//     const total_energy_today_kwh = energyResult[0]?.total || 0;
 
//     res.status(200).json({
//       total_rooms,
//       total_devices,
//       active_devices,
//       total_energy_today_kwh: parseFloat(total_energy_today_kwh.toFixed(2))
//     });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // GET /api/events/recent?limit=5
// exports.getRecentEvents = async (req, res) => {
//   try {
//     const limit = parseInt(req.query.limit) || 5;
 
//     const events = await Event.find()
//       .sort({ timestamp: -1 })   // newest first
//       .limit(limit)
//       .select('deviceName action timestamp triggeredBy');
 
//     const result = events.map(e => ({
//       device_name: e.deviceName,
//       action:      e.action,
//       timestamp:   e.timestamp,
//       triggered_by: e.triggeredBy
//     }));
 
//     res.status(200).json(result);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // GET /api/alerts
// exports.getAlerts = async (req, res) => {
//   try {
//     const alerts = await Alert.find({ isRead: false })
//       .sort({ createdAt: -1 })
//       .populate('device', 'name type');  // get device name if linked
 
//     res.status(200).json(alerts.map(a => ({
//       id:       a._id,
//       type:     a.type,
//       message:  a.message,
//       severity: a.severity,
//       device:   a.device?.name || null,
//       created:  a.createdAt
//     })));
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };
