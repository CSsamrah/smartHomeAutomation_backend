/**
 * Authentication Strategies
 *
 * Design Pattern: STRATEGY
 *
 * Context:    AuthService selects the correct strategy at runtime.
 * Interface:  AuthStrategy.authenticate(credentials) → AuthResult
 *
 * Concrete strategies:
 *   EmailPasswordStrategy  — classic email + password login
 *   GoogleStrategy         — Google OAuth ID-token login / sign-up
 *                            Accepts an optional `role` field so an admin
 *                            can register/login via Google with ADMIN role.
 *
 * Adding a new auth method (e.g. Apple, GitHub) means adding one new class
 * here — nothing else needs to change.
 *
 * AuthResult is a VALUE OBJECT carrying the outcome of any strategy.
 */

const User              = require('../../models/User');
const tokenService      = require('../tokenService');
const googleAuthService = require('../GoogleAuthService');
const emailService      = require('../emailService');

const {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
} = require('../../utils/AppError');

// ─── Value Object: AuthResult ─────────────────────────────────────────────────

class AuthResult {
  constructor({ user, tokens, isNewUser = false }) {
    this.user      = user;
    this.tokens    = tokens;
    this.isNewUser = isNewUser;
    Object.freeze(this);
  }
}

// ─── Shared helper ────────────────────────────────────────────────────────────

/**
 * Returns the canonical safe user shape for API responses.
 * Kept here because all strategies return it — no duplication.
 */
const formatUser = (user) => ({
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

// ─── Abstract Strategy ────────────────────────────────────────────────────────

class AuthStrategy {
  /**
   * Authenticate using this strategy's mechanism.
   * @param {object} credentials  Strategy-specific payload
   * @returns {Promise<AuthResult>}
   */
  // eslint-disable-next-line no-unused-vars
  async authenticate(credentials) {
    throw new Error(`${this.constructor.name}.authenticate() must be implemented.`);
  }
}

// ─── Concrete Strategy: Email + Password ──────────────────────────────────────

class EmailPasswordStrategy extends AuthStrategy {
  async authenticate({ email, password }) {
    const user = await User.findOne({ email }).select('+password +googleId');

    if (!user) {
      throw new AuthenticationError('Invalid email or password.', 'INVALID_CREDENTIALS');
    }

    // Account exists but was created via Google only (no password hash stored)
    if (!user.password) {
      throw new ValidationError(
        'This account was created with Google. Sign in with Google or use Forgot Password to set a password.',
        'NO_PASSWORD_SET'
      );
    }

    const match = await user.comparePassword(password);
    if (!match) {
      throw new AuthenticationError('Invalid email or password.', 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new AuthorizationError(
        'Your account has been deactivated. Contact support.',
        'ACCOUNT_INACTIVE'
      );
    }

    user.lastLogin = new Date();
    await user.save();

    const tokens = tokenService.createTokenPair({ id: user._id, role: user.role });
    console.log(`[EmailPasswordStrategy] Login: ${user.email}`);

    return new AuthResult({ user: formatUser(user), tokens });
  }
}

// ─── Concrete Strategy: Google OAuth ─────────────────────────────────────────

class GoogleStrategy extends AuthStrategy {
  /**
   * @param {{ idToken: string, role?: 'ADMIN'|'RESIDENT' }} credentials
   *
   * role is ONLY used when creating a brand-new account.
   * If the account already exists, the stored role is always kept —
   * you cannot escalate privileges by passing role on a returning login.
   */
  async authenticate({ idToken, role }) {
    const profile = await googleAuthService.verifyToken(idToken);
    const { googleId, email, name, avatar } = profile;

    // Validate and resolve the requested role — default to RESIDENT
    const ALLOWED_ROLES = ['ADMIN', 'RESIDENT'];
    const requestedRole = role && ALLOWED_ROLES.includes(role) ? role : 'RESIDENT';

    let isNewUser = false;
    let user = await User.findOne({ email }).select('+googleId');

    if (user) {
      // ── Returning user ──────────────────────────────────────────────────────
      if (!user.isActive) {
        throw new AuthorizationError(
          'Your account has been deactivated. Contact support.',
          'ACCOUNT_INACTIVE'
        );
      }

      // Link Google to an existing manual account on first Google sign-in
      if (!user.googleId) {
        user.googleId = googleId;
        if (avatar) user.avatar = avatar;
        await user.save();
        console.log(`[GoogleStrategy] Google linked to existing account: ${email}`);
      }

      // NOTE: role is intentionally NOT updated for existing users.
      // An admin cannot be demoted by someone passing role:'RESIDENT' here.

    } else {
      // ── Brand-new user ──────────────────────────────────────────────────────
      user = await User.create({
        name,
        email,
        googleId,
        avatar,
        role: requestedRole,
      });
      isNewUser = true;
      console.log(`[GoogleStrategy] New Google user created: ${email} (${requestedRole})`);

      emailService.sendWelcomeEmail(email, name).catch((err) =>
        console.error('[GoogleStrategy] Welcome email failed:', err.message)
      );
    }

    user.lastLogin = new Date();
    await user.save();

    const tokens = tokenService.createTokenPair({ id: user._id, role: user.role });
    console.log(`[GoogleStrategy] Google login: ${email} (${user.role})`);

    return new AuthResult({ user: formatUser(user), tokens, isNewUser });
  }
}

module.exports = {
  AuthStrategy,
  EmailPasswordStrategy,
  GoogleStrategy,
  AuthResult,
  formatUser,
};