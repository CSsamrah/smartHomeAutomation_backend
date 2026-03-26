/**
 * dashboardValidator.js  (Module 6 — Dashboard)
 *
 * Design Pattern: DECORATOR
 * Consistent with validators/index.js pattern.
 */

const { param } = require('express-validator');
const { validate } = require('./index');

const validateHomeIdParam = [
  param('homeId').isMongoId().withMessage('homeId must be a valid MongoDB ObjectId.'),
  validate,
];

module.exports = { validateHomeIdParam };