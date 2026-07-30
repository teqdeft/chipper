/**
 * Users, sessions, one-time tokens, badges, expertise and settings.
 * `role` is always resolved to its name so callers never juggle role_id.
 */
const BaseRepository = require('../../repositories/BaseRepository');
const { db } = require('../../database/connection');
const { escapeLike } = require('../../utils/helpers');
const { USER_STATUS, ACCOUNT_TYPE } = require('../../config/constants');

const PUBLIC_COLUMNS = [
  'users.id',
  'users.uuid',
  'users.name',
  'users.handle',
  'users.affiliation',
  'users.account_type',
  'users.country',
  'users.website',
  'users.orcid',
  'users.bio',
  'users.avatar_path',
  'users.reputation',
  'users.upload_count',
  'users.status',
  'users.created_at',
];

class UserRepository extends BaseRepository {
  constructor() {
    super('users', { softDelete: true });
  }

  /** Base builder with the role name joined in. */
  baseQuery(trx) {
    return (trx || db)('users')
      .join('roles', 'users.role_id', 'roles.id')
      .select('users.*', 'roles.name as role', 'roles.level as role_level');
  }

  /** Minimal projection used by the authenticate middleware on every request. */
  findAuthById(id, trx) {
    return (trx || db)('users')
      .join('roles', 'users.role_id', 'roles.id')
      .where('users.id', id)
      .select(
        'users.id',
        'users.uuid',
        'users.name',
        'users.handle',
        'users.email',
        'users.status',
        'users.email_verified_at',
        'users.deleted_at',
        'roles.name as role',
      )
      .first();
  }

  findByEmail(email, trx) {
    return this.baseQuery(trx).where('users.email', String(email).toLowerCase()).whereNull('users.deleted_at').first();
  }

  findByHandle(handle, trx) {
    return this.baseQuery(trx).where('users.handle', String(handle).toLowerCase()).whereNull('users.deleted_at').first();
  }

  findByIdWithRole(id, trx) {
    return this.baseQuery(trx).where('users.id', id).whereNull('users.deleted_at').first();
  }

  findByUuid(uuidValue, trx) {
    return this.baseQuery(trx).where('users.uuid', uuidValue).whereNull('users.deleted_at').first();
  }

  /** Includes soft-deleted rows so registration cannot silently reuse an email. */
  emailTaken(email, excludeId, trx) {
    const q = (trx || db)('users').where('email', String(email).toLowerCase());
    if (excludeId) q.whereNot('id', excludeId);
    return q.first().then(Boolean);
  }

  handleTaken(handle, excludeId, trx) {
    const q = (trx || db)('users').where('handle', String(handle).toLowerCase());
    if (excludeId) q.whereNot('id', excludeId);
    return q.first().then(Boolean);
  }

  /**
   * Shared by the admin user list (SCR-033) and the member directory.
   *
   * @param {object} filters
   * @param {boolean} [filters.publicOnly] narrows the query to what one member
   *        may see of another: no email column, no matching on email, and nobody
   *        who has hidden their profile. Leave it off for staff screens.
   */
  searchQuery({ search, role, status, verified, accountType, publicOnly = false } = {}, trx) {
    const q = (trx || db)('users')
      .join('roles', 'users.role_id', 'roles.id')
      .whereNull('users.deleted_at')
      .select(...PUBLIC_COLUMNS, 'roles.name as role');

    if (publicOnly) {
      q.leftJoin('user_settings', 'user_settings.user_id', 'users.id')
        // Rows predating user_settings have no preference stored; the column
        // defaults to public, so treat a missing row the same way.
        .where((b) => b.where('user_settings.profile_public', true).orWhereNull('user_settings.id'));
    } else {
      q.select('users.email', 'users.last_login_at');
    }

    if (search) {
      const term = `%${escapeLike(search)}%`;
      q.where((b) => {
        b.where('users.name', 'like', term)
          .orWhere('users.handle', 'like', term)
          .orWhere('users.affiliation', 'like', term);
        // Email is searchable for staff only — matching on it in the member
        // directory would confirm whether any given address is registered.
        if (!publicOnly) b.orWhere('users.email', 'like', term);
      });
    }
    if (role) q.where('roles.name', role);
    if (status) q.where('users.status', status);
    if (accountType) q.where('users.account_type', accountType);
    if (verified === true) q.whereNotNull('users.email_verified_at');
    if (verified === false) q.whereNull('users.email_verified_at');

    return q;
  }

