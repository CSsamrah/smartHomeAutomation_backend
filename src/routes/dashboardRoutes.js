/**
 * dashboardRoutes.js  (Module 6 — Dashboard)
 *
 * Mount point (app.js): app.use('/api/dashboard', dashboardRoutes)
 *
 * Route map:
 *   GET /api/dashboard              → auto-resolves caller's home summary
 *   GET /api/dashboard/:homeId      → explicit homeId (admin use)
 *
 * Both routes perform their own access check inside DashboardService,
 * so there's no redundant homeId-ownership guard at the route layer.
 */

const express              = require('express');
const router               = express.Router();
const dashboardController  = require('../controllers/dashboardController');
const authMiddleware       = require('../middleware/authMiddleware');
const { validateHomeIdParam } = require('../validators/dashboardValidator');

const { protect, restrictTo } = authMiddleware;

router.use(protect);

// GET /api/dashboard
router.get(
  '/',
  dashboardController.handle(dashboardController.getSummary.bind(dashboardController))
);

// GET /api/dashboard/:homeId
router.get(
  '/:homeId',
  restrictTo('ADMIN'),
  validateHomeIdParam,
  dashboardController.handle(dashboardController.getSummaryById.bind(dashboardController))
);

module.exports = router;



// // routes/dashboard.js
// // GET /api/dashboard/summary handled here
// const express = require('express');
// const router  = express.Router();
// const ctrl    = require('../controllers/dashboardController');
// const { protect, restrictTo } = require('../middleware/authMiddleware')
 
// router.get('/summary', protect, restrictTo('ADMIN'), ctrl.getSummary);
 
// module.exports = router;
