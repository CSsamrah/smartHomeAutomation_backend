/**
 * energyValidator.js  (Module 7)
 *
 * Design Pattern: DECORATOR
 * Consistent with deviceValidator.js and validators/index.js patterns.
 */

const { query, param } = require('express-validator');
const { validate }     = require('./index');

// ── Reusable rule blocks ──────────────────────────────────────────────────────

const dateQueryRule = (field) =>
  query(field)
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage(`${field} must be in YYYY-MM-DD format.`);

const dateRangeRules = [dateQueryRule('startDate'), dateQueryRule('endDate')];

const homeIdParam   = param('homeId').isMongoId().withMessage('homeId must be a valid MongoDB ObjectId.');
const deviceIdParam = param('deviceId').isMongoId().withMessage('deviceId must be a valid MongoDB ObjectId.');
const roomIdParam   = param('roomId').isMongoId().withMessage('roomId must be a valid MongoDB ObjectId.');

// ── Exported validator arrays ─────────────────────────────────────────────────

const validateHomeDailySummary = [
  homeIdParam,
  dateQueryRule('date'),
  validate,
];

const validateHomeWeeklySummary = [
  homeIdParam,
  dateQueryRule('weekStart'),
  validate,
];

const validateHomeLive = [
  homeIdParam,
  validate,
];

const validateDeviceEnergy = [
  deviceIdParam,
  ...dateRangeRules,
  validate,
];

const validateRoomEnergy = [
  roomIdParam,
  ...dateRangeRules,
  validate,
];

module.exports = {
  validateHomeDailySummary,
  validateHomeWeeklySummary,
  validateHomeLive,
  validateDeviceEnergy,
  validateRoomEnergy,
};