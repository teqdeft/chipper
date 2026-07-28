/**
 * Forum business rules (SCR-024..028 · CHIP-039..047).
 *
 * Covers categories, topics, threaded posts, voting, accepted answers, tags,
 * @mentions, subscriptions and pin/lock moderation.
 */
const { db } = require('../../database/connection');
const ApiError = require('../../utils/ApiError');
const { getPagination, buildPaginationMeta } = require('../../utils/pagination');
const { uniqueSlug, uuid, toArray, extractMentions } = require('../../utils/helpers');
const {
  TOPIC_STATUS, COMMENT_STATUS, NOTIFICATION_TYPE, ENTITY_TYPE,
} = require('../../config/constants');
const { PERMISSIONS, roleHasPermission } = require('../../config/permissions');
const { publicUrlFor } = require('../../middlewares/upload');
const forumRepository = require('./forum.repository');
const taxonomyService = require('../taxonomy/taxonomy.service');
const notificationService = require('../notifications/notification.service');
const auditService = require('../../services/audit.service');

const canModerate = (user) => Boolean(user && roleHasPermission(user.role, PERMISSIONS.FORUM_MODERATE));

const authorOf = (row) => ({
  id: row.author_id,
  name: row.author_name,
  handle: row.author_handle,
  affiliation: row.author_affiliation || null,
  avatarUrl: publicUrlFor(row.author_avatar_path),
  reputation: Number(row.author_reputation) || 0,
});

function toTopic(row, { tags = [], subscribed = false } = {}) {
  return {
    id: row.uuid,
    numericId: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    type: row.type,
    status: row.status,
    pinned: Boolean(row.is_pinned),
    solved: Boolean(row.accepted_post_id),
    acceptedPostId: row.accepted_post_id,
    views: Number(row.view_count) || 0,
    replies: Number(row.reply_count) || 0,
    category: { slug: row.category_slug, name: row.category_name },
    categorySlug: row.category_slug,
    author: authorOf(row),
    lastPost: row.last_post_at
      ? { at: row.last_post_at, authorName: row.last_post_author_name, authorHandle: row.last_post_author_handle }
      : null,
    designId: row.design_id,
    tags: tags.map((t) => t.name),
    subscribed,
    updatedAt: row.last_post_at || row.updated_at,
    createdAt: row.created_at,
  };
}

function toPost(row, { myVote = 0, canModerate: moderator = false } = {}) {
  return {
    id: row.id,
    body: row.status === COMMENT_STATUS.HIDDEN && !moderator ? '[This post has been hidden]' : row.body,
    status: row.status,
    parentId: row.parent_id,
    isFirstPost: Boolean(row.is_first_post),
    isAccepted: Boolean(row.is_accepted),
    votes: Number(row.vote_score) || 0,
    upvotes: Number(row.upvotes) || 0,
    downvotes: Number(row.downvotes) || 0,
    myVote,
    author: authorOf(row),
    editedAt: row.edited_at,
    at: row.created_at,
    createdAt: row.created_at,
  };
}

/** Notifies every @handle mentioned in a body. */
async function notifyMentions(body, { actor, title, link }) {
  const handles = extractMentions(body);
  if (!handles.length) return;

  const users = await db('users').whereIn('handle', handles).whereNull('deleted_at').select('id');
  await notificationService.notifyMany(
    users.map((u) => u.id).filter((id) => Number(id) !== Number(actor.id)),
    {
      actorId: actor.id,
      type: NOTIFICATION_TYPE.FORUM_MENTION,
      title: `${actor.name} mentioned you`,
      body: title,
      link,
      entityType: ENTITY_TYPE.FORUM_TOPIC,
    },
  );
}

