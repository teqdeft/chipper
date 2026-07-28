/**
 * Forum data access (SCR-024..028).
 */
const BaseRepository = require('../../repositories/BaseRepository');
const { db } = require('../../database/connection');
const { escapeLike } = require('../../utils/helpers');
const { COMMENT_STATUS } = require('../../config/constants');

const AUTHOR = (alias) => [
  `${alias}.id as author_id`,
  `${alias}.name as author_name`,
  `${alias}.handle as author_handle`,
  `${alias}.affiliation as author_affiliation`,
  `${alias}.avatar_path as author_avatar_path`,
  `${alias}.reputation as author_reputation`,
];

const TOPIC_COLUMNS = [
  'forum_topics.id',
  'forum_topics.uuid',
  'forum_topics.slug',
  'forum_topics.category_id',
  'forum_topics.user_id',
  'forum_topics.title',
  'forum_topics.excerpt',
  'forum_topics.type',
  'forum_topics.status',
  'forum_topics.is_pinned',
  'forum_topics.view_count',
  'forum_topics.reply_count',
  'forum_topics.accepted_post_id',
  'forum_topics.last_post_at',
  'forum_topics.design_id',
  'forum_topics.created_at',
  'forum_topics.updated_at',
  'forum_categories.slug as category_slug',
  'forum_categories.name as category_name',
  'last_poster.name as last_post_author_name',
  'last_poster.handle as last_post_author_handle',
  ...AUTHOR('author'),
];

class ForumRepository extends BaseRepository {
  constructor() {
    super('forum_topics', { softDelete: true });
  }

  // ── Categories ───────────────────────────────────────────────────────────
  listCategories(trx) {
    return (trx || db)('forum_categories')
      .where('is_active', true)
      .orderBy('sort_order')
      .select('id', 'slug', 'name', 'description', 'icon', 'color', 'is_locked', 'topic_count', 'post_count');
  }

  findCategory(slugOrId, trx) {
    const q = (trx || db)('forum_categories');
    return Number.isFinite(Number(slugOrId))
      ? q.where({ id: Number(slugOrId) }).first()
      : q.where({ slug: slugOrId }).first();
  }

  // ── Topics ───────────────────────────────────────────────────────────────
  topicsQuery(filters = {}, trx) {
    const q = (trx || db)('forum_topics')
      .join('forum_categories', 'forum_topics.category_id', 'forum_categories.id')
      .join('users as author', 'forum_topics.user_id', 'author.id')
      .leftJoin('users as last_poster', 'forum_topics.last_post_user_id', 'last_poster.id')
      .whereNull('forum_topics.deleted_at')
      .select(TOPIC_COLUMNS);

    if (filters.categoryId) q.where('forum_topics.category_id', filters.categoryId);
    if (filters.userId) q.where('forum_topics.user_id', filters.userId);
    if (filters.type) q.where('forum_topics.type', filters.type);
    if (filters.status) q.where('forum_topics.status', filters.status);
    if (filters.designId) q.where('forum_topics.design_id', filters.designId);
    if (filters.unanswered) q.where('forum_topics.reply_count', 0);
    if (filters.solved === true) q.whereNotNull('forum_topics.accepted_post_id');
    if (filters.solved === false) q.whereNull('forum_topics.accepted_post_id');

    if (filters.search) {
      const term = `%${escapeLike(filters.search)}%`;
      q.where((b) =>
        b
          .where('forum_topics.title', 'like', term)
          .orWhere('forum_topics.excerpt', 'like', term)
          .orWhereExists((sub) =>
            sub
              .select(db.raw(1))
              .from('forum_posts')
              .whereRaw('forum_posts.topic_id = forum_topics.id')
              .where('forum_posts.body', 'like', term)
              .where('forum_posts.status', COMMENT_STATUS.VISIBLE),
          ),
      );
    }

    if (filters.tagIds?.length) {
      q.whereExists((sub) =>
        sub
          .select(db.raw(1))
          .from('forum_topic_tags')
          .whereRaw('forum_topic_tags.topic_id = forum_topics.id')
          .whereIn('forum_topic_tags.tag_id', filters.tagIds),
      );
    }

    if (filters.authorHandle) q.where('author.handle', filters.authorHandle);
    if (filters.since) q.where('forum_topics.created_at', '>=', filters.since);

    return q;
  }

