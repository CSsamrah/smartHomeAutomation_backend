/**
 * Invitation — Mongoose Model
 *
 * Represents a pending invitation from an Admin to a Resident.
 * The invite token is the proof of invitation — only someone who
 * received the email can accept and join the Home.
 *
 * Design Patterns:
 *  • ACTIVE RECORD  — instance methods (isExpired, isAlreadyAccepted,
 *                     markAccepted) bundle state with behaviour
 *  • NULL OBJECT    — safe status default ('pending')
 *  • VALUE OBJECT   — InvitationStatus constants prevent magic strings
 */

const mongoose = require('mongoose');
const crypto   = require('crypto');

// ─── Value Object: Status constants ──────────────────────────────────────────
const InvitationStatus = Object.freeze({
  PENDING:  'pending',
  ACCEPTED: 'accepted',
  EXPIRED:  'expired',
  CANCELLED: 'cancelled',
});

// ─── Schema ───────────────────────────────────────────────────────────────────
const InvitationSchema = new mongoose.Schema(
  {
    home: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Home',
      required: [true, 'Invitation must belong to a home'],
    },
    invitedBy: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'Invitation must have an inviter'],
    },
    email: {
      type:      String,
      required:  [true, 'Invitation email is required'],
      lowercase: true,
      trim:      true,
      match:     [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    token: {
      type:     String,
      required: true,
      unique:   true,
    },
    status: {
      type:    String,
      enum:    Object.values(InvitationStatus),
      default: InvitationStatus.PENDING,
    },
    expiresAt: {
      type:     Date,
      required: true,
    },
    acceptedBy: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'User',
      default: null,
    },
    acceptedAt: {
      type:    Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_, ret) {
        delete ret.__v;
        delete ret.token; // never expose raw token in API responses
        return ret;
      },
    },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// InvitationSchema.index({ token: 1 });
InvitationSchema.index({ email: 1, home: 1 });
InvitationSchema.index({ home: 1, status: 1 });

// ─── Static Factory ───────────────────────────────────────────────────────────

/**
 * Generate a cryptographically secure invite token.
 * Static factory method — encapsulates token generation logic here.
 */
InvitationSchema.statics.generateToken = function () {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Calculate expiry date.
 * @param {number} hours  Default 48 hours
 */
InvitationSchema.statics.calculateExpiry = function (hours = 48) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
};

// ─── Active Record Instance Methods ──────────────────────────────────────────

/** True if this invitation has passed its expiry date. */
InvitationSchema.methods.isExpired = function () {
  return new Date() > this.expiresAt;
};

/** True if already accepted. */
InvitationSchema.methods.isAlreadyAccepted = function () {
  return this.status === InvitationStatus.ACCEPTED;
};

/** True if cancelled by admin. */
InvitationSchema.methods.isCancelled = function () {
  return this.status === InvitationStatus.CANCELLED;
};

/** True if this invitation is still usable. */
InvitationSchema.methods.isUsable = function () {
  return (
    this.status === InvitationStatus.PENDING &&
    !this.isExpired()
  );
};

/** Mark this invitation as accepted by a user. */
InvitationSchema.methods.markAccepted = function (userId) {
  this.status     = InvitationStatus.ACCEPTED;
  this.acceptedBy = userId;
  this.acceptedAt = new Date();
};

module.exports = mongoose.model('Invitation', InvitationSchema);
module.exports.InvitationStatus = InvitationStatus;