/**
 * AuthController
 *
 * Design Patterns:
 *  • TEMPLATE METHOD (via BaseController) — this.handle() wraps every method
 *    in the invariant try/catch → next(err) skeleton.
 *  • MVC CONTROLLER  — thin HTTP adapter: extract input → call AuthService
 *                      → send response. Zero business logic here.
 */

const BaseController = require('./baseController');
const authService    = require('../services/auth/authService');

class AuthController extends BaseController {

  // ── POST /auth/register ──────────────────────────────────────────────────
  async register(req, res) {
    const { name, email, password, role } = req.body;
    const result = await authService.register({ name, email, password, role });

    return this.created(res, 'Account created successfully.', {
      user:   result.user,
      tokens: result.tokens,
    });
  }

  // ── POST /auth/login ─────────────────────────────────────────────────────
  async login(req, res) {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });

    res.setHeader('X-User-Role', result.user.role);

    return this.ok(res, 'Login successful.', {
      user:   result.user,
      tokens: result.tokens,
    });
  }

  // ── POST /auth/google ────────────────────────────────────────────────────
  async googleLogin(req, res) {
    const { idToken,role } = req.body;
    const result = await authService.googleLogin({ idToken, role });

    res.setHeader('X-User-Role', result.user.role);

    const statusCode = result.isNewUser ? 201 : 200;
    const message    = result.isNewUser
      ? 'Account created via Google.'
      : 'Google login successful.';

    return ApiResponse.success(message, {
      user:      result.user,
      tokens:    result.tokens,
      isNewUser: result.isNewUser,
    }).send(res, statusCode);
  }

  // ── POST /auth/refresh-token ─────────────────────────────────────────────
  async refreshToken(req, res) {
    const { refreshToken } = req.body;
    const result = await authService.refreshToken(refreshToken);

    return this.ok(res, 'Token refreshed.', result);
  }

  // ── POST /auth/forgot-password ───────────────────────────────────────────
  async forgotPassword(req, res) {
    await authService.forgotPassword(req.body.email);
    // Always 200 regardless of whether the email exists — prevents enumeration
    return this.ok(
      res,
      'an account with that email exists, a reset code has been sent.'
    );
  }

  // ── POST /auth/verify-reset-code ─────────────────────────────────────────
  async verifyResetCode(req, res) {
    const { email, code } = req.body;
    await authService.verifyResetCode(email, code);
    return this.ok(res, 'Code verified. You may now reset your password.');
  }

  // ── POST /auth/reset-password ────────────────────────────────────────────
  async resetPassword(req, res) {
    const { email, newPassword } = req.body;
    const result = await authService.resetPassword(email, newPassword);

    return this.ok(res, 'Password reset successfully.', {
      user:   result.user,
      tokens: result.tokens,
    });
  }
}

// Export a single instance so routes can call controller.handle(controller.method)
const ApiResponse = require('../utils/ApiResponse');
const controller  = new AuthController();
module.exports    = controller;