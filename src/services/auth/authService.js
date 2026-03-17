/**
 * AuthService
 *
 * Design Patterns:
 *  • FACADE     — Single entry point that orchestrates:
 *                   TokenService, EmailPasswordStrategy, GoogleStrategy,
 *                   PasswordResetService, and User.create for registration.
 *                 Controllers import only AuthService; they are unaware of
 *                 the strategies or sub-services behind it.
 *
 *  • STRATEGY (via delegation) — login() and googleLogin() delegate to their
 *                 respective strategy objects, making it trivially easy to
 *                 add new auth methods.
 *
 *  • SINGLETON  — One AuthService per process.
 */

const User         = require('../../models/User');
const tokenService = require('../tokenService');
const passwordResetService = require('./passwordService');
const { EmailPasswordStrategy, GoogleStrategy, formatUser } = require('./authStrategy');
const { ConflictError } = require('../../utils/AppError');

class AuthService {
  constructor() {
    if (AuthService._instance) {
      return AuthService._instance;
    }

    // Strategies are injected as collaborators — easy to mock in tests
    this._emailPasswordStrategy = new EmailPasswordStrategy();
    this._googleStrategy        = new GoogleStrategy();

    AuthService._instance = this;
  }

  // ── Registration ──────────────────────────────────────────────────────────

  /**
   * Create a new account with email + password.
   * @param {{ name, email, password, role? }} dto
   */
  async register({ name, email, password, role }) {
    const existing = await User.findOne({ email });
    if (existing) {
      throw new ConflictError(
        'An account with this email already exists.',
        'EMAIL_TAKEN'
      );
    }

    const user   = await User.create({ name, email, password, role });
    const tokens = tokenService.createTokenPair({ id: user._id, role: user.role });

    console.log(`[AuthService] Registered: ${user.email} (${user.role})`);
    return { user: formatUser(user), tokens };
  }

  // ── Login (delegates to strategy) ────────────────────────────────────────

  /** Email + password login */
  async login(credentials) {
    return this._emailPasswordStrategy.authenticate(credentials);
  }

  /** Google OAuth login / sign-up */
  async googleLogin({ idToken, role }) {
    return this._googleStrategy.authenticate({ idToken, role });
  }

  // ── Token refresh ─────────────────────────────────────────────────────────

  /**
   * Issue a new access token from a valid refresh token.
   * @param {string} refreshToken
   */
  async refreshToken(refreshToken) {
    const decoded = tokenService.verifyRefreshToken(refreshToken);
    const user    = await User.findById(decoded.sub);

    if (!user || !user.isActive) {
      const { AuthenticationError } = require('../../utils/AppError');
      throw new AuthenticationError('Invalid refresh token.', 'INVALID_REFRESH_TOKEN');
    }

    const accessToken = tokenService.generateAccessToken({
      id:   user._id,
      role: user.role,
    });

    return { accessToken, expiresIn: process.env.JWT_EXPIRES_IN || '15m' };
  }

  // ── Password reset (delegates to PasswordResetService) ───────────────────

  async forgotPassword(email) {
    return passwordResetService.requestReset(email);
  }

  async verifyResetCode(email, code) {
    return passwordResetService.verifyCode(email, code);
  }

  async resetPassword(email, newPassword) {
    return passwordResetService.resetPassword(email, newPassword);
  }
}

module.exports = new AuthService();