  findTopic(identifier, trx) {
    const q = this.topicsQuery({}, trx);
    return Number.isFinite(Number(identifier))
      ? q.where('forum_topics.id', Number(identifier)).first()
      : q.where('forum_topics.slug', identifier).orWhere('forum_topics.uuid', identifier).first();
  }

  slugTaken(slug, trx) {
    return (trx || db)('forum_topics').where({ slug }).first().then(Boolean);
  }

  createTopic(data, trx) {
    return (trx || db)('forum_topics').insert(data).then(([id]) => id);
  }

  updateTopic(id, data, trx) {
    return (trx || db)('forum_topics').where({ id }).update(data);
  }

  // ── Posts ────────────────────────────────────────────────────────────────
  postsQuery(topicId, { includeHidden = false } = {}, trx) {
    const q = (trx || db)('forum_posts')
      .join('users as author', 'forum_posts.user_id', 'author.id')
      .where('forum_posts.topic_id', topicId)
      .whereNull('forum_posts.deleted_at')
      .orderBy('forum_posts.is_first_post', 'desc')
      .orderBy('forum_posts.created_at', 'asc')
      .select('forum_posts.*', ...AUTHOR('author'));
    if (!includeHidden) q.where('forum_posts.status', COMMENT_STATUS.VISIBLE);
    return q;
  }

  findPost(id, trx) {
    return (trx || db)('forum_posts').where({ id }).whereNull('deleted_at').first();
  }

  findPostWithAuthor(id, trx) {
    return (trx || db)('forum_posts')
      .join('users as author', 'forum_posts.user_id', 'author.id')
      .where('forum_posts.id', id)
      .whereNull('forum_posts.deleted_at')
      .select('forum_posts.*', ...AUTHOR('author'))
      .first();
  }

  createPost(data, trx) {
    return (trx || db)('forum_posts').insert(data).then(([id]) => id);
  }

  updatePost(id, data, trx) {
    return (trx || db)('forum_posts').where({ id }).update(data);
  }

  // ── Votes ────────────────────────────────────────────────────────────────
  findVote(postId, userId, trx) {
    return (trx || db)('forum_post_votes').where({ post_id: postId, user_id: userId }).first();
  }

  async setVote(postId, userId, value, trx) {
    const runner = trx || db;
    const existing = await this.findVote(postId, userId, trx);

    if (existing && existing.value === value) {
      await runner('forum_post_votes').where({ id: existing.id }).del();
      return { previous: existing.value, current: 0 };
    }
    if (existing) {
      await runner('forum_post_votes').where({ id: existing.id }).update({ value });
      return { previous: existing.value, current: value };
    }
    await runner('forum_post_votes').insert({ post_id: postId, user_id: userId, value });
    return { previous: 0, current: value };
  }

  async refreshVoteCounts(postId, trx) {
    const runner = trx || db;
    const row = await runner('forum_post_votes')
      .where({ post_id: postId })
      .select(
        runner.raw('COALESCE(SUM(CASE WHEN value = 1 THEN 1 ELSE 0 END), 0) as up'),
        runner.raw('COALESCE(SUM(CASE WHEN value = -1 THEN 1 ELSE 0 END), 0) as down'),
      )
      .first();

    const upvotes = Number(row?.up) || 0;
    const downvotes = Number(row?.down) || 0;
    await runner('forum_posts')
      .where({ id: postId })
      .update({ upvotes, downvotes, vote_score: upvotes - downvotes });

    return { upvotes, downvotes, score: upvotes - downvotes };
  }

