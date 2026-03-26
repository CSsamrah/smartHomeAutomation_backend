/**
 * HomeController
 *
 * Design Patterns:
 *  • TEMPLATE METHOD (via BaseController) — this.handle() wraps every method
 *  • MVC CONTROLLER  — thin HTTP adapter only
 */

const BaseController  = require('./baseController');
const homeService     = require('../services/homeService');
const invitationService = require('../services/invitationService');

class HomeController extends BaseController {

  // ── POST /homes ───────────────────────────────────────────────────────────
  async createHome(req, res) {
    const { name, address } = req.body;
    const home = await homeService.createHome(req.user._id, { name, address });
    return this.created(res, 'Home created successfully.', { home });
  }

  // ── GET /homes/mine ───────────────────────────────────────────────────────
  async getMyHome(req, res) {
    const home = req.user.role === 'ADMIN'
      ? await homeService.getMyHome(req.user._id)
      : await homeService.getResidentHome(req.user._id);

    return this.ok(res, 'Home retrieved.', { home });
  }

  // ── PATCH /homes/:homeId ──────────────────────────────────────────────────
  async updateHome(req, res) {
    const { name, address } = req.body;
    const home = await homeService.updateHome(
      req.params.homeId,
      req.user._id,
      { name, address }
    );
    return this.ok(res, 'Home updated.', { home });
  }

  // ── GET /homes/:homeId/residents ──────────────────────────────────────────
  async listResidents(req, res) {
    const residents = await homeService.listResidents(
      req.params.homeId,
      req.user._id
    );
    return this.ok(res, 'Residents retrieved.', { residents });
  }

  // ── DELETE /homes/:homeId/residents/:residentId ───────────────────────────
  async removeResident(req, res) {
    await homeService.removeResident(
      req.params.homeId,
      req.params.residentId,
      req.user._id
    );
    return this.ok(res, 'Resident removed from home.');
  }

  // ── POST /homes/:homeId/invitations ───────────────────────────────────────
  async sendInvitation(req, res) {
    const invitation = await invitationService.sendInvitation(
      req.params.homeId,
      req.user._id,
      req.body.email
    );
    return this.created(res, 'Invitation sent successfully.', { invitation });
  }

  // ── GET /homes/:homeId/invitations ────────────────────────────────────────
  async listInvitations(req, res) {
    const invitations = await invitationService.listInvitations(
      req.params.homeId,
      req.user._id,
      req.query.status
    );
    return this.ok(res, 'Invitations retrieved.', { invitations });
  }

  // ── DELETE /homes/:homeId/invitations/:invitationId ───────────────────────
  async cancelInvitation(req, res) {
    await invitationService.cancelInvitation(
      req.params.invitationId,
      req.user._id
    );
    return this.ok(res, 'Invitation cancelled.');
  }

  // ── POST /homes/accept-invitation ─────────────────────────────────────────
  async acceptInvitation(req, res) {
    const result = await invitationService.acceptInvitation(
      req.body.token,
      req.user._id
    );
    return this.ok(res, 'You have successfully joined the home.', result);
  }
}

const controller = new HomeController();
module.exports   = controller;