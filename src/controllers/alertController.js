/**
 * AlertController (Module 7 — Alerts)
 *
 * Design Patterns:
 * • TEMPLATE METHOD (via BaseController) — this.handle() wraps every method
 * • MVC CONTROLLER  — thin HTTP adapter; all logic in AlertService
 *
 * Routes:
 * GET    /alerts/stats          → getStats (unread, critical, total)
 * GET    /alerts/unread         → getUnread (unread)
 * GET    /alerts/critical       → getCritical (critical)
 * GET    /alerts/home/:homeId   → getAlertsByHome (paginated list)
 * PATCH  /alerts/:alertId/read  → markAsRead
 */

const BaseController = require('./baseController');
const alertService   = require('../services/alertService');

class AlertController extends BaseController {
    
  // ── GET /api/alerts/stats ────────────────────────────────────────────────
  async getStats(req, res) {
    const result = await alertService.getAlertStats();
    return this.ok(res, 'Alert statistics retrieved.', result);
  }

  // ── GET /api/alerts/unread ────────────────────────────────────────────────
  async getUnread(req, res) {
    const result = await alertService.getUnreadAlerts();
    return this.ok(res, 'Unread Alerts retrieved.', result);
  }

  // ── GET /api/alerts/critical ────────────────────────────────────────────────
  async getCritical(req, res) {
    const result = await alertService.getCriticalAlerts();
    return this.ok(res, 'Critical Alerts retrieved.', result);
  }

  // ── GET /api/alerts/home/:homeId ─────────────────────────────────────────
  async getAlertsByHome(req, res) {
    const { homeId } = req.params;
    const { page, limit, severity } = req.query;

    const result = await alertService.getAlertsByHome(homeId, {
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      severity
    });

    return this.ok(res, 'Home alerts retrieved.', result);
  }

  // ── PATCH /api/alerts/:alertId/read ──────────────────────────────────────
  async markAsRead(req, res) {
    const { alertId } = req.params;
    const result = await alertService.markAsRead(alertId);
    
    return this.ok(res, 'Alert marked as read.', result);
  }
}

const controller = new AlertController();
module.exports   = controller;