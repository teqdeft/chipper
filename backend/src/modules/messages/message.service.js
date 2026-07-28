/**
 * Direct messaging (SCR-029, SCR-030 · CHIP-049).
 *
 * A conversation is a participant set plus an ordered message list. Unread state
 * is denormalised per participant so the inbox badge is a single indexed read.
 * Every read and write re-checks membership — a conversation id is never enough
 * on its own to see its contents.
 */
const { db } = require('../../database/connection');
const ApiError = require('../../utils/ApiError');
const { getPagination, buildPaginationMeta } = require('../../utils/pagination');
const { uuid, formatBytes } = require('../../utils/helpers');
const { NOTIFICATION_TYPE, ENTITY_TYPE, COMMENT_STATUS } = require('../../config/constants');
const { publicUrlFor, describeFile } = require('../../middlewares/upload');
const notificationService = require('../notifications/notification.service');

/** Loads a conversation the caller belongs to, else 404. */
async function assertParticipant(conversationId, userId) {
  const conversation = await db('conversations')
    .where((b) => {
      if (Number.isFinite(Number(conversationId))) b.where('conversations.id', Number(conversationId));
      else b.where('conversations.uuid', conversationId);
    })
    .first();

  if (!conversation) throw ApiError.notFound('Conversation not found');

  const membership = await db('conversation_participants')
    .where({ conversation_id: conversation.id, user_id: userId })
    .whereNull('left_at')
    .first();

  if (!membership) throw ApiError.notFound('Conversation not found');
  return { conversation, membership };
}

function toMessage(row, viewerId, attachments = []) {
  return {
    id: row.id,
    body: row.status === COMMENT_STATUS.REMOVED ? '[Message removed]' : row.body,
    from: Number(row.sender_id) === Number(viewerId) ? 'me' : 'them',
    sender: row.sender_id
      ? {
          id: row.sender_id,
          name: row.sender_name,
          handle: row.sender_handle,
          avatarUrl: publicUrlFor(row.sender_avatar_path),
        }
      : null,
    attachments: attachments.map((a) => ({
      id: a.id,
      name: a.original_name,
      size: formatBytes(a.size_bytes),
      url: publicUrlFor(a.path),
      mimeType: a.mime_type,
    })),
    editedAt: row.edited_at,
    at: row.created_at,
    createdAt: row.created_at,
  };
}

