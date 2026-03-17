/**
 * DeviceService
 *
 * Design Patterns:
 *   - SERVICE LAYER   : encapsulates all device business rules
 *   - OBSERVER        : emits DomainEvents after state changes
 *   - FACADE          : single entry point hiding DB + MQTT + event details
 *
 * Controllers stay thin; all side-effects (MQTT, event log, alerts) are
 * triggered via the DomainEvents bus so this service has no circular deps.
 */

const Device       = require('../models/Device');     
const Event        = require('../models/Event');
const AppError     = require('../utils/AppError');
const DomainEvents = require('../events/domainEvents');
const MqttPublisher = require('./mqttPublisher');

class DeviceService {
  // ── Query helpers ────────────────────────────────────────────────────────

  /**
   * Return all active devices, optionally filtered by room.
   * @param {string|null} roomId
   */
  async getAllDevices(roomId = null) {
    const filter = { isActive: true };
    if (roomId) filter.room = roomId;
    return Device.find(filter).populate('room', 'name').lean();
  }

  /**
   * Return a single active device or throw 404.
   */
  async getDeviceById(deviceId) {
    const device = await Device.findOne({ _id: deviceId, isActive: true })
      .populate('room', 'name')
      .lean();
    if (!device) throw new AppError('Device not found', 404);
    return device;
  }

  // ── Mutations ────────────────────────────────────────────────────────────

  /**
   * Create a new device and attach it to a room.
   * @param {Object} dto  { name, type, roomId, powerRatingWatt }
   */
  async createDevice(dto) {
    const { name, type, roomId, powerRatingWatt } = dto;

    const device = await Device.create({
      name,
      type,
      room:           roomId,
      powerRatingWatt,
    });

    return device;
  }

  /**
   * Update mutable device fields (name, powerRatingWatt).
   * Status changes must go through controlDevice().
   */
  async updateDevice(deviceId, dto) {
    const allowed = ['name', 'powerRatingWatt'];
    const update  = {};
    allowed.forEach((k) => { if (dto[k] !== undefined) update[k] = dto[k]; });

    const device = await Device.findOneAndUpdate(
      { _id: deviceId, isActive: true },
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!device) throw new AppError('Device not found', 404);
    return device;
  }

  /**
   * Soft-delete a device.
   */
  async deleteDevice(deviceId) {
    const device = await Device.findOneAndUpdate(
      { _id: deviceId, isActive: true },
      { $set: { isActive: false } },
      { new: true }
    );
    if (!device) throw new AppError('Device not found', 404);
    return device;
  }

  // ── Core Control ─────────────────────────────────────────────────────────

  /**
   * CRITICAL API — change device state.
   *
   * Pipeline:
   *   1. Validate device exists & is not in FAULT
   *   2. Persist new status to DB
   *   3. Publish MQTT command to hardware
   *   4. Emit DomainEvent → EventLogListener writes Poisson log entry
   *
   * @param {string} deviceId
   * @param {string} action       'ON' | 'OFF' | 'IDLE'
   * @param {Object} meta         { triggeredBy, userId?, automationId? }
   */
  async controlDevice(deviceId, action, meta = {}) {
    const { triggeredBy = 'USER', userId = null, automationId = null } = meta;

    const device = await Device.findOne({ _id: deviceId, isActive: true });
    if (!device) throw new AppError('Device not found', 404);

    if (device.status === 'FAULT') {
      throw new AppError(
        `Device "${device.name}" is in FAULT state and cannot be controlled.`,
        409
      );
    }

    // 1. Persist
    device.status = action;
    await device.save();

    // 2. Fire MQTT command to physical hardware (non-blocking)
    MqttPublisher.publishCommand(deviceId, action);

    // 3. Emit domain event — listeners handle event logging asynchronously
    DomainEvents.emit(DomainEvents.DEVICE_STATE_CHANGED, {
      device,
      action,
      triggeredBy,
      userId,
      automationId,
    });

    return { status: device.status, state: device.status };
  }

  /**
   * Handle IoT feedback from hardware (POST /api/iot/feedback).
   * Updates device state and emits the same domain event so the Poisson
   * log stays consistent regardless of who triggered the change.
   *
   * @param {string} deviceId
   * @param {string} status     Raw status string from hardware
   * @param {number} power      Reported wattage
   */
  async handleIotFeedback(deviceId, status, power) {
    const normalised = status.toUpperCase();
    const validStates = ['ON', 'OFF', 'IDLE', 'FAULT'];

    if (!validStates.includes(normalised)) {
      throw new AppError(`Unknown IoT status: "${status}"`, 400);
    }

    const device = await Device.findByIdAndUpdate(
      deviceId,
      { $set: { status: normalised } },
      { new: true, runValidators: true }
    );

    if (!device) throw new AppError('Device not found', 404);

    // Emit so event log & alerts fire just like a user action
    DomainEvents.emit(DomainEvents.DEVICE_STATE_CHANGED, {
      device,
      action:      normalised,
      triggeredBy: 'IOT_FEEDBACK',
      userId:      null,
      automationId: null,
      power,         // extra IoT context
    });

    return device;
  }

  /**
   * Get current status of one device (polling / REST fallback).
   */
  async getDeviceStatus(deviceId) {
    const device = await Device.findOne({ _id: deviceId, isActive: true })
      .select('status lastUpdated')
      .lean();
    if (!device) throw new AppError('Device not found', 404);

    return {
      status:       device.status,
      state:        device.status,
      last_updated: device.lastUpdated,
    };
  }
}

module.exports = new DeviceService();