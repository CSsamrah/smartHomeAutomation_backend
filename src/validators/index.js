/**
 * validators/index.js
 *
 * Design Pattern: DECORATOR
 *
 * Each exported array is a set of decorators that enrich an Express route
 * with input validation behaviour. Routes are unaware of validation logic —
 * it is "decorated on" at the routing layer.
 *
 * The shared `handleValidation` terminator is the invariant step; the
 * rule arrays before it are the variant decoration.
 */

const { body, param, query, validationResult } = require('express-validator');
 
// ─── Shared terminator ────────────────────────────────────────────────────────
 
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const { ApiResponse } = require('../utils/ApiResponse');
    // Use the first message to keep responses concise
    const message = errors.array()[0].msg;
    return ApiResponse
      ? ApiResponse.error(message, 'VALIDATION_ERROR').send(res, 422)
      : res.status(422).json({ success: false, message, code: 'VALIDATION_ERROR' });
  }
  next();
};
 
// Lazy-load to avoid circular dependency at startup
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: errors.array()[0].msg,
      code:    'VALIDATION_ERROR',
    });
  }
  next();
};
 
// ─── Auth ─────────────────────────────────────────────────────────────────────
 
const validateRegister = [
  body('name').trim().notEmpty().withMessage('Name is required.')
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters.'),
  body('email').trim().notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please provide a valid email.'),
  body('password').notEmpty().withMessage('Password is required.')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  body('role').optional().isIn(['ADMIN', 'RESIDENT'])
    .withMessage('Role must be ADMIN or RESIDENT.'),
  validate,
];
 
const validateLogin = [
  body('email').trim().notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Invalid email.'),
  body('password').notEmpty().withMessage('Password is required.'),
  validate,
];
 
const validateGoogleLogin = [
  body('idToken').notEmpty().withMessage('Google ID token is required.'),
  body('role').optional().isIn(['ADMIN', 'RESIDENT'])
    .withMessage('Role must be ADMIN or RESIDENT.'),
  validate,
];
 
const validateRefreshToken = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required.'),
  validate,
];
 
const validateForgotPassword = [
  body('email').trim().notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Invalid email.'),
  validate,
];
 
const validateVerifyResetCode = [
  body('email').trim().notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Invalid email.'),
  body('code').trim().notEmpty().withMessage('Reset code is required.')
    .isLength({ min: 6, max: 6 }).withMessage('Code must be exactly 6 digits.')
    .isNumeric().withMessage('Code must be numeric.'),
  validate,
];
 
const validateResetPassword = [
  body('email').trim().notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Invalid email.'),
  body('newPassword').notEmpty().withMessage('New password is required.')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  validate,
];
 
// ─── User ─────────────────────────────────────────────────────────────────────
 
const validateUpdateProfile = [
  body('name').optional().trim()
    .isLength({ min: 1, max: 100 }).withMessage('Name must be 1–100 characters.'),
  body('avatar').optional().isURL().withMessage('Avatar must be a valid URL.'),
  validate,
];
 
const validateChangePassword = [
  body('currentPassword').optional().isString()
    .withMessage('Current password must be a string.'),
  body('newPassword').notEmpty().withMessage('New password is required.')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  validate,
];
 
const validateAdminUpdateUser = [
  param('userId').isMongoId().withMessage('Invalid user ID.'),
  body('name').optional().trim()
    .isLength({ min: 1, max: 100 }).withMessage('Name must be 1–100 characters.'),
  body('email').optional().trim().isEmail().withMessage('Invalid email.'),
  body('role').optional().isIn(['ADMIN', 'RESIDENT'])
    .withMessage('Role must be ADMIN or RESIDENT.'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean.'),
  body('avatar').optional().isURL().withMessage('Avatar must be a valid URL.'),
  validate,
];
 
const validateAddResident = [
  body('name').trim().notEmpty().withMessage('Name is required.'),
  body('email').trim().notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Invalid email.'),
  body('password').notEmpty().withMessage('Password is required.')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  validate,
];
 
const validateUserId = [
  param('userId').isMongoId().withMessage('Invalid user ID.'),
  validate,
];
 
const validateListUsers = [
  query('role').optional().isIn(['ADMIN', 'RESIDENT']).withMessage('Invalid role filter.'),
  query('isActive').optional().isBoolean().withMessage('isActive must be true or false.'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer.'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1–100.'),
  validate,
];
const validateHomeId      = [param('homeId').isMongoId().withMessage('Invalid home ID.'), validate];
const validateRoomId      = [param('roomId').isMongoId().withMessage('Invalid room ID.'), validate];
const validateResidentId  = [param('residentId').isMongoId().withMessage('Invalid resident ID.'), validate];
const validateInvitationId = [param('invitationId').isMongoId().withMessage('Invalid invitation ID.'), validate];
 
const validateCreateHome = [
  body('name').trim().notEmpty().withMessage('Home name is required.')
    .isLength({ max: 100 }).withMessage('Home name cannot exceed 100 characters.'),
  body('address').optional().trim(),
  validate,
];
 
const validateUpdateHome = [
  param('homeId').isMongoId().withMessage('Invalid home ID.'),
  body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1–100 characters.'),
  body('address').optional().trim(),
  validate,
];
 
const validateSendInvitation = [
  param('homeId').isMongoId().withMessage('Invalid home ID.'),
  body('email').trim().notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please provide a valid email.'),
  validate,
];
 
const validateAcceptInvitation = [
  body('token').trim().notEmpty().withMessage('Invitation token is required.'),
  validate,
];
 
const validateCreateRoom = [
  param('homeId').isMongoId().withMessage('Invalid home ID.'),
  body('name').trim().notEmpty().withMessage('Room name is required.')
    .isLength({ max: 100 }).withMessage('Room name cannot exceed 100 characters.'),
  body('description').optional().trim(),
  validate,
];
 
const validateUpdateRoom = [
  param('homeId').isMongoId().withMessage('Invalid home ID.'),
  param('roomId').isMongoId().withMessage('Invalid room ID.'),
  body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1–100 characters.'),
  body('description').optional().trim(),
  validate,
];

module.exports = {
  validateRegister,
  validateLogin,
  validateGoogleLogin,
  validateRefreshToken,
  validateForgotPassword,
  validateVerifyResetCode,
  validateResetPassword,
  validateUpdateProfile,
  validateChangePassword,
  validateAdminUpdateUser,
  validateAddResident,
  validateUserId,
  validateListUsers,
  validateHomeId,
  validateRoomId,
  validateResidentId,
  validateInvitationId,
  validateCreateHome,
  validateUpdateHome,
  validateSendInvitation,
  validateAcceptInvitation,
  validateCreateRoom,
  validateUpdateRoom,
};