  /** Public member directory / mention autocomplete. */
  async searchPublic(term, limit = 10, trx) {
    const like = `%${escapeLike(term)}%`;
    return (trx || db)('users')
      .whereNull('users.deleted_at')
      .where('users.status', USER_STATUS.ACTIVE)
      .where((b) => b.where('users.name', 'like', like).orWhere('users.handle', 'like', like))
      .select('users.id', 'users.name', 'users.handle', 'users.avatar_path', 'users.affiliation')
      .limit(limit);
  }

  getRoleByName(name, trx) {
    return (trx || db)('roles').where({ name }).first();
  }

  listRoles(trx) {
    return (trx || db)('roles').orderBy('level', 'asc').select('id', 'name', 'label', 'level', 'description');
  }

  // ── Settings ─────────────────────────────────────────────────────────────
  getSettings(userId, trx) {
    return (trx || db)('user_settings').where({ user_id: userId }).first();
  }

  async upsertSettings(userId, data, trx) {
    const existing = await this.getSettings(userId, trx);
    if (existing) {
      await (trx || db)('user_settings').where({ user_id: userId }).update(data);
    } else {
      await (trx || db)('user_settings').insert({ user_id: userId, ...data });
    }
    return this.getSettings(userId, trx);
  }

  // ── Expertise ────────────────────────────────────────────────────────────
  getExpertise(userId, trx) {
    return (trx || db)('user_expertise').where({ user_id: userId }).pluck('term');
  }

  async replaceExpertise(userId, terms = [], trx) {
    const runner = trx || db;
    await runner('user_expertise').where({ user_id: userId }).del();
    const unique = [...new Set(terms.map((t) => String(t).trim()).filter(Boolean))].slice(0, 20);
    if (unique.length) {
      await runner('user_expertise').insert(unique.map((term) => ({ user_id: userId, term })));
    }
    return unique;
  }

  // ── Badges ───────────────────────────────────────────────────────────────
  getBadges(userId, trx) {
    return (trx || db)('user_badges')
      .join('badges', 'user_badges.badge_id', 'badges.id')
      .where('user_badges.user_id', userId)
      .orderBy('badges.sort_order')
      .select('badges.slug', 'badges.name', 'badges.description', 'badges.tone', 'user_badges.awarded_at');
  }

  async awardBadge(userId, badgeSlug, awardedBy = null, trx) {
    const runner = trx || db;
    const badge = await runner('badges').where({ slug: badgeSlug }).first();
    if (!badge) return false;
    const existing = await runner('user_badges').where({ user_id: userId, badge_id: badge.id }).first();
    if (existing) return false;
    await runner('user_badges').insert({ user_id: userId, badge_id: badge.id, awarded_by: awardedBy });
    return true;
  }

  // ── Refresh sessions ─────────────────────────────────────────────────────
  createRefreshToken(data, trx) {
    return (trx || db)('refresh_tokens').insert(data);
  }

  findRefreshToken(tokenHash, trx) {
    return (trx || db)('refresh_tokens').where({ token_hash: tokenHash }).whereNull('revoked_at').first();
  }

  /**
   * Includes revoked rows, so a caller can tell "this token was rotated a moment
   * ago" apart from "this token was never ours". Used to keep a harmless
   * rotation race from being treated as token theft.
   */
  findAnyRefreshToken(tokenHash, trx) {
    return (trx || db)('refresh_tokens').where({ token_hash: tokenHash }).first();
  }

  revokeRefreshToken(sessionId, reason = 'rotated', trx) {
    return (trx || db)('refresh_tokens')
      .where({ session_id: sessionId })
      .whereNull('revoked_at')
      .update({ revoked_at: db.fn.now(), revoked_reason: reason });
  }

