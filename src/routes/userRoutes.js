/**
 * User Routes
 *
 * Own-profile  (any authenticated user)
 *   GET    /api/v1/users/me
 *   PATCH  /api/v1/users/me
 *   PATCH  /api/v1/users/me/password
 *
 * Admin only
 *   GET    /api/v1/users
 *   POST   /api/v1/users/residents
 *   GET    /api/v1/users/:userId
 *   PATCH  /api/v1/users/:userId
 *   PATCH  /api/v1/users/:userId/deactivate
 *   PATCH  /api/v1/users/:userId/reactivate
 *   DELETE /api/v1/users/:userId
 */

const express        = require('express');
const router         = express.Router();
const controller     = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const {
  validateUpdateProfile,
  validateChangePassword,
  validateAdminUpdateUser,
  validateAddResident,
  validateUserId,
  validateListUsers,
} = require('../validators');

const { protect, restrictTo } = authMiddleware;

// Chain of Responsibility: every route below requires authentication
router.use(protect);

// ── Own-profile (ADMIN + RESIDENT) ────────────────────────────────────────────
router.get( '/me',           controller.handle(controller.getMyProfile.bind(controller)));
router.patch('/me',          validateUpdateProfile,  controller.handle(controller.updateMyProfile.bind(controller)));
router.patch('/me/password', validateChangePassword, controller.handle(controller.changeMyPassword.bind(controller)));

// ── Admin-only: protect → restrictTo('ADMIN') → handler ──────────────────────
const adminOnly = restrictTo('ADMIN');

router.get(   '/',                    adminOnly, validateListUsers,       controller.handle(controller.listUsers.bind(controller)));
// router.post(  '/residents',           adminOnly, validateAddResident,     controller.handle(controller.addResident.bind(controller)));
router.get(   '/:userId',             adminOnly, validateUserId,          controller.handle(controller.getUserById.bind(controller)));
router.patch( '/:userId',             adminOnly, validateAdminUpdateUser, controller.handle(controller.adminUpdateUser.bind(controller)));
router.patch( '/:userId/deactivate',  adminOnly, validateUserId,          controller.handle(controller.deactivateUser.bind(controller)));
router.patch( '/:userId/reactivate',  adminOnly, validateUserId,          controller.handle(controller.reactivateUser.bind(controller)));
router.delete('/:userId',             adminOnly, validateUserId,          controller.handle(controller.deleteUser.bind(controller)));

module.exports = router;