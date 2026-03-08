const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// All user routes require authentication
router.use(protect);
router.get('/me', userController.getMyProfile);
router.get('/', restrictTo('ADMIN'), userController.getAllUsers);
router.get('/:id', restrictTo('ADMIN'), userController.getUserById);

module.exports = router;