  revokeAllRefreshTokens(userId, reason = 'logout_all', trx) {
    return (trx || db)('refresh_tokens')
      .where({ user_id: userId })
      .whereNull('revoked_at')
      .update({ revoked_at: db.fn.now(), revoked_reason: reason });
  }

  listSessions(userId, trx) {
    return (trx || db)('refresh_tokens')
      .where({ user_id: userId })
      .whereNull('revoked_at')
      .where('expires_at', '>', db.fn.now())
      .orderBy('created_at', 'desc')
      .select('session_id', 'user_agent', 'ip_address', 'created_at', 'expires_at');
  }

  purgeExpiredRefreshTokens(trx) {
    return (trx || db)('refresh_tokens').where('expires_at', '<', db.fn.now()).del();
  }

  // ── One-time tokens ──────────────────────────────────────────────────────
  createUserToken(data, trx) {
    return (trx || db)('user_tokens').insert(data);
  }

  findUserToken(tokenHash, type, trx) {
    return (trx || db)('user_tokens')
      .where({ token_hash: tokenHash, type })
      .whereNull('used_at')
      .where('expires_at', '>', db.fn.now())
      .first();
  }

  /**
   * The live OTP request for one user.
   *
   * Scoped by user_id on purpose: a 6-digit code is not unique across the table,
   * so looking one up by hash alone would let any user's code unlock another's
   * account. The caller compares the hash and counts the attempt.
   */
  findLatestOtpRequest(userId, type, trx) {
    return (trx || db)('user_tokens')
      .where({ user_id: userId, type })
      .whereNull('used_at')
      .whereNotNull('otp_hash')
      .where('expires_at', '>', db.fn.now())
      .orderBy('id', 'desc')
      .first();
  }

  incrementTokenAttempts(id, trx) {
    return (trx || db)('user_tokens').where({ id }).increment('attempts', 1);
  }

  consumeUserToken(id, trx) {
    return (trx || db)('user_tokens').where({ id }).update({ used_at: db.fn.now() });
  }

  invalidateUserTokens(userId, type, trx) {
    return (trx || db)('user_tokens')
      .where({ user_id: userId, type })
      .whereNull('used_at')
      .update({ used_at: db.fn.now() });
  }

  // ── Institution ↔ member links ───────────────────────────────────────────
  // See modules/users/affiliation.js for how the key on both sides is derived.

  /**
   * Live accounts that are safe to list on someone else's page.
   * A member who made their profile private is left out: the row would link to a
   * page the visitor cannot open.
   */
  listableQuery(excludeUserId, trx) {
    const q = (trx || db)('users')
      .leftJoin('user_settings', 'user_settings.user_id', 'users.id')
      .whereNull('users.deleted_at')
      .where('users.status', USER_STATUS.ACTIVE)
      // Rows seeded before user_settings existed have no preference recorded;
      // the column defaults to public, so treat a missing row the same way.
      .where((b) => b.where('user_settings.profile_public', true).orWhereNull('user_settings.id'));

    if (excludeUserId) q.whereNot('users.id', excludeUserId);
    return q;
  }

  /**
   * The people who named this institution as their affiliation.
   * @param {string} institutionKey the institution's own `institution_key`
   * @returns {Promise<{ total:number, items:object[] }>}
   */
  async listAffiliatedMembers(institutionKey, { excludeUserId, limit = 24 } = {}, trx) {
    if (!institutionKey) return { total: 0, items: [] };

    const matching = () =>
      this.listableQuery(excludeUserId, trx).where('users.affiliation_key', institutionKey);

    const [{ total }] = await matching().count({ total: 'users.id' });
    if (!Number(total)) return { total: 0, items: [] };

    const items = await matching()
      .select(...PUBLIC_COLUMNS)
      // Most active first: the people a visitor is most likely looking for.
      // `id` breaks remaining ties so the order is total — brand new members all
      // sit on 0 uploads and 0 reputation, and an unstable sort under LIMIT
      // would drop or repeat people between reads.
      .orderBy([
        { column: 'users.upload_count', order: 'desc' },
        { column: 'users.reputation', order: 'desc' },
        { column: 'users.name', order: 'asc' },
        { column: 'users.id', order: 'asc' },
      ])
      .limit(limit);

    return { total: Number(total), items };
  }

