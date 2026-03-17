/**
 * UserController
 *
 * Design Patterns:
 *  • TEMPLATE METHOD (via BaseController) — this.handle() eliminates
 *    try/catch boilerplate from every method.
 *  • MVC CONTROLLER — thin adapter: extract → service → respond.
 */

const BaseController = require('./baseController');
const userService    = require('../services/userService');

class UserController extends BaseController {

  // ── Own-profile ───────────────────────────────────────────────────────────

  async getMyProfile(req, res) {
    const user = await userService.getMyProfile(req.user._id);
    return this.ok(res, 'Profile retrieved.', { user });
  }

  async updateMyProfile(req, res) {
    const { name, avatar } = req.body;
    const user = await userService.updateMyProfile(req.user._id, { name, avatar });
    return this.ok(res, 'Profile updated.', { user });
  }

  async changeMyPassword(req, res) {
    const { currentPassword, newPassword } = req.body;
    await userService.changeMyPassword(req.user._id, { currentPassword, newPassword });
    return this.ok(res, 'Password changed successfully.');
  }

  // ── Admin ─────────────────────────────────────────────────────────────────

  async listUsers(req, res) {
    const { role, isActive, page, limit, search } = req.query;

    const result = await userService.listUsers({
      role,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      page:     page  ? Number(page)  : 1,
      limit:    limit ? Number(limit) : 20,
      search,
    });

    return this.ok(res, 'Users retrieved.', result);
  }

  async addResident(req, res) {
    const { name, email, password } = req.body;
    const user = await userService.addResident({ name, email, password }, req.user);
    return this.created(res, 'Resident added successfully.', { user });
  }

  async getUserById(req, res) {
    const user = await userService.getUserById(req.params.userId);
    return this.ok(res, 'User retrieved.', { user });
  }

  async adminUpdateUser(req, res) {
    const user = await userService.adminUpdateUser(
      req.params.userId,
      req.body,
      req.user
    );
    return this.ok(res, 'User updated.', { user });
  }

  async deactivateUser(req, res) {
    const user = await userService.deactivateUser(req.params.userId, req.user);
    return this.ok(res, 'User deactivated.', { user });
  }

  async reactivateUser(req, res) {
    const user = await userService.reactivateUser(req.params.userId, req.user);
    return this.ok(res, 'User reactivated.', { user });
  }

  async deleteUser(req, res) {
    await userService.deleteUser(req.params.userId, req.user);
    return this.ok(res, 'User permanently deleted.');
  }
}

const controller = new UserController();
module.exports   = controller;