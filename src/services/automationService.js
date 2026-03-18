/**
 * AutomationService
 *
 * Design Patterns:
 *   - SERVICE LAYER    : all automation business rules live here
 *   - STRATEGY         : TriggerStrategy determines WHEN a rule fires
 *   - COMMAND          : each Action in a rule is a command object
 *   - SCHEDULER        : node-cron registers TIME-based rules at startup
 *   - OBSERVER         : emits DomainEvents after execution
 *
 * Dependencies:
 *   npm install node-cron
 */

const cron          = require('node-cron');
const AutomationRule = require('../models/AutomationRule');
const AppError      = require('../utils/AppError');
const DomainEvents  = require('../events/domainEvents');
const DeviceService = require('./deviceService');

// ── TriggerStrategy interface ─────────────────────────────────────────────
/**
 * Each concrete strategy knows how to evaluate whether a rule should fire.
 *
 * TimeTriggerStrategy  : uses node-cron to schedule execution
 * ConditionTriggerStrategy : evaluated on-demand when a device state changes
 */
class TimeTriggerStrategy {
  /**
   * @param {string} time  "HH:MM" 24-hour
   * @returns {string}     node-cron expression
   */
  toCron(time) {
    const [hour, minute] = time.split(':');
    return `${minute} ${hour} * * *`;
  }

  matches() {
    // Time rules are fired by cron — not polled
    return false;
  }
}

class ConditionTriggerStrategy {
  /**
   * Evaluate whether a live reading satisfies the condition.
   * @param {Object} condition  { field, operator, value }
   * @param {Object} reading    e.g. { energy_kwh: 12.4 }
   */
  matches(condition, reading) {
    const actual = reading[condition.field];
    if (actual === undefined) return false;

    switch (condition.operator) {
      case 'gt': return actual >  condition.value;
      case 'lt': return actual <  condition.value;
      case 'eq': return actual === condition.value;
      case 'gte': return actual >= condition.value;
      case 'lte': return actual <= condition.value;
      default:   return false;
    }
  }
}

