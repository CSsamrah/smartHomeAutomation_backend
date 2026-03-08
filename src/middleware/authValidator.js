const { body } = require('express-validator');

const registerValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required.')
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters.'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please provide a valid email.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters.')
    .matches(/\d/).withMessage('Password must contain at least one number.'),

  body('role')
    .optional()
    .isIn(['ADMIN', 'RESIDENT']).withMessage('Role must be ADMIN or RESIDENT.'),
];

const loginValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please provide a valid email.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.'),
];

const googleLoginValidator = [
  body('idToken')
    .trim()
    .notEmpty().withMessage('Google ID token is required.'),
];

module.exports = { registerValidator, loginValidator, googleLoginValidator };