  /**
   * The institution account a member's affiliation names, if it has one.
   * Matched against the institution's own name, so an account merely *listing*
   * that affiliation is never mistaken for the institution itself.
   *
   * Nothing stops two accounts registering the same institution name, so the
   * oldest one wins — explicitly ordered, because an unordered `first()` lets
   * MySQL return either row and the link would appear to flip at random.
   * First-come-first-served also never changes once decided, unlike a rule based
   * on reputation or uploads.
   *
   * @param {string} affiliationKey the member's `affiliation_key`
   */
  findInstitutionByKey(affiliationKey, excludeUserId, trx) {
    if (!affiliationKey) return Promise.resolve(undefined);
    return this.listableQuery(excludeUserId, trx)
      .where('users.institution_key', affiliationKey)
      .where('users.account_type', ACCOUNT_TYPE.INSTITUTION)
      .select('users.id', 'users.name', 'users.handle', 'users.avatar_path')
      .orderBy('users.id', 'asc')
      .first();
  }

  // ── Pending registrations ────────────────────────────────────────────────
  // Signups held outside `users` until the email is confirmed. See the
  // 20260730000002 migration for why the row does not live in `users` yet.

  /**
   * Stores the signup, replacing any earlier unconfirmed attempt for the same
   * address — someone who never received the first code simply registers again.
   */
  async upsertPendingRegistration(data, trx) {
    const runner = trx || db;
    const email = String(data.email).toLowerCase();
    await runner('pending_registrations').where({ email }).del();
    await runner('pending_registrations').insert({ ...data, email });
    return runner('pending_registrations').where({ email }).first();
  }

  findPendingRegistrationByToken(tokenHash, trx) {
    return (trx || db)('pending_registrations')
      .where({ token_hash: tokenHash })
      .where('expires_at', '>', db.fn.now())
      .first();
  }

  /**
   * @param {object} [options]
   * @param {boolean} [options.includeExpired] resend re-arms an expired row
   *        rather than making the user fill the form again.
   */
  findPendingRegistrationByEmail(email, { includeExpired = false } = {}, trx) {
    const q = (trx || db)('pending_registrations').where({ email: String(email).toLowerCase() });
    if (!includeExpired) q.where('expires_at', '>', db.fn.now());
    return q.first();
  }

  incrementPendingRegistrationAttempts(id, trx) {
    return (trx || db)('pending_registrations').where({ id }).increment('attempts', 1);
  }

  updatePendingRegistration(id, data, trx) {
    return (trx || db)('pending_registrations').where({ id }).update(data);
  }

  deletePendingRegistration(id, trx) {
    return (trx || db)('pending_registrations').where({ id }).del();
  }

  purgeExpiredPendingRegistrations(trx) {
    return (trx || db)('pending_registrations').where('expires_at', '<', db.fn.now()).del();
  }

  // ── Stats ────────────────────────────────────────────────────────────────
  async stats(trx) {
    const runner = trx || db;
    const [[{ total }], [{ active }], [{ recent }]] = await Promise.all([
      runner('users').whereNull('deleted_at').count({ total: 'id' }),
      runner('users').whereNull('deleted_at').where('status', USER_STATUS.ACTIVE).count({ active: 'id' }),
      runner('users')
        .whereNull('deleted_at')
        .where('created_at', '>=', db.raw('DATE_SUB(NOW(), INTERVAL 30 DAY)'))
        .count({ recent: 'id' }),
    ]);
    return { total: Number(total), active: Number(active), newLast30Days: Number(recent) };
  }
}

module.exports = new UserRepository();
module.exports.PUBLIC_COLUMNS = PUBLIC_COLUMNS;
