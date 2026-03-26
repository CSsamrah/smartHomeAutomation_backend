/**
 * EventController  (Module 6 — Events)
 *
 * Design Patterns:
 *  • TEMPLATE METHOD (via BaseController) — this.handle() wraps every method
 *  • MVC CONTROLLER  — thin HTTP adapter; all logic in EventService
 *
 * Routes:
 *   GET /api/events/device/:deviceId/lambda    → getPoissonLambda
 *   GET /api/events/device/:deviceId/frequency → getActionFrequency
 *
 * NOTE: The event log is IMMUTABLE — no POST/PATCH/DELETE routes exist.
 * Events are written exclusively by the domain event listener that fires
 * after every device state change.
 */

const BaseController = require('./baseController');
const eventService   = require('../services/eventService');

class EventController extends BaseController {
    
  // ── GET /events/device/:deviceId/lambda ───────────────────────────────────
  async getPoissonLambda(req, res) {
    const windowHours = req.query.windowHours ? Number(req.query.windowHours) : 24;
    const result = await eventService.getPoissonLambda(
      req.params.deviceId,
      windowHours
    );
    return this.ok(res, 'Poisson λ estimated.', result);
  }

  // ── GET /events/device/:deviceId/frequency ────────────────────────────────
  async getActionFrequency(req, res) {
    const result = await eventService.getActionFrequency(req.params.deviceId);
    return this.ok(res, 'Action frequency fetched.', result);
  }
}

const controller = new EventController();
module.exports   = controller;