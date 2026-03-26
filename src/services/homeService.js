/**
 * HomeService
 *
 * Design Patterns:
 *  • SERVICE LAYER  — all home business logic lives here; controllers stay thin
 *  • REPOSITORY     — data access goes through model layer only
 *  • GUARD CLAUSE   — pre-condition checks at top of each method
 *  • SINGLETON      — one shared instance
 */

const Home       = require('../models/Home');
const User       = require('../models/User');
const Room       = require('../models/Room');
const Invitation = require('../models/Invitation');

const {
  NotFoundError,
  ConflictError,
  AuthorizationError,
  ValidationError,
} = require('../utils/AppError');

// ─── Value Object: HomeDTO ────────────────────────────────────────────────────
const toHomeDTO = (home) => ({
  id:        home._id,
  name:      home.name,
  address:   home.address,
  admin:     home.admin,
  residents: home.residents,
  isActive:  home.isActive,
  createdAt: home.createdAt,
  updatedAt: home.updatedAt,
});

class HomeService {
  constructor() {
    if (HomeService._instance) return HomeService._instance;
    HomeService._instance = this;
  }

  // ── Admin: create home ────────────────────────────────────────────────────

  /**
   * An admin can only own one active home.
   * Guards against creating duplicates.
   */
  async createHome(adminId, { name, address }) {
    const existing = await Home.findOne({ admin: adminId, isActive: true });
    if (existing) {
      throw new ConflictError(
        'You already have an active home. An admin can only manage one home.',
        'HOME_ALREADY_EXISTS'
      );
    }

    const home = await Home.create({ name, address, admin: adminId });
    console.log(`[HomeService] Home created: "${home.name}" by admin ${adminId}`);
    return toHomeDTO(home);
  }

  // ── Get home ──────────────────────────────────────────────────────────────

  async getHomeById(homeId) {
    const home = await Home.findById(homeId)
      .populate('admin', 'name email')
      .populate('residents', 'name email role');

    if (!home) throw new NotFoundError('Home not found.', 'HOME_NOT_FOUND');
    return home;
  }

  /**
   * Get the home owned by the currently logged-in admin.
   */
  async getMyHome(adminId) {
    const home = await Home.findOne({ admin: adminId, isActive: true })
      .populate('admin', 'name email')
      .populate('residents', 'name email role avatar');

    if (!home) throw new NotFoundError('You have not created a home yet.', 'HOME_NOT_FOUND');
    return toHomeDTO(home);
  }

  /**
   * Get the home a resident belongs to.
   */
  async getResidentHome(userId) {
    const home = await Home.findOne({ residents: userId, isActive: true })
      .populate('admin', 'name email')
      .populate('residents', 'name email role avatar');

    if (!home) throw new NotFoundError('You do not belong to any home.', 'HOME_NOT_FOUND');
    return toHomeDTO(home);
  }

  // ── Update home ───────────────────────────────────────────────────────────

  async updateHome(homeId, adminId, { name, address }) {
    const home = await Home.findById(homeId);
    if (!home) throw new NotFoundError('Home not found.', 'HOME_NOT_FOUND');

    // Guard: only the home's own admin can update it
    if (!home.isOwnedBy(adminId)) {
      throw new AuthorizationError(
        'You are not the admin of this home.',
        'NOT_HOME_ADMIN'
      );
    }

    if (name    !== undefined) home.name    = name.trim();
    if (address !== undefined) home.address = address;
    await home.save();

    console.log(`[HomeService] Home updated: "${home.name}"`);
    return toHomeDTO(home);
  }

  // ── Residents ─────────────────────────────────────────────────────────────

  async listResidents(homeId, adminId) {
    const home = await Home.findById(homeId)
      .populate('residents', 'name email role avatar isActive lastLogin');

    if (!home) throw new NotFoundError('Home not found.', 'HOME_NOT_FOUND');

    if (!home.isOwnedBy(adminId)) {
      throw new AuthorizationError('You are not the admin of this home.', 'NOT_HOME_ADMIN');
    }

    return home.residents;
  }

  async removeResident(homeId, residentId, adminId) {
    const home = await Home.findById(homeId);
    if (!home) throw new NotFoundError('Home not found.', 'HOME_NOT_FOUND');

    if (!home.isOwnedBy(adminId)) {
      throw new AuthorizationError('You are not the admin of this home.', 'NOT_HOME_ADMIN');
    }

    if (!home.hasResident(residentId)) {
      throw new NotFoundError('Resident not found in this home.', 'RESIDENT_NOT_FOUND');
    }

    home.removeResident(residentId);
    await home.save();

    console.log(`[HomeService] Resident ${residentId} removed from home ${homeId}`);
  }

  // ── Helper used by other services ────────────────────────────────────────

  /**
   * Verify that a user (admin or resident) has access to a given home.
   * Used by RoomService and DeviceService to authorise access.
   * @returns {Home} the home document
   */
  async assertUserBelongsToHome(userId, homeId) {
    const home = await Home.findById(homeId);
    if (!home) throw new NotFoundError('Home not found.', 'HOME_NOT_FOUND');

    const isAdmin    = home.isOwnedBy(userId);
    const isResident = home.hasResident(userId);

    if (!isAdmin && !isResident) {
      throw new AuthorizationError(
        'You do not have access to this home.',
        'HOME_ACCESS_DENIED'
      );
    }

    return home;
  }
}

module.exports = new HomeService();