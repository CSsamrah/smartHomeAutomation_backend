/**
 * deviceRoutes.js
 *
 * All device-related routes, including IoT feedback webhook.
 * Auth middleware assumed to be applied at app level or here explicitly.
 */

const router = require('express').Router();
const controller = require('../controllers/deviceController');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const {
  validateCreateDevice,
  validateControlDevice,
} = require('../validators/deviceValidator');
 
// ── Device CRUD ──────────────────────────────────────────────────────────────
router.get(
  '/',
  protect,
  controller.handle(controller.getAllDevices.bind(controller))
);
 
router.post(
  '/',
  protect,
  restrictTo('ADMIN'),
  validateCreateDevice,
  controller.handle(controller.createDevice.bind(controller))
);
 
router.get(
  '/:id',
  protect,
  controller.handle(controller.getDevice.bind(controller))
);
 
router.patch(
  '/:id',
  protect,
  restrictTo('ADMIN'),
  controller.handle(controller.updateDevice.bind(controller))
);
 
router.delete(
  '/:id',
  protect,
  restrictTo('ADMIN'),
  controller.handle(controller.deleteDevice.bind(controller))
);
 
// ── Device Control ───────────────────────────────────────────────────────────
router.post(
  '/:id/control',
  protect,
  validateControlDevice,
  controller.handle(controller.controlDevice.bind(controller))
);
 
router.get(
  '/:id/status',
  protect,
  controller.handle(controller.getDeviceStatus.bind(controller))
);
 
module.exports = router;
 