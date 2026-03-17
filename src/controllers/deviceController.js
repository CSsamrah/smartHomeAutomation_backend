/**
 * DeviceController
 *
 * Design Pattern: TEMPLATE METHOD (inherits BaseController.handle())
 *
 * Stays intentionally thin:
 *   - Extracts & validates input from req
 *   - Delegates ALL logic to DeviceService
 *   - Sends standardised response via BaseController helpers
 *
 * Routes:
 *   GET    /api/devices                  → getAllDevices
 *   POST   /api/devices                  → createDevice
 *   GET    /api/devices/:id              → getDevice
 *   PATCH  /api/devices/:id              → updateDevice
 *   DELETE /api/devices/:id              → deleteDevice
 *   POST   /api/devices/:id/control      → controlDevice   ← CRITICAL
 *   GET    /api/devices/:id/status       → getDeviceStatus
 *   POST   /api/iot/feedback             → iotFeedback
 */

const BaseController = require('./baseController');
const DeviceService  = require('../services/deviceService');
 
class DeviceController extends BaseController {
 
  // ── GET /devices?roomId=xxx ──────────────────────────────────────────────
  async getAllDevices(req, res) {
    const { roomId } = req.query;
    const devices = await DeviceService.getAllDevices(roomId || null);
    return this.ok(res, 'Devices fetched successfully', { devices });
  }
 
  // ── POST /devices ────────────────────────────────────────────────────────
  async createDevice(req, res) {
    const { name, type, room_id, power_rating_watt } = req.body;
    const device = await DeviceService.createDevice({
      name,
      type,
      roomId:          room_id,
      powerRatingWatt: power_rating_watt,
    });
    return this.created(res, 'Device created successfully', { device });
  }
 
  // ── GET /devices/:id ─────────────────────────────────────────────────────
  async getDevice(req, res) {
    const device = await DeviceService.getDeviceById(req.params.id);
    return this.ok(res, 'Device fetched successfully', { device });
  }
 
  // ── PATCH /devices/:id ───────────────────────────────────────────────────
  async updateDevice(req, res) {
    const device = await DeviceService.updateDevice(req.params.id, req.body);
    return this.ok(res, 'Device updated successfully', { device });
  }
 
  // ── DELETE /devices/:id ──────────────────────────────────────────────────
  async deleteDevice(req, res) {
    await DeviceService.deleteDevice(req.params.id);
    return this.noContent(res);
  }
 
  // ── POST /devices/:id/control ────────────────────────────────────────────
  async controlDevice(req, res) {
    const { action } = req.body;
    const result = await DeviceService.controlDevice(
      req.params.id,
      action,
      {
        triggeredBy: 'USER',
        userId:      req.user?.id ?? null,
      }
    );
    return this.ok(res, 'Device state updated', result);
  }
 
  // ── GET /devices/:id/status ──────────────────────────────────────────────
  async getDeviceStatus(req, res) {
    const status = await DeviceService.getDeviceStatus(req.params.id);
    return this.ok(res, 'Device status fetched', status);
  }
 
  // ── POST /iot/feedback ───────────────────────────────────────────────────
  async iotFeedback(req, res) {
    const { device_id, status, power } = req.body;
    const device = await DeviceService.handleIotFeedback(device_id, status, power);
    return this.ok(res, 'IoT feedback processed', {
      device_id: device._id,
      status:    device.status,
    });
  }
}
 
const controller = new DeviceController();
module.exports   = controller;