/**
 * alertRoutes.js
 *
 * Mount point (app.js): app.use('/alerts', alertRoutes)
 *
 * Route map:
 * GET    /alerts/stats          → getStats (unread, critical, total)
 * GET    /alerts/unread         → getUnread (unread)
 * GET    /alerts/critical       → getCritical (critical)
 * GET    /alerts/home/:homeId   → getAlertsByHome (paginated list) [Only Admin]
 * PATCH  /alerts/:alertId/read  → markAsRead
 */

const express              = require('express');
const router               = express.Router();
const alertController  = require('../controllers/alertController');
const authMiddleware       = require('../middleware/authMiddleware');

const { protect, restrictTo } = authMiddleware;

router.use(protect);

// GET /api/alerts/stats
router.get(
  '/stats',
  alertController.handle(alertController.getStats.bind(alertController))
);

// GET /api/alerts/unread
router.get(
  '/unread',
  alertController.handle(alertController.getUnread.bind(alertController))
);

// GET /api/alerts/critical
router.get(
  '/critical',
  alertController.handle(alertController.getCritical.bind(alertController))
);

// GET /api/alerts/home/:homeId
router.get(
  '/home/:homeId',
  restrictTo('ADMIN'),
  alertController.handle(alertController.getAlertsByHome.bind(alertController))
);

// PATCH /api/alerts/:alertId/read
router.patch(
  '/:alertId/read',
  alertController.handle(alertController.markAsRead.bind(alertController))
);

module.exports = router;