const forumService = {
  /** SCR-024 — categories with counters plus recent activity. */
  async home() {
    const [categories, stats, recent] = await Promise.all([
      forumRepository.listCategories(),
      forumRepository.stats(),
      forumRepository.topicsQuery({}).orderBy('forum_topics.last_post_at', 'desc').limit(10),
    ]);

    const tagMap = await forumRepository.tagsForTopics(recent.map((t) => t.id));

    return {
      categories: categories.map((c) => ({
        slug: c.slug,
        name: c.name,
        description: c.description,
        icon: c.icon,
        color: c.color,
        locked: Boolean(c.is_locked),
        topics: Number(c.topic_count) || 0,
        posts: Number(c.post_count) || 0,
      })),
      stats,
      recentTopics: recent.map((t) => toTopic(t, { tags: tagMap[t.id] || [] })),
    };
  },

  /** SCR-025 / SCR-028 — topic list with filters and search. */
  async listTopics(query, viewer = null) {
    const { page, limit } = getPagination(query);

    const category = query.category ? await forumRepository.findCategory(query.category) : null;
    if (query.category && !category) throw ApiError.notFound('Category not found');

    const tagIds = await taxonomyService.resolveIds('tags', toArray(query.tag));

    const filters = {
      categoryId: category?.id,
      type: query.type,
      status: query.status,
      search: query.search,
      authorHandle: query.author,
      unanswered: query.unanswered,
      solved: query.solved,
      tagIds,
      designId: query.designId,
    };

    const base = forumRepository.topicsQuery(filters);
    const [{ total }] = await base.clone().clearSelect().clearOrder().count({ total: 'forum_topics.id' });

    const sortColumn =
      { newest: 'forum_topics.created_at', active: 'forum_topics.last_post_at', views: 'forum_topics.view_count', replies: 'forum_topics.reply_count' }[
        query.sort
      ] || 'forum_topics.last_post_at';

    const rows = await base
      .orderBy('forum_topics.is_pinned', 'desc')
      .orderBy(sortColumn, 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    const tagMap = await forumRepository.tagsForTopics(rows.map((t) => t.id));

    return {
      items: rows.map((t) => toTopic(t, { tags: tagMap[t.id] || [] })),
      pagination: buildPaginationMeta({ total, page, limit }),
      category: category
        ? { slug: category.slug, name: category.name, description: category.description }
        : null,
      viewerCanPost: Boolean(viewer),
    };
  },

  /** SCR-026 — a thread with its posts. */
  async getTopic(identifier, query = {}, viewer = null) {
    const topic = await forumRepository.findTopic(identifier);
    if (!topic) throw ApiError.notFound('Topic not found');

    const { page, limit } = getPagination({ ...query, limit: query.limit || 30 });
    const moderator = canModerate(viewer);

    const base = forumRepository.postsQuery(topic.id, { includeHidden: moderator });
    const [{ total }] = await base.clone().clearSelect().clearOrder().count({ total: 'forum_posts.id' });
    const rows = await base.limit(limit).offset((page - 1) * limit);

    const [votes, tags, subscribed] = await Promise.all([
      forumRepository.votesByUser(viewer?.id, rows.map((p) => p.id)),
      forumRepository.listTopicTags(topic.id),
      forumRepository.isSubscribed(topic.id, viewer?.id),
    ]);

    // Fire-and-forget view counter; a failure here must not break the read.
    db('forum_topics').where({ id: topic.id }).increment('view_count', 1).catch(() => {});

    return {
      topic: toTopic(topic, { tags, subscribed }),
      posts: rows.map((p) => toPost(p, { myVote: votes[p.id] || 0, canModerate: moderator })),
      pagination: buildPaginationMeta({ total, page, limit }),
      viewer: {
        canReply: Boolean(viewer) && topic.status !== TOPIC_STATUS.LOCKED,
        canModerate: moderator,
        canAcceptAnswer:
          Boolean(viewer) && (Number(topic.author_id) === Number(viewer?.id) || moderator),
        isAuthor: Boolean(viewer) && Number(topic.author_id) === Number(viewer.id),
      },
    };
  },

  /** SCR-027 — start a thread. The opening post is post #1 of the topic. */
  async createTopic(payload, user, context = {}) {
    const category = await forumRepository.findCategory(payload.category);
    if (!category) throw ApiError.badRequest('Choose a valid category');
    if (category.is_locked && !canModerate(user)) {
      throw ApiError.forbidden('This category is read-only', { code: 'CATEGORY_LOCKED' });
    }

    const slug = await uniqueSlug(payload.title, (candidate) => forumRepository.slugTaken(candidate));

    const topicId = await db.transaction(async (trx) => {
      const id = await forumRepository.createTopic(
        {
          uuid: uuid(),
          slug,
          category_id: category.id,
          user_id: user.id,
          title: payload.title,
          excerpt: String(payload.body).slice(0, 240),
          type: payload.type || 'discussion',
          status: TOPIC_STATUS.OPEN,
          design_id: payload.designId || null,
        },
        trx,
      );

      const postId = await forumRepository.createPost(
        { topic_id: id, user_id: user.id, body: payload.body, is_first_post: true },
        trx,
      );

      await forumRepository.updateTopic(
        id,
        { last_post_id: postId, last_post_user_id: user.id, last_post_at: db.fn.now() },
        trx,
      );

      if (payload.tags?.length) {
        const tagIds = await taxonomyService.upsertTags(payload.tags, trx);
        await forumRepository.replaceTopicTags(id, tagIds, trx);
      }

      await forumRepository.subscribe(id, user.id, trx);
      await forumRepository.refreshCategoryCounters(category.id, trx);
      return id;
    });

    const topic = await forumRepository.findTopic(topicId);
    await notifyMentions(payload.body, { actor: user, title: payload.title, link: `/forum/t/${topic.slug}` });

    await auditService.log({
      userId: user.id,
      action: 'forum.topic_create',
      entityType: ENTITY_TYPE.FORUM_TOPIC,
      entityId: topicId,
      context,
    });

    return toTopic(topic, { tags: await forumRepository.listTopicTags(topicId), subscribed: true });
  },

  async updateTopic(identifier, payload, user) {
    const topic = await forumRepository.findTopic(identifier);
    if (!topic) throw ApiError.notFound('Topic not found');

    const moderator = canModerate(user);
    if (Number(topic.author_id) !== Number(user.id) && !moderator) {
      throw ApiError.forbidden('You can only edit your own topics');
    }
    if (topic.status === TOPIC_STATUS.LOCKED && !moderator) {
      throw ApiError.forbidden('This thread is locked', { code: 'TOPIC_LOCKED' });
    }

    await db.transaction(async (trx) => {
      await forumRepository.updateTopic(
        topic.id,
        { title: payload.title, type: payload.type },
        trx,
      );
      if (payload.tags) {
        const tagIds = await taxonomyService.upsertTags(payload.tags, trx);
        await forumRepository.replaceTopicTags(topic.id, tagIds, trx);
      }
    });

    const updated = await forumRepository.findTopic(topic.id);
    return toTopic(updated, { tags: await forumRepository.listTopicTags(topic.id) });
  },

  async deleteTopic(identifier, user, context = {}) {
    const topic = await forumRepository.findTopic(identifier);
    if (!topic) throw ApiError.notFound('Topic not found');

    const moderator = canModerate(user);
    if (Number(topic.author_id) !== Number(user.id) && !moderator) {
      throw ApiError.forbidden('You can only delete your own topics');
    }

    await db.transaction(async (trx) => {
      await forumRepository.updateTopic(topic.id, { deleted_at: db.fn.now() }, trx);
      await forumRepository.refreshCategoryCounters(topic.category_id, trx);
    });

    await auditService.log({
      userId: user.id,
      action: 'forum.topic_delete',
      entityType: ENTITY_TYPE.FORUM_TOPIC,
      entityId: topic.id,
      context,
    });

    return { deleted: true };
  },

  /** Reply, with optional quote/parent. */
  async createPost(identifier, payload, user) {
    const topic = await forumRepository.findTopic(identifier);
    if (!topic) throw ApiError.notFound('Topic not found');
    if (topic.status === TOPIC_STATUS.LOCKED && !canModerate(user)) {
      throw ApiError.forbidden('This thread is locked', { code: 'TOPIC_LOCKED' });
    }

    if (payload.parentId) {
      const parent = await forumRepository.findPost(payload.parentId);
      if (!parent || Number(parent.topic_id) !== Number(topic.id)) {
        throw ApiError.badRequest('The post you are replying to does not exist');
      }
    }

    const postId = await db.transaction(async (trx) => {
      const id = await forumRepository.createPost(
        {
          topic_id: topic.id,
          user_id: user.id,
          parent_id: payload.parentId || null,
          body: payload.body,
        },
        trx,
      );

      await trx('forum_topics')
        .where({ id: topic.id })
        .increment('reply_count', 1)
        .update({ last_post_id: id, last_post_user_id: user.id, last_post_at: db.fn.now() });

      await trx('forum_categories').where({ id: topic.category_id }).increment('post_count', 1);
      await forumRepository.subscribe(topic.id, user.id, trx);
      return id;
    });

    const link = `/forum/t/${topic.slug}`;

    // Notify the author and every other subscriber exactly once.
    const subscribers = await forumRepository.subscriberIds(topic.id, user.id);
    await notificationService.notifyMany(subscribers, {
      actorId: user.id,
      type: NOTIFICATION_TYPE.FORUM_REPLY,
      title: `New reply in "${topic.title}"`,
      body: `${user.name}: ${String(payload.body).slice(0, 140)}`,
      link,
      entityType: ENTITY_TYPE.FORUM_TOPIC,
      entityId: topic.id,
    });

    await notifyMentions(payload.body, { actor: user, title: topic.title, link });

    const row = await forumRepository.findPostWithAuthor(postId);
    return toPost(row);
  },

  async updatePost(postId, payload, user) {
    const post = await forumRepository.findPost(postId);
    if (!post) throw ApiError.notFound('Post not found');

    const moderator = canModerate(user);
    if (Number(post.user_id) !== Number(user.id) && !moderator) {
      throw ApiError.forbidden('You can only edit your own posts');
    }

    await forumRepository.updatePost(postId, {
      body: payload.body,
      edited_at: db.fn.now(),
      edited_by: user.id,
    });

    const row = await forumRepository.findPostWithAuthor(postId);
    return toPost(row, { canModerate: moderator });
  },

  async deletePost(postId, user) {
    const post = await forumRepository.findPost(postId);
    if (!post) throw ApiError.notFound('Post not found');

    const moderator = canModerate(user);
    if (Number(post.user_id) !== Number(user.id) && !moderator) {
      throw ApiError.forbidden('You can only delete your own posts');
    }
    if (post.is_first_post) {
      throw ApiError.badRequest('Delete the topic instead of its opening post', { code: 'FIRST_POST' });
    }

    await db.transaction(async (trx) => {
      await forumRepository.updatePost(
        postId,
        { deleted_at: db.fn.now(), status: COMMENT_STATUS.REMOVED },
        trx,
      );
      await trx('forum_topics').where({ id: post.topic_id }).decrement('reply_count', 1);
    });

    return { deleted: true };
  },

  /** CHIP-042 — up/down vote. Voting the same way twice removes the vote. */
  async vote(postId, value, user) {
    const post = await forumRepository.findPost(postId);
    if (!post) throw ApiError.notFound('Post not found');
    if (Number(post.user_id) === Number(user.id)) {
      throw ApiError.badRequest('You cannot vote on your own post', { code: 'SELF_VOTE' });
    }

    const result = await db.transaction(async (trx) => {
      await forumRepository.setVote(postId, user.id, value, trx);
      const counts = await forumRepository.refreshVoteCounts(postId, trx);
      // Reputation follows the net change in score.
      const delta = counts.score - (Number(post.vote_score) || 0);
      if (delta !== 0) await trx('users').where({ id: post.user_id }).increment('reputation', delta * 2);
      return counts;
    });

    const myVote = await forumRepository.findVote(postId, user.id);
    return { ...result, myVote: myVote ? myVote.value : 0 };
  },

  /** CHIP-041 — mark an answer as accepted (topic author or moderator). */
  async acceptAnswer(identifier, postId, user) {
    const topic = await forumRepository.findTopic(identifier);
    if (!topic) throw ApiError.notFound('Topic not found');

    if (Number(topic.author_id) !== Number(user.id) && !canModerate(user)) {
      throw ApiError.forbidden('Only the topic author can accept an answer');
    }

    const post = await forumRepository.findPost(postId);
    if (!post || Number(post.topic_id) !== Number(topic.id)) throw ApiError.notFound('Post not found');
    if (post.is_first_post) throw ApiError.badRequest('The opening post cannot be the accepted answer');

    const alreadyAccepted = Number(topic.accepted_post_id) === Number(postId);

    await db.transaction(async (trx) => {
      await trx('forum_posts').where({ topic_id: topic.id }).update({ is_accepted: false });
      if (!alreadyAccepted) await trx('forum_posts').where({ id: postId }).update({ is_accepted: true });

      await forumRepository.updateTopic(
        topic.id,
        {
          accepted_post_id: alreadyAccepted ? null : postId,
          status: alreadyAccepted ? TOPIC_STATUS.OPEN : TOPIC_STATUS.SOLVED,
        },
        trx,
      );

      if (!alreadyAccepted) await trx('users').where({ id: post.user_id }).increment('reputation', 15);
    });

    if (!alreadyAccepted) {
      await require('../users/user.repository').awardBadge(post.user_id, 'helpful-answer').catch(() => {});
      notificationService
        .notify({
          userId: post.user_id,
          actorId: user.id,
          type: NOTIFICATION_TYPE.FORUM_ANSWER_ACCEPTED,
          title: 'Your answer was accepted',
          body: topic.title,
          link: `/forum/t/${topic.slug}`,
          entityType: ENTITY_TYPE.FORUM_POST,
          entityId: postId,
        })
        .catch(() => {});
    }

    return { accepted: !alreadyAccepted, status: alreadyAccepted ? TOPIC_STATUS.OPEN : TOPIC_STATUS.SOLVED };
  },

  async toggleSubscription(identifier, user) {
    const topic = await forumRepository.findTopic(identifier);
    if (!topic) throw ApiError.notFound('Topic not found');

    const subscribed = await forumRepository.isSubscribed(topic.id, user.id);
    if (subscribed) await forumRepository.unsubscribe(topic.id, user.id);
    else await forumRepository.subscribe(topic.id, user.id);

    return { subscribed: !subscribed };
  },

  /** Moderation: pin, lock, move, change status (SCR-038 · CHIP-043). */
  async moderateTopic(identifier, payload, user, context = {}) {
    const topic = await forumRepository.findTopic(identifier);
    if (!topic) throw ApiError.notFound('Topic not found');

    const updates = {};
    if (payload.pinned !== undefined) updates.is_pinned = payload.pinned;
    if (payload.status !== undefined) updates.status = payload.status;
    if (payload.category) {
      const category = await forumRepository.findCategory(payload.category);
      if (!category) throw ApiError.badRequest('Target category not found');
      updates.category_id = category.id;
    }

    if (!Object.keys(updates).length) throw ApiError.badRequest('Nothing to update');

    const previousCategoryId = topic.category_id;
    await db.transaction(async (trx) => {
      await forumRepository.updateTopic(topic.id, updates, trx);
      if (updates.category_id) {
        await forumRepository.refreshCategoryCounters(updates.category_id, trx);
        if (previousCategoryId) await forumRepository.refreshCategoryCounters(previousCategoryId, trx);
      }
      await trx('moderation_actions').insert({
        moderator_id: user.id,
        entity_type: ENTITY_TYPE.FORUM_TOPIC,
        entity_id: topic.id,
        action: Object.keys(updates).join(','),
        note: payload.note || null,
      });
    });

    await auditService.log({
      userId: user.id,
      action: 'forum.topic_moderate',
      entityType: ENTITY_TYPE.FORUM_TOPIC,
      entityId: topic.id,
      changes: { after: updates },
      context,
    });

    const updated = await forumRepository.findTopic(topic.id);
    return toTopic(updated, { tags: await forumRepository.listTopicTags(topic.id) });
  },

  /** SCR-028 — dedicated forum search across topics and post bodies. */
  async search(query, viewer) {
    return this.listTopics({ ...query, search: query.q || query.search }, viewer);
  },
};

module.exports = forumService;
module.exports.toTopic = toTopic;
module.exports.toPost = toPost;