const messageService = {
  /** SCR-029 — conversation list with unread badges. */
  async listConversations(userId, query = {}) {
    const { page, limit } = getPagination(query);

    const base = db('conversation_participants as me')
      .join('conversations', 'me.conversation_id', 'conversations.id')
      .leftJoin('messages as last_message', 'conversations.last_message_id', 'last_message.id')
      .where('me.user_id', userId)
      .whereNull('me.left_at')
      .where('me.is_archived', Boolean(query.archived))
      .select(
        'conversations.id',
        'conversations.uuid',
        'conversations.subject',
        'conversations.is_system',
        'conversations.last_message_at',
        'me.unread_count',
        'me.last_read_at',
        'me.is_muted',
        'last_message.body as last_body',
        'last_message.sender_id as last_sender_id',
      )
      .orderBy('conversations.last_message_at', 'desc');

    const [{ total }] = await base.clone().clearSelect().clearOrder().count({ total: 'conversations.id' });
    const rows = await base.limit(limit).offset((page - 1) * limit);

    // Resolve the "other side" of each conversation for the list label.
    const conversationIds = rows.map((r) => r.id);
    const others = conversationIds.length
      ? await db('conversation_participants')
          .join('users', 'conversation_participants.user_id', 'users.id')
          .whereIn('conversation_participants.conversation_id', conversationIds)
          .whereNot('conversation_participants.user_id', userId)
          .select(
            'conversation_participants.conversation_id',
            'users.id',
            'users.name',
            'users.handle',
            'users.avatar_path',
          )
      : [];

    const othersByConversation = others.reduce((acc, row) => {
      (acc[row.conversation_id] = acc[row.conversation_id] || []).push({
        id: row.id,
        name: row.name,
        handle: row.handle,
        avatarUrl: publicUrlFor(row.avatar_path),
      });
      return acc;
    }, {});

    const items = rows.map((row) => {
      const participants = othersByConversation[row.id] || [];
      return {
        id: row.uuid,
        numericId: row.id,
        subject: row.subject,
        with: row.is_system ? 'Moderation' : participants.map((p) => p.name).join(', ') || 'Unknown',
        participants,
        preview: row.last_body ? String(row.last_body).slice(0, 160) : '',
        unread: Number(row.unread_count) || 0,
        muted: Boolean(row.is_muted),
        isSystem: Boolean(row.is_system),
        updatedAt: row.last_message_at,
      };
    });

    return {
      items,
      pagination: buildPaginationMeta({ total, page, limit }),
      totalUnread: await this.unreadCount(userId),
    };
  },

  async unreadCount(userId) {
    const [{ total }] = await db('conversation_participants')
      .where({ user_id: userId })
      .whereNull('left_at')
      .sum({ total: 'unread_count' });
    return Number(total) || 0;
  },

  /** SCR-030 — a thread; reading it clears the unread badge. */
  async getConversation(conversationId, userId, query = {}) {
    const { conversation } = await assertParticipant(conversationId, userId);
    const { page, limit } = getPagination({ ...query, limit: query.limit || 50 });

    const base = db('messages')
      .leftJoin('users as sender', 'messages.sender_id', 'sender.id')
      .where('messages.conversation_id', conversation.id)
      .whereNull('messages.deleted_at')
      .select(
        'messages.*',
        'sender.name as sender_name',
        'sender.handle as sender_handle',
        'sender.avatar_path as sender_avatar_path',
      )
      .orderBy('messages.created_at', 'asc');

    const [{ total }] = await base.clone().clearSelect().clearOrder().count({ total: 'messages.id' });
    const rows = await base.limit(limit).offset((page - 1) * limit);

    const attachments = rows.length
      ? await db('message_attachments').whereIn('message_id', rows.map((r) => r.id)).select('*')
      : [];
    const byMessage = attachments.reduce((acc, a) => {
      (acc[a.message_id] = acc[a.message_id] || []).push(a);
      return acc;
    }, {});

    await this.markRead(conversation.id, userId);

    const participants = await db('conversation_participants')
      .join('users', 'conversation_participants.user_id', 'users.id')
      .where('conversation_participants.conversation_id', conversation.id)
      .select('users.id', 'users.name', 'users.handle', 'users.affiliation', 'users.avatar_path');

    return {
      conversation: {
        id: conversation.uuid,
        numericId: conversation.id,
        subject: conversation.subject,
        isSystem: Boolean(conversation.is_system),
        participants: participants.map((p) => ({
          id: p.id,
          name: p.name,
          handle: p.handle,
          affiliation: p.affiliation,
          avatarUrl: publicUrlFor(p.avatar_path),
          isMe: Number(p.id) === Number(userId),
        })),
      },
      messages: rows.map((row) => toMessage(row, userId, byMessage[row.id] || [])),
      pagination: buildPaginationMeta({ total, page, limit }),
    };
  },

  /**
   * Starts a conversation, or appends to the existing 1:1 thread with the same
   * person so the inbox does not fill with duplicates.
   */
  async startConversation({ recipientHandle, recipientId, subject, body }, sender, files = []) {
    const recipient = recipientId
      ? await db('users').where({ id: recipientId }).whereNull('deleted_at').first()
      : await db('users').where({ handle: String(recipientHandle).toLowerCase() }).whereNull('deleted_at').first();

    if (!recipient) throw ApiError.notFound('Recipient not found');
    if (Number(recipient.id) === Number(sender.id)) {
      throw ApiError.badRequest('You cannot message yourself', { code: 'SELF_MESSAGE' });
    }

    const settings = await db('user_settings').where({ user_id: recipient.id }).first();
    if (settings && settings.notify_messages === 0 && settings.profile_public === 0) {
      throw ApiError.forbidden('This member is not accepting messages', { code: 'MESSAGES_DISABLED' });
    }

    // Look for an existing two-party thread between exactly these users.
    const existing = await db('conversation_participants as a')
      .join('conversation_participants as b', 'a.conversation_id', 'b.conversation_id')
      .join('conversations', 'a.conversation_id', 'conversations.id')
      .where('a.user_id', sender.id)
      .where('b.user_id', recipient.id)
      .where('conversations.is_system', false)
      .select('conversations.id', 'conversations.uuid')
      .first();

    const conversationId = existing
      ? existing.id
      : await db.transaction(async (trx) => {
          const [id] = await trx('conversations').insert({
            uuid: uuid(),
            subject: subject || null,
            created_by: sender.id,
          });
          await trx('conversation_participants').insert([
            { conversation_id: id, user_id: sender.id },
            { conversation_id: id, user_id: recipient.id },
          ]);
          return id;
        });

    return this.sendMessage(conversationId, { body }, sender, files);
  },

  /** Appends a message and bumps everyone else's unread counter. */
  async sendMessage(conversationId, { body }, sender, files = []) {
    const { conversation } = await assertParticipant(conversationId, sender.id);

    const messageId = await db.transaction(async (trx) => {
      const [id] = await trx('messages').insert({
        conversation_id: conversation.id,
        sender_id: sender.id,
        body,
      });

      if (files.length) {
        await trx('message_attachments').insert(
          files.map((file) => {
            const described = describeFile(file);
            return {
              message_id: id,
              original_name: described.original_name,
              stored_name: described.stored_name,
              path: described.path,
              mime_type: described.mime_type,
              extension: described.extension,
              size_bytes: described.size_bytes,
            };
          }),
        );
      }

      await trx('conversations')
        .where({ id: conversation.id })
        .update({ last_message_id: id, last_message_at: trx.fn.now() });

      await trx('conversation_participants')
        .where({ conversation_id: conversation.id })
        .whereNot('user_id', sender.id)
        .increment('unread_count', 1)
        .update({ is_archived: false });

      await trx('conversation_participants')
        .where({ conversation_id: conversation.id, user_id: sender.id })
        .update({ last_read_at: trx.fn.now() });

      return id;
    });

    const recipients = await db('conversation_participants')
      .where({ conversation_id: conversation.id })
      .whereNot('user_id', sender.id)
      .whereNull('left_at')
      .pluck('user_id');

    await notificationService.notifyMany(recipients, {
      actorId: sender.id,
      type: NOTIFICATION_TYPE.MESSAGE_RECEIVED,
      title: `New message from ${sender.name}`,
      body: String(body).slice(0, 140),
      link: `/messages/${conversation.uuid}`,
      entityType: ENTITY_TYPE.MESSAGE,
      entityId: messageId,
    });

    const row = await db('messages')
      .leftJoin('users as sender', 'messages.sender_id', 'sender.id')
      .where('messages.id', messageId)
      .select(
        'messages.*',
        'sender.name as sender_name',
        'sender.handle as sender_handle',
        'sender.avatar_path as sender_avatar_path',
      )
      .first();

    const attachments = await db('message_attachments').where({ message_id: messageId }).select('*');

    return {
      conversationId: conversation.uuid,
      message: toMessage(row, sender.id, attachments),
    };
  },

  async markRead(conversationId, userId) {
    await db('conversation_participants')
      .where({ conversation_id: conversationId, user_id: userId })
      .update({ unread_count: 0, last_read_at: db.fn.now() });
    return { read: true };
  },

  async setArchived(conversationId, userId, archived) {
    const { conversation } = await assertParticipant(conversationId, userId);
    await db('conversation_participants')
      .where({ conversation_id: conversation.id, user_id: userId })
      .update({ is_archived: archived });
    return { archived };
  },

  async setMuted(conversationId, userId, muted) {
    const { conversation } = await assertParticipant(conversationId, userId);
    await db('conversation_participants')
      .where({ conversation_id: conversation.id, user_id: userId })
      .update({ is_muted: muted });
    return { muted };
  },

  /** Leaves a thread — the other side keeps their copy. */
  async leave(conversationId, userId) {
    const { conversation } = await assertParticipant(conversationId, userId);
    await db('conversation_participants')
      .where({ conversation_id: conversation.id, user_id: userId })
      .update({ left_at: db.fn.now(), unread_count: 0 });
    return { left: true };
  },

  async deleteMessage(messageId, user) {
    const message = await db('messages').where({ id: messageId }).whereNull('deleted_at').first();
    if (!message) throw ApiError.notFound('Message not found');

    const moderator = ['admin', 'moderator'].includes(user.role);
    if (Number(message.sender_id) !== Number(user.id) && !moderator) {
      throw ApiError.forbidden('You can only delete your own messages');
    }

    await db('messages')
      .where({ id: messageId })
      .update({ deleted_at: db.fn.now(), status: COMMENT_STATUS.REMOVED });
    return { deleted: true };
  },
};

module.exports = messageService;
