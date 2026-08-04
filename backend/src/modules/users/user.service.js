/**
 * Profiles and account settings (SCR-014, SCR-015, SCR-016 · CHIP-004, CHIP-051/052).
 */
const { db } = require('../../database/connection');
const ApiError = require('../../utils/ApiError');
const { pick } = require('../../utils/helpers');
const { getPagination, buildPaginationMeta } = require('../../utils/pagination');
const { USER_STATUS, FILE_KIND } = require('../../config/constants');
const { permissionsForRole } = require('../../config/permissions');
const { removeStoredFile, describeFile, publicUrlFor } = require('../../middlewares/upload');
const userRepository = require('./user.repository');
const { identityKeysFor, identityKeysForRow } = require('./affiliation');
const { toPublicUser, toPrivateUser, toMemberCard, toInstitutionRef, toSettings } = require('./user.serializer');
const auditService = require('../../services/audit.service');

const PROFILE_FIELDS = ['name', 'affiliation', 'account_type', 'country', 'website', 'orcid', 'bio'];

/** How many affiliated members an institution page shows before "and N more". */
const MEMBER_PREVIEW_LIMIT = 24;

async function decorate(user) {
  const [badges, expertise, settings] = await Promise.all([
    userRepository.getBadges(user.id),
    userRepository.getExpertise(user.id),
    userRepository.getSettings(user.id),
  ]);
  return { badges, expertise, settings };
}

