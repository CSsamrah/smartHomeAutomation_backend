/**
 * EventLogListener
 *
 * Design Pattern: OBSERVER (listener side)
 *
 * Subscribes to DomainEvents and writes immutable Event documents
 * (the Poisson process log).  Completely decoupled from DeviceService —
 * if this listener crashes, device control still succeeds.
 * 
 * Write a MarkovTransition document (fromState → toState)
 * 
 * Manage EnergyRecord open/close lifecycle
 *    - Device turns ON  → open a new EnergyRecord (endedAt = null)
 *    - Device turns OFF/IDLE/FAULT → close the open record (set endedAt,
 *      durationSeconds, energyKwh)
 *
 * Register once at app bootstrap:
 *   require('./listeners/EventLogListener');
 */

const DomainEvents = require('./domainEvents');
const Event        = require('../models/Event');
const Alert        = require('../models/Alert');
const MarkovTransition = require('../models/MarkovTransition');
const EnergyRecord     = require('../models/EnergyRecord');

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


  // ── 2. Write MarkovTransition (fromState → toState) ────────────────────
  // device.status was already updated to `action` by DeviceService before
  // emitting, so we fall back to querying the second-to-last Event for this device.
  try {
    const prevEvent = await Event.findOne({
      device: device._id,
      _id:    { $ne: (await Event.findOne({ device: device._id }).sort({ _id: -1 }).select('_id').lean())?._id },
    })
      .sort({ timestamp: -1 })
      .select('action')
      .lean();
 
    if (prevEvent) {
      await MarkovTransition.create({
        device:    device._id,
        fromState: prevEvent.action,
        toState:   action,
      });
    }
  } catch (err) {
    console.error('[EventLogListener] Failed to write MarkovTransition:', err.message);
  }
 
  // ── 3. Manage EnergyRecord lifecycle ──────────────────────────────────
  try {
    const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
 
    if (action === 'ON') {
      // Open a new energy session — close any accidentally-open ones first
      await EnergyRecord.updateMany(
        { device: device._id, endedAt: null },
        { $set: { endedAt: new Date(), durationSeconds: 0 } }
      );
 
      await EnergyRecord.create({
        device:    device._id,
        room:      device.room,        // device.room is populated by DeviceService
        startedAt: new Date(),
        date:      today,
        // endedAt, durationSeconds, energyKwh all default to null/0
      });
 
    } else if (action === 'OFF' || action === 'IDLE' || action === 'FAULT') {
      // Close any open session for this device
      const openRecord = await EnergyRecord.findOne({
        device: device._id,
        endedAt: null,
      });
 
      if (openRecord) {
        const endedAt         = new Date();
        const durationSeconds = Math.floor(
          (endedAt.getTime() - new Date(openRecord.startedAt).getTime()) / 1000
        );
        const energyKwh = (device.powerRatingWatt * durationSeconds) / 3_600_000;
 
        openRecord.endedAt         = endedAt;
        openRecord.durationSeconds = durationSeconds;
        openRecord.energyKwh       = energyKwh;
        await openRecord.save();
      }
    }
  } catch (err) {
    console.error('[EventLogListener] Failed to manage EnergyRecord:', err.message);
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