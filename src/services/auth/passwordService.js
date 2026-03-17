/**
 * PasswordResetService
 *
 * Design Patterns:
 *  • SERVICE LAYER  — Encapsulates the entire 3-step password-reset flow in
 *                     one cohesive class. Controllers call this; they don't
 *                     know anything about OTPs or bcrypt.
 *  • COMMAND (light) — Each public method represents a discrete command in the
 *                     reset workflow: requestReset → verifyCode → resetPassword.
 *                     Each command is self-contained and validates its own
 *                     preconditions.
 */

const bcrypt       = require('bcryptjs');
const User         = require('../../models/User');
const emailService = require('../emailService');
const { formatUser } = require('./authStrategy');
const tokenService   = require('../tokenService');

const {
  ValidationError,
  NotFoundError,
  AuthorizationError,
} = require('../../utils/AppError');

const OTP_EXPIRES_MINUTES = 15;
const OTP_SALT_ROUNDS     = 10;

class PasswordResetService {

  // ── Step 1 ─────────────────────────────────────────────────────────────────

  /**
   * Generate and email a 6-digit OTP.
   * Silently succeeds for unknown emails to prevent enumeration.
   * @param {string} email
   */
  async requestReset(email) {
    const user = await User.findOne({ email });

    if (!user || !user.isActive) {
      console.log(`[PasswordResetService] Reset requested for unknown/inactive: ${email}`);
      return; // Silent success — prevent email enumeration
    }

    const code      = this._generateCode();
    const hash      = await bcrypt.hash(code, OTP_SALT_ROUNDS);
    const expiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000);

    await User.findByIdAndUpdate(user._id, {
      passwordResetCodeHash:  hash,
      passwordResetExpiresAt: expiresAt,
      passwordResetVerified:  false,
    });

    await emailService.sendPasswordResetEmail(
      user.email,
      user.name,
      code,
      OTP_EXPIRES_MINUTES
    );

    console.log(`[PasswordResetService] OTP sent to: ${email}`);
  }

  // ── Step 2 ─────────────────────────────────────────────────────────────────

  /**
   * Validate the OTP without changing the password.
   * Sets passwordResetVerified = true so step 3 can proceed.
   * @param {string} email
   * @param {string} code   6-digit OTP from email
   */
  async verifyCode(email, code) {
    const user = await User.findOne({ email }).select(
      '+passwordResetCodeHash +passwordResetExpiresAt +passwordResetVerified'
    );

    this._assertResetRequested(user);
    this._assertCodeNotExpired(user);

    const isValid = await bcrypt.compare(code, user.passwordResetCodeHash);
    if (!isValid) {
      throw new ValidationError('Invalid reset code.', 'RESET_CODE_INVALID');
    }

    await User.findByIdAndUpdate(user._id, { passwordResetVerified: true });

    console.log(`[PasswordResetService] Code verified for: ${email}`);
  }

  // ── Step 3 ─────────────────────────────────────────────────────────────────

  /**
   * Replace the password — only callable after verifyCode succeeds.
   * Returns fresh tokens so the user is immediately logged in.
   * @param {string} email
   * @param {string} newPassword
   * @returns {{ user, tokens }}
   */
  async resetPassword(email, newPassword) {
    const user = await User.findOne({ email }).select(
      '+passwordResetVerified +passwordResetExpiresAt'
    );

    if (!user) {
      throw new NotFoundError('No account found with this email.', 'USER_NOT_FOUND');
    }

    if (!user.passwordResetVerified) {
      throw new ValidationError(
        'Reset code has not been verified. Please verify your code first.',
        'RESET_NOT_VERIFIED'
      );
    }

    this._assertCodeNotExpired(user);

    // Mongoose pre-save hook handles hashing
    user.password               = newPassword;
    user.passwordResetCodeHash  = null;
    user.passwordResetExpiresAt = null;
    user.passwordResetVerified  = false;
    await user.save();

    console.log(`[PasswordResetService] Password reset for: ${email}`);

    const tokens = tokenService.createTokenPair({ id: user._id, role: user.role });
    return { user: formatUser(user), tokens };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /** Generate a random 6-digit numeric OTP. */
  _generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  _assertResetRequested(user) {
    if (!user || !user.passwordResetCodeHash || !user.passwordResetExpiresAt) {
      throw new ValidationError(
        'No password reset was requested for this email.',
        'NO_RESET_REQUESTED'
      );
    }
  }

  _assertCodeNotExpired(user) {
    if (new Date() > user.passwordResetExpiresAt) {
      // Clean up
      User.findByIdAndUpdate(user._id, {
        passwordResetCodeHash:  null,
        passwordResetExpiresAt: null,
        passwordResetVerified:  false,
      }).catch(() => {});

      throw new ValidationError(
        'Reset code has expired. Please request a new one.',
        'RESET_CODE_EXPIRED'
      );
    }
  }
}

module.exports = new PasswordResetService();