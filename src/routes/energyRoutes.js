/**
 * energyRoutes.js  (Module 7 — Energy Analytics)
 *
 * Mount point (app.js): app.use('/api/energy', energyRoutes)
 *
 * Route map:
 *   GET /api/energy/home/:homeId/daily       → getDailySummary
 *   GET /api/energy/home/:homeId/weekly      → getWeeklySummary
 *   GET /api/energy/home/:homeId/live        → getLiveSessions
 *   GET /api/energy/device/:deviceId         → getDeviceEnergy
 *   GET /api/energy/room/:roomId             → getRoomEnergy
 *
 * Route ordering:
 *   Named sub-paths (/daily, /weekly, /live) are declared before the bare
 *   home param GET so Express resolves them correctly.
 */

const express          = require('express');
const router           = express.Router();
const energyController = require('../controllers/energyController');
const authMiddleware   = require('../middleware/authMiddleware');

const {
  validateHomeDailySummary,
  validateHomeWeeklySummary,
  validateHomeLive,
  validateDeviceEnergy,
  validateRoomEnergy,
} = require('../validators/energyValidator');

const { protect } = authMiddleware;

router.use(protect);

// ─── Home-scoped energy ───────────────────────────────────────────────────────

// GET /api/energy/home/:homeId/daily?date=YYYY-MM-DD
router.get(
  '/home/:homeId/daily',
  validateHomeDailySummary,
  energyController.handle(energyController.getDailySummary.bind(energyController))
);

// GET /api/energy/home/:homeId/weekly?weekStart=YYYY-MM-DD
router.get(
  '/home/:homeId/weekly',
  validateHomeWeeklySummary,
  energyController.handle(energyController.getWeeklySummary.bind(energyController))
);

// GET /api/energy/home/:homeId/live
router.get(
  '/home/:homeId/live',
  validateHomeLive,
  energyController.handle(energyController.getLiveSessions.bind(energyController))
);

// ─── Device-scoped energy ─────────────────────────────────────────────────────

// GET /api/energy/device/:deviceId?startDate=&endDate=
router.get(
  '/device/:deviceId',
  validateDeviceEnergy,
  energyController.handle(energyController.getDeviceEnergy.bind(energyController))
);

// ─── Room-scoped energy ───────────────────────────────────────────────────────

// GET /api/energy/room/:roomId?startDate=&endDate=
router.get(
  '/room/:roomId',
  validateRoomEnergy,
  energyController.handle(energyController.getRoomEnergy.bind(energyController))
);

module.exports = router;


// // routes/energy.js
// const express = require('express');
// const router  = express.Router();
// const ctrl    = require('../controllers/energyController');
// const { protect, restrictTo } = require('../middleware/authMiddleware')
 
// router.get('/device/:device_id', protect, restrictTo('ADMIN'), ctrl.getDeviceEnergy);
// router.get('/rooms',             protect, restrictTo('ADMIN'),             ctrl.getRoomEnergy);
// router.get('/overview',          protect, restrictTo('ADMIN'),          ctrl.getOverview);
 
// module.exports = router;
