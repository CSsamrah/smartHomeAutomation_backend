
class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode >= 400 && statusCode < 500 ? 'fail' : 'error';
    this.code = code;
    this.isOperational = true; // marks expected, handled errors

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;