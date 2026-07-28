/**
 * Admin operations (SCR-032..038 · CHIP-031, CHIP-033, CHIP-035..039, CHIP-043).
 */
const { db } = require('../../database/connection');
const ApiError = require('../../utils/ApiError');
const { getPagination, buildPaginationMeta } = require('../../utils/pagination');
const { slugify } = require('../../utils/helpers');
const {
  DESIGN_STATUS, USER_STATUS, ROLES, ENTITY_TYPE, NOTIFICATION_TYPE,
} = require('../../config/constants');
const userRepository = require('../users/user.repository');
const designRepository = require('../designs/design.repository');
const forumRepository = require('../forum/forum.repository');
const { toAdminUser } = require('../users/user.serializer');
const notificationService = require('../notifications/notification.service');
const moderationService = require('../moderation/moderation.service');
const mailService = require('../../services/mail.service');
const auditService = require('../../services/audit.service');
const taxonomyService = require('../taxonomy/taxonomy.service');

const adminService = {
  /** SCR-032 — dashboard stats + shortcuts. */
  async dashboard() {
    const [users, designs, forum, moderation, downloads7d, signups7d, recentDesigns] = await Promise.all([
      userRepository.stats(),
      designRepository.stats(),
      forumRepository.stats(),
      moderationService.queueSummary(),
      db('design_downloads')
        .where('created_at', '>=', db.raw('DATE_SUB(NOW(), INTERVAL 7 DAY)'))
        .count({ total: 'id' })
        .first(),
      db('users')
        .whereNull('deleted_at')
        .where('created_at', '>=', db.raw('DATE_SUB(NOW(), INTERVAL 7 DAY)'))
        .count({ total: 'id' })
        .first(),
      designRepository
        .browseQuery({ statuses: Object.values(DESIGN_STATUS) })
        .orderBy('designs.created_at', 'desc')
        .limit(5),
    ]);

    return {
      // Field names mirror the frontend's mockAdminStats.
      designs: designs.total,
      downloads: designs.downloads,
      activeUsers: users.active,
      pendingReview: designs.pending,
      flagged: moderation.open,

      detail: {
        users,
        designs,
        forum,
        moderation,
        last7Days: {
          downloads: Number(downloads7d?.total) || 0,
          signups: Number(signups7d?.total) || 0,
        },
      },
      recentDesigns: recentDesigns.map((d) => ({
        id: d.uuid,
        slug: d.slug,
        title: d.title,
        status: d.status,
        author: d.author_name,
        createdAt: d.created_at,
      })),
    };
  },

  // ── Users (SCR-033) ──────────────────────────────────────────────────────
  async listUsers(query) {
    const { page, limit } = getPagination(query);
    const base = userRepository.searchQuery({
      search: query.search,
      role: query.role,
      status: query.status,
      verified: query.verified,
    });

    const [{ total }] = await base.clone().clearSelect().clearOrder().count({ total: 'users.id' });
    const rows = await base.orderBy('users.created_at', 'desc').limit(limit).offset((page - 1) * limit);

    return {
      items: rows.map(toAdminUser),
      pagination: buildPaginationMeta({ total, page, limit }),
    };
  },

  async getUser(id) {
    const user = await userRepository.findByIdWithRole(id);
    if (!user) throw ApiError.notFound('User not found');

    const [badges, expertise, designs, sessions] = await Promise.all([
      userRepository.getBadges(id),
      userRepository.getExpertise(id),
      db('designs').where({ owner_id: id }).whereNull('deleted_at').count({ total: 'id' }).first(),
      userRepository.listSessions(id),
    ]);

    return {
      ...toAdminUser(user),
      bio: user.bio,
      badges,
      expertise,
      designCount: Number(designs?.total) || 0,
      activeSessions: sessions.length,
      suspensionReason: user.suspension_reason,
      suspendedUntil: user.suspended_until,
    };
  },

  /** CHIP-036 — change a member's role. */
  async changeRole(userId, roleName, admin, context = {}) {
    const user = await userRepository.findByIdWithRole(userId);
    if (!user) throw ApiError.notFound('User not found');

    if (Number(userId) === Number(admin.id) && roleName !== ROLES.ADMIN) {
      throw ApiError.badRequest('You cannot remove your own admin role', { code: 'SELF_DEMOTE' });
    }

    const role = await userRepository.getRoleByName(roleName);
    if (!role) throw ApiError.badRequest(`Unknown role "${roleName}"`);

    await userRepository.update(userId, { role_id: role.id });

    notificationService
      .notify({
        userId,
        actorId: admin.id,
        type: NOTIFICATION_TYPE.ROLE_CHANGED,
        title: 'Your role has changed',
        body: `You are now a ${role.label}.`,
        link: '/settings/account',
      })
      .catch(() => {});

    await auditService.log({
      userId: admin.id,
      action: 'admin.role_change',
      entityType: ENTITY_TYPE.USER,
      entityId: userId,
      changes: { before: user.role, after: roleName },
      context,
    });

    return this.getUser(userId);
  },

  /** Suspend / ban / reactivate. Suspension and bans revoke live sessions. */
  async changeStatus(userId, { status, reason, until }, admin, context = {}) {
    const user = await userRepository.findByIdWithRole(userId);
    if (!user) throw ApiError.notFound('User not found');
    if (Number(userId) === Number(admin.id)) {
      throw ApiError.badRequest('You cannot change your own account status', { code: 'SELF_STATUS' });
    }

    await db.transaction(async (trx) => {
      await userRepository.update(
        userId,
        {
          status,
          suspension_reason: status === USER_STATUS.ACTIVE ? null : reason || null,
          suspended_until: status === USER_STATUS.SUSPENDED ? until || null : null,
        },
        trx,
      );
      if (status !== USER_STATUS.ACTIVE) {
        await userRepository.revokeAllRefreshTokens(userId, status, trx);
      }
    });

    await auditService.log({
      userId: admin.id,
      action: `admin.user_${status}`,
      entityType: ENTITY_TYPE.USER,
      entityId: userId,
      changes: { before: user.status, after: status, reason },
      context,
    });

    return this.getUser(userId);
  },

  async awardBadge(userId, badgeSlug, admin) {
    const awarded = await userRepository.awardBadge(userId, badgeSlug, admin.id);
    if (!awarded) throw ApiError.conflict('That badge is already awarded, or does not exist');
    return this.getUser(userId);
  },

  // ── Designs (SCR-034) ────────────────────────────────────────────────────
  async listDesigns(query) {
    const { page, limit } = getPagination(query);
    const filters = {
      statuses: query.status ? [query.status] : Object.values(DESIGN_STATUS),
      search: query.search,
    };

    const base = designRepository.browseQuery(filters);
    const [{ total }] = await base.clone().clearSelect().clearOrder().count({ total: 'designs.id' });
    const rows = await base.orderBy('designs.created_at', 'desc').limit(limit).offset((page - 1) * limit);

    return {
      items: rows.map((d) => ({
        id: d.uuid,
        numericId: d.id,
        slug: d.slug,
        title: d.title,
        summary: d.summary,
        status: d.status,
        author: d.author_name,
        authorHandle: d.author_handle,
        componentType: d.component_type_name,
        license: d.license_code,
        iso22916: Boolean(d.is_iso22916),
        featured: Boolean(d.is_featured),
        downloads: Number(d.download_count) || 0,
        stars: Number(d.star_count) || 0,
        createdAt: d.created_at,
        publishedAt: d.published_at,
      })),
      pagination: buildPaginationMeta({ total, page, limit }),
    };
  },

  /** CHIP-037 — approve, reject, archive or restore a design. */
  async reviewDesign(identifier, { action, note }, moderator, context = {}) {
    const design = await designRepository.findBySlugOrId(identifier);
    if (!design) throw ApiError.notFound('Design not found');

    const statusByAction = {
      approve: DESIGN_STATUS.PUBLISHED,
      reject: DESIGN_STATUS.REJECTED,
      archive: DESIGN_STATUS.ARCHIVED,
      restore: DESIGN_STATUS.PUBLISHED,
      unpublish: DESIGN_STATUS.DRAFT,
    };
    const status = statusByAction[action];
    if (!status) throw ApiError.badRequest(`Unsupported action "${action}"`);

    await db.transaction(async (trx) => {
      await trx('designs')
        .where({ id: design.id })
        .update({
          status,
          published_at: status === DESIGN_STATUS.PUBLISHED ? design.published_at || trx.fn.now() : design.published_at,
          deleted_at: action === 'restore' ? null : design.deleted_at,
        });

      if (design.current_version_id) {
        await trx('design_versions')
          .where({ id: design.current_version_id })
          .update({
            status,
            published_at: status === DESIGN_STATUS.PUBLISHED ? trx.fn.now() : null,
          });
      }

      await trx('moderation_actions').insert({
        moderator_id: moderator.id,
        entity_type: ENTITY_TYPE.DESIGN,
        entity_id: design.id,
        action,
        note: note || null,
      });
    });

    const owner = await db('users').where({ id: design.owner_id }).first('id', 'name', 'email');
    if (owner) {
      notificationService
        .notify({
          userId: owner.id,
          actorId: moderator.id,
          type: status === DESIGN_STATUS.PUBLISHED ? NOTIFICATION_TYPE.DESIGN_APPROVED : NOTIFICATION_TYPE.DESIGN_REJECTED,
          title: status === DESIGN_STATUS.PUBLISHED ? 'Design approved' : `Design ${status}`,
          body: `${design.title}${note ? ` — ${note}` : ''}`,
          link: `/designs/${design.slug}`,
          entityType: ENTITY_TYPE.DESIGN,
          entityId: design.id,
        })
        .catch(() => {});

      mailService.sendDesignStatusEmail(owner, { design, status, note }).catch(() => {});
    }

    await auditService.log({
      userId: moderator.id,
      action: `admin.design_${action}`,
      entityType: ENTITY_TYPE.DESIGN,
      entityId: design.id,
      changes: { before: design.status, after: status, note },
      context,
    });

    return { status, action };
  },

  async setDesignFeatured(identifier, featured, admin, context = {}) {
    const design = await designRepository.findBySlugOrId(identifier);
    if (!design) throw ApiError.notFound('Design not found');

    await db('designs').where({ id: design.id }).update({ is_featured: featured });
    await auditService.log({
      userId: admin.id,
      action: 'admin.design_feature',
      entityType: ENTITY_TYPE.DESIGN,
      entityId: design.id,
      changes: { featured },
      context,
    });

    return { featured };
  },

  // ── Forum management (SCR-038 · CHIP-039, CHIP-043) ──────────────────────
  async createCategory(payload) {
    const slug = payload.slug || slugify(payload.name);
    const existing = await db('forum_categories').where({ slug }).first();
    if (existing) throw ApiError.conflict('A category with that slug already exists');

    const [id] = await db('forum_categories').insert({
      slug,
      name: payload.name,
      description: payload.description || null,
      icon: payload.icon || null,
      color: payload.color || null,
      sort_order: payload.sortOrder || 0,
    });
    return db('forum_categories').where({ id }).first();
  },

  async updateCategory(slugOrId, payload) {
    const category = await forumRepository.findCategory(slugOrId);
    if (!category) throw ApiError.notFound('Category not found');

    await db('forum_categories')
      .where({ id: category.id })
      .update(
        Object.fromEntries(
          Object.entries({
            name: payload.name,
            description: payload.description,
            icon: payload.icon,
            color: payload.color,
            sort_order: payload.sortOrder,
            is_locked: payload.locked,
            is_active: payload.active,
          }).filter(([, v]) => v !== undefined),
        ),
      );

    return db('forum_categories').where({ id: category.id }).first();
  },

  async deleteCategory(slugOrId) {
    const category = await forumRepository.findCategory(slugOrId);
    if (!category) throw ApiError.notFound('Category not found');

    const [{ total }] = await db('forum_topics')
      .where({ category_id: category.id })
      .whereNull('deleted_at')
      .count({ total: 'id' });

    if (Number(total) > 0) {
      throw ApiError.conflict('Move or remove its topics before deleting this category', {
        code: 'CATEGORY_NOT_EMPTY',
        details: { topics: Number(total) },
      });
    }

    await db('forum_categories').where({ id: category.id }).del();
    return { deleted: true };
  },

  // ── Taxonomy management (CHIP-008..015) ──────────────────────────────────
  /** Lets an admin extend the controlled vocabularies without a deployment. */
  async upsertTaxonomyItem(table, payload) {
    const allowed = [
      'component_types', 'resource_types', 'organs', 'materials',
      'fabrication_methods', 'model_types', 'licenses',
    ];
    if (!allowed.includes(table)) throw ApiError.badRequest('Unknown taxonomy');

    const key = table === 'licenses' ? 'code' : 'slug';
    const identifier = table === 'licenses' ? payload.code : payload.slug || slugify(payload.name);

    const existing = await db(table).where({ [key]: identifier }).first();
    const row = {
      [key]: identifier,
      name: payload.name,
      ...(table === 'licenses'
        ? {
            family: payload.family,
            url: payload.url,
            summary: payload.summary,
            requires_attribution: payload.requiresAttribution,
            allows_commercial: payload.allowsCommercial,
            share_alike: payload.shareAlike,
          }
        : { note: payload.note, description: payload.description }),
      sort_order: payload.sortOrder,
      is_active: payload.active,
    };
    const clean = Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined));

    if (existing) await db(table).where({ id: existing.id }).update(clean);
    else await db(table).insert(clean);

    taxonomyService.bustCache();
    return db(table).where({ [key]: identifier }).first();
  },

  async deactivateTaxonomyItem(table, identifier) {
    const key = table === 'licenses' ? 'code' : 'slug';
    const updated = await db(table).where({ [key]: identifier }).update({ is_active: false });
    if (!updated) throw ApiError.notFound('Item not found');
    taxonomyService.bustCache();
    return { deactivated: true };
  },

  /** Audit trail reader (CHIP-038). */
  async listAuditLogs(query) {
    const { page, limit } = getPagination(query);
    const base = auditService.query(query);
    const [{ total }] = await base.clone().clearSelect().clearOrder().count({ total: 'audit_logs.id' });
    const rows = await base.limit(limit).offset((page - 1) * limit);

    return {
      items: rows.map((r) => ({
        id: r.id,
        action: r.action,
        entityType: r.entity_type,
        entityId: r.entity_id,
        actor: r.actor_name ? { name: r.actor_name, handle: r.actor_handle } : null,
        changes: r.changes,
        ip: r.ip_address,
        at: r.created_at,
      })),
      pagination: buildPaginationMeta({ total, page, limit }),
    };
  },
};

module.exports = adminService;
