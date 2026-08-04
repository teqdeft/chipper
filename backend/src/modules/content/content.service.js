/**
 * Public content + CMS (SCR-004..008, SCR-037 · CHIP-033..035).
 * News posts, static pages and public site settings.
 */
const { db } = require('../../database/connection');
const ApiError = require('../../utils/ApiError');
const { getPagination, buildPaginationMeta } = require('../../utils/pagination');
const { uniqueSlug, escapeLike, parseJson } = require('../../utils/helpers');
const { CONTENT_STATUS, NOTIFICATION_TYPE, ENTITY_TYPE } = require('../../config/constants');
const { publicUrlFor, describeFile, removeStoredFile } = require('../../middlewares/upload');
const notificationService = require('../notifications/notification.service');

/** Fan-out a news publish alert to members who opted into the newsletter. */
async function notifyNewsPublished(article, actorId) {
  if (!article?.slug) return;
  const recipients = await db('user_settings')
    .where('notify_newsletter', true)
    .select('user_id');
  const ids = recipients
    .map((r) => r.user_id)
    .filter((id) => Number(id) !== Number(actorId));
  if (!ids.length) return;

  await notificationService.notifyMany(ids, {
    actorId: actorId || null,
    type: NOTIFICATION_TYPE.NEWS_PUBLISHED,
    title: 'New on Chipper News',
    body: article.title,
    link: `/news/${article.slug}`,
    entityType: ENTITY_TYPE.NEWS,
    entityId: article.id,
    email: false,
  });
}

