/**
 * Reporting + moderation queue (SCR-035, SCR-036 · CHIP-031, CHIP-037, CHIP-052).
 *
 * Any member can flag content; moderators work a single queue that spans designs,
 * comments, forum topics/posts, messages and users. Every action is recorded in
 * moderation_actions and mirrored to the audit log.
 */
const { db } = require('../../database/connection');
const ApiError = require('../../utils/ApiError');
const { getPagination, buildPaginationMeta } = require('../../utils/pagination');
const {
  REPORT_STATUS, ENTITY_TYPE, COMMENT_STATUS, DESIGN_STATUS, TOPIC_STATUS, NOTIFICATION_TYPE, USER_STATUS,
} = require('../../config/constants');
const notificationService = require('../notifications/notification.service');
const auditService = require('../../services/audit.service');

/** Where each reportable entity lives, and how to render it in the queue. */
const ENTITY_MAP = {
  [ENTITY_TYPE.DESIGN]: {
    table: 'designs',
    label: (row) => row.title,
    link: (row) => `/designs/${row.slug}`,
    ownerColumn: 'owner_id',
    hideAction: (id, trx) => trx('designs').where({ id }).update({ status: DESIGN_STATUS.ARCHIVED }),
    removeAction: (id, trx) =>
      trx('designs').where({ id }).update({ status: DESIGN_STATUS.ARCHIVED, deleted_at: trx.fn.now() }),
    restoreAction: (id, trx) =>
      trx('designs').where({ id }).update({ status: DESIGN_STATUS.PUBLISHED, deleted_at: null }),
  },
  [ENTITY_TYPE.DESIGN_COMMENT]: {
    table: 'design_comments',
    label: (row) => String(row.body).slice(0, 120),
    link: () => null,
    ownerColumn: 'user_id',
    hideAction: (id, trx) => trx('design_comments').where({ id }).update({ status: COMMENT_STATUS.HIDDEN }),
    removeAction: (id, trx) =>
      trx('design_comments').where({ id }).update({ status: COMMENT_STATUS.REMOVED, deleted_at: trx.fn.now() }),
    restoreAction: (id, trx) =>
      trx('design_comments').where({ id }).update({ status: COMMENT_STATUS.VISIBLE, deleted_at: null }),
  },
  [ENTITY_TYPE.FORUM_TOPIC]: {
    table: 'forum_topics',
    label: (row) => row.title,
    link: (row) => `/forum/t/${row.slug}`,
    ownerColumn: 'user_id',
    hideAction: (id, trx) => trx('forum_topics').where({ id }).update({ status: TOPIC_STATUS.LOCKED }),
    removeAction: (id, trx) => trx('forum_topics').where({ id }).update({ deleted_at: trx.fn.now() }),
    restoreAction: (id, trx) =>
      trx('forum_topics').where({ id }).update({ deleted_at: null, status: TOPIC_STATUS.OPEN }),
  },
  [ENTITY_TYPE.FORUM_POST]: {
    table: 'forum_posts',
    label: (row) => String(row.body).slice(0, 120),
    link: () => null,
    ownerColumn: 'user_id',
    hideAction: (id, trx) => trx('forum_posts').where({ id }).update({ status: COMMENT_STATUS.HIDDEN }),
    removeAction: (id, trx) =>
      trx('forum_posts').where({ id }).update({ status: COMMENT_STATUS.REMOVED, deleted_at: trx.fn.now() }),
    restoreAction: (id, trx) =>
      trx('forum_posts').where({ id }).update({ status: COMMENT_STATUS.VISIBLE, deleted_at: null }),
  },
  [ENTITY_TYPE.MESSAGE]: {
    table: 'messages',
    label: (row) => String(row.body).slice(0, 120),
    link: () => null,
    ownerColumn: 'sender_id',
    hideAction: (id, trx) => trx('messages').where({ id }).update({ status: COMMENT_STATUS.HIDDEN }),
    removeAction: (id, trx) =>
      trx('messages').where({ id }).update({ status: COMMENT_STATUS.REMOVED, deleted_at: trx.fn.now() }),
    restoreAction: (id, trx) =>
      trx('messages').where({ id }).update({ status: COMMENT_STATUS.VISIBLE, deleted_at: null }),
  },
  [ENTITY_TYPE.USER]: {
    table: 'users',
    label: (row) => row.name,
    link: (row) => `/u/${row.handle}`,
    ownerColumn: 'id',
    hideAction: (id, trx) => trx('users').where({ id }).update({ status: USER_STATUS.SUSPENDED }),
    removeAction: (id, trx) => trx('users').where({ id }).update({ status: USER_STATUS.BANNED }),
    restoreAction: (id, trx) => trx('users').where({ id }).update({ status: USER_STATUS.ACTIVE }),
  },
};

