/**
 * RoomController
 *
 * Design Patterns:
 *  • TEMPLATE METHOD (via BaseController) — this.handle() wraps every method
 *  • MVC CONTROLLER  — thin HTTP adapter only
 */

const BaseController = require('./baseController');
const roomService    = require('../services/roomService');

class RoomController extends BaseController {

  // ── POST /homes/:homeId/rooms ─────────────────────────────────────────────
  async createRoom(req, res) {
    const { name, description } = req.body;
    const room = await roomService.createRoom(
      req.params.homeId,
      req.user._id,
      { name, description }
    );
    return this.created(res, 'Room created successfully.', { room });
  }

  // ── GET /homes/:homeId/rooms ──────────────────────────────────────────────
  async listRooms(req, res) {
    const rooms = await roomService.listRooms(
      req.params.homeId,
      req.user._id
    );
    return this.ok(res, 'Rooms retrieved.', { rooms });
  }

  // ── GET /homes/:homeId/rooms/:roomId ──────────────────────────────────────
  async getRoomById(req, res) {
    const room = await roomService.getRoomById(
      req.params.homeId,
      req.params.roomId,
      req.user._id
    );
    return this.ok(res, 'Room retrieved.', { room });
  }

  // ── PATCH /homes/:homeId/rooms/:roomId ────────────────────────────────────
  async updateRoom(req, res) {
    const { name, description } = req.body;
    const room = await roomService.updateRoom(
      req.params.homeId,
      req.params.roomId,
      req.user._id,
      { name, description }
    );
    return this.ok(res, 'Room updated.', { room });
  }

  // ── DELETE /homes/:homeId/rooms/:roomId ───────────────────────────────────
  async deleteRoom(req, res) {
    await roomService.deleteRoom(
      req.params.homeId,
      req.params.roomId,
      req.user._id
    );
    return this.ok(res, 'Room deleted.');
  }
}

const controller = new RoomController();
module.exports   = controller;