/**
 * RoomService
 *
 * Design Patterns:
 *  • SERVICE LAYER  — all room business logic here; controllers stay thin
 *  • REPOSITORY     — all DB access through model layer only
 *  • GUARD CLAUSE   — pre-condition checks keep the happy path flat
 *  • SINGLETON      — one shared instance
 *
 * Access rules enforced here:
 *  - Only the home's admin can create, update, delete rooms
 *  - Both admin and residents can VIEW rooms of their home
 *  - A room name must be unique within a home
 */

const Room        = require('../models/Room');
const homeService = require('./homeService');

const {
  NotFoundError,
  ConflictError,
  AuthorizationError,
} = require('../utils/AppError');

// ─── Value Object: RoomDTO ────────────────────────────────────────────────────
const toRoomDTO = (room) => ({
  id:          room._id,
  name:        room.name,
  description: room.description,
  home:        room.home,
  createdBy:   room.createdBy,
  isActive:    room.isActive,
  deviceCount: room.deviceCount ?? undefined,
  createdAt:   room.createdAt,
  updatedAt:   room.updatedAt,
});

class RoomService {
  constructor() {
    if (RoomService._instance) return RoomService._instance;
    RoomService._instance = this;
  }

  // ── Admin: create room ────────────────────────────────────────────────────

  /**
   * Create a new room in a home.
   * Only the home's admin can create rooms.
   */
  async createRoom(homeId, adminId, { name, description }) {
    // Guard: user must be admin of this home
    const home = await homeService.assertUserBelongsToHome(adminId, homeId);
    if (!home.isOwnedBy(adminId)) {
      throw new AuthorizationError(
        'Only the home admin can create rooms.',
        'NOT_HOME_ADMIN'
      );
    }

    // Guard: no duplicate room names in the same home
    const duplicate = await Room.findOne({
      home,
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
    });
    if (duplicate) {
      throw new ConflictError(
        `A room named "${name}" already exists in this home.`,
        'ROOM_NAME_TAKEN'
      );
    }

    const room = await Room.create({
      name:        name.trim(),
      description: description || null,
      home:        homeId,
      createdBy:   adminId,
    });

    console.log(`[RoomService] Room "${room.name}" created in home ${homeId}`);
    return toRoomDTO(room);
  }

  // ── Read rooms ────────────────────────────────────────────────────────────

  /**
   * List all rooms in a home.
   * Both admin and residents of the home can view.
   */
  async listRooms(homeId, userId) {
    // Guard: user must belong to this home (admin or resident)
    await homeService.assertUserBelongsToHome(userId, homeId);

    const rooms = await Room.find({ home: homeId, isActive: true })
      .populate('deviceCount')
      .sort({ name: 1 });

    return rooms.map(toRoomDTO);
  }

  /**
   * Get a single room by ID.
   * Both admin and residents of the home can view.
   */
  async getRoomById(homeId, roomId, userId) {
    await homeService.assertUserBelongsToHome(userId, homeId);

    const room = await Room.findOne({ _id: roomId, home: homeId })
      .populate('createdBy', 'name email')
      .populate('deviceCount');

    if (!room) throw new NotFoundError('Room not found.', 'ROOM_NOT_FOUND');

    return toRoomDTO(room);
  }

  // ── Admin: update room ────────────────────────────────────────────────────

  async updateRoom(homeId, roomId, adminId, { name, description }) {
    const home = await homeService.assertUserBelongsToHome(adminId, homeId);

    if (!home.isOwnedBy(adminId)) {
      throw new AuthorizationError(
        'Only the home admin can update rooms.',
        'NOT_HOME_ADMIN'
      );
    }

    const room = await Room.findOne({ _id: roomId, home: homeId });
    if (!room) throw new NotFoundError('Room not found.', 'ROOM_NOT_FOUND');

    // Guard: check duplicate name if name is being changed
    if (name && name.trim().toLowerCase() !== room.name.toLowerCase()) {
      const duplicate = await Room.findOne({
        home:  homeId,
        name:  { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        _id:   { $ne: roomId },
      });
      if (duplicate) {
        throw new ConflictError(
          `A room named "${name}" already exists in this home.`,
          'ROOM_NAME_TAKEN'
        );
      }
    }

    if (name        !== undefined) room.name        = name.trim();
    if (description !== undefined) room.description = description;
    await room.save();

    console.log(`[RoomService] Room "${room.name}" updated`);
    return toRoomDTO(room);
  }

  // ── Admin: delete room ────────────────────────────────────────────────────

  /**
   * Soft delete — sets isActive = false.
   * Hard delete is available but prefer soft for audit trails.
   */
  async deleteRoom(homeId, roomId, adminId) {
    const home = await homeService.assertUserBelongsToHome(adminId, homeId);

    if (!home.isOwnedBy(adminId)) {
      throw new AuthorizationError(
        'Only the home admin can delete rooms.',
        'NOT_HOME_ADMIN'
      );
    }

    const room = await Room.findOne({ _id: roomId, home: homeId });
    if (!room) throw new NotFoundError('Room not found.', 'ROOM_NOT_FOUND');

    room.isActive = false;
    await room.save();

    console.log(`[RoomService] Room "${room.name}" deactivated`);
  }
}

module.exports = new RoomService();