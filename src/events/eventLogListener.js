/**
 * EventLogListener
 *
 * Design Pattern: OBSERVER (listener side)
 *
 * Subscribes to DomainEvents and writes immutable Event documents
 * (the Poisson process log).  Completely decoupled from DeviceService —
 * if this listener crashes, device control still succeeds.
 *
 * Register once at app bootstrap:
 *   require('./listeners/EventLogListener');
 */

const DomainEvents = require('./domainEvents');
const Event        = require('../models/Event');
const Alert        = require('../models/Alert');

// ── device.stateChanged → write Event document ───────────────────────────
DomainEvents.on(DomainEvents.DEVICE_STATE_CHANGED, async (payload) => {
  const { device, action, triggeredBy, userId, automationId } = payload;

  try {
    await Event.create({
      device:      device._id,
      deviceName:  device.name,
      action,
      triggeredBy,
      user:        userId       || null,
      automation:  automationId || null,
    });
  } catch (err) {
    console.error('[EventLogListener] Failed to write Event log:', err.message);
  }

  // Auto-alert on FAULT
  if (action === 'FAULT') {
    try {
      await Alert.create({
        type:     'DEVICE_FAULT',
        message:  `Device "${device.name}" reported a FAULT state.`,
        severity: 'critical',
        device:   device._id,
      });
      DomainEvents.emit(DomainEvents.ALERT_CREATED, { device });
    } catch (err) {
      console.error('[EventLogListener] Failed to create FAULT alert:', err.message);
    }
  }
});

// ── automation.failed → write alert ─────────────────────────────────────
DomainEvents.on(DomainEvents.AUTOMATION_FAILED, async ({ rule, reason }) => {
  try {
    await Alert.create({
      type:     'AUTOMATION_FAILED',
      message:  `Automation "${rule.name}" failed: ${reason}`,
      severity: 'warning',
    });
  } catch (err) {
    console.error('[EventLogListener] Failed to create automation alert:', err.message);
  }
});