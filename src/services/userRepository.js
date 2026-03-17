/**
 * UserRepository
 *
 * Design Pattern: REPOSITORY
 *
 * Abstracts all database access for the User entity.
 * The rest of the application (services, controllers) never calls Mongoose
 * directly — they call this repository. Swapping MongoDB for PostgreSQL
 * only requires rewriting this one class.
 *
 * Also follows SINGLE RESPONSIBILITY: this class knows how to persist/retrieve
 * Users; it knows nothing about business rules.
 */

const User = require('../models/User');

class UserRepository {
  // ── Singleton ─────────────────────────────────────────────────────────────
  constructor() {
    if (UserRepository._instance) return UserRepository._instance;
    UserRepository._instance = this;
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  async findById(id, selectFields = '') {
    return User.findById(id).select(selectFields);
  }

  async findByEmail(email, selectFields = '') {
    return User.findOne({ email }).select(selectFields);
  }

  /**
   * Paginated list with optional filters.
   * @param {{ role?, isActive?, search?, page?, limit? }} options
   * @returns {{ users: User[], pagination }}
   */
  async findAll({ role, isActive, search, page = 1, limit = 20 } = {}) {
    const filter = {};

    if (role !== undefined)     filter.role     = role;
    if (isActive !== undefined) filter.isActive = isActive;
    if (search) {
      const re  = new RegExp(search, 'i');
      filter.$or = [{ name: re }, { email: re }];
    }

    const skip  = (page - 1) * limit;
    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return {
      users,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async countByRole(role, extraFilter = {}) {
    return User.countDocuments({ role, ...extraFilter });
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  async create(data) {
    return User.create(data);
  }

  async updateById(id, updates, options = { new: true, runValidators: true }) {
    return User.findByIdAndUpdate(id, updates, options);
  }

  async save(userDocument) {
    return userDocument.save();
  }

  async deleteById(id) {
    return User.findByIdAndDelete(id);
  }

  // ── Specialised queries ───────────────────────────────────────────────────

  /** Load a user with their reset-code fields (never selected by default). */
  async findByEmailWithResetFields(email) {
    return User.findOne({ email }).select(
      '+passwordResetCodeHash +passwordResetExpiresAt +passwordResetVerified'
    );
  }

  /** Load a user with the password hash for comparison. */
  async findByEmailWithPassword(email) {
    return User.findOne({ email }).select('+password +googleId');
  }

  async existsByEmail(email, excludeId = null) {
    const filter = { email };
    if (excludeId) filter._id = { $ne: excludeId };
    return !!(await User.findOne(filter).select('_id'));
  }
}

module.exports = new UserRepository();