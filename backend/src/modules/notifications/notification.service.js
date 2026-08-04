/**
 * In-platform notifications (SCR-031 · CHIP-030).
 *
 * `notify()` is the single entry point used across modules. It respects the
 * recipient's preferences, never notifies someone about their own action, and
 * mirrors to email when the user opted in. Failures are logged, never thrown —
 * a notification must not fail the action that produced it.
 */
const { db } = require('../../database/connection');
const logger = require('../../config/logger');
const ApiError = require('../../utils/ApiError');
const { getPagination, buildPaginationMeta } = require('../../utils/pagination');
const { parseJson } = require('../../utils/helpers');
const { NOTIFICATION_TYPE } = require('../../config/constants');
const mailService = require('../../services/mail.service');

/** Maps a notification type to the preference column that gates it. */
const PREFERENCE_BY_TYPE = {
  [NOTIFICATION_TYPE.DESIGN_COMMENT]: 'notify_design_comments',
  [NOTIFICATION_TYPE.FORUM_REPLY]: 'notify_forum_replies',
  [NOTIFICATION_TYPE.FORUM_MENTION]: 'notify_mentions',
  [NOTIFICATION_TYPE.FORUM_ANSWER_ACCEPTED]: 'notify_forum_replies',
  [NOTIFICATION_TYPE.MESSAGE_RECEIVED]: 'notify_messages',
  [NOTIFICATION_TYPE.NEWS_PUBLISHED]: 'notify_newsletter',
};

function serialize(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    href: row.link,
    entityType: row.entity_type,
    entityId: row.entity_id,
    data: parseJson(row.data, null),
    actor: row.actor_id
      ? { id: row.actor_id, name: row.actor_name, handle: row.actor_handle }
      : null,
    read: Boolean(row.read_at),
    at: row.created_at,
    createdAt: row.created_at,
  };
}

const notificationService = {
  /**
   * @param {object} input
   * @param {number} input.userId recipient
   * @param {number} [input.actorId] who triggered it
   * @param {string} input.type see NOTIFICATION_TYPE
   * @param {string} input.title
   * @param {string} [input.body]
   * @param {string} [input.link] frontend route
   * @param {boolean} [input.email] force/suppress the email mirror
   */
  async notify({ userId, actorId, type, title, body, link, entityType, entityId, data, email }) {
    try {
      if (!userId) return null;
      if (actorId && Number(actorId) === Number(userId)) return null;

      const settings = await db('user_settings').where({ user_id: userId }).first();
      const gate = PREFERENCE_BY_TYPE[type];
      if (settings && gate && settings[gate] === 0) return null;

      const [id] = await db('notifications').insert({
        user_id: userId,
        actor_id: actorId || null,
        type,
        title,
        body: body ? String(body).slice(0, 500) : null,
        link: link || null,
        entity_type: entityType || null,
        entity_id: entityId || null,
        data: data ? JSON.stringify(data) : null,
      });

      const shouldEmail = email !== undefined ? email : Boolean(settings?.email_notifications);
      if (shouldEmail) {
        const user = await db('users').where({ id: userId }).first('email', 'name');
        if (user) {
          mailService
            .sendNotificationEmail(user, { title, body, link })
            .then(() => db('notifications').where({ id }).update({ emailed_at: db.fn.now() }))
            .catch(() => {});
        }
      }

      return id;
    } catch (err) {
      logger.warn(`Notification failed (${type}): ${err.message}`);
      return null;
    }
  },

  /** Fan-out to several recipients (forum subscribers, mentions). */
  async notifyMany(userIds = [], payload) {
    const unique = [...new Set(userIds.filter(Boolean).map(Number))];
    await Promise.all(unique.map((userId) => this.notify({ ...payload, userId })));
    return unique.length;
  },

  /** SCR-031 — list, newest first. */
  async list(userId, query = {}) {
    const { page, limit } = getPagination(query);

    const base = db('notifications')
      .leftJoin('users as actor', 'notifications.actor_id', 'actor.id')
      .where('notifications.user_id', userId)
      .select('notifications.*', 'actor.name as actor_name', 'actor.handle as actor_handle')
      .orderBy('notifications.created_at', 'desc');

    if (query.unreadOnly) base.whereNull('notifications.read_at');
    if (query.type) base.where('notifications.type', query.type);

    const [{ total }] = await base.clone().clearSelect().clearOrder().count({ total: 'notifications.id' });
    const rows = await base.limit(limit).offset((page - 1) * limit);

    return {
      items: rows.map(serialize),
      pagination: buildPaginationMeta({ total, page, limit }),
      unreadCount: await this.unreadCount(userId),
    };
  },

  async unreadCount(userId) {
    const [{ total }] = await db('notifications')
      .where({ user_id: userId })
      .whereNull('read_at')
      .count({ total: 'id' });
    return Number(total) || 0;
  },

  async markRead(userId, notificationId) {
    const row = await db('notifications').where({ id: notificationId, user_id: userId }).first();
    if (!row) throw ApiError.notFound('Notification not found');
    if (!row.read_at) await db('notifications').where({ id: notificationId }).update({ read_at: db.fn.now() });
    return { read: true, unreadCount: await this.unreadCount(userId) };
  },

  async markAllRead(userId) {
    await db('notifications').where({ user_id: userId }).whereNull('read_at').update({ read_at: db.fn.now() });
    return { read: true, unreadCount: 0 };
  },

  async remove(userId, notificationId) {
    const deleted = await db('notifications').where({ id: notificationId, user_id: userId }).del();
    if (!deleted) throw ApiError.notFound('Notification not found');
    return { deleted: true, unreadCount: await this.unreadCount(userId) };
  },

  async clear(userId) {
    await db('notifications').where({ user_id: userId }).del();
    return { cleared: true, unreadCount: 0 };
  },
};

module.exports = notificationService;