  /** The caller's votes on a page of posts, for rendering the vote widget. */
  async votesByUser(userId, postIds = [], trx) {
    if (!userId || !postIds.length) return {};
    const rows = await (trx || db)('forum_post_votes')
      .where('user_id', userId)
      .whereIn('post_id', postIds)
      .select('post_id', 'value');
    return Object.fromEntries(rows.map((r) => [r.post_id, r.value]));
  }

  // ── Tags & subscriptions ─────────────────────────────────────────────────
  listTopicTags(topicId, trx) {
    return (trx || db)('forum_topic_tags')
      .join('tags', 'forum_topic_tags.tag_id', 'tags.id')
      .where('forum_topic_tags.topic_id', topicId)
      .select('tags.id', 'tags.slug', 'tags.name');
  }

  async replaceTopicTags(topicId, tagIds = [], trx) {
    const runner = trx || db;
    await runner('forum_topic_tags').where({ topic_id: topicId }).del();
    if (tagIds.length) {
      await runner('forum_topic_tags').insert([...new Set(tagIds)].map((tag_id) => ({ topic_id: topicId, tag_id })));
    }
  }

  async tagsForTopics(topicIds = [], trx) {
    if (!topicIds.length) return {};
    const rows = await (trx || db)('forum_topic_tags')
      .join('tags', 'forum_topic_tags.tag_id', 'tags.id')
      .whereIn('forum_topic_tags.topic_id', topicIds)
      .select('forum_topic_tags.topic_id', 'tags.slug', 'tags.name');
    return rows.reduce((acc, row) => {
      (acc[row.topic_id] = acc[row.topic_id] || []).push({ slug: row.slug, name: row.name });
      return acc;
    }, {});
  }

  subscribe(topicId, userId, trx) {
    return (trx || db)('forum_subscriptions')
      .insert({ topic_id: topicId, user_id: userId })
      .onConflict(['topic_id', 'user_id'])
      .ignore();
  }

  unsubscribe(topicId, userId, trx) {
    return (trx || db)('forum_subscriptions').where({ topic_id: topicId, user_id: userId }).del();
  }

  subscriberIds(topicId, excludeUserId, trx) {
    const q = (trx || db)('forum_subscriptions').where({ topic_id: topicId });
    if (excludeUserId) q.whereNot('user_id', excludeUserId);
    return q.pluck('user_id');
  }

  isSubscribed(topicId, userId, trx) {
    if (!userId) return Promise.resolve(false);
    return (trx || db)('forum_subscriptions').where({ topic_id: topicId, user_id: userId }).first().then(Boolean);
  }

  // ── Counters & stats ─────────────────────────────────────────────────────
  async refreshCategoryCounters(categoryId, trx) {
    const runner = trx || db;
    const [{ topics }] = await runner('forum_topics')
      .where({ category_id: categoryId })
      .whereNull('deleted_at')
      .count({ topics: 'id' });
    const [{ posts }] = await runner('forum_posts')
      .join('forum_topics', 'forum_posts.topic_id', 'forum_topics.id')
      .where('forum_topics.category_id', categoryId)
      .whereNull('forum_posts.deleted_at')
      .count({ posts: 'forum_posts.id' });

    await runner('forum_categories')
      .where({ id: categoryId })
      .update({ topic_count: Number(topics) || 0, post_count: Number(posts) || 0 });
  }

  async stats(trx) {
    const runner = trx || db;
    const [[{ topics }], [{ posts }], [{ unanswered }]] = await Promise.all([
      runner('forum_topics').whereNull('deleted_at').count({ topics: 'id' }),
      runner('forum_posts').whereNull('deleted_at').count({ posts: 'id' }),
      runner('forum_topics').whereNull('deleted_at').where('reply_count', 0).count({ unanswered: 'id' }),
    ]);
    return { topics: Number(topics), posts: Number(posts), unanswered: Number(unanswered) };
  }
}

module.exports = new ForumRepository();
module.exports.TOPIC_COLUMNS = TOPIC_COLUMNS;
