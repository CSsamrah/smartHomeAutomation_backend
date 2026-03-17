/**
 * AuthMiddleware
 *
 * Design Patterns:
 *  • CHAIN OF RESPONSIBILITY — protect() and restrictTo() are links in the
 *    middleware chain. Each handler either passes control to the next link
 *    (next()) or terminates the chain with an error response. They compose:
 *
 *      router.get('/rooms', protect, restrictTo('ADMIN'), handler)
 *
 *  • NULL OBJECT — restrictTo() returns a no-op middleware when called with
 *    no roles, so callers don't need null-checks.
 */

const tokenService = require('../services/tokenService');
const userRepository = require('../services/userRepository');
const ApiResponse  = require('../utils/ApiResponse');

class AuthMiddleware {
  /**
   * Link 1 — Authentication.
   * Validates the Bearer token, loads the user, and attaches it to req.user.
   * Passes to the next link only if authentication succeeds.
   */
  get protect() {
    return async (req, res, next) => {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return ApiResponse
          .error('No access token provided.', 'NO_TOKEN')
          .send(res, 401);
      }

      try {
        const token   = authHeader.split(' ')[1];
        const decoded = tokenService.verifyAccessToken(token);

        const user = await userRepository.findById(decoded.sub);

        if (!user) {
          return ApiResponse
            .error('The user belonging to this token no longer exists.', 'USER_NOT_FOUND')
            .send(res, 401);
        }

        if (!user.isActive) {
          return ApiResponse
            .error('Your account has been deactivated.', 'ACCOUNT_INACTIVE')
            .send(res, 403);
        }

        req.user = user;
        res.setHeader('X-User-Role', user.role);
        res.setHeader('X-User-Id',   user._id.toString());

        next();
      } catch (err) {
        if (err.isOperational) {
          return ApiResponse.error(err.message, err.code).send(res, err.statusCode);
        }
        console.error('[AuthMiddleware] protect error:', err);
        return ApiResponse.error('Authentication failed.').send(res, 500);
      }
    };
  }

  /**
   * Link 2 — Authorisation.
   * Must come after protect (relies on req.user).
   * Returns a middleware that rejects requests whose user role is not in
   * the allowed list.
   *
   * @param {...string} roles  e.g. restrictTo('ADMIN')
   * @returns {Function}       Express middleware
   */
  restrictTo(...roles) {
    // Null Object: no roles means no restriction
    if (roles.length === 0) return (req, res, next) => next();

    return (req, res, next) => {
      if (!req.user) {
        return ApiResponse
          .error('Authentication required.', 'NOT_AUTHENTICATED')
          .send(res, 401);
      }

      if (!roles.includes(req.user.role)) {
        return ApiResponse
          .error(`Access denied. Required role(s): ${roles.join(', ')}.`, 'FORBIDDEN')
          .send(res, 403);
      }

      next();
    };
  }
}

// Export a single instance so protect / restrictTo are reusable singletons
const authMiddleware = new AuthMiddleware();
module.exports = authMiddleware;