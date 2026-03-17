/**
 * User — Mongoose Model
 *
 * Design Patterns applied directly in the model:
 *
 *  • ACTIVE RECORD   — The model bundles data (schema fields) together with
 *                      behaviour that acts on that data (comparePassword,
 *                      hasPasswordSet, toPublicJson). Callers treat a User
 *                      document like an object with methods, not a raw record.
 *
 *  • TEMPLATE METHOD — The pre('save') hook is the invariant algorithm step:
 *                      "before saving, hash the password if it changed."
 *                      The actual hashing logic is the variant part, supplied
 *                      by bcrypt.
 *
 *  • NULL OBJECT     — Safe defaults (isActive: true, avatar: null,
 *                      lastLogin: null) ensure callers never need null-checks.
 */

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const { bcryptSaltRounds } = require('../config/auth');

const UserSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────────────────
    name: {
      type:      String,
      required:  [true, 'Name is required'],
      trim:      true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type:      String,
      required:  [true, 'Email is required'],
      unique:    true,
      lowercase: true,
      trim:      true,
      match:     [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    avatar: {
      type:    String,
      default: null,   // Null Object default
    },

    // ── Auth ──────────────────────────────────────────────────────────────
    password: {
      type:      String,
      required:  function () { return !this.googleId; }, // required only for manual accounts
      minlength: [6, 'Password must be at least 6 characters'],
      select:    false,
    },
    googleId: {
      type:   String,
      select: false,
    },

    // ── Role & Status ─────────────────────────────────────────────────────
    role: {
      type:    String,
      enum:    ['ADMIN', 'RESIDENT'],
      default: 'RESIDENT',
    },
    isActive: {
      type:    Boolean,
      default: true,   // Null Object default — never undefined
    },
    lastLogin: {
      type:    Date,
      default: null,   // Null Object default
    },

    // ── Password Reset (OTP) ──────────────────────────────────────────────
    passwordResetCodeHash:  { type: String,  select: false, default: null },
    passwordResetExpiresAt: { type: Date,    select: false, default: null },
    passwordResetVerified:  { type: Boolean, select: false, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_, ret) {
        delete ret.__v;
        // Strip all internal fields from serialised output
        delete ret.googleId;
        delete ret.passwordResetCodeHash;
        delete ret.passwordResetExpiresAt;
        delete ret.passwordResetVerified;
        return ret;
      },
    },
  }
);

// // ─── Indexes ──────────────────────────────────────────────────────────────────
// UserSchema.index({ email: 1 });

// ─── Template Method Hook ─────────────────────────────────────────────────────
// Invariant step: "if the password changed, hash it before saving."
UserSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, bcryptSaltRounds);
});

// ─── Active Record Instance Methods ──────────────────────────────────────────

/** Compare a plaintext candidate with the stored bcrypt hash. */
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/** True when the account has a password (not Google-only). */
UserSchema.methods.hasPasswordSet = function () {
  return Boolean(this.password);
};

/**
 * Safe public representation.
 * Deliberately excludes: password, googleId, reset fields.
 */
UserSchema.methods.toPublicJson = function () {
  return {
    id:        this._id,
    name:      this.name,
    email:     this.email,
    role:      this.role,
    avatar:    this.avatar,
    isActive:  this.isActive,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('User', UserSchema);