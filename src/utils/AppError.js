/**
 * AppError Hierarchy
 *
 * Design Pattern: TEMPLATE METHOD (base class defines the error contract;
 *                  subclasses specialise status codes and codes)
 *
 * All domain errors extend AppError so the global error handler can
 * distinguish operational errors (known, safe to expose) from programming
 * errors (unknown, hide in production).
 *
 *   AppError  ──┬── ValidationError   (422)
 *               ├── AuthenticationError (401)
 *               ├── AuthorizationError  (403)
 *               ├── NotFoundError       (404)
 *               └── ConflictError       (409)
 */

// ─── Base ─────────────────────────────────────────────────────────────────────

class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.name         = this.constructor.name;
    this.statusCode   = statusCode;
    this.code         = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─── Subclasses ───────────────────────────────────────────────────────────────

class ValidationError extends AppError {
  constructor(message, code = 'VALIDATION_ERROR') {
    super(message, 422, code);
  }
}

class AuthenticationError extends AppError {
  constructor(message, code = 'UNAUTHENTICATED') {
    super(message, 401, code);
  }
}

class AuthorizationError extends AppError {
  constructor(message, code = 'FORBIDDEN') {
    super(message, 403, code);
  }
}

class NotFoundError extends AppError {
  constructor(message, code = 'NOT_FOUND') {
    super(message, 404, code);
  }
}

class ConflictError extends AppError {
  constructor(message, code = 'CONFLICT') {
    super(message, 409, code);
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
};