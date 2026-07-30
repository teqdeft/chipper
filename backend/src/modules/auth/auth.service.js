/**
 * Authentication business rules (SCR-009..013 · CHIP-001..003).
 *
 * Design notes:
 *  - Registration always creates a *pending* account and mails a verification
 *    link; the account activates on confirmation.
 *  - Login is deliberately vague about which half of the credentials failed and
 *    locks an account after repeated failures.
 *  - Refresh tokens rotate: using one revokes it and issues a new pair. Reuse of
 *    an already-revoked token revokes the whole family (theft detection).
 *  - Forgot-password always reports success, so the endpoint cannot be used to
 *    enumerate registered addresses.
 */
const config = require('../../config');
const logger = require('../../config/logger');
const { db } = require('../../database/connection');
const ApiError = require('../../utils/ApiError');
const { hashPassword, comparePassword } = require('../../utils/password');
const jwtUtil = require('../../utils/jwt');
const { uuid, uniqueHandle } = require('../../utils/helpers');
const { ROLES, USER_STATUS, TOKEN_TYPES } = require('../../config/constants');
const { permissionsForRole } = require('../../config/permissions');
const userRepository = require('../users/user.repository');
const { identityKeysFor } = require('../users/affiliation');
const { toPrivateUser } = require('../users/user.serializer');
const mailService = require('../../services/mail.service');
const auditService = require('../../services/audit.service');

const MAX_FAILED_LOGINS = 8;
const LOCK_MINUTES = 15;

/**
 * How long a just-rotated refresh token still counts as a benign race rather
 * than theft. Long enough to cover a second tab or an interrupted page load,
 * short enough that a genuinely stolen token is still caught on replay.
 */
const REFRESH_REUSE_GRACE_SECONDS = 60;

/**
 * Issues a one-time credential pair for an email flow.
 *
 * Both a magic link token and a numeric OTP are minted on the same row, so the
 * user can click the link or type the code. Only hashes are stored; the raw
 * values exist just long enough to be emailed.
 *
 * @param {number} userId
 * @param {string} type TOKEN_TYPES.*
 * @param {Date} expiresAt
 * @returns {Promise<{ token:string, otp:string|null }>}
 */
async function issueOneTimeCredentials(userId, type, expiresAt, context = {}, trx) {
  const token = jwtUtil.randomToken();
  const otp = config.otp.enabled ? jwtUtil.generateOtp() : null;

  await userRepository.createUserToken(
    {
      user_id: userId,
      type,
      token_hash: jwtUtil.hashToken(token),
      otp_hash: otp ? jwtUtil.hashToken(otp) : null,
      expires_at: expiresAt,
      ip_address: context.ip || null,
    },
    trx,
  );

  return { token, otp };
}

/**
 * Resolves an email flow to its token row, accepting either a magic-link token
 * or an `email` + `otp` pair.
 *
 * OTP verification is attempt-limited per request row — without that cap a
 * six-digit code is one of a million and trivially brute-forced.
 *
 * @returns {Promise<{ record:object, user:object }>}
 */
async function resolveOneTimeCredential({ token, email, otp }, type, invalidMessage) {
  const invalid = () => ApiError.badRequest(invalidMessage, { code: 'TOKEN_INVALID_OR_EXPIRED' });

  if (token) {
    const record = await userRepository.findUserToken(jwtUtil.hashToken(token), type);
    if (!record) throw invalid();
    return { record, user: await userRepository.findByIdWithRole(record.user_id) };
  }

  if (!email || !otp) throw invalid();

  const user = await userRepository.findByEmail(email);
  // Same error whether the address is unknown or the code is wrong, so the
  // endpoint cannot be used to discover which addresses are registered.
  if (!user) throw invalid();

  const record = await userRepository.findLatestOtpRequest(user.id, type);
  if (!record) throw invalid();

  if (record.attempts >= config.otp.maxAttempts) {
    await userRepository.consumeUserToken(record.id);
    throw ApiError.tooManyRequests('Too many incorrect codes. Please request a new one.', {
      code: 'OTP_ATTEMPTS_EXCEEDED',
    });
  }

  if (record.otp_hash !== jwtUtil.hashToken(String(otp).trim())) {
    await userRepository.incrementTokenAttempts(record.id);
    const remaining = Math.max(config.otp.maxAttempts - (record.attempts + 1), 0);
    throw ApiError.badRequest('That code is not correct', {
      code: 'OTP_INVALID',
      details: { attemptsRemaining: remaining },
    });
  }

  return { record, user };
}

