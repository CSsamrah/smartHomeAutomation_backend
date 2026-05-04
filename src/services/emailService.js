/**
 * EmailService
 *
 * Design Patterns:
 *  • STRATEGY       — EmailTransport is an abstract strategy; SmtpTransport is
 *                     the concrete implementation. A SendGridTransport could be
 *                     dropped in without changing EmailService at all.
 *  • TEMPLATE METHOD — EmailService._buildHtml() defines the invariant HTML
 *                     skeleton; each send* method supplies only the varying body.
 *  • SINGLETON      — One EmailService instance per process.
 */

const nodemailer = require('nodemailer');

// ─── Strategy: Abstract Transport ─────────────────────────────────────────────

class EmailTransport {
  /**
   * @param {object} mailOptions  { from, to, subject, html }
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  async send(mailOptions) {
    throw new Error('EmailTransport.send() must be implemented by a subclass.');
  }
}

// ─── Strategy: Concrete SMTP Transport ────────────────────────────────────────

class SmtpTransport extends EmailTransport {
  constructor() {
    super();
    this._transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST   || 'smtp.ethereal.email',
      port:   Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async send(mailOptions) {
    await this._transporter.sendMail(mailOptions);
  }
}

// ─── Context: EmailService ─────────────────────────────────────────────────────

class EmailService {
  // ── Singleton plumbing ────────────────────────────────────────────────────
  constructor(transport = null) {
    if (EmailService._instance) {
      return EmailService._instance;
    }

    /** @type {EmailTransport} */
    this._transport = transport || new SmtpTransport();
    this._from      = process.env.EMAIL_FROM || 'noreply@smarthome.local';

    EmailService._instance = this;
  }

  // ── Strategy setter (allows swapping transport at runtime / in tests) ──────
  setTransport(transport) {
    if (!(transport instanceof EmailTransport)) {
      throw new TypeError('transport must extend EmailTransport');
    }
    this._transport = transport;
  }

  // ── Template Method: invariant HTML shell ─────────────────────────────────

  /**
   * Builds the full HTML email from a title and a body fragment.
   * Each send* method supplies only the varying body — the shell never changes.
   */
  _buildHtml(title, body) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    body { font-family: Arial, sans-serif; background:#f4f4f4; padding:20px; }
    .container { background:#fff; border-radius:8px; padding:30px;
                 max-width:520px; margin:auto; }
    h2  { color:#1f2937; margin-top:0; }
    p   { color:#4b5563; line-height:1.7; }
    .otp { font-size:34px; font-weight:700; color:#4f46e5;
           letter-spacing:10px; text-align:center;
           background:#eef2ff; border-radius:8px; padding:16px; margin:24px 0; }
    .btn { display:inline-block; background:#4f46e5; color:#ffffff;
           padding:12px 28px; border-radius:8px; text-decoration:none;
           font-weight:600; font-size:15px; margin:24px 0; }
    .footer { font-size:11px; color:#9ca3af; margin-top:24px; }
  </style>
</head>
<body>
  <div class="container">
    <h2>${title}</h2>
    ${body}
    <p class="footer">SmartHome Automation System — Do not reply to this email.</p>
  </div>
</body>
</html>`;
  }

  // ── Public send methods ───────────────────────────────────────────────────

  /**
   * Send a password-reset OTP email.
   * @param {string} to
   * @param {string} name
   * @param {string} code        6-digit OTP
   * @param {number} expiresIn   Minutes until expiry
   */
  async sendPasswordResetEmail(to, name, code, expiresIn = 15) {
    const body = `
      <p>Hi <strong>${name}</strong>,</p>
      <p>Use the verification code below to reset your SmartHome password.
         It expires in <strong>${expiresIn} minutes</strong>.</p>
      <div class="otp">${code}</div>
      <p>If you did not request a password reset, please ignore this email.</p>`;

    await this._transport.send({
      from:    `"SmartHome" <${this._from}>`,
      to,
      subject: 'Your SmartHome Password Reset Code',
      html:    this._buildHtml('🔐 Password Reset Request', body),
    });
  }

  /**
   * Send a welcome email after Google sign-up.
   * @param {string} to
   * @param {string} name
   */
  async sendWelcomeEmail(to, name) {
    const body = `
      <p>Hi <strong>${name}</strong>,</p>
      <p>Your SmartHome account has been created via Google.
         You can now manage your home automation from anywhere.</p>
      <p>To enable email/password login as well, use
         <em>Forgot Password</em> from the login screen.</p>`;

    await this._transport.send({
      from:    `"SmartHome" <${this._from}>`,
      to,
      subject: 'Welcome to SmartHome!',
      html:    this._buildHtml('🏠 Welcome to SmartHome', body),
    });
  }

  /**
   * Send a resident invitation email.
   *
   * @param {string} to           Recipient email (the invited resident)
   * @param {string} adminName    Name of the admin who sent the invite
   * @param {string} homeName     Name of the home the resident is invited to
   * @param {string} token        The unique invitation token
   * @param {number} expiresIn    Hours until the invitation expires (default 48)
   */
  async sendInvitationEmail(to, adminName, homeName, token, expiresIn = 48) {
    const acceptUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/accept-invitation?token=${token}`;

    const body = `
      <p>Hi there,</p>
      <p><strong>${adminName}</strong> has invited you to join their SmartHome
         <strong>"${homeName}"</strong> as a resident.</p>
      <p>Click the button below to accept your invitation.
         This link expires in <strong>${expiresIn} hours</strong>.</p>
      <div style="text-align:center;">
        <a href="${acceptUrl}" class="btn">Accept Invitation</a>
      </div>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break:break-all;font-size:13px;color:#6b7280;">${acceptUrl}</p>
      <p>If you were not expecting this invitation, you can safely ignore this email.</p>`;

    await this._transport.send({
      from:    `"SmartHome" <${this._from}>`,
      to,
      subject: `You have been invited to join "${homeName}" on SmartHome`,
      html:    this._buildHtml('🏠 You have been invited!', body),
    });
  }
}

module.exports = new EmailService();