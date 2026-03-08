// routes/rooms.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/roomController');
 
router.get('/',          ctrl.getAllRooms);
router.post('/',         ctrl.createRoom);
router.get('/:room_id',  ctrl.getRoomById);
 
module.exports = router;
