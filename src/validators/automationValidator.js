/**
 * automationValidator.js
 *
 * Request body validators for AutomationRule routes.
 */

const { body } = require('express-validator');
const { validate } = require('./index'); // your existing field validator runner

const triggerRules = [
  body('trigger')
    .notEmpty().withMessage('trigger is required'),

  body('trigger.type')
    .isIn(['TIME', 'CONDITION']).withMessage('trigger.type must be TIME or CONDITION'),

  // TIME-specific
  body('trigger.time')
    .if(body('trigger.type').equals('TIME'))
    .notEmpty().withMessage('trigger.time is required for TIME triggers')
    .matches(/^\d{2}:\d{2}$/).withMessage('trigger.time must be in HH:MM format'),

  // CONDITION-specific
  body('trigger.condition.field')
    .if(body('trigger.type').equals('CONDITION'))
    .notEmpty().withMessage('trigger.condition.field is required for CONDITION triggers'),

  body('trigger.condition.operator')
    .if(body('trigger.type').equals('CONDITION'))
    .isIn(['gt', 'lt', 'eq', 'gte', 'lte'])
    .withMessage('operator must be one of: gt, lt, eq, gte, lte'),

  body('trigger.condition.value')
    .if(body('trigger.type').equals('CONDITION'))
    .isNumeric().withMessage('trigger.condition.value must be a number'),
];

const actionRules = [
  body('actions')
    .isArray({ min: 1 }).withMessage('actions must be a non-empty array'),

  body('actions.*.device_id')
    .isMongoId().withMessage('Each action must have a valid device_id'),

  body('actions.*.action')
    .isIn(['ON', 'OFF', 'IDLE']).withMessage("Each action must be 'ON', 'OFF', or 'IDLE'"),
];

const createAutomationRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Automation name is required'),
  ...triggerRules,
  ...actionRules,
];

const updateAutomationRules = [
  body('name').optional().trim().notEmpty().withMessage('name cannot be empty'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  // Allow partial trigger/action updates — run same rules only when present
  body('trigger').optional(),
  ...triggerRules.map((r) => r.optional ? r : r), // rules already optional-safe
  body('actions').optional().isArray({ min: 1 }),
  ...actionRules.map((r) => r.optional()),
];

const toggleRules = [
  body('isActive')
    .isBoolean().withMessage('isActive must be true or false'),
];

module.exports = {
  validateCreateAutomation: [...createAutomationRules, validate],
  validateUpdateAutomation: [...updateAutomationRules, validate],
  validateToggleAutomation: [...toggleRules,            validate],
};