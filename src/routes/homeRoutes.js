/**
 * Home Routes
 *
 * POST   /api/v1/homes                                  Admin creates home
 * GET    /api/v1/homes/mine                             Get own home (admin or resident)
 * PATCH  /api/v1/homes/:homeId                          Admin updates home
 *
 * GET    /api/v1/homes/:homeId/residents                Admin lists residents
 * DELETE /api/v1/homes/:homeId/residents/:residentId    Admin removes resident
 *
 * POST   /api/v1/homes/:homeId/invitations              Admin sends invite
 * GET    /api/v1/homes/:homeId/invitations              Admin lists invitations
 * DELETE /api/v1/homes/:homeId/invitations/:invitationId Admin cancels invite
 *
 * POST   /api/v1/homes/accept-invitation                Resident accepts invite
 */

const express        = require('express');
const router         = express.Router();
const homeController = require('../controllers/homeController');
const roomController = require('../controllers/roomController');
const authMiddleware = require('../middleware/authMiddleware');
const { validateCreateHome, validateUpdateHome, validateHomeId, validateResidentId, validateInvitationId, validateSendInvitation, validateAcceptInvitation } = require('../validators');
const { protect, restrictTo } = authMiddleware;


// ─── All routes require authentication ───────────────────────────────────────
router.use(protect);

// ─── Home routes ──────────────────────────────────────────────────────────────

router.post(
  '/createHome',
  restrictTo('ADMIN'),
  validateCreateHome,
  homeController.handle(homeController.createHome.bind(homeController))
);

router.get(
  '/mine',
  homeController.handle(homeController.getMyHome.bind(homeController))
);

// Accept invitation — any authenticated user (resident joining)
router.post(
  '/accept-invitation',
  validateAcceptInvitation,
  homeController.handle(homeController.acceptInvitation.bind(homeController))
);

router.patch(
  '/:homeId',
  restrictTo('ADMIN'),
  validateUpdateHome,
  homeController.handle(homeController.updateHome.bind(homeController))
);

// ─── Resident management ──────────────────────────────────────────────────────

router.get(
  '/:homeId/residents',
  restrictTo('ADMIN'),
  validateHomeId,
  homeController.handle(homeController.listResidents.bind(homeController))
);

router.delete(
  '/:homeId/residents/:residentId',
  restrictTo('ADMIN'),
  [...validateHomeId, ...validateResidentId],
  homeController.handle(homeController.removeResident.bind(homeController))
);

// ─── Invitation management ────────────────────────────────────────────────────

router.post(
  '/:homeId/invitations',
  restrictTo('ADMIN'),
  validateSendInvitation,
  homeController.handle(homeController.sendInvitation.bind(homeController))
);

router.get(
  '/:homeId/invitations',
  restrictTo('ADMIN'),
  validateHomeId,
  homeController.handle(homeController.listInvitations.bind(homeController))
);

router.delete(
  '/:homeId/invitations/:invitationId',
  restrictTo('ADMIN'),
  [...validateHomeId, ...validateInvitationId],
  homeController.handle(homeController.cancelInvitation.bind(homeController))
);

module.exports = router;