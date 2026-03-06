const AppError = require('../utils/AppError');

const handleCastError = (err) =>
  new AppError(`Invalid ${err.path}: ${err.value}.`, 400, 'INVALID_ID');

const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  return new AppError(`An account with that ${field} already exists.`, 409, 'DUPLICATE_FIELD');
};

const handleValidationError = (err) => {
  const messages = Object.values(err.errors).map((e) => e.message);
  return new AppError(messages.join(' | '), 400, 'VALIDATION_ERROR');
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again.', 401, 'TOKEN_INVALID');

const handleJWTExpiredError = () =>
  new AppError('Token expired. Please log in again.', 401, 'TOKEN_EXPIRED');

const sendDevError = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    code: err.code,
    stack: err.stack,
    error: err,
  });
};

const sendProdError = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      ...(err.code && { code: err.code }),
    });
  } else {
    console.error('ERROR 💥', err);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong. Please try again later.',
    });
  }
};

const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  console.error(`[${new Date().toISOString()}] ${err.statusCode} - ${err.message}`);

  if (process.env.NODE_ENV === 'development') {
    return sendDevError(err, res);
  }

  let error = Object.assign(Object.create(Object.getPrototypeOf(err)), err);

  if (err.name === 'CastError') error = handleCastError(error);
  if (err.code === 11000) error = handleDuplicateKeyError(error);
  if (err.name === 'ValidationError') error = handleValidationError(error);
  if (err.name === 'JsonWebTokenError') error = handleJWTError();
  if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

  sendProdError(error, res);
};

module.exports = globalErrorHandler;