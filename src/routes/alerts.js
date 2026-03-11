// routes/alerts.js
// GET /api/alerts handled here
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/dashboardController');
const { protect, restrictTo } = require('../middleware/authMiddleware')
 
router.get('/', protect, ctrl.getAlerts);
 
module.exports = router;
