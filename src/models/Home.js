/**
 * Home — Mongoose Model
 *
 * The central entity of the system. Every Room, Device, and Resident
 * belongs to exactly one Home. An Admin owns the Home.
 *
 * Design Patterns:
 *  • ACTIVE RECORD  — instance methods (isOwnedBy, hasResident, addResident,
 *                     removeResident) bundle data with behaviour
 *  • TEMPLATE METHOD — pre-save hook validates admin role before saving
 *  • NULL OBJECT    — safe defaults so callers never need null-checks
 */

const mongoose = require('mongoose');

const HomeSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────────────────
    name: {
      type:      String,
      required:  [true, 'Home name is required'],
      trim:      true,
      maxlength: [100, 'Home name cannot exceed 100 characters'],
    },
    address: {
      type:  String,
      trim:  true,
      default: null,
    },

    // ── Ownership ─────────────────────────────────────────────────────────
    admin: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'Home must have an admin (owner)'],
    },

    // ── Residents ─────────────────────────────────────────────────────────
    residents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref:  'User',
      },
    ],

    // ── Status ────────────────────────────────────────────────────────────
    isActive: {
      type:    Boolean,
      default: true,   // Null Object default
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
HomeSchema.index({ admin: 1 });
HomeSchema.index({ residents: 1 });

// ─── Virtuals ─────────────────────────────────────────────────────────────────

/** Total number of rooms in this home (populated on demand) */
HomeSchema.virtual('roomCount', {
  ref:        'Room',
  localField: '_id',
  foreignField: 'home',
  count:      true,
});

// ─── Template Method Hook ─────────────────────────────────────────────────────
// Invariant: a Home's admin field must always point to an ADMIN-role user.
HomeSchema.pre('save', async function () {
  if (!this.isModified('admin')) return;

  const User  = require('./User');
  const admin = await User.findById(this.admin);

  if (!admin || admin.role !== 'ADMIN') {
    throw new Error('Home admin must be a user with ADMIN role.');
  }
});

// ─── Active Record Instance Methods ──────────────────────────────────────────

/** True if the given userId is this home's admin. */
HomeSchema.methods.isOwnedBy = function (userId) {
  return this.admin.toString() === userId.toString();
};

/** True if the given userId is already a resident of this home. */
HomeSchema.methods.hasResident = function (userId) {
  return this.residents.some(
    (r) => r.toString() === userId.toString()
  );
};

/** Add a resident — idempotent (won't duplicate). */
HomeSchema.methods.addResident = function (userId) {
  if (!this.hasResident(userId)) {
    this.residents.push(userId);
  }
};

/** Remove a resident. */
HomeSchema.methods.removeResident = function (userId) {
  this.residents = this.residents.filter(
    (r) => r.toString() !== userId.toString()
  );
};

/** Safe public shape for API responses. */
HomeSchema.methods.toPublicJson = function () {
  return {
    id:           this._id,
    name:         this.name,
    address:      this.address,
    admin:        this.admin,
    residents:    this.residents,
    isActive:     this.isActive,
    createdAt:    this.createdAt,
    updatedAt:    this.updatedAt,
  };
};

module.exports = mongoose.model('Home', HomeSchema);