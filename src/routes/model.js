// routes/model.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/modelController');
const { protect, restrictTo } = require('../middleware/authMiddleware')
 
router.get('/poisson/events', protect, restrictTo('ADMIN'), ctrl.getPoissonEvents);
router.get('/poisson/lambda', protect, restrictTo('ADMIN'), ctrl.getLambda);

module.exports = router;
