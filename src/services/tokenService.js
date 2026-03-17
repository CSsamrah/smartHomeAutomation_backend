/**
 * TokenService
 *
 * Design Patterns:
 *  • SINGLETON  — one instance shared across the entire app (prevents
 *                 accidentally instantiating with different secrets)
 *  • FACADE     — hides the jwt library details behind a clean class interface
 */

const jwt = require('jsonwebtoken');
const { AuthenticationError } = require('../utils/AppError');

class TokenService {
  // ── Singleton plumbing ──────────────────────────────────────────────────────
  constructor() {
    if (TokenService._instance) {
      return TokenService._instance;
    }

    this._accessSecret   = process.env.JWT_SECRET;
    this._refreshSecret  = process.env.JWT_REFRESH_SECRET;
    this._accessExpiry   = process.env.JWT_EXPIRES_IN         || '15m';
    this._refreshExpiry  = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

    TokenService._instance = this;
    Object.freeze(this); // Singleton should not be mutated after creation
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Generate a short-lived access token.
   * @param {{ id: string, role: string }} payload
   * @returns {string}
   */
  generateAccessToken({ id, role }) {
    return jwt.sign({ sub: id, role }, this._accessSecret, {
      expiresIn: this._accessExpiry,
    });
  }

  /**
   * Generate a long-lived refresh token.
   * @param {{ id: string }} payload
   * @returns {string}
   */
  generateRefreshToken({ id }) {
    return jwt.sign({ sub: id }, this._refreshSecret, {
      expiresIn: this._refreshExpiry,
    });
  }

  /**
   * Convenience: generate both tokens at once.
   * @param {{ id: string, role: string }} payload
   * @returns {{ accessToken, refreshToken, expiresIn }}
   */
  createTokenPair(payload) {
    return {
      accessToken:  this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
      expiresIn:    this._accessExpiry,
    };
  }

  /**
   * Verify an access token — throws AuthenticationError on failure.
   * @param {string} token
   * @returns {object} decoded payload
   */
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, this._accessSecret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new AuthenticationError('Access token has expired.', 'TOKEN_EXPIRED');
      }
      throw new AuthenticationError('Invalid access token.', 'TOKEN_INVALID');
    }
  }

  /**
   * Verify a refresh token — throws AuthenticationError on failure.
   * @param {string} token
   * @returns {object} decoded payload
   */
  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, this._refreshSecret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new AuthenticationError(
          'Refresh token has expired. Please log in again.',
          'REFRESH_TOKEN_EXPIRED'
        );
      }
      throw new AuthenticationError('Invalid refresh token.', 'REFRESH_TOKEN_INVALID');
    }
  }
}

// Export the singleton instance directly
module.exports = new TokenService();