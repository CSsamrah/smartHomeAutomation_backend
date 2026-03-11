// routes/energy.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/energyController');
const { protect, restrictTo } = require('../middleware/authMiddleware')
 
router.get('/device/:device_id', protect, restrictTo('ADMIN'), ctrl.getDeviceEnergy);
router.get('/rooms',             protect, restrictTo('ADMIN'),             ctrl.getRoomEnergy);
router.get('/overview',          protect, restrictTo('ADMIN'),          ctrl.getOverview);
 
module.exports = router;
