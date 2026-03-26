/**
 * DomainEvents
 *
 * Design Pattern: OBSERVER / EVENT BUS
 *
 * A lightweight singleton event bus for internal domain events.
 * Decouples the Device control flow from side-effects like:
 *   - Logging Poisson events
 *   - Triggering automation rule checks
 *   - Pushing real-time updates (Socket.io / MQTT)
 *   - Firing alerts
 *
 * Usage:
 *   DomainEvents.emit('device.stateChanged', { device, action, triggeredBy });
 *   DomainEvents.on('device.stateChanged', handler);
 */

const EventEmitter = require('events');

class DomainEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(30); // IoT systems have many listeners
  }
}

// Singleton
const DomainEvents = new DomainEventBus();

// ── Event name constants (avoids magic strings) ─────────────────────────────
DomainEvents.DEVICE_STATE_CHANGED  = 'device.stateChanged';
DomainEvents.AUTOMATION_TRIGGERED  = 'automation.triggered';
DomainEvents.AUTOMATION_FAILED     = 'automation.failed';
DomainEvents.ALERT_CREATED         = 'alert.created';

module.exports = DomainEvents;