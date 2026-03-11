// routes/dashboard.js
// GET /api/dashboard/summary handled here
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/dashboardController');
const { protect, restrictTo } = require('../middleware/authMiddleware')
 
router.get('/summary', protect, restrictTo('ADMIN'), ctrl.getSummary);
 
module.exports = router;
