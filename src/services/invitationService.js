/**
 * InvitationService
 *
 * Design Patterns:
 *  • SERVICE LAYER  — encapsulates the full invitation lifecycle
 *  • COMMAND        — each method is a discrete command: send, accept, cancel
 *  • SINGLETON      — one shared instance
 *
 * The invitation flow:
 *   Admin sends invite  →  token emailed to resident
 *   Resident accepts    →  verified, linked to home
 *   Admin can cancel    →  token invalidated
 */

const Home       = require('../models/Home');
const User       = require('../models/User');
const Invitation = require('../models/Invitation');
const { InvitationStatus } = require('../models/Invitation');
const emailService = require('./emailService');

const {
  NotFoundError,
  ConflictError,
  AuthorizationError,
  ValidationError,
} = require('../utils/AppError');

class InvitationService {
  constructor() {
    if (InvitationService._instance) return InvitationService._instance;
    InvitationService._instance = this;
  }

  // ── Command: Admin sends invitation ───────────────────────────────────────

  /**
   * Admin invites a resident by email.
   * Guards:
   *  - Admin must own the home
   *  - Email must not already be the admin
   *  - No duplicate pending invite for same email + home
   *  - If email already belongs to a resident of this home, reject
   */
  async sendInvitation(homeId, adminId, email) {
    const home = await Home.findById(homeId);
    if (!home) throw new NotFoundError('Home not found.', 'HOME_NOT_FOUND');

    if (!home.isOwnedBy(adminId)) {
      throw new AuthorizationError(
        'You are not the admin of this home.',
        'NOT_HOME_ADMIN'
      );
    }

    // Guard: cannot invite yourself
    const admin = await User.findById(adminId);
    if (admin.email === email.toLowerCase()) {
      throw new ValidationError(
        'You cannot invite yourself.',
        'CANNOT_INVITE_SELF'
      );
    }

    // Guard: if the user already exists and is already a resident
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser && home.hasResident(existingUser._id)) {
      throw new ConflictError(
        'This user is already a resident of your home.',
        'ALREADY_RESIDENT'
      );
    }

    // Guard: cancel any existing pending invite for this email + home
    await Invitation.updateMany(
      { home: homeId, email: email.toLowerCase(), status: InvitationStatus.PENDING },
      { status: InvitationStatus.CANCELLED }
    );

    // Create new invitation
    const token     = Invitation.generateToken();
    const expiresAt = Invitation.calculateExpiry(48); // 48 hours

    const invitation = await Invitation.create({
      home:      homeId,
      invitedBy: adminId,
      email:     email.toLowerCase(),
      token,
      expiresAt,
    });

    // Send invitation email
    await emailService.sendInvitationEmail(
      email,
      admin.name,
      home.name,
      token,
      48
    );

    console.log(`[InvitationService] Invite sent to ${email} for home "${home.name}"`);

    return {
      id:        invitation._id,
      email:     invitation.email,
      status:    invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
    };
  }

  // ── Command: Resident accepts invitation ──────────────────────────────────

  /**
   * Resident accepts an invitation using the token from their email.
   * The resident may or may not already have an account.
   *
   * Guards:
   *  - Token must exist
   *  - Token must not be expired, cancelled, or already accepted
   *  - Logged-in user's email must match the invited email
   */
  async acceptInvitation(token, userId) {
    const invitation = await Invitation.findOne({ token }).select('+token');
    if (!invitation) {
      throw new NotFoundError(
        'Invitation not found. The link may be invalid.',
        'INVITATION_NOT_FOUND'
      );
    }

    if (invitation.isCancelled()) {
      throw new ValidationError(
        'This invitation has been cancelled by the admin.',
        'INVITATION_CANCELLED'
      );
    }

    if (invitation.isAlreadyAccepted()) {
      throw new ValidationError(
        'This invitation has already been accepted.',
        'INVITATION_ALREADY_ACCEPTED'
      );
    }

    if (invitation.isExpired()) {
      await Invitation.findByIdAndUpdate(invitation._id, {
        status: InvitationStatus.EXPIRED,
      });
      throw new ValidationError(
        'This invitation has expired. Ask the admin to send a new one.',
        'INVITATION_EXPIRED'
      );
    }

    // Guard: the logged-in user's email must match the invitation email
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User not found.', 'USER_NOT_FOUND');

    if (user.email !== invitation.email) {
      throw new AuthorizationError(
        'This invitation was sent to a different email address.',
        'EMAIL_MISMATCH'
      );
    }

    // Link resident to home
    const home = await Home.findById(invitation.home);
    if (!home) throw new NotFoundError('Home not found.', 'HOME_NOT_FOUND');

    if (!home.hasResident(userId)) {
      home.addResident(userId);
      await home.save();
    }

    // Mark invitation accepted
    invitation.markAccepted(userId);
    await invitation.save();

    console.log(`[InvitationService] ${user.email} accepted invite to home "${home.name}"`);

    return {
      home: {
        id:      home._id,
        name:    home.name,
        address: home.address,
      },
    };
  }

  // ── Command: Admin cancels invitation ─────────────────────────────────────

  async cancelInvitation(invitationId, adminId) {
    const invitation = await Invitation.findById(invitationId);
    if (!invitation) throw new NotFoundError('Invitation not found.', 'INVITATION_NOT_FOUND');

    const home = await Home.findById(invitation.home);
    if (!home || !home.isOwnedBy(adminId)) {
      throw new AuthorizationError(
        'You are not the admin of this home.',
        'NOT_HOME_ADMIN'
      );
    }

    if (!invitation.isUsable()) {
      throw new ValidationError(
        'Only pending invitations can be cancelled.',
        'INVITATION_NOT_PENDING'
      );
    }

    invitation.status = InvitationStatus.CANCELLED;
    await invitation.save();

    console.log(`[InvitationService] Invitation ${invitationId} cancelled by admin ${adminId}`);
  }

  // ── Query: list invitations for a home ───────────────────────────────────

  async listInvitations(homeId, adminId, status) {
    const home = await Home.findById(homeId);
    if (!home) throw new NotFoundError('Home not found.', 'HOME_NOT_FOUND');

    if (!home.isOwnedBy(adminId)) {
      throw new AuthorizationError('You are not the admin of this home.', 'NOT_HOME_ADMIN');
    }

    const filter = { home: homeId };
    if (status) filter.status = status;

    const invitations = await Invitation.find(filter)
      .sort({ createdAt: -1 })
      .select('-token'); // never return raw token

    return invitations;
  }
}

module.exports = new InvitationService();