/**
 * Echoes the code back to the caller while the static OTP is in use, so the
 * flow can be exercised without a mail server. Stops as soon as
 * OTP_STATIC_ENABLED is turned off (i.e. once real email delivery exists).
 */
function devOtpPayload(otp) {
  if (!otp || !config.otp.staticEnabled) return {};
  return { devOtp: otp, devNote: 'Static OTP — remove OTP_STATIC_ENABLED once real email is set up' };
}

/**
 * Finds the parked signup a verification request refers to, accepting either the
 * magic-link token or an `email` + `otp` pair.
 *
 * Returns null when no pending signup matches at all, so the caller can fall
 * back to the legacy `user_tokens` flow for accounts that predate this table.
 * A pending row with the wrong code throws instead — a typo must never be
 * reported as "no such signup".
 */
async function resolvePendingRegistration({ token, email, otp }) {
  if (token) {
    return userRepository.findPendingRegistrationByToken(jwtUtil.hashToken(token));
  }
  if (!email || !otp) return null;

  const pending = await userRepository.findPendingRegistrationByEmail(email);
  if (!pending) return null;

  if (pending.attempts >= config.otp.maxAttempts) {
    await userRepository.deletePendingRegistration(pending.id);
    throw ApiError.tooManyRequests('Too many incorrect codes. Please sign up again.', {
      code: 'OTP_ATTEMPTS_EXCEEDED',
    });
  }

  if (pending.otp_hash !== jwtUtil.hashToken(String(otp).trim())) {
    await userRepository.incrementPendingRegistrationAttempts(pending.id);
    const attemptsRemaining = Math.max(config.otp.maxAttempts - (pending.attempts + 1), 0);
    throw ApiError.badRequest('That code is not correct', {
      code: 'OTP_INVALID',
      details: { attemptsRemaining },
    });
  }

  return pending;
}

/**
 * Writes the account row and its settings.
 *
 * Every signup lands on the same role whatever they registered as — a student,
 * a researcher and an institution all get the full member capability set (see
 * config/permissions.js). Moderator and admin are only ever granted afterwards
 * by an existing admin.
 */
async function createAccount(data, trx) {
  const role = await userRepository.getRoleByName(ROLES.UPLOADER);
  if (!role) throw ApiError.internal('Default role is missing — run the database seeds');

  const userId = await userRepository.create(
    {
      uuid: uuid(),
      name: data.name,
      handle: data.handle,
      email: data.email,
      password_hash: data.passwordHash,
      role_id: role.id,
      affiliation: data.affiliation || null,
      ...identityKeysFor(data),
      account_type: data.accountType || null,
      country: data.country || null,
      status: data.status,
      email_verified_at: data.emailVerifiedAt,
    },
    trx,
  );

  await trx('user_settings').insert({
    user_id: userId,
    notify_newsletter: Boolean(data.newsletter),
  });

  return userRepository.findByIdWithRole(userId, trx);
}

/** Issues an access + refresh pair and records the session. */
async function issueTokens(user, context = {}, trx) {
  const sessionId = uuid();
  const accessToken = jwtUtil.signAccessToken(user);
  const refreshToken = jwtUtil.signRefreshToken(user, sessionId);

  await userRepository.createRefreshToken(
    {
      session_id: sessionId,
      user_id: user.id,
      token_hash: jwtUtil.hashToken(refreshToken),
      user_agent: (context.userAgent || '').slice(0, 255),
      ip_address: context.ip || null,
      expires_at: jwtUtil.expiryDate(config.jwt.refreshExpiresIn),
    },
    trx,
  );

  return {
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    expiresIn: config.jwt.accessExpiresIn,
  };
}

async function loadProfile(user) {
  const [badges, expertise, settings] = await Promise.all([
    userRepository.getBadges(user.id),
    userRepository.getExpertise(user.id),
    userRepository.getSettings(user.id),
  ]);
  return toPrivateUser(user, {
    badges,
    expertise,
    settings,
    permissions: permissionsForRole(user.role),
  });
}

