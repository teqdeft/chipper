/**
 * Transactional email (SCR-041 · Email templates).
 *
 * When MAIL_ENABLED=false the transport is replaced by a logger sink, so local
 * development never needs an SMTP server and verification/reset links are simply
 * printed to the console.
 *
 * Sending is fire-and-forget from the caller's point of view: a mail failure is
 * logged but never fails the surrounding request (a user who registered should
 * not see a 500 because SMTP was down).
 */
const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../config/logger');
const templates = require('../templates/email');

let transporter = null;

function getTransport() {
  if (transporter) return transporter;

  if (!config.mail.enabled) {
    transporter = {
      sendMail: async (options) => {
        logger.info(`[mail:dev] To: ${options.to} · Subject: ${options.subject}`);
        if (options.previewData) logger.info(`[mail:dev] Data: ${JSON.stringify(options.previewData)}`);
        return { messageId: 'dev-noop', envelope: { to: options.to } };
      },
      verify: async () => true,
    };
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.secure,
    auth: config.mail.user ? { user: config.mail.user, pass: config.mail.password } : undefined,
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
  });

  return transporter;
}

async function verifyTransport() {
  try {
    await getTransport().verify();
    logger.info(config.mail.enabled ? 'Mail transport ready' : 'Mail disabled — emails will be logged');
    return true;
  } catch (err) {
    logger.warn(`Mail transport unavailable: ${err.message}`);
    return false;
  }
}

/**
 * @param {{to:string, subject:string, html:string, text?:string, previewData?:object}} message
 */
async function send({ to, subject, html, text, previewData }) {
  try {
    const info = await getTransport().sendMail({
      from: `"${config.mail.fromName}" <${config.mail.fromAddress}>`,
      to,
      subject,
      html,
      text: text || String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      previewData,
    });
    logger.debug(`Mail sent to ${to} (${info.messageId})`);
    return true;
  } catch (err) {
    logger.error(`Failed to send "${subject}" to ${to}: ${err.message}`);
    return false;
  }
}

const mailService = {
  verifyTransport,
  send,

  /**
   * @param {object} user
   * @param {{ token:string, otp:string|null }} credentials issued together —
   *        the reader can click the link or type the code.
   */
  sendVerificationEmail(user, credentials) {
    const { token, otp } = typeof credentials === 'string' ? { token: credentials, otp: null } : credentials;
    const url = `${config.app.clientUrl}/verify-email?token=${token}`;
    return send({
      to: user.email,
      subject: otp
        ? `${otp} is your ${config.app.name} verification code`
        : `Confirm your ${config.app.name} account`,
      html: templates.verifyEmail({ name: user.name, url, otp }),
      previewData: { url, otp },
    });
  },

  sendPasswordResetEmail(user, credentials) {
    const { token, otp } = typeof credentials === 'string' ? { token: credentials, otp: null } : credentials;
    const url = `${config.app.clientUrl}/reset-password?token=${token}`;
    return send({
      to: user.email,
      subject: otp
        ? `${otp} is your ${config.app.name} password reset code`
        : `Reset your ${config.app.name} password`,
      html: templates.resetPassword({
        name: user.name,
        url,
        otp,
        expiresMinutes: config.security.passwordResetExpiresMinutes,
      }),
      previewData: { url, otp },
    });
  },

  sendWelcomeEmail(user) {
    return send({
      to: user.email,
      subject: `Welcome to ${config.app.name}`,
      html: templates.welcome({ name: user.name, url: `${config.app.clientUrl}/designs` }),
    });
  },

  sendPasswordChangedEmail(user) {
    return send({
      to: user.email,
      subject: 'Your password was changed',
      html: templates.passwordChanged({ name: user.name, url: `${config.app.clientUrl}/settings/account` }),
    });
  },

  /** Generic in-platform notification mirrored to email (CHIP-030). */
  sendNotificationEmail(user, { title, body, link }) {
    return send({
      to: user.email,
      subject: title,
      html: templates.notification({
        name: user.name,
        title,
        body,
        url: link ? `${config.app.clientUrl}${link}` : config.app.clientUrl,
      }),
    });
  },

  sendDesignStatusEmail(user, { design, status, note }) {
    return send({
      to: user.email,
      subject:
        status === 'published' ? `"${design.title}" is now published` : `Update on "${design.title}"`,
      html: templates.designStatus({
        name: user.name,
        title: design.title,
        status,
        note,
        url: `${config.app.clientUrl}/designs/${design.slug || design.id}`,
      }),
    });
  },
};

module.exports = mailService;
