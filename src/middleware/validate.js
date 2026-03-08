const { validationResult } = require('express-validator');
const { sendError } = require('../utils/responseHelper');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  const formatted = errors.array().map(({ path, msg }) => ({ field: path, message: msg }));
  return sendError(res, 422, 'Validation failed.', formatted);
};

module.exports = { validate };