const userService = {
  /** Own profile, including settings and effective permissions. */
  async getProfile(userId) {
    const user = await userRepository.findByIdWithRole(userId);
    if (!user) throw ApiError.notFound('Account not found');
    const extras = await decorate(user);
    return toPrivateUser(user, { ...extras, permissions: permissionsForRole(user.role) });
  },

  /** SCR-016 — public member page: uploads, reputation, badges, expertise. */
  async getPublicProfile(handle, viewer = null) {
    const user = await userRepository.findByHandle(handle);
    if (!user || user.status === USER_STATUS.BANNED) throw ApiError.notFound('Member not found');

    const extras = await decorate(user);
    const isSelf = viewer && Number(viewer.id) === Number(user.id);
    const isStaff = viewer && ['admin', 'moderator'].includes(viewer.role);

    if (extras.settings && !extras.settings.profile_public && !isSelf && !isStaff) {
      throw ApiError.forbidden('This profile is private', { code: 'PROFILE_PRIVATE' });
    }

    const [publishedDesigns, stats] = await Promise.all([
      db('designs')
        .where({ owner_id: user.id, status: 'published' })
        .whereNull('deleted_at')
        .orderBy('published_at', 'desc')
        .limit(12)
        .select(
          'id',
          'uuid',
          'slug',
          'title',
          'summary',
          'download_count',
          'star_count',
          'published_at',
          'current_version_id',
        ),
      db('designs')
        .where({ owner_id: user.id })
        .whereNull('deleted_at')
        .select(
          db.raw('COUNT(*) as total'),
          db.raw("SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published"),
          db.raw('COALESCE(SUM(download_count), 0) as downloads'),
          db.raw('COALESCE(SUM(star_count), 0) as stars'),
        )
        .first(),
    ]);

    // Same cover rule as browse cards — nominated cover first, else first image.
    const versionIds = publishedDesigns.map((d) => d.current_version_id).filter(Boolean);
    const coverByVersion = {};
    if (versionIds.length) {
      const imageRows = await db('design_files')
        .whereIn('design_version_id', versionIds)
        .where('kind', FILE_KIND.IMAGE)
        .orderBy('is_cover', 'desc')
        .orderBy('sort_order')
        .orderBy('id')
        .select('design_version_id', 'path');
      for (const image of imageRows) {
        if (!(image.design_version_id in coverByVersion)) {
          coverByVersion[image.design_version_id] = image.path;
        }
      }
    }

    // An institution page lists the members who named it — matched on its own
    // name. Any page can also link back to the institution its affiliation
    // names, including one institution sitting under a parent.
    const { affiliation_key: affiliationKey, institution_key: institutionKey } = identityKeysForRow(user);

    const [members, institution] = await Promise.all([
      institutionKey
        ? userRepository.listAffiliatedMembers(institutionKey, {
            excludeUserId: user.id,
            limit: MEMBER_PREVIEW_LIMIT,
          })
        : null,
      userRepository.findInstitutionByKey(affiliationKey, user.id),
    ]);

    const forumStats = await db('forum_posts')
      .where({ user_id: user.id, status: 'visible' })
      .whereNull('deleted_at')
      .select(
        db.raw('COUNT(*) as posts'),
        db.raw('SUM(CASE WHEN is_accepted = 1 THEN 1 ELSE 0 END) as accepted_answers'),
      )
      .first();

    return {
      ...toPublicUser(user, extras),
      stats: {
        designs: Number(stats?.total) || 0,
        publishedDesigns: Number(stats?.published) || 0,
        downloads: Number(stats?.downloads) || 0,
        stars: Number(stats?.stars) || 0,
        forumPosts: Number(forumStats?.posts) || 0,
        acceptedAnswers: Number(forumStats?.accepted_answers) || 0,
      },
      // Serialised here rather than handed over raw — the client should never
      // have to know about snake_case column names.
      recentDesigns: publishedDesigns.map((design) => ({
        id: design.uuid,
        slug: design.slug,
        title: design.title,
        summary: design.summary,
        downloads: Number(design.download_count) || 0,
        stars: Number(design.star_count) || 0,
        publishedAt: design.published_at,
        coverImageUrl: publicUrlFor(coverByVersion[design.current_version_id] || null),
      })),
      // Null on a member page; an institution always gets an object, even when
      // nobody has named it yet, so the client can tell "no members" apart from
      // "not an institution".
      members: members
        ? { total: members.total, items: members.items.map(toMemberCard) }
        : null,
      institution: toInstitutionRef(institution),
      isSelf: Boolean(isSelf),
    };
  },

  /** SCR-014 — edit own profile data. */
  async updateProfile(userId, payload, context = {}) {
    const user = await userRepository.findByIdWithRole(userId);
    if (!user) throw ApiError.notFound('Account not found');

    if (payload.handle && payload.handle !== user.handle) {
      if (await userRepository.handleTaken(payload.handle, userId)) {
        throw ApiError.conflict('This handle is already taken', { code: 'HANDLE_TAKEN' });
      }
    }

    const updates = pick(
      {
        name: payload.name,
        affiliation: payload.affiliation,
        account_type: payload.accountType,
        country: payload.country,
        website: payload.website,
        orcid: payload.orcid,
        bio: payload.bio,
        handle: payload.handle,
      },
      [...PROFILE_FIELDS, 'handle'],
    );

    // Recomputed on every write, or a member who corrects their employer would
    // stay listed under the old institution — and a renamed institution would
    // stop matching its own people. Merged with the stored row because the keys
    // depend on name and account type too, which may not be in this payload.
    Object.assign(
      updates,
      identityKeysFor({
        accountType: updates.account_type ?? user.account_type,
        affiliation: 'affiliation' in updates ? updates.affiliation : user.affiliation,
        name: updates.name ?? user.name,
      }),
    );

    await db.transaction(async (trx) => {
      await userRepository.update(userId, updates, trx);
      if (payload.expertise) await userRepository.replaceExpertise(userId, payload.expertise, trx);
    });

    await auditService.log({
      userId,
      action: 'user.profile_update',
      entityType: 'user',
      entityId: userId,
      changes: { before: pick(user, PROFILE_FIELDS), after: updates },
      context,
    });

    return this.getProfile(userId);
  },

  /** Replaces the avatar and removes the previous file from disk. */
  async updateAvatar(userId, file) {
    if (!file) throw ApiError.badRequest('No image was uploaded', { code: 'FILE_REQUIRED' });

    const user = await userRepository.findById(userId);
    if (!user) throw ApiError.notFound('Account not found');

    const described = describeFile(file);
    await userRepository.update(userId, { avatar_path: described.path });
    if (user.avatar_path) await removeStoredFile(user.avatar_path);

    return this.getProfile(userId);
  },

  async removeAvatar(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw ApiError.notFound('Account not found');
    if (user.avatar_path) {
      await userRepository.update(userId, { avatar_path: null });
      await removeStoredFile(user.avatar_path);
    }
    return this.getProfile(userId);
  },

  /** SCR-015 — notification and privacy preferences. */
  async getSettings(userId) {
    const settings = await userRepository.getSettings(userId);
    return toSettings(settings || {});
  },

  async updateSettings(userId, payload) {
    const updates = pick(
      {
        email_notifications: payload.emailNotifications,
        notify_design_comments: payload.notifyDesignComments,
        notify_forum_replies: payload.notifyForumReplies,
        notify_mentions: payload.notifyMentions,
        notify_messages: payload.notifyMessages,
        notify_newsletter: payload.notifyNewsletter,
        profile_public: payload.profilePublic,
        show_email: payload.showEmail,
        locale: payload.locale,
      },
      [
        'email_notifications', 'notify_design_comments', 'notify_forum_replies', 'notify_mentions',
        'notify_messages', 'notify_newsletter', 'profile_public', 'show_email', 'locale',
      ],
    );

    const settings = await userRepository.upsertSettings(userId, updates);
    return toSettings(settings);
  },

  /**
   * SCR-015 — self-service account deletion.
   * Soft-deletes and anonymises the row: designs, comments and forum posts stay
   * attributed to a tombstone so the library keeps its provenance chain, while
   * personal data is removed.
   */
  async deleteAccount(userId, { password, reason } = {}, context = {}) {
    const { comparePassword } = require('../../utils/password');
    const user = await userRepository.findByIdWithRole(userId);
    if (!user) throw ApiError.notFound('Account not found');

    if (!(await comparePassword(password, user.password_hash))) {
      throw ApiError.badRequest('Your password is incorrect', { code: 'INVALID_PASSWORD' });
    }

    await db.transaction(async (trx) => {
      await userRepository.update(
        userId,
        {
          name: 'Deleted member',
          email: `deleted-${userId}-${Date.now()}@chipper.invalid`,
          handle: `deleted.${userId}`,
          password_hash: null,
          affiliation: null,
          affiliation_key: null,
          institution_key: null,
          country: null,
          website: null,
          orcid: null,
          bio: null,
          avatar_path: null,
          status: USER_STATUS.SUSPENDED,
          deleted_at: db.fn.now(),
        },
        trx,
      );
      await userRepository.revokeAllRefreshTokens(userId, 'account_deleted', trx);
      await trx('user_expertise').where({ user_id: userId }).del();
      if (user.avatar_path) await removeStoredFile(user.avatar_path);
    });

    await auditService.log({
      userId,
      action: 'user.delete_account',
      entityType: 'user',
      entityId: userId,
      changes: { reason: reason || null },
      context,
    });

    return { deleted: true };
  },

  /** Member directory — signed-in members searching for one another. */
  async search(query) {
    const { page, limit } = getPagination(query);
    const base = userRepository
      .searchQuery({
        search: query.search,
        role: query.role,
        accountType: query.accountType || undefined,
        status: USER_STATUS.ACTIVE,
        publicOnly: true,
      })
      .clone();

    const [{ total }] = await base.clone().clearSelect().clearOrder().count({ total: 'users.id' });
    const rows = await base
      // Most established first, then `id` so the order is total — without it,
      // members sharing a reputation could shuffle between pages under LIMIT.
      .orderBy([
        { column: 'users.reputation', order: 'desc' },
        { column: 'users.upload_count', order: 'desc' },
        { column: 'users.id', order: 'asc' },
      ])
      .limit(limit)
      .offset((page - 1) * limit);

    // One round-trip for expertise tags so directory cards stay informative
    // without an N+1 per member.
    const ids = rows.map((row) => row.id);
    const expertiseRows = ids.length
      ? await db('user_expertise').whereIn('user_id', ids).select('user_id', 'term')
      : [];
    const expertiseByUser = expertiseRows.reduce((acc, row) => {
      (acc[row.user_id] = acc[row.user_id] || []).push(row.term);
      return acc;
    }, {});

    return {
      items: rows.map((row) => toPublicUser(row, { expertise: expertiseByUser[row.id] || [] })),
      pagination: buildPaginationMeta({ total, page, limit }),
    };
  },

  /** Lightweight lookup used by the @mention picker in the forum and messages. */
  async mentionSuggestions(term, limit = 8) {
    if (!term || term.length < 2) return [];
    const rows = await userRepository.searchPublic(term, limit);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      handle: r.handle,
      affiliation: r.affiliation,
      avatarUrl: require('../../middlewares/upload').publicUrlFor(r.avatar_path),
    }));
  },
};

module.exports = userService;