function toNews(row, { full = false } = {}) {
  return {
    slug: row.slug,
    id: row.id,
    title: row.title,
    excerpt: row.excerpt,
    ...(full ? { body: row.body ? String(row.body).split('\n\n') : [], bodyRaw: row.body } : {}),
    category: row.category,
    coverImageUrl: publicUrlFor(row.cover_image_path),
    author: row.author_name ? { name: row.author_name, handle: row.author_handle } : null,
    status: row.status,
    featured: Boolean(row.is_featured),
    views: Number(row.view_count) || 0,
    date: row.published_at,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Date-only admin values are stored at UTC midnight so "today" is live for the
 * whole calendar day. Empty date + published → now (or keep existing).
 */
function resolvePublishedAt({ status, incoming, existing }) {
  if (status !== CONTENT_STATUS.PUBLISHED) {
    if (incoming === undefined) return existing ?? null;
    return incoming || null;
  }

  if (incoming) return incoming;
  if (existing) return existing;
  return db.fn.now();
}

function toPage(row) {
  return {
    slug: row.slug,
    title: row.title,
    body: row.body,
    sections: parseJson(row.sections, null),
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    status: row.status,
    isSystem: Boolean(row.is_system),
    updatedAt: row.updated_at,
  };
}

const contentService = {
  /** SCR-004 — public news list. */
  async listNews(query = {}, { includeDrafts = false } = {}) {
    const { page, limit } = getPagination(query);

    const base = db('news_posts')
      .leftJoin('users', 'news_posts.author_id', 'users.id')
      .whereNull('news_posts.deleted_at')
      .select('news_posts.*', 'users.name as author_name', 'users.handle as author_handle')
      .orderBy('news_posts.published_at', 'desc');

    if (!includeDrafts) {
      // Published + already live. NULL published_at is treated as live so a
      // bad admin save cannot hide an otherwise-published post.
      base
        .where('news_posts.status', CONTENT_STATUS.PUBLISHED)
        .andWhere((qb) => {
          qb.whereNull('news_posts.published_at').orWhere('news_posts.published_at', '<=', db.fn.now());
        });
    } else if (query.status) {
      base.where('news_posts.status', query.status);
    }

    if (query.category) base.where('news_posts.category', query.category);
    if (query.search) {
      const term = `%${escapeLike(query.search)}%`;
      base.where((b) => b.where('news_posts.title', 'like', term).orWhere('news_posts.excerpt', 'like', term));
    }

    const [{ total }] = await base.clone().clearSelect().clearOrder().count({ total: 'news_posts.id' });
    const rows = await base.limit(limit).offset((page - 1) * limit);

    return {
      items: rows.map((r) => toNews(r)),
      pagination: buildPaginationMeta({ total, page, limit }),
    };
  },

  /** SCR-005 — a single announcement. */
  async getNews(slug, { includeDrafts = false, countView = true } = {}) {
    const q = db('news_posts')
      .leftJoin('users', 'news_posts.author_id', 'users.id')
      .whereNull('news_posts.deleted_at')
      .select('news_posts.*', 'users.name as author_name', 'users.handle as author_handle');

    const row = Number.isFinite(Number(slug))
      ? await q.where('news_posts.id', Number(slug)).first()
      : await q.where('news_posts.slug', slug).first();

    if (!row) throw ApiError.notFound('Article not found');
    if (row.status !== CONTENT_STATUS.PUBLISHED && !includeDrafts) throw ApiError.notFound('Article not found');

    if (countView) db('news_posts').where({ id: row.id }).increment('view_count', 1).catch(() => {});

    const related = await db('news_posts')
      .where('status', CONTENT_STATUS.PUBLISHED)
      .whereNull('deleted_at')
      .whereNot('id', row.id)
      .orderBy('published_at', 'desc')
      .limit(3)
      .select('slug', 'title', 'excerpt', 'published_at', 'category');

    return { article: toNews(row, { full: true }), related };
  },

  async createNews(payload, user, file) {
    const slug = payload.slug || (await uniqueSlug(payload.title, async (candidate) =>
      Boolean(await db('news_posts').where({ slug: candidate }).first())));

    const status = payload.status || CONTENT_STATUS.DRAFT;
    const publishedAt = resolvePublishedAt({
      status,
      incoming: payload.publishedAt,
      existing: null,
    });

    const [id] = await db('news_posts').insert({
      slug,
      title: payload.title,
      excerpt: payload.excerpt || null,
      body: payload.body || null,
      category: payload.category || null,
      cover_image_path: file ? describeFile(file).path : null,
      author_id: user.id,
      status,
      is_featured: Boolean(payload.featured),
      published_at: publishedAt,
    });

    const { article } = await this.getNews(id, { includeDrafts: true, countView: false });
    if (status === CONTENT_STATUS.PUBLISHED) {
      notifyNewsPublished(article, user.id).catch(() => {});
    }
    return article;
  },

  async updateNews(slug, payload, user, file) {
    const existing = await db('news_posts').where({ slug }).orWhere({ id: Number(slug) || 0 }).first();
    if (!existing) throw ApiError.notFound('Article not found');

    const nextStatus = payload.status !== undefined ? payload.status : existing.status;
    const wasPublished = existing.status === CONTENT_STATUS.PUBLISHED;
    const updates = {
      title: payload.title,
      excerpt: payload.excerpt,
      body: payload.body,
      category: payload.category,
      status: payload.status,
      is_featured: payload.featured,
    };

    // Only touch published_at when status/date actually change — never wipe a
    // live timestamp with null from an empty admin date field.
    if (payload.publishedAt !== undefined || payload.status !== undefined) {
      updates.published_at = resolvePublishedAt({
        status: nextStatus,
        incoming: payload.publishedAt,
        existing: existing.published_at,
      });
    }

    if (file) {
      updates.cover_image_path = describeFile(file).path;
      if (existing.cover_image_path) await removeStoredFile(existing.cover_image_path);
    }

    await db('news_posts')
      .where({ id: existing.id })
      .update(Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined)));

    const { article } = await this.getNews(existing.id, { includeDrafts: true, countView: false });
    if (!wasPublished && nextStatus === CONTENT_STATUS.PUBLISHED) {
      notifyNewsPublished(article, user.id).catch(() => {});
    }
    return article;
  },

  async deleteNews(slug) {
    const existing = await db('news_posts').where({ slug }).orWhere({ id: Number(slug) || 0 }).first();
    if (!existing) throw ApiError.notFound('Article not found');
    await db('news_posts').where({ id: existing.id }).update({ deleted_at: db.fn.now() });
    return { deleted: true };
  },

  /** SCR-002, SCR-003, SCR-006, SCR-007, SCR-008 — static pages. */
  async getPage(slug) {
    const row = await db('pages').where({ slug }).first();
    if (!row || row.status !== CONTENT_STATUS.PUBLISHED) throw ApiError.notFound('Page not found');
    return toPage(row);
  },

  async listPages({ includeDrafts = false } = {}) {
    const q = db('pages').orderBy('slug').select('*');
    if (!includeDrafts) q.where('status', CONTENT_STATUS.PUBLISHED);
    return (await q).map(toPage);
  },

  async upsertPage(slug, payload, user) {
    const existing = await db('pages').where({ slug }).first();

    if (existing) {
      await db('pages')
        .where({ id: existing.id })
        .update({
          title: payload.title ?? existing.title,
          body: payload.body ?? existing.body,
          sections: payload.sections ? JSON.stringify(payload.sections) : existing.sections,
          meta_title: payload.metaTitle ?? existing.meta_title,
          meta_description: payload.metaDescription ?? existing.meta_description,
          status: payload.status ?? existing.status,
          updated_by: user.id,
        });
    } else {
      await db('pages').insert({
        slug,
        title: payload.title,
        body: payload.body || null,
        sections: payload.sections ? JSON.stringify(payload.sections) : null,
        meta_title: payload.metaTitle || null,
        meta_description: payload.metaDescription || null,
        status: payload.status || CONTENT_STATUS.PUBLISHED,
        updated_by: user.id,
      });
    }

    return toPage(await db('pages').where({ slug }).first());
  },

  async deletePage(slug) {
    const existing = await db('pages').where({ slug }).first();
    if (!existing) throw ApiError.notFound('Page not found');
    if (existing.is_system) {
      throw ApiError.badRequest('System pages cannot be deleted — set the status to draft instead', {
        code: 'SYSTEM_PAGE',
      });
    }
    await db('pages').where({ id: existing.id }).del();
    return { deleted: true };
  },

  /** Public settings + feature flags the frontend reads at boot. */
  async publicSettings() {
    const rows = await db('site_settings').where({ is_public: true }).select('key', 'value');
    const config = require('../../config');
    return {
      settings: Object.fromEntries(rows.map((r) => [r.key, parseJson(r.value, r.value)])),
      features: {
        commercial: config.features.commercial,
        registrationOpen: config.features.registrationOpen,
        requireEmailVerification: config.features.requireEmailVerification,
        designReviewRequired: config.features.designReviewRequired,
      },
      limits: {
        maxFileSizeMb: Math.round(config.upload.maxFileSize / (1024 * 1024)),
        maxFilesPerUpload: config.upload.maxFiles,
        designExtensions: config.upload.designExtensions,
        imageExtensions: config.upload.imageExtensions,
      },
    };
  },

  async allSettings() {
    const rows = await db('site_settings').orderBy('group').orderBy('key').select('*');
    return rows.map((r) => ({
      key: r.key,
      value: parseJson(r.value, r.value),
      group: r.group,
      description: r.description,
      isPublic: Boolean(r.is_public),
    }));
  },

  async updateSetting(key, value, user) {
    const existing = await db('site_settings').where({ key }).first();
    if (existing) {
      await db('site_settings').where({ key }).update({ value: JSON.stringify(value), updated_by: user.id });
    } else {
      await db('site_settings').insert({ key, value: JSON.stringify(value), updated_by: user.id });
    }
    return { key, value };
  },

  /** Home page payload: featured designs + latest news + community stats. */
  async homeSummary() {
    const designRepository = require('../designs/design.repository');
    const designService = require('../designs/design.service');

    const [featuredRows, latestRows, news, stats] = await Promise.all([
      designRepository
        .browseQuery({ featured: true })
        .orderBy('designs.published_at', 'desc')
        .limit(3),
      designRepository.browseQuery({}).orderBy('designs.published_at', 'desc').limit(6),
      this.listNews({ limit: 3 }),
      this.communityStats(),
    ]);

    return {
      featured: await designService.decorateList(featuredRows, null),
      latest: await designService.decorateList(latestRows, null),
      news: news.items,
      stats,
    };
  },

  async communityStats() {
    const [designs, users, downloads, labs] = await Promise.all([
      db('designs').where('status', 'published').whereNull('deleted_at').count({ total: 'id' }).first(),
      db('users').whereNull('deleted_at').where('status', 'active').count({ total: 'id' }).first(),
      db('designs').whereNull('deleted_at').sum({ total: 'download_count' }).first(),
      db('users').whereNull('deleted_at').whereNotNull('affiliation').countDistinct({ total: 'affiliation' }).first(),
    ]);

    return {
      designsPublished: Number(designs?.total) || 0,
      activeMembers: Number(users?.total) || 0,
      reuses: Number(downloads?.total) || 0,
      labsContributing: Number(labs?.total) || 0,
    };
  },
};

module.exports = contentService;
