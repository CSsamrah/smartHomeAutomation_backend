
const express        = require('express');
const router         = express.Router();
const homeController = require('../controllers/homeController');
const roomController = require('../controllers/roomController');
const authMiddleware = require('../middleware/authMiddleware');
const {validateCreateRoom, validateUpdateRoom, validateHomeId, validateRoomId} = require('../validators');

const { protect, restrictTo } = authMiddleware;


// ─── All routes require authentication ───────────────────────────────────────
router.use(protect);


router.post(
  '/:homeId/rooms',
  restrictTo('ADMIN'),
  validateCreateRoom,
  roomController.handle(roomController.createRoom.bind(roomController))
);

router.get(
  '/:homeId/rooms',
  validateHomeId,
  roomController.handle(roomController.listRooms.bind(roomController))
);

router.get(
  '/:homeId/rooms/:roomId',
  [...validateHomeId, ...validateRoomId],
  roomController.handle(roomController.getRoomById.bind(roomController))
);

router.patch(
  '/:homeId/rooms/:roomId',
  restrictTo('ADMIN'),
  validateUpdateRoom,
  roomController.handle(roomController.updateRoom.bind(roomController))
);

router.delete(
  '/:homeId/rooms/:roomId',
  restrictTo('ADMIN'),
  [...validateHomeId, ...validateRoomId],
  roomController.handle(roomController.deleteRoom.bind(roomController))
);

module.exports = router;