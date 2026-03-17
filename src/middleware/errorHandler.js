/**
 * ErrorHandler
 *
 * Design Pattern: CHAIN OF RESPONSIBILITY (terminal link)
 *
 * This is the last middleware in the Express chain. It receives any error
 * forwarded via next(err) and maps it to a clean JSON response.
 *
 * The mapping table follows the OPEN/CLOSED PRINCIPLE: adding support for
 * a new error type means adding a new _handle* method and registering it
 * in the handlers array — the dispatch loop never changes.
 */

const ApiResponse = require('../utils/ApiResponse');
const { AppError } = require('../utils/AppError');

class ErrorHandler {
  constructor() {
    /**
     * Ordered list of handler methods.
     * Each returns an ApiResponse + statusCode pair, or null to pass to the next.
     */
    this._handlers = [
      this._handleMongooseCast,
      this._handleMongoDuplicateKey,
      this._handleMongooseValidation,
      this._handleJwtError,
      this._handleOperational,
    ];
  }

  /**
   * Returns an Express error-handling middleware (4-argument signature).
   */
  get middleware() {
    return (err, req, res, next) => { // eslint-disable-line no-unused-vars
      for (const handler of this._handlers) {
        const result = handler(err);
        if (result) {
          return ApiResponse.error(result.message, result.code).send(res, result.status);
        }
      }
      // Fallthrough: unknown / programming error
      console.error('[ErrorHandler] Unhandled error:', err);
      const message = process.env.NODE_ENV === 'production'
        ? 'Something went wrong. Please try again later.'
        : err.message;
      return ApiResponse.error(message, 'INTERNAL_ERROR').send(res, 500);
    };
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  _handleMongooseCast(err) {
    if (err.name !== 'CastError') return null;
    return { status: 400, message: `Invalid ${err.path}: ${err.value}.`, code: 'INVALID_ID' };
  }

  _handleMongoDuplicateKey(err) {
    if (err.code !== 11000) return null;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return { status: 409, message: `${field} is already in use.`, code: 'DUPLICATE_KEY' };
  }

  _handleMongooseValidation(err) {
    if (err.name !== 'ValidationError') return null;
    const message = Object.values(err.errors).map((e) => e.message)[0];
    return { status: 422, message, code: 'VALIDATION_ERROR' };
  }

  _handleJwtError(err) {
    if (err.name === 'JsonWebTokenError') {
      return { status: 401, message: 'Invalid token.', code: 'TOKEN_INVALID' };
    }
    if (err.name === 'TokenExpiredError') {
      return { status: 401, message: 'Token has expired.', code: 'TOKEN_EXPIRED' };
    }
    return null;
  }

  _handleOperational(err) {
    if (!err.isOperational) return null;
    return { status: err.statusCode, message: err.message, code: err.code };
  }
}

module.exports = new ErrorHandler();