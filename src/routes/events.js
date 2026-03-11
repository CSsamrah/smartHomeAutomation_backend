// routes/events.js
// GET /api/events/recent handled here
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/dashboardController');
const { protect, restrictTo } = require('../middleware/authMiddleware')
 
router.get('/recent', protect, restrictTo('ADMIN'), ctrl.getRecentEvents);
 
module.exports = router;
