// // routes/rooms.js
// const express = require('express');
// const router  = express.Router();
// const ctrl    = require('../controllers/roomController');
// const { protect, restrictTo } = require('../middleware/authMiddleware')
 
// router.get('/',          protect,                      ctrl.getAllRooms);
// router.post('/',         protect, restrictTo('ADMIN'), ctrl.createRoom);
// router.get('/:room_id',  protect,                      ctrl.getRoomById);

 
// module.exports = router;
