const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { registerValidator, loginValidator, googleLoginValidator } = require('../middleware/authValidator');
const { validate } = require('../middleware/validate');


router.post('/register', registerValidator, validate, authController.register);
router.post('/login', loginValidator, validate, authController.login);
router.post('/google', googleLoginValidator, validate, authController.googleLogin);
router.post('/refresh', authController.refreshToken);

module.exports = router;