/**
 * GoogleAuthService
 *
 * Design Patterns:
 *  • ADAPTER    — Wraps the google-auth-library (incompatible third-party
 *                 interface) and exposes it via the app's own interface
 *                 (verifyToken → returns a normalised GoogleProfile object).
 *                 If Google's SDK ever changes, only this class needs updating.
 *  • SINGLETON  — One OAuth2Client per process.
 *
 * GoogleProfile is a VALUE OBJECT: immutable, identity-less data carrier.
 */

const { OAuth2Client } = require('google-auth-library');
const { AuthenticationError } = require('../utils/AppError');

// ─── Value Object: GoogleProfile ──────────────────────────────────────────────

class GoogleProfile {
  constructor({ googleId, email, name, avatar }) {
    this.googleId = googleId;
    this.email    = email;
    this.name     = name;
    this.avatar   = avatar || null;
    Object.freeze(this);
  }
}

// ─── Adapter: GoogleAuthService ───────────────────────────────────────────────

class GoogleAuthService {
  constructor() {
    if (GoogleAuthService._instance) {
      return GoogleAuthService._instance;
    }

    const { googleClientId } = require('../config/auth');
    this._clientId = googleClientId;
    this._client   = new OAuth2Client(this._clientId);

    GoogleAuthService._instance = this;
  }

  /**
   * Verify a raw Google ID token and return a normalised GoogleProfile.
   * Adapts google-auth-library's ticket API to our own domain object.
   *
   * @param {string} idToken
   * @returns {Promise<GoogleProfile>}
   */
  async verifyToken(idToken) {
    try {
      const ticket  = await this._client.verifyIdToken({
        idToken,
        audience: this._clientId,
      });
      const payload = ticket.getPayload();

      if (!payload) {
        throw new AuthenticationError(
          'Google token payload is empty.',
          'GOOGLE_TOKEN_EMPTY'
        );
      }
      if (!payload.email_verified) {
        throw new AuthenticationError(
          'Google account email is not verified.',
          'GOOGLE_EMAIL_UNVERIFIED'
        );
      }

      return new GoogleProfile({
        googleId: payload.sub,
        email:    payload.email,
        name:     payload.name,
        avatar:   payload.picture || null,
      });
    } catch (err) {
      if (err.isOperational) throw err;
      throw new AuthenticationError(
        'Failed to verify Google token.',
        'GOOGLE_TOKEN_INVALID'
      );
    }
  }
}

module.exports = new GoogleAuthService();