async function loadEntity(entityType, entityId) {
  const config = ENTITY_MAP[entityType];
  if (!config) return null;
  const row = await db(config.table).where({ id: entityId }).first();
  if (!row) return null;
  return {
    id: row.id,
    type: entityType,
    label: config.label(row),
    link: config.link(row),
    ownerId: row[config.ownerColumn],
    status: row.status || null,
    raw: row,
  };
}

const moderationService = {
  /** CHIP-052 — flag content. One open report per user per entity. */
  async createReport({ entityType, entityId, reason, details }, user) {
    const config = ENTITY_MAP[entityType];
    if (!config) throw ApiError.badRequest('That content type cannot be reported');

    const entity = await loadEntity(entityType, entityId);
    if (!entity) throw ApiError.notFound('The reported content no longer exists');
    if (Number(entity.ownerId) === Number(user.id)) {
      throw ApiError.badRequest('You cannot report your own content', { code: 'SELF_REPORT' });
    }

    const existing = await db('reports')
      .where({ reporter_id: user.id, entity_type: entityType, entity_id: entityId })
      .whereIn('status', [REPORT_STATUS.OPEN, REPORT_STATUS.REVIEWING])
      .first();
    if (existing) {
      throw ApiError.conflict('You have already reported this — a moderator is reviewing it', {
        code: 'ALREADY_REPORTED',
      });
    }

    const [id] = await db('reports').insert({
      reporter_id: user.id,
      entity_type: entityType,
      entity_id: entityId,
      reason,
      details: details || null,
    });

    return { id, status: REPORT_STATUS.OPEN, message: 'Thanks — a moderator will review this' };
  },

  /** SCR-035 — the moderation queue, flagged items first. */
  async listReports(query = {}) {
    const { page, limit } = getPagination(query);

    const base = db('reports')
      .leftJoin('users as reporter', 'reports.reporter_id', 'reporter.id')
      .leftJoin('users as handler', 'reports.handled_by', 'handler.id')
      .select(
        'reports.*',
        'reporter.name as reporter_name',
        'reporter.handle as reporter_handle',
        'handler.name as handler_name',
      )
      .orderByRaw("FIELD(reports.status, 'open', 'reviewing', 'resolved', 'dismissed')")
      .orderBy('reports.created_at', 'desc');

    if (query.status) base.where('reports.status', query.status);
    if (query.entityType) base.where('reports.entity_type', query.entityType);
    if (query.reason) base.where('reports.reason', query.reason);

    const [{ total }] = await base.clone().clearSelect().clearOrder().count({ total: 'reports.id' });
    const rows = await base.limit(limit).offset((page - 1) * limit);

    const items = await Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        entityType: row.entity_type,
        entityId: row.entity_id,
        entity: await loadEntity(row.entity_type, row.entity_id),
        reason: row.reason,
        details: row.details,
        status: row.status,
        reporter: row.reporter_id ? { name: row.reporter_name, handle: row.reporter_handle } : null,
        handledBy: row.handler_name || null,
        handledAt: row.handled_at,
        resolution: row.resolution,
        resolutionNote: row.resolution_note,
        createdAt: row.created_at,
      })),
    );

    return { items, pagination: buildPaginationMeta({ total, page, limit }) };
  },

  async queueSummary() {
    const rows = await db('reports').select('status').count({ total: 'id' }).groupBy('status');
    const byStatus = Object.fromEntries(rows.map((r) => [r.status, Number(r.total)]));

    const [pendingDesigns] = await db('designs')
      .where('status', DESIGN_STATUS.PENDING)
      .whereNull('deleted_at')
      .count({ total: 'id' });

    return {
      open: byStatus[REPORT_STATUS.OPEN] || 0,
      reviewing: byStatus[REPORT_STATUS.REVIEWING] || 0,
      resolved: byStatus[REPORT_STATUS.RESOLVED] || 0,
      dismissed: byStatus[REPORT_STATUS.DISMISSED] || 0,
      pendingDesigns: Number(pendingDesigns.total) || 0,
    };
  },

  /**
   * Resolves a report and applies the chosen action to the underlying entity.
   * @param {'hide'|'remove'|'restore'|'warn'|'suspend'|'ban'|'no-action'} action
   */
  async resolveReport(reportId, { action, note }, moderator, context = {}) {
    const report = await db('reports').where({ id: reportId }).first();
    if (!report) throw ApiError.notFound('Report not found');

    const config = ENTITY_MAP[report.entity_type];
    if (!config) throw ApiError.badRequest('Unknown entity type on this report');

    const entity = await loadEntity(report.entity_type, report.entity_id);

    await db.transaction(async (trx) => {
      if (entity) {
        if (action === 'hide') await config.hideAction(entity.id, trx);
        if (action === 'remove') await config.removeAction(entity.id, trx);
        if (action === 'restore') await config.restoreAction(entity.id, trx);
        if (action === 'suspend' && entity.ownerId) {
          await trx('users').where({ id: entity.ownerId }).update({
            status: USER_STATUS.SUSPENDED,
            suspension_reason: note || 'Community guidelines',
          });
        }
        if (action === 'ban' && entity.ownerId) {
          await trx('users').where({ id: entity.ownerId }).update({ status: USER_STATUS.BANNED });
          await trx('refresh_tokens')
            .where({ user_id: entity.ownerId })
            .whereNull('revoked_at')
            .update({ revoked_at: trx.fn.now(), revoked_reason: 'banned' });
        }
      }

      await trx('reports').where({ id: reportId }).update({
        status: action === 'no-action' ? REPORT_STATUS.DISMISSED : REPORT_STATUS.RESOLVED,
        handled_by: moderator.id,
        handled_at: trx.fn.now(),
        resolution: action,
        resolution_note: note || null,
      });

      await trx('moderation_actions').insert({
        moderator_id: moderator.id,
        report_id: reportId,
        entity_type: report.entity_type,
        entity_id: report.entity_id,
        action,
        note: note || null,
      });
    });

    if (report.reporter_id) {
      notificationService
        .notify({
          userId: report.reporter_id,
          actorId: moderator.id,
          type: NOTIFICATION_TYPE.REPORT_RESOLVED,
          title: 'Your report was reviewed',
          body: `Outcome: ${action}`,
          link: '/notifications',
        })
        .catch(() => {});
    }

    await auditService.log({
      userId: moderator.id,
      action: `moderation.${action}`,
      entityType: report.entity_type,
      entityId: report.entity_id,
      changes: { reportId, note },
      context,
    });

    return { resolved: true, action };
  },

  async claimReport(reportId, moderator) {
    const report = await db('reports').where({ id: reportId }).first();
    if (!report) throw ApiError.notFound('Report not found');
    await db('reports').where({ id: reportId }).update({
      status: REPORT_STATUS.REVIEWING,
      handled_by: moderator.id,
    });
    return { status: REPORT_STATUS.REVIEWING };
  },

  /** Direct moderation without a report (e.g. from the comments admin screen). */
  async moderateEntity({ entityType, entityId, action, note }, moderator, context = {}) {
    const config = ENTITY_MAP[entityType];
    if (!config) throw ApiError.badRequest('That content type cannot be moderated');

    const entity = await loadEntity(entityType, entityId);
    if (!entity) throw ApiError.notFound('Content not found');

    await db.transaction(async (trx) => {
      if (action === 'hide') await config.hideAction(entityId, trx);
      else if (action === 'remove') await config.removeAction(entityId, trx);
      else if (action === 'restore') await config.restoreAction(entityId, trx);
      else throw ApiError.badRequest(`Unsupported action "${action}"`);

      await trx('moderation_actions').insert({
        moderator_id: moderator.id,
        entity_type: entityType,
        entity_id: entityId,
        action,
        note: note || null,
      });
    });

    if (entity.ownerId) {
      notificationService
        .notify({
          userId: entity.ownerId,
          actorId: moderator.id,
          type: NOTIFICATION_TYPE.SYSTEM,
          title: 'A moderator acted on your content',
          body: `${entityType}: ${action}${note ? ` — ${note}` : ''}`,
          link: entity.link || '/notifications',
        })
        .catch(() => {});
    }

    await auditService.log({
      userId: moderator.id,
      action: `moderation.${action}`,
      entityType,
      entityId,
      changes: { note },
      context,
    });

    return { moderated: true, action };
  },

  /** SCR-036 — every comment across the platform, for the admin table. */
  async listAllComments(query = {}) {
    const { page, limit } = getPagination(query);

    const base = db('design_comments')
      .join('users', 'design_comments.user_id', 'users.id')
      .join('designs', 'design_comments.design_id', 'designs.id')
      .select(
        'design_comments.*',
        'users.name as author_name',
        'users.handle as author_handle',
        'designs.title as design_title',
        'designs.slug as design_slug',
      )
      .orderBy('design_comments.created_at', 'desc');

    if (query.status) base.where('design_comments.status', query.status);
    if (query.search) base.where('design_comments.body', 'like', `%${query.search}%`);

    const [{ total }] = await base.clone().clearSelect().clearOrder().count({ total: 'design_comments.id' });
    const rows = await base.limit(limit).offset((page - 1) * limit);

    return {
      items: rows.map((r) => ({
        id: r.id,
        body: r.body,
        status: r.status,
        author: { name: r.author_name, handle: r.author_handle },
        design: { title: r.design_title, slug: r.design_slug },
        createdAt: r.created_at,
      })),
      pagination: buildPaginationMeta({ total, page, limit }),
    };
  },

  listActions(query = {}) {
    const { page, limit } = getPagination(query);
    return db('moderation_actions')
      .leftJoin('users', 'moderation_actions.moderator_id', 'users.id')
      .select('moderation_actions.*', 'users.name as moderator_name')
      .orderBy('moderation_actions.created_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);
  },
};

module.exports = moderationService;
module.exports.ENTITY_MAP = ENTITY_MAP;
