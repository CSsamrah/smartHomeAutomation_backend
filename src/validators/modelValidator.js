/**
 * modelValidator.js  (Module 8)
 *
 * Design Pattern: DECORATOR
 * Consistent with deviceValidator.js and validators/index.js patterns.
 */

const { query, param } = require('express-validator');
const { validate }     = require('./index');

const VALID_STATES = ['ON', 'OFF', 'IDLE', 'FAULT'];

const homeIdParam   = param('homeId').isMongoId().withMessage('homeId must be a valid MongoDB ObjectId.');
const deviceIdParam = param('deviceId').isMongoId().withMessage('deviceId must be a valid MongoDB ObjectId.');

const validateHomeAnalytics = [homeIdParam, validate];

const validateMarkovMatrix = [deviceIdParam, validate];

const validatePredictNextState = [
  deviceIdParam,
  query('currentState')
    .notEmpty().withMessage('currentState is required.')
    .isIn(VALID_STATES)
    .withMessage(`currentState must be one of: ${VALID_STATES.join(', ')}.`),
  validate,
];

module.exports = {
  validateHomeAnalytics,
  validateMarkovMatrix,
  validatePredictNextState,
};