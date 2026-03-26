/**
 * modelRoutes.js  (Module 8 — AI / Mathematical Modeling)
 *
 * Mount point (app.js): app.use('/api/model', modelRoutes)
 *
 * Route map:
 *   GET /api/model/home/:homeId                  → getHomeDeviceAnalytics
 *   GET /api/model/device/:deviceId/markov       → getMarkovMatrix
 *   GET /api/model/device/:deviceId/predict      → predictNextState
 *
 * Poisson λ estimation and action frequency are intentionally on
 * /api/events/device/:deviceId/lambda and /frequency —
 * they derive from Event documents and belong there semantically.
 *
 * Route ordering:
 *   Sub-paths (markov, predict) declared before bare device param GET.
 */

const express              = require('express');
const router               = express.Router();
const modelController  = require('../controllers/modelController');
const authMiddleware       = require('../middleware/authMiddleware');

const {
  validateHomeAnalytics,
  validateMarkovMatrix,
  validatePredictNextState,
} = require('../validators/modelValidator');

const { protect } = authMiddleware;

router.use(protect);

// ─── Home-level analytics ─────────────────────────────────────────────────────

// GET /api/model/home/:homeId
router.get(
  '/home/:homeId',
  validateHomeAnalytics,
  modelController.handle(modelController.getHomeDeviceAnalytics.bind(modelController))
);

// ─── Device-level analytics ───────────────────────────────────────────────────

// GET /api/model/device/:deviceId/markov
router.get(
  '/device/:deviceId/markov',
  validateMarkovMatrix,
  modelController.handle(modelController.getMarkovMatrix.bind(modelController))
);

// GET /api/model/device/:deviceId/predict?currentState=ON
router.get(
  '/device/:deviceId/predict',
  validatePredictNextState,
  modelController.handle(modelController.predictNextState.bind(modelController))
);

module.exports = router;



// // routes/model.js
// const express = require('express');
// const router  = express.Router();
// const ctrl    = require('../controllers/modelController');
// const { protect, restrictTo } = require('../middleware/authMiddleware')
 
// router.get('/poisson/events', protect, restrictTo('ADMIN'), ctrl.getPoissonEvents);
// router.get('/poisson/lambda', protect, restrictTo('ADMIN'), ctrl.getLambda);

// module.exports = router;
