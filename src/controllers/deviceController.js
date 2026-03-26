/**
 * DeviceController
 *
 * Design Patterns:
 *  • TEMPLATE METHOD (via BaseController)
 *  • MVC CONTROLLER — thin HTTP adapter only, zero business logic
 */

const BaseController = require('./baseController');
const DeviceService  = require('../services/deviceService');

class DeviceController extends BaseController {

  async getAllDevices(req, res) {
    const { roomId } = req.query;
    const devices = await DeviceService.getAllDevices(roomId || null);
    return this.ok(res, 'Devices fetched successfully', { devices });
  }

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

  async getDevice(req, res) {
    const device = await DeviceService.getDeviceById(req.params.id);
    return this.ok(res, 'Device fetched successfully', { device });
  }

  async updateDevice(req, res) {
    const device = await DeviceService.updateDevice(req.params.id, req.body);
    return this.ok(res, 'Device updated successfully', { device });
  }

  async deleteDevice(req, res) {
    await DeviceService.deleteDevice(req.params.id);
    return this.noContent(res);
  }

  async controlDevice(req, res) {
    const { action } = req.body;
    const result = await DeviceService.controlDevice(
      req.params.id,
      action,
      { triggeredBy: 'USER', userId: req.user?.id ?? null }
    );
    return this.ok(res, 'Device state updated', result);
  }

  async getDeviceStatus(req, res) {
    const status = await DeviceService.getDeviceStatus(req.params.id);
    return this.ok(res, 'Device status fetched', status);
  }

  async iotFeedback(req, res) {
    const { device_id, status, power, energy_kwh } = req.body;
    const device = await DeviceService.handleIotFeedback(device_id, status, power, energy_kwh);
    return this.ok(res, 'IoT feedback processed', {
      device_id: device._id,
      status:    device.status,
    });
  }
}

const controller = new DeviceController();
module.exports   = controller;