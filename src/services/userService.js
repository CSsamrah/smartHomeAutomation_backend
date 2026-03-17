/**
 * UserService
 *
 * Design Patterns:
 *  • SERVICE LAYER  — Pure business logic; no HTTP concerns.
 *  • REPOSITORY     — All DB access goes through UserRepository, never raw Mongoose.
 *  • GUARD CLAUSE   — Pre-condition checks at the top of each method keep the
 *                     happy path flat and readable.
 *  • SINGLETON      — One shared instance.
 */

const userRepository = require('./userRepository');
const {
  NotFoundError,
  ConflictError,
  ValidationError,
  AuthorizationError,
} = require('../utils/AppError');

// ─── Value Object: UserDTO ────────────────────────────────────────────────────

/**
 * Canonical safe user shape returned to controllers.
 * Ensures password hashes, googleId, and reset fields never leak.
 */
const toUserDTO = (user) => ({
  id:        user._id,
  name:      user.name,
  email:     user.email,
  role:      user.role,
  avatar:    user.avatar,
  isActive:  user.isActive,
  lastLogin: user.lastLogin,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

// ─── Service ──────────────────────────────────────────────────────────────────

class UserService {
  constructor() {
    if (UserService._instance) return UserService._instance;
    UserService._instance = this;
  }

  // ── Own-profile operations ────────────────────────────────────────────────

  async getMyProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found.', 'USER_NOT_FOUND');
    return toUserDTO(user);
  }

  /**
   * Update own name / avatar.
   * Email, role, and isActive require admin or a dedicated flow.
   */
  async updateMyProfile(userId, { name, avatar }) {
    const updates = {};
    if (name   !== undefined) updates.name   = name.trim();
    if (avatar !== undefined) updates.avatar = avatar;

    const user = await userRepository.updateById(userId, updates);
    if (!user) throw new NotFoundError('User not found.', 'USER_NOT_FOUND');

    console.log(`[UserService] Profile updated: ${user.email}`);
    return toUserDTO(user);
  }

  /**
   * Change own password.
   * Also works as "set password" for Google-only accounts — in that case
   * currentPassword is omitted (no existing hash to compare against).
   */
  async changeMyPassword(userId, { currentPassword, newPassword }) {
    const user = await userRepository.findById(userId, '+password');
    if (!user) throw new NotFoundError('User not found.', 'USER_NOT_FOUND');

    if (user.password) {
      // Guard: must supply the current password
      if (!currentPassword) {
        throw new ValidationError('Current password is required.', 'CURRENT_PASSWORD_REQUIRED');
      }
      const match = await user.comparePassword(currentPassword);
      if (!match) {
        throw new ValidationError('Current password is incorrect.', 'WRONG_PASSWORD');
      }
    }
    // Else: Google-only account setting a password for the first time

    user.password = newPassword; // pre-save hook hashes it
    await userRepository.save(user);

    console.log(`[UserService] Password changed: ${user.email}`);
  }

  // ── Admin: read ───────────────────────────────────────────────────────────

  async listUsers({ role, isActive, page, limit, search } = {}) {
    const { users, pagination } = await userRepository.findAll({
      role,
      isActive,
      page,
      limit,
      search,
    });
    return { users: users.map(toUserDTO), pagination };
  }

  async getUserById(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found.', 'USER_NOT_FOUND');
    return toUserDTO(user);
  }

  // ── Admin: mutate ─────────────────────────────────────────────────────────

  /**
   * Admin can update name, email, role, avatar, isActive.
   * Guards prevent breaking the system (e.g. demoting the last admin).
   */
  async adminUpdateUser(targetUserId, updates, requestingUser) {
    const allowed   = ['name', 'email', 'role', 'avatar', 'isActive'];
    const sanitised = {};
    for (const key of allowed) {
      if (updates[key] !== undefined) sanitised[key] = updates[key];
    }

    // Guard: cannot demote yourself if you are the only admin
    if (sanitised.role && sanitised.role !== 'ADMIN' &&
        requestingUser._id.toString() === targetUserId) {
      const adminCount = await userRepository.countByRole('ADMIN', { isActive: true });
      if (adminCount <= 1) {
        throw new ValidationError(
          'Cannot change role: you are the only active admin.',
          'LAST_ADMIN'
        );
      }
    }

    // Guard: email uniqueness
    if (sanitised.email) {
      const taken = await userRepository.existsByEmail(sanitised.email, targetUserId);
      if (taken) {
        throw new ConflictError('Email is already in use by another account.', 'EMAIL_TAKEN');
      }
    }

    const user = await userRepository.updateById(targetUserId, sanitised);
    if (!user) throw new NotFoundError('User not found.', 'USER_NOT_FOUND');

    console.log(`[UserService] Admin updated ${user.email} — by ${requestingUser.email}`);
    return toUserDTO(user);
  }

  /** Soft delete: set isActive = false. */
  async deactivateUser(targetUserId, requestingUser) {
    await this._guardLastAdmin(targetUserId, requestingUser);

    const user = await userRepository.updateById(targetUserId, { isActive: false });
    if (!user) throw new NotFoundError('User not found.', 'USER_NOT_FOUND');

    console.log(`[UserService] Deactivated ${user.email} — by ${requestingUser.email}`);
    return toUserDTO(user);
  }

  async reactivateUser(targetUserId, requestingUser) {
    const user = await userRepository.updateById(targetUserId, { isActive: true });
    if (!user) throw new NotFoundError('User not found.', 'USER_NOT_FOUND');

    console.log(`[UserService] Reactivated ${user.email} — by ${requestingUser.email}`);
    return toUserDTO(user);
  }

  /** Hard delete — prefer deactivation for audit trails. */
  async deleteUser(targetUserId, requestingUser) {
    if (requestingUser._id.toString() === targetUserId) {
      throw new ValidationError('You cannot delete your own account.', 'SELF_DELETE');
    }

    const user = await userRepository.deleteById(targetUserId);
    if (!user) throw new NotFoundError('User not found.', 'USER_NOT_FOUND');

    console.log(`[UserService] Permanently deleted ${user.email} — by ${requestingUser.email}`);
  }

  // /** Admin adds a resident directly (bypasses public registration). */
  // async addResident({ name, email, password }, requestingUser) {
  //   const taken = await userRepository.existsByEmail(email);
  //   if (taken) {
  //     throw new ConflictError('An account with this email already exists.', 'EMAIL_TAKEN');
  //   }

  //   const user = await userRepository.create({ name, email, password, role: 'RESIDENT' });

  //   console.log(`[UserService] Resident added ${user.email} — by ${requestingUser.email}`);
  //   return toUserDTO(user);
  // }

  // ── Private guards ────────────────────────────────────────────────────────

  async _guardLastAdmin(targetUserId, requestingUser) {
    if (requestingUser._id.toString() !== targetUserId) return;

    const adminCount = await userRepository.countByRole('ADMIN', { isActive: true });
    if (adminCount <= 1) {
      throw new ValidationError(
        'Cannot deactivate: you are the only active admin.',
        'LAST_ADMIN'
      );
    }
  }
}

module.exports = new UserService();