/**
 * deviceValidator.js
 *
 * Request body validators for Device routes.
 * Uses express-validator (consistent with your existing auth validators).
 */

const { body, param } = require('express-validator');
const { validate }    = require('./index'); // your existing field validator runner

const VALID_ACTIONS = ['ON', 'OFF', 'IDLE'];
const VALID_TYPES   = ['LIGHT', 'FAN', 'AC'];

const createDeviceRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Device name is required'),

  body('type')
    .isIn(VALID_TYPES).withMessage(`Device type must be one of: ${VALID_TYPES.join(', ')}`),

  body('room_id')
    .notEmpty().withMessage('room_id is required')
    .isMongoId().withMessage('room_id must be a valid MongoDB ObjectId'),

  body('power_rating_watt')
    .isInt({ min: 1 }).withMessage('power_rating_watt must be a positive integer'),
];

const controlDeviceRules = [
  param('id')
    .isMongoId().withMessage('Device id must be a valid MongoDB ObjectId'),

  body('action')
    .isIn(VALID_ACTIONS).withMessage(`action must be one of: ${VALID_ACTIONS.join(', ')}`),
];

const iotFeedbackRules = [
  body('device_id')
    .notEmpty().withMessage('device_id is required')
    .isMongoId().withMessage('device_id must be a valid MongoDB ObjectId'),

  body('status')
    .isIn(['ON', 'OFF', 'IDLE', 'FAULT']).withMessage('Invalid status value'),

  body('power')
    .optional()
    .isNumeric().withMessage('power must be a number'),
  body('energy_kwh')
  .optional()
  .isNumeric().withMessage('energy_kwh must be a number'),
];

module.exports = {
  validateCreateDevice:  [...createDeviceRules,  validate],
  validateControlDevice: [...controlDeviceRules, validate],
  validateIotFeedback:   [...iotFeedbackRules,   validate],
};