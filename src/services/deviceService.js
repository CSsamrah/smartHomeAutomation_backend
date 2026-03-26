/**
 * DeviceService
 *
 * Design Patterns:
 *   - SERVICE LAYER   : encapsulates all device business rules
 *   - OBSERVER        : emits DomainEvents after state changes
 *   - FACADE          : single entry point hiding DB + MQTT + event details
 */

const Device            = require('../models/Device');
const AppError          = require('../utils/AppError');
const DomainEvents      = require('../events/domainEvents');
const MqttPublisher     = require('./mqttPublisher');
const AutomationService = require('./automationService');

class DeviceService {

  // ── Query helpers ──────────────────────────────────────────────────────

  async getAllDevices(roomId = null) {
    const filter = { isActive: true };
    if (roomId) filter.room = roomId;
    return Device.find(filter).populate('room', 'name').lean();
  }

  async getDeviceById(deviceId) {
    const device = await Device.findOne({ _id: deviceId, isActive: true })
      .populate('room', 'name')
      .lean();
    if (!device) throw new AppError('Device not found', 404);
    return device;
  }

  // ── Mutations ──────────────────────────────────────────────────────────

  async createDevice(dto) {
    const { name, type, roomId, powerRatingWatt } = dto;
    const device = await Device.create({ name, type, room: roomId, powerRatingWatt });
    return device;
  }

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

  async deleteDevice(deviceId) {
    const device = await Device.findOneAndUpdate(
      { _id: deviceId, isActive: true },
      { $set: { isActive: false } },
      { new: true }
    );
    if (!device) throw new AppError('Device not found', 404);
    return device;
  }

  // ── Core Control ───────────────────────────────────────────────────────

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

    device.status = action;
    await device.save();

    MqttPublisher.publishCommand(deviceId, action);

    DomainEvents.emit(DomainEvents.DEVICE_STATE_CHANGED, {
      device,
      action,
      triggeredBy,
      userId,
      automationId,
    });

    return { status: device.status, state: device.status };
  }

  // ── IoT Feedback ───────────────────────────────────────────────────────

  async handleIotFeedback(deviceId, status, power, energy_kwh) {
    const normalised  = status.toUpperCase();
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

    // 1. Emit domain event → EventLogListener writes the event log entry
    DomainEvents.emit(DomainEvents.DEVICE_STATE_CHANGED, {
      device,
      action:       normalised,
      triggeredBy:  'IOT_FEEDBACK',
      userId:       null,
      automationId: null,
      power,
    });

    // 2. Build reading object from whatever was sent
    const reading = {};
    if (power      !== undefined && power      !== null) reading.power      = power;
    if (energy_kwh !== undefined && energy_kwh !== null) reading.energy_kwh = energy_kwh;

    // 3. Evaluate CONDITION rules against the reading
    console.log('[DeviceService] Evaluating condition rules with reading:', reading);
    if (Object.keys(reading).length > 0) {
      await AutomationService.evaluateConditionRules(reading);
    }

    return device;
  }

  // ── Status ─────────────────────────────────────────────────────────────

  async getDeviceStatus(deviceId) {
    const device = await Device.findOne({ _id: deviceId, isActive: true })
      .select('status lastUpdated')
      .lean();
    if (!device) throw new AppError('Device not found', 404);
    return { status: device.status, state: device.status, last_updated: device.lastUpdated };
  }
}

module.exports = new DeviceService();