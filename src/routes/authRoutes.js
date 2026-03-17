

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/authController');
const {
  validateRegister,
  validateLogin,
  validateGoogleLogin,
  validateRefreshToken,
  validateForgotPassword,
  validateVerifyResetCode,
  validateResetPassword,
} = require('../validators');

router.post('/register',          validateRegister,        controller.handle(controller.register.bind(controller)));
router.post('/login',             validateLogin,           controller.handle(controller.login.bind(controller)));
router.post('/google',            validateGoogleLogin,     controller.handle(controller.googleLogin.bind(controller)));
router.post('/refresh-token',     validateRefreshToken,    controller.handle(controller.refreshToken.bind(controller)));
router.post('/forgot-password',   validateForgotPassword,  controller.handle(controller.forgotPassword.bind(controller)));
router.post('/verify-reset-code', validateVerifyResetCode, controller.handle(controller.verifyResetCode.bind(controller)));
router.post('/reset-password',    validateResetPassword,   controller.handle(controller.resetPassword.bind(controller)));

module.exports = router;