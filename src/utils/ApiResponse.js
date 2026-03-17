/**
 * ApiResponse
 *
 * Design Pattern: VALUE OBJECT
 * An immutable, self-describing HTTP response envelope.
 * Controllers call ApiResponse.success() / ApiResponse.error() and send the
 * result — no ad-hoc JSON objects scattered across the codebase.
 *
 * Also acts as a simple BUILDER: the static factory methods construct the
 * object and the instance knows how to send itself via res.
 */

class ApiResponse {
  /**
   * @param {boolean} success
   * @param {string}  message
   * @param {object}  [data]
   * @param {string}  [code]   Error code (errors only)
   */
  constructor(success, message, data = null, code = null) {
    this.success = success;
    this.message = message;
    if (data)  this.data  = data;
    if (code)  this.code  = code;
    Object.freeze(this); // Value Objects are immutable
  }

  // ── Static factories (Builder variants) ────────────────────────────────────

  static success(message, data = {}) {
    return new ApiResponse(true, message, data);
  }

  static error(message, code = null) {
    return new ApiResponse(false, message, null, code);
  }

  // ── Transport ───────────────────────────────────────────────────────────────

  /**
   * Send this response through an Express `res` object.
   * @param {object} res        Express response
   * @param {number} statusCode HTTP status code
   */
  send(res, statusCode) {
    return res.status(statusCode).json(this);
  }
}

module.exports = ApiResponse;