// ── AutomationService ─────────────────────────────────────────────────────
class AutomationService {
  constructor() {
    /** Map<ruleId, CronTask> — lets us cancel cron tasks on rule disable/delete */
    this._cronJobs = new Map();

    this._timeTrigger      = new TimeTriggerStrategy();
    this._conditionTrigger = new ConditionTriggerStrategy();
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  /**
   * Create a new automation rule.
   * If it's a TIME trigger and isActive, schedule it immediately.
   *
   * @param {Object} dto  { name, trigger, actions, createdBy }
   */
  async createRule(dto) {
    const { name, trigger, actions, createdBy } = dto;

    const rule = await AutomationRule.create({
      name,
      trigger,
      actions,
      createdBy,
      isActive: true,
    });

    if (rule.isActive && rule.trigger.type === 'TIME') {
      this._scheduleCron(rule);
    }

    return rule;
  }

  /**
   * List all automation rules for a user (or all for admin).
   */
  async listRules(filter = {}) {
    return AutomationRule.find(filter)
      .populate('actions.device', 'name type status')
      .lean();
  }

  /**
   * Get one rule by id.
   */
  async getRuleById(ruleId) {
    const rule = await AutomationRule.findById(ruleId)
      .populate('actions.device', 'name type status room');
    if (!rule) throw new AppError('Automation rule not found', 404);
    return rule;
  }

  /**
   * Update rule fields.  Re-schedules cron if trigger or isActive changed.
   */
  async updateRule(ruleId, dto) {
    const rule = await AutomationRule.findByIdAndUpdate(
      ruleId,
      { $set: dto },
      { new: true, runValidators: true }
    );
    if (!rule) throw new AppError('Automation rule not found', 404);

    // Cancel old cron (if any) and reschedule if still a TIME trigger
    this._cancelCron(ruleId);
    if (rule.isActive && rule.trigger.type === 'TIME') {
      this._scheduleCron(rule);
    }

    return rule;
  }

  /**
   * Soft-disable a rule (sets isActive = false, cancels cron).
   */
  async toggleRule(ruleId, isActive) {
    const rule = await AutomationRule.findByIdAndUpdate(
      ruleId,
      { $set: { isActive } },
      { new: true }
    );
    if (!rule) throw new AppError('Automation rule not found', 404);

    if (!isActive) {
      this._cancelCron(ruleId);
    } else if (rule.trigger.type === 'TIME') {
      this._scheduleCron(rule);
    }

    return rule;
  }

  /**
   * Permanently delete a rule and cancel its cron.
   */
  async deleteRule(ruleId) {
    const rule = await AutomationRule.findByIdAndDelete(ruleId);
    if (!rule) throw new AppError('Automation rule not found', 404);
    this._cancelCron(ruleId);
    return rule;
  }

  // ── Execution ─────────────────────────────────────────────────────────────

  /**
   * Execute a rule's action list.
   * Called by: cron scheduler, manual trigger endpoint, condition evaluator.
   *
   * Each action is treated as a Command object — executed sequentially so
   * a failure in one action is caught without blocking the rest.
   *
   * @param {string|ObjectId} ruleId
   * @param {string} source  'SCHEDULE' | 'MANUAL' | 'CONDITION'
   */
  async executeRule(ruleId, source = 'MANUAL') {
    const rule = await AutomationRule.findById(ruleId).populate('actions.device');
    if (!rule) throw new AppError('Automation rule not found', 404);

    if (!rule.isActive) {
      throw new AppError('Automation rule is disabled', 409);
    }

    const results = [];

    for (const actionCmd of rule.actions) {
      try {
        // COMMAND pattern: each action is self-contained
        await DeviceService.controlDevice(
          actionCmd.device._id.toString(),
          actionCmd.action,
          {
            triggeredBy:  'AUTOMATION',
            automationId: rule._id,
          }
        );
        results.push({ deviceId: actionCmd.device._id, action: actionCmd.action, ok: true });
      } catch (err) {
        results.push({ deviceId: actionCmd.device._id, action: actionCmd.action, ok: false, error: err.message });

        DomainEvents.emit(DomainEvents.AUTOMATION_FAILED, {
          rule,
          reason: `Action ${actionCmd.action} on device ${actionCmd.device.name} failed: ${err.message}`,
        });
      }
    }

    // Update lastRunAt
    rule.lastRunAt = new Date();
    await rule.save();

    DomainEvents.emit(DomainEvents.AUTOMATION_TRIGGERED, { rule, source, results });

    return { ruleId, name: rule.name, source, executedAt: rule.lastRunAt, results };
  }

  /**
   * Evaluate CONDITION-based rules against a live reading.
   * Called by IoT feedback handler after every device update.
   *
   * @param {Object} reading  e.g. { energy_kwh: 15 }
   */
  async evaluateConditionRules(reading) {
    const rules = await AutomationRule.find({
      isActive: true,
      'trigger.type': 'CONDITION',
    });

    for (const rule of rules) {
      const matches = this._conditionTrigger.matches(rule.trigger.condition, reading);
      if (matches) {
        // Fire-and-forget; errors are caught inside executeRule
        this.executeRule(rule._id.toString(), 'CONDITION').catch((err) =>
          console.error(`[AutomationService] Condition rule "${rule.name}" failed:`, err.message)
        );
      }
    }
  }

  // ── Scheduler ─────────────────────────────────────────────────────────────

  /**
   * Boot-time: load all active TIME rules and schedule them.
   * Call once after DB connection is ready.
   */
  async scheduleAllActiveRules() {
    const rules = await AutomationRule.find({
      isActive: true,
      'trigger.type': 'TIME',
    });

    let scheduled = 0;
    for (const rule of rules) {
      try {
        this._scheduleCron(rule);
        scheduled++;
      } catch (err) {
        console.error(`[AutomationService] Failed to schedule "${rule.name}":`, err.message);
      }
    }

    console.log(`[AutomationService] Scheduled ${scheduled} TIME-based automation rules.`);
  }

  // ── Private cron helpers ──────────────────────────────────────────────────

  _scheduleCron(rule) {
    const cronExpr = this._timeTrigger.toCron(rule.trigger.time);

    if (!cron.validate(cronExpr)) {
      throw new Error(`Invalid cron expression derived from time "${rule.trigger.time}": ${cronExpr}`);
    }

    const task = cron.schedule(cronExpr, () => {
      console.log(`[AutomationService] Firing rule "${rule.name}" at ${rule.trigger.time}`);
      this.executeRule(rule._id.toString(), 'SCHEDULE').catch((err) =>
        console.error(`[AutomationService] Scheduled execution of "${rule.name}" failed:`, err.message)
      );
    });

    // Store so we can cancel later
    this._cronJobs.set(rule._id.toString(), task);
  }

  _cancelCron(ruleId) {
    const task = this._cronJobs.get(ruleId.toString());
    if (task) {
      task.stop();
      this._cronJobs.delete(ruleId.toString());
    }
  }
}

// Singleton — preserves the _cronJobs Map across the app lifetime
module.exports = new AutomationService();