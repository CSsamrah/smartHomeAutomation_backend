/**
 * AutomationController
 *
 * Design Pattern: TEMPLATE METHOD (inherits BaseController.handle())
 *
 * Routes:
 *   GET    /api/automations             → listRules
 *   POST   /api/automations             → createRule
 *   GET    /api/automations/:id         → getRule
 *   PATCH  /api/automations/:id         → updateRule
 *   DELETE /api/automations/:id         → deleteRule
 *   PATCH  /api/automations/:id/toggle  → toggleRule
 *   POST   /api/automations/:id/run     → runRule  (manual trigger)
 */

const BaseController    = require('./baseController');
const AutomationService = require('../services/automationService');
 
class AutomationController extends BaseController {
 
  // ── GET /automations ─────────────────────────────────────────────────────
  async listRules(req, res) {
    const filter = req.user.role === 'ADMIN'
      ? {}
      : { createdBy: req.user.id };
    const rules = await AutomationService.listRules(filter);
    return this.ok(res, 'Automation rules fetched', { rules });
  }
 
  // ── POST /automations ────────────────────────────────────────────────────
  async createRule(req, res) {
    const { name, trigger, actions } = req.body;
    const mappedActions = actions.map((a) => ({
      device: a.device_id,
      action: a.action,
    }));
    const rule = await AutomationService.createRule({
      name,
      trigger,
      actions:   mappedActions,
      createdBy: req.user.id,
    });
    return this.created(res, 'Automation rule created', { rule });
  }
 
  // ── GET /automations/:id ─────────────────────────────────────────────────
  async getRule(req, res) {
    const rule = await AutomationService.getRuleById(req.params.id);
    return this.ok(res, 'Automation rule fetched', { rule });
  }
 
  // ── PATCH /automations/:id ───────────────────────────────────────────────
  async updateRule(req, res) {
    const { name, trigger, actions, isActive } = req.body;
    const dto = {};
    if (name     !== undefined) dto.name     = name;
    if (trigger  !== undefined) dto.trigger  = trigger;
    if (isActive !== undefined) dto.isActive = isActive;
    if (actions  !== undefined) {
      dto.actions = actions.map((a) => ({ device: a.device_id, action: a.action }));
    }
    const rule = await AutomationService.updateRule(req.params.id, dto);
    return this.ok(res, 'Automation rule updated', { rule });
  }
 
  // ── DELETE /automations/:id ──────────────────────────────────────────────
  async deleteRule(req, res) {
    await AutomationService.deleteRule(req.params.id);
    return this.noContent(res);
  }
 
  // ── PATCH /automations/:id/toggle ────────────────────────────────────────
  async toggleRule(req, res) {
    const { isActive } = req.body;
    const rule = await AutomationService.toggleRule(req.params.id, isActive);
    return this.ok(res, `Automation rule ${isActive ? 'enabled' : 'disabled'}`, { rule });
  }
 
  // ── POST /automations/:id/run ─────────────────────────────────────────────
  async runRule(req, res) {
    const result = await AutomationService.executeRule(req.params.id, 'MANUAL');
    return this.ok(res, 'Automation rule executed', result);
  }
}
 
const controller = new AutomationController();
module.exports   = controller;
 