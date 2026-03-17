/**
 * BaseController
 *
 * Design Pattern: TEMPLATE METHOD
 *
 * Defines the invariant skeleton for handling an Express route:
 *   1. Extract input (implemented by subclass or inline)
 *   2. Call service method
 *   3. Send ApiResponse
 *   4. Catch → next(err)
 *
 * Subclasses (AuthController, UserController) call this.handle() to get
 * a properly wrapped async Express handler without repeating try/catch
 * in every method.
 *
 * Also provides this.ok(), this.created(), this.noContent() helpers so
 * response codes are not magic numbers scattered in subclasses.
 */

const ApiResponse = require('../utils/ApiResponse');

class BaseController {
  /**
   * Wraps an async handler so errors are forwarded to Express's next().
   * Eliminates try/catch boilerplate in every controller method.
   *
   * Usage:
   *   router.post('/login', this.handle(this.login.bind(this)));
   *
   * @param {Function} fn  async (req, res, next) → void
   * @returns {Function}   Express middleware
   */
  handle(fn) {
    return async (req, res, next) => {
      try {
        await fn(req, res, next);
      } catch (err) {
        next(err);
      }
    };
  }

  // ── Response helpers ──────────────────────────────────────────────────────

  ok(res, message, data = {}) {
    return ApiResponse.success(message, data).send(res, 200);
  }

  created(res, message, data = {}) {
    return ApiResponse.success(message, data).send(res, 201);
  }

  noContent(res) {
    return res.status(204).send();
  }

  error(res, statusCode, message, code = null) {
    return ApiResponse.error(message, code).send(res, statusCode);
  }
}

module.exports = BaseController;