const authService = {
  /**
   * CHIP-001 — start a signup.
   *
   * Nothing is written to `users` here: the details are parked in
   * pending_registrations and the account is created only once the emailed code
   * confirms the address (see `verifyEmail`). An address that is never confirmed
   * therefore leaves no account behind.
   */
  async register(payload, context = {}) {
    if (!config.features.registrationOpen) {
      throw ApiError.forbidden('Registration is currently closed', { code: 'REGISTRATION_CLOSED' });
    }

    const email = payload.email.toLowerCase();
    if (await userRepository.emailTaken(email)) {
      throw ApiError.conflict('An account with this email address already exists', { code: 'EMAIL_TAKEN' });
    }

    const handle = payload.handle
      ? payload.handle.toLowerCase()
      : await uniqueHandle(payload.name, (candidate) => userRepository.handleTaken(candidate));

    if (payload.handle && (await userRepository.handleTaken(handle))) {
      throw ApiError.conflict('This handle is already taken', { code: 'HANDLE_TAKEN' });
    }

    const passwordHash = await hashPassword(payload.password);

    // Verification switched off (dev / self-hosted): the account is real at once.
    if (!config.features.requireEmailVerification) {
      const user = await db.transaction((trx) =>
        createAccount(
          {
            name: payload.name,
            handle,
            email,
            passwordHash,
            affiliation: payload.affiliation,
            accountType: payload.accountType,
            country: payload.country,
            newsletter: payload.newsletter,
            status: USER_STATUS.ACTIVE,
            emailVerifiedAt: db.fn.now(),
          },
          trx,
        ),
      );

      mailService.sendWelcomeEmail(user).catch(() => {});
      await auditService.log({
        userId: user.id,
        action: 'auth.register',
        entityType: 'user',
        entityId: user.id,
        context,
      });

      return {
        user: await loadProfile(user),
        tokens: await issueTokens(user, context),
        requiresVerification: false,
        verification: null,
      };
    }

    await userRepository.purgeExpiredPendingRegistrations().catch(() => {});

    const token = jwtUtil.randomToken();
    const otp = config.otp.enabled ? jwtUtil.generateOtp() : null;

    await userRepository.upsertPendingRegistration({
      email,
      name: payload.name,
      handle,
      password_hash: passwordHash,
      affiliation: payload.affiliation || null,
      account_type: payload.accountType || null,
      country: payload.country || null,
      newsletter: Boolean(payload.newsletter),
      token_hash: jwtUtil.hashToken(token),
      otp_hash: otp ? jwtUtil.hashToken(otp) : null,
      expires_at: new Date(Date.now() + config.security.emailVerifyExpiresHours * 3600 * 1000),
      ip_address: context.ip || null,
    });

    mailService.sendVerificationEmail({ name: payload.name, email }, { token, otp }).catch(() => {});
    await auditService.log({ action: 'auth.register_requested', entityType: 'user', context });

    // No user, no tokens — the caller is a guest until the code is entered.
    return {
      user: null,
      tokens: null,
      requiresVerification: true,
      verification: {
        method: config.otp.enabled ? 'otp' : 'link',
        email,
        otpLength: config.otp.length,
        expiresInMinutes: config.security.emailVerifyExpiresHours * 60,
        ...devOtpPayload(otp),
      },
    };
  },

  /** CHIP-002 — email + password sign-in. */
  async login({ email, password }, context = {}) {
    const user = await userRepository.findByEmail(email);
    const invalid = ApiError.unauthorized('Email or password is incorrect', { code: 'INVALID_CREDENTIALS' });

    if (!user) {
      // No account — but there may be a signup that never confirmed its address.
      // One bcrypt comparison always runs, so the timing cannot distinguish
      // "no such user" from "wrong password".
      const pending = await userRepository.findPendingRegistrationByEmail(email, { includeExpired: true });
      const matchesPending = await comparePassword(
        password,
        pending?.password_hash || '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv',
      );

      // Only acknowledged once the password checks out, so the endpoint still
      // cannot be used to discover which addresses have signed up.
      if (pending && matchesPending) {
        throw ApiError.forbidden('Confirm your email address to finish creating your account', {
          code: 'EMAIL_NOT_VERIFIED',
          details: { email: pending.email },
        });
      }
      throw invalid;
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      throw ApiError.forbidden('Too many failed attempts. Please try again shortly', {
        code: 'ACCOUNT_LOCKED',
        details: { lockedUntil: user.locked_until },
      });
    }
    if (user.status === USER_STATUS.BANNED) {
      throw ApiError.forbidden('This account has been banned', { code: 'ACCOUNT_BANNED' });
    }
    if (user.status === USER_STATUS.SUSPENDED) {
      throw ApiError.forbidden('This account is suspended', {
        code: 'ACCOUNT_SUSPENDED',
        details: { reason: user.suspension_reason, until: user.suspended_until },
      });
    }

    const matches = await comparePassword(password, user.password_hash);
    if (!matches) {
      const attempts = (user.failed_login_attempts || 0) + 1;
      await userRepository.update(user.id, {
        failed_login_attempts: attempts,
        locked_until:
          attempts >= MAX_FAILED_LOGINS ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000) : null,
      });
      throw invalid;
    }

    if (config.features.requireEmailVerification && !user.email_verified_at) {
      throw ApiError.forbidden('Please verify your email address before signing in', {
        code: 'EMAIL_NOT_VERIFIED',
        details: { email: user.email },
      });
    }

    await userRepository.update(user.id, {
      failed_login_attempts: 0,
      locked_until: null,
      last_login_at: db.fn.now(),
      last_login_ip: context.ip || null,
      status: user.status === USER_STATUS.PENDING ? USER_STATUS.ACTIVE : user.status,
    });

    const tokens = await issueTokens(user, context);

    await auditService.log({ userId: user.id, action: 'auth.login', entityType: 'user', entityId: user.id, context });

    return { user: await loadProfile(user), tokens };
  },

  /** Rotates a refresh token; detects reuse of a revoked token. */
  async refresh(refreshToken, context = {}) {
    if (!refreshToken) {
      throw ApiError.unauthorized('Refresh token is required', { code: 'TOKEN_MISSING' });
    }

    const payload = jwtUtil.verifyRefreshToken(refreshToken);
    const tokenHash = jwtUtil.hashToken(refreshToken);
    let session = await userRepository.findRefreshToken(tokenHash);

    if (!session) {
      // Valid signature but no live session. Before assuming theft, check whether
      // this is simply a token *we* rotated moments ago: a second tab, or a
      // reload that cut the response off before the client stored the new pair,
      // both legitimately present the previous token. Revoking every session for
      // that would sign the user out of everything for using the app normally.
      const previous = await userRepository.findAnyRefreshToken(tokenHash);
      const rotatedAt = previous?.revoked_at ? new Date(previous.revoked_at).getTime() : 0;
      const withinGrace =
        previous?.revoked_reason === 'rotated' &&
        Date.now() - rotatedAt <= REFRESH_REUSE_GRACE_SECONDS * 1000;

      if (!withinGrace) {
        await userRepository.revokeAllRefreshTokens(payload.sub, 'reuse_detected');
        logger.warn(`Refresh token reuse detected for user ${payload.sub}`);
        throw ApiError.unauthorized('This session is no longer valid. Please sign in again', {
          code: 'SESSION_REVOKED',
        });
      }

      logger.debug(`Benign refresh race for user ${previous.user_id}; issuing a fresh pair`);
      session = previous;
    }

    if (new Date(session.expires_at) < new Date()) {
      throw ApiError.unauthorized('Your session has expired. Please sign in again', { code: 'SESSION_EXPIRED' });
    }

    const user = await userRepository.findByIdWithRole(session.user_id);
    if (!user || user.status === USER_STATUS.BANNED || user.status === USER_STATUS.SUSPENDED) {
      await userRepository.revokeAllRefreshTokens(session.user_id, 'account_inactive');
      throw ApiError.forbidden('This account can no longer sign in', { code: 'ACCOUNT_INACTIVE' });
    }

    const tokens = await db.transaction(async (trx) => {
      // Already revoked when this is the grace path; revoking again is a no-op
      // because the update is scoped to rows with a null revoked_at.
      await userRepository.revokeRefreshToken(session.session_id, 'rotated', trx);
      return issueTokens(user, context, trx);
    });

    return { user: await loadProfile(user), tokens };
  },

  /** Revokes the presented session (or all of them). */
  async logout(refreshToken, { allDevices = false, userId } = {}) {
    if (allDevices && userId) {
      await userRepository.revokeAllRefreshTokens(userId, 'logout_all');
      return { revoked: 'all' };
    }
    if (!refreshToken) return { revoked: 'none' };

    const session = await userRepository.findRefreshToken(jwtUtil.hashToken(refreshToken));
    if (session) await userRepository.revokeRefreshToken(session.session_id, 'logout');
    return { revoked: session ? 'session' : 'none' };
  },

  /**
   * CHIP-001 — confirm the address and *create* the account.
   * Accepts either `{ token }` from the magic link or `{ email, otp }`.
   * Signs the new member in on success — they just proved control of the inbox,
   * so asking for the password again would be pure friction.
   */
  async verifyEmail(payload, context = {}) {
    const pending = await resolvePendingRegistration(payload);

    if (pending) {
      const user = await db.transaction(async (trx) => {
        // Re-checked inside the transaction: the address or handle may have been
        // claimed while the code sat unread in an inbox.
        if (await userRepository.emailTaken(pending.email, null, trx)) {
          throw ApiError.conflict('An account with this email address already exists', {
            code: 'EMAIL_TAKEN',
          });
        }

        const handle = (await userRepository.handleTaken(pending.handle, null, trx))
          ? await uniqueHandle(pending.name, (candidate) => userRepository.handleTaken(candidate, null, trx))
          : pending.handle;

        const created = await createAccount(
          {
            name: pending.name,
            handle,
            email: pending.email,
            passwordHash: pending.password_hash,
            affiliation: pending.affiliation,
            accountType: pending.account_type,
            country: pending.country,
            newsletter: pending.newsletter,
            status: USER_STATUS.ACTIVE,
            emailVerifiedAt: db.fn.now(),
          },
          trx,
        );

        await userRepository.deletePendingRegistration(pending.id, trx);
        return created;
      });

      await userRepository.awardBadge(user.id, 'early-adopter').catch(() => {});
      mailService.sendWelcomeEmail(user).catch(() => {});
      await auditService.log({
        userId: user.id,
        action: 'auth.register',
        entityType: 'user',
        entityId: user.id,
        context,
      });

      return { user: await loadProfile(user), tokens: await issueTokens(user, context), verified: true };
    }

    // Accounts created before pending_registrations existed still confirm the
    // old way: the row is already in `users` and only needs activating.
    const { record } = await resolveOneTimeCredential(
      payload,
      TOKEN_TYPES.EMAIL_VERIFICATION,
      'This verification link or code is invalid or has expired',
    );

    const user = await db.transaction(async (trx) => {
      await userRepository.consumeUserToken(record.id, trx);
      await userRepository.update(
        record.user_id,
        { email_verified_at: db.fn.now(), status: USER_STATUS.ACTIVE },
        trx,
      );
      return userRepository.findByIdWithRole(record.user_id, trx);
    });

    await userRepository.awardBadge(user.id, 'early-adopter').catch(() => {});
    mailService.sendWelcomeEmail(user).catch(() => {});

    const tokens = await issueTokens(user, context);

    return { user: await loadProfile(user), tokens, verified: true };
  },

  /** Re-sends the verification email. Always reports success. */
  async resendVerification(email, context = {}) {
    const generic = { sent: true, otpLength: config.otp.length };

    // A signup still waiting on its code: re-arm the same row rather than making
    // the user fill the form again. Expired rows are re-armed too.
    const pending = await userRepository.findPendingRegistrationByEmail(email, { includeExpired: true });
    if (pending) {
      const token = jwtUtil.randomToken();
      const otp = config.otp.enabled ? jwtUtil.generateOtp() : null;

      await userRepository.updatePendingRegistration(pending.id, {
        token_hash: jwtUtil.hashToken(token),
        otp_hash: otp ? jwtUtil.hashToken(otp) : null,
        attempts: 0,
        expires_at: new Date(Date.now() + config.security.emailVerifyExpiresHours * 3600 * 1000),
      });

      mailService
        .sendVerificationEmail({ name: pending.name, email: pending.email }, { token, otp })
        .catch(() => {});
      return { ...generic, ...devOtpPayload(otp) };
    }

    const user = await userRepository.findByEmail(email);
    if (!user || user.email_verified_at) return generic;

    const credentials = await db.transaction(async (trx) => {
      await userRepository.invalidateUserTokens(user.id, TOKEN_TYPES.EMAIL_VERIFICATION, trx);
      return issueOneTimeCredentials(
        user.id,
        TOKEN_TYPES.EMAIL_VERIFICATION,
        new Date(Date.now() + config.security.emailVerifyExpiresHours * 3600 * 1000),
        context,
        trx,
      );
    });

    mailService.sendVerificationEmail(user, credentials).catch(() => {});
    return { ...generic, ...devOtpPayload(credentials.otp) };
  },

  /** CHIP-003 — request a reset code/link. Never reveals whether the email exists. */
  async forgotPassword(email, context = {}) {
    const user = await userRepository.findByEmail(email);
    const generic = {
      sent: true,
      otpLength: config.otp.length,
      expiresInMinutes: config.security.passwordResetExpiresMinutes,
    };

    if (!user || user.status === USER_STATUS.BANNED) return generic;

    const credentials = await db.transaction(async (trx) => {
      await userRepository.invalidateUserTokens(user.id, TOKEN_TYPES.PASSWORD_RESET, trx);
      return issueOneTimeCredentials(
        user.id,
        TOKEN_TYPES.PASSWORD_RESET,
        new Date(Date.now() + config.security.passwordResetExpiresMinutes * 60 * 1000),
        context,
        trx,
      );
    });

    mailService.sendPasswordResetEmail(user, credentials).catch(() => {});
    return { ...generic, ...devOtpPayload(credentials.otp) };
  },

  /**
   * CHIP-003 — set a new password.
   * Accepts either `{ token, password }` or `{ email, otp, password }`.
   */
  async resetPassword({ token, email, otp, password }, context = {}) {
    const { record } = await resolveOneTimeCredential(
      { token, email, otp },
      TOKEN_TYPES.PASSWORD_RESET,
      'This reset link or code is invalid or has expired',
    );

    const user = await db.transaction(async (trx) => {
      await userRepository.consumeUserToken(record.id, trx);
      await userRepository.update(
        record.user_id,
        {
          password_hash: await hashPassword(password),
          failed_login_attempts: 0,
          locked_until: null,
        },
        trx,
      );
      // A password change ends every existing session.
      await userRepository.revokeAllRefreshTokens(record.user_id, 'password_reset', trx);
      return userRepository.findByIdWithRole(record.user_id, trx);
    });

    mailService.sendPasswordChangedEmail(user).catch(() => {});
    await auditService.log({
      userId: user.id,
      action: 'auth.password_reset',
      entityType: 'user',
      entityId: user.id,
      context,
    });

    return { reset: true };
  },

  /** Password change from inside the app (SCR-015). */
  async changePassword(userId, { currentPassword, newPassword }, context = {}) {
    const user = await userRepository.findByIdWithRole(userId);
    if (!user) throw ApiError.notFound('Account not found');

    if (!(await comparePassword(currentPassword, user.password_hash))) {
      throw ApiError.badRequest('Your current password is incorrect', { code: 'INVALID_CURRENT_PASSWORD' });
    }
    if (await comparePassword(newPassword, user.password_hash)) {
      throw ApiError.badRequest('The new password must be different from the current one', {
        code: 'PASSWORD_UNCHANGED',
      });
    }

    await db.transaction(async (trx) => {
      await userRepository.update(userId, { password_hash: await hashPassword(newPassword) }, trx);
      await userRepository.revokeAllRefreshTokens(userId, 'password_changed', trx);
    });

    mailService.sendPasswordChangedEmail(user).catch(() => {});
    await auditService.log({
      userId,
      action: 'auth.password_change',
      entityType: 'user',
      entityId: userId,
      context,
    });

    // Every session was revoked, so hand back a fresh pair for this device.
    return { tokens: await issueTokens(user, context) };
  },

  /** Current user + permissions — used to hydrate the app shell on load. */
  async me(userId) {
    const user = await userRepository.findByIdWithRole(userId);
    if (!user) throw ApiError.notFound('Account not found');
    return loadProfile(user);
  },

  listSessions(userId) {
    return userRepository.listSessions(userId);
  },

  async revokeSession(userId, sessionId) {
    const sessions = await userRepository.listSessions(userId);
    if (!sessions.some((s) => s.session_id === sessionId)) {
      throw ApiError.notFound('Session not found');
    }
    await userRepository.revokeRefreshToken(sessionId, 'revoked_by_user');
    return { revoked: true };
  },
};

module.exports = authService;
module.exports.issueTokens = issueTokens;
