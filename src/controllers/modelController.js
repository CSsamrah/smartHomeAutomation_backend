/**
 * ModelController  (Module 8 — AI / Mathematical Modeling)
 *
 * Design Patterns:
 *  • TEMPLATE METHOD (via BaseController) — this.handle() wraps every method
 *  • MVC CONTROLLER  — thin HTTP adapter; all logic in AnalyticsService
 *
 * Routes:
 *   GET /api/model/home/:homeId               → getHomeDeviceAnalytics
 *   GET /api/model/device/:deviceId/markov    → getMarkovMatrix
 *   GET /api/model/device/:deviceId/predict   → predictNextState
 *
 * Poisson λ and action frequency live under /api/events/device/:deviceId/...
 * because they derive directly from the Event log (natural co-location).
 */

const BaseController    = require('./baseController');
const modelService  = require('../services/modelService');

class ModelController extends BaseController {

  // ── GET /model/home/:homeId ───────────────────────────────────────────
  async getHomeDeviceAnalytics(req, res) {
    const result = await modelService.getHomeDeviceAnalytics(req.params.homeId);
    return this.ok(res, 'Home device analytics fetched.', result);
  }

  // ── GET /model/device/:deviceId/markov ────────────────────────────────
  async getMarkovMatrix(req, res) {
    const result = await modelService.getMarkovMatrix(req.params.deviceId);
    return this.ok(res, 'Markov transition matrix fetched.', result);
  }

  // ── GET /model/device/:deviceId/predict?currentState= ────────────────
  async predictNextState(req, res) {
    const result = await modelService.predictNextState(
      req.params.deviceId,
      req.query.currentState
    );
    return this.ok(res, 'Next state predicted.', result);
  }
}

const controller = new ModelController();
module.exports   = controller;


// const Event = require('../models/Event');
// const MarkovTransition = require('../models/MarkovTransition');
 
// const STATES = ['OFF', 'ON', 'IDLE', 'FAULT'];
 
// // GET /model/poisson/events (Returns raw timestamped events for modeling)
// exports.getPoissonEvents = async (req, res) => {
//   try {
//     // Default: last 24 hours of events
//     const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
 
//     const events = await Event.find({ timestamp: { $gte: since } })
//       .sort({ timestamp: 1 })
//       .select('device timestamp action');
 
//     res.status(200).json(events.map(e => ({
//       device_id: e.device,
//       timestamp: e.timestamp,
//       action:    e.action
//     })));
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // GET /model/poisson/lambda (Computes average event rate per hour)
// exports.getLambda = async (req, res) => {
//   try {
//     // Use last 24 hours as observation window
//     const windowHours = 24;
//     const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);
 
//     const totalEvents = await Event.countDocuments({
//       timestamp: { $gte: since }
//     });
 
//     // Lambda = events per hour
//     const lambda = totalEvents / windowHours;
 
//     res.status(200).json({
//       lambda:   parseFloat(lambda.toFixed(4)),
//       interval: 'hour',
//       based_on: `${totalEvents} events in last ${windowHours} hours`
//     });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };
