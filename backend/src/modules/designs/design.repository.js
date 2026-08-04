/**
 * Design data access: browse/filter, detail hydration, versions, files,
 * comments, stars, ownerships and downloads.
 */
const BaseRepository = require('../../repositories/BaseRepository');
const { db } = require('../../database/connection');
const { escapeLike, toArray } = require('../../utils/helpers');
const { DESIGN_STATUS, COMMENT_STATUS } = require('../../config/constants');

const AUTHOR_COLUMNS = [
  'owner.id as author_id',
  'owner.name as author_name',
  'owner.handle as author_handle',
  'owner.affiliation as author_affiliation',
  'owner.avatar_path as author_avatar_path',
];

const LIST_COLUMNS = [
  'designs.id',
  'designs.uuid',
  'designs.slug',
  // Ownership/type FKs are needed by the visibility and "more like this" checks
  // — they are stripped again by the serializer, never sent to the client.
  'designs.owner_id',
  'designs.component_type_id',
  'designs.resource_type_id',
  'designs.deleted_at',
  'designs.title',
  'designs.summary',
  'designs.status',
  'designs.publish_as',
  'designs.institute_name',
  'designs.is_iso22916',
  'designs.is_featured',
  'designs.view_count',
  'designs.download_count',
  'designs.star_count',
  'designs.comment_count',
  'designs.ownership_count',
  'designs.average_rating',
  'designs.rating_count',
  'designs.published_at',
  'designs.created_at',
  'designs.updated_at',
  'component_types.slug as component_type_slug',
  'component_types.name as component_type_name',
  'resource_types.slug as resource_type_slug',
  'resource_types.name as resource_type_name',
  'current_version.version as version',
  'current_version.id as current_version_id',
  'licenses.code as license_code',
  'licenses.name as license_name',
  'materials.slug as material_slug',
  'materials.name as material_name',
  'fabrication_methods.slug as fabrication_slug',
  'fabrication_methods.name as fabrication_name',
  ...AUTHOR_COLUMNS,
];

class DesignRepository extends BaseRepository {
  constructor() {
    super('designs', { softDelete: true });
  }

  /** Join skeleton shared by browse and detail queries. */
  baseQuery(trx) {
    return (trx || db)('designs')
      .join('users as owner', 'designs.owner_id', 'owner.id')
      .leftJoin('component_types', 'designs.component_type_id', 'component_types.id')
      .leftJoin('resource_types', 'designs.resource_type_id', 'resource_types.id')
      .leftJoin('design_versions as current_version', 'designs.current_version_id', 'current_version.id')
      .leftJoin('licenses', 'current_version.license_id', 'licenses.id')
      .leftJoin('materials', 'current_version.tested_material_id', 'materials.id')
      .leftJoin('fabrication_methods', 'current_version.tested_fabrication_method_id', 'fabrication_methods.id')
      .whereNull('designs.deleted_at');
  }

  /**
   * SCR-017 — browse / search with filters.
   * @param {object} filters normalised by the service (ids already resolved)
   */
  browseQuery(filters = {}, trx) {
    const q = this.baseQuery(trx).select(LIST_COLUMNS);

    // Visibility: only published designs unless the caller may see more.
    if (filters.statuses?.length) {
      q.whereIn('designs.status', filters.statuses);
    } else {
      q.where('designs.status', DESIGN_STATUS.PUBLISHED);
    }

    if (filters.ownerId) q.where('designs.owner_id', filters.ownerId);
    if (filters.componentTypeIds?.length) q.whereIn('designs.component_type_id', filters.componentTypeIds);
    if (filters.resourceTypeIds?.length) q.whereIn('designs.resource_type_id', filters.resourceTypeIds);
    if (filters.licenseIds?.length) q.whereIn('current_version.license_id', filters.licenseIds);
    if (filters.materialIds?.length) q.whereIn('current_version.tested_material_id', filters.materialIds);
    if (filters.fabricationIds?.length)
      q.whereIn('current_version.tested_fabrication_method_id', filters.fabricationIds);
    if (filters.iso22916 !== undefined) q.where('designs.is_iso22916', filters.iso22916);
    if (filters.featured !== undefined) q.where('designs.is_featured', filters.featured);

    if (filters.organIds?.length) {
      q.whereExists((sub) =>
        sub
          .select(db.raw(1))
          .from('design_version_organs')
          .whereRaw('design_version_organs.design_version_id = designs.current_version_id')
          .whereIn('design_version_organs.organ_id', filters.organIds),
      );
    }

    if (filters.tagIds?.length) {
      q.whereExists((sub) =>
        sub
          .select(db.raw(1))
          .from('design_tags')
          .whereRaw('design_tags.design_id = designs.id')
          .whereIn('design_tags.tag_id', filters.tagIds),
      );
    }

    if (filters.search) {
      const term = `%${escapeLike(filters.search)}%`;
      q.where((b) =>
        b
          .where('designs.title', 'like', term)
          .orWhere('designs.summary', 'like', term)
          .orWhere('owner.name', 'like', term)
          .orWhere('current_version.description', 'like', term),
      );
    }

    if (filters.minRating) q.where('designs.average_rating', '>=', filters.minRating);
    if (filters.publishedAfter) q.where('designs.published_at', '>=', filters.publishedAfter);
    if (filters.publishedBefore) q.where('designs.published_at', '<=', filters.publishedBefore);

    return q;
  }

  /** Counts per facet so the browse sidebar can show numbers next to filters. */
  async facets(filters = {}) {
    const scoped = () => this.browseQuery(filters).clone().clearSelect().clearOrder();

    const [componentTypes, organs, materials, licenses, iso] = await Promise.all([
      scoped()
        .select('component_types.slug', 'component_types.name')
        .count({ count: 'designs.id' })
        .groupBy('component_types.slug', 'component_types.name'),
      scoped()
        .join('design_version_organs', 'design_version_organs.design_version_id', 'designs.current_version_id')
        .join('organs', 'design_version_organs.organ_id', 'organs.id')
        .select('organs.slug', 'organs.name')
        .count({ count: 'designs.id' })
        .groupBy('organs.slug', 'organs.name'),
      scoped()
        .select('materials.slug', 'materials.name')
        .count({ count: 'designs.id' })
        .groupBy('materials.slug', 'materials.name'),
      scoped()
        .select('licenses.code as slug', 'licenses.name')
        .count({ count: 'designs.id' })
        .groupBy('licenses.code', 'licenses.name'),
      scoped().select('designs.is_iso22916 as slug').count({ count: 'designs.id' }).groupBy('designs.is_iso22916'),
    ]);

    const clean = (rows) =>
      rows.filter((r) => r.slug !== null && r.slug !== undefined).map((r) => ({ ...r, count: Number(r.count) }));

    return {
      componentTypes: clean(componentTypes),
      organs: clean(organs),
      materials: clean(materials),
      licenses: clean(licenses),
      iso22916: clean(iso).map((r) => ({ ...r, slug: r.slug ? 'compliant' : 'not-declared' })),
    };
  }

  findBySlugOrId(identifier, trx) {
    const q = this.baseQuery(trx).select(LIST_COLUMNS);
    return Number.isFinite(Number(identifier))
      ? q.where('designs.id', Number(identifier)).first()
      : q.where('designs.slug', identifier).orWhere('designs.uuid', identifier).first();
  }

  slugTaken(slug, excludeId, trx) {
    const q = (trx || db)('designs').where({ slug });
    if (excludeId) q.whereNot('id', excludeId);
    return q.first().then(Boolean);
  }

  // ── Versions ─────────────────────────────────────────────────────────────
  listVersions(designId, { includeDrafts = false } = {}, trx) {
    const q = (trx || db)('design_versions')
      .leftJoin('licenses', 'design_versions.license_id', 'licenses.id')
      .where('design_versions.design_id', designId)
      .orderBy('design_versions.version_number', 'desc')
      .select('design_versions.*', 'licenses.code as license_code', 'licenses.name as license_name');
    if (!includeDrafts) q.where('design_versions.status', DESIGN_STATUS.PUBLISHED);
    return q;
  }

  /**
   * Newest not-yet-live version per design, keyed by design id.
   *
   * A published design can have a draft queued behind it — the version branched
   * by an edit or by "new version". "My designs" needs it because the row's own
   * status still reads `published`, so without this the draft is invisible and
   * submitting the design would re-submit the live version instead.
   */
  async unpublishedVersionsByDesign(designIds = [], trx) {
    if (!designIds.length) return {};

    const rows = await (trx || db)('design_versions')
      .join('designs', 'designs.id', 'design_versions.design_id')
      .whereIn('design_versions.design_id', designIds)
      .whereIn('design_versions.status', [DESIGN_STATUS.DRAFT, DESIGN_STATUS.PENDING])
      .whereRaw('(designs.current_version_id is null or design_versions.id <> designs.current_version_id)')
      .orderBy('design_versions.version_number', 'desc')
      .select(
        'design_versions.id',
        'design_versions.design_id',
        'design_versions.version',
        'design_versions.status',
      );

    const byDesign = {};
    // Ordered newest-first, so the first row seen per design is the one to show.
    for (const row of rows) {
      if (!(row.design_id in byDesign)) byDesign[row.design_id] = row;
    }
    return byDesign;
  }

  findVersion(designId, versionIdOrLabel, trx) {
    const q = (trx || db)('design_versions')
      .leftJoin('licenses', 'design_versions.license_id', 'licenses.id')
      .leftJoin('materials', 'design_versions.tested_material_id', 'materials.id')
      .leftJoin('fabrication_methods', 'design_versions.tested_fabrication_method_id', 'fabrication_methods.id')
      .leftJoin('component_types', 'design_versions.component_type_id', 'component_types.id')
      .where('design_versions.design_id', designId)
      .select(
        'design_versions.*',
        'licenses.code as license_code',
        'licenses.name as license_name',
        'licenses.url as license_url',
        'licenses.summary as license_summary',
        'materials.slug as material_slug',
        'materials.name as material_name',
        'fabrication_methods.slug as fabrication_slug',
        'fabrication_methods.name as fabrication_name',
        'component_types.slug as component_type_slug',
        'component_types.name as component_type_name',
      );

    return Number.isFinite(Number(versionIdOrLabel))
      ? q.where('design_versions.id', Number(versionIdOrLabel)).first()
      : q.where('design_versions.version', versionIdOrLabel).first();
  }

  latestVersion(designId, trx) {
    return (trx || db)('design_versions')
      .where({ design_id: designId })
      .orderBy('version_number', 'desc')
      .first();
  }

  createVersion(data, trx) {
    return (trx || db)('design_versions').insert(data).then(([id]) => id);
  }

  updateVersion(id, data, trx) {
    return (trx || db)('design_versions').where({ id }).update(data);
  }

  // ── Version-scoped collections ───────────────────────────────────────────
  listFiles(versionId, trx) {
    return (trx || db)('design_files')
      .where({ design_version_id: versionId })
      .orderBy('sort_order')
      .orderBy('id')
      .select('*');
  }

  /**
   * By numeric id or uuid — the serializer hands clients the uuid, so that is
   * what comes back in a delete, while internal callers hold the numeric id.
   */
  findFile(fileId, trx) {
    const q = (trx || db)('design_files');
    return Number.isFinite(Number(fileId))
      ? q.where({ id: Number(fileId) }).first()
      : q.where({ uuid: fileId }).first();
  }

  addFiles(rows, trx) {
    return rows.length ? (trx || db)('design_files').insert(rows) : Promise.resolve([]);
  }

  deleteFile(fileId, trx) {
    return (trx || db)('design_files').where({ id: fileId }).del();
  }

  listOrgans(versionId, trx) {
    return (trx || db)('design_version_organs')
      .join('organs', 'design_version_organs.organ_id', 'organs.id')
      .where('design_version_organs.design_version_id', versionId)
      .select('organs.id', 'organs.slug', 'organs.name');
  }

  async replaceOrgans(versionId, organIds = [], trx) {
    const runner = trx || db;
    await runner('design_version_organs').where({ design_version_id: versionId }).del();
    if (organIds.length) {
      await runner('design_version_organs').insert(
        [...new Set(organIds)].map((organ_id) => ({ design_version_id: versionId, organ_id })),
      );
    }
  }

  listTags(designId, trx) {
    return (trx || db)('design_tags')
      .join('tags', 'design_tags.tag_id', 'tags.id')
      .where('design_tags.design_id', designId)
      .select('tags.id', 'tags.slug', 'tags.name');
  }

  async replaceTags(designId, tagIds = [], trx) {
    const runner = trx || db;
    const previous = await runner('design_tags').where({ design_id: designId }).pluck('tag_id');
    await runner('design_tags').where({ design_id: designId }).del();
    if (tagIds.length) {
      await runner('design_tags').insert([...new Set(tagIds)].map((tag_id) => ({ design_id: designId, tag_id })));
      await runner('tags').whereIn('id', tagIds).increment('usage_count', 1);
    }
    if (previous.length) await runner('tags').whereIn('id', previous).decrement('usage_count', 1);
  }

  listCredits(versionId, trx) {
    return (trx || db)('design_credits').where({ design_version_id: versionId }).orderBy('sort_order').select('*');
  }

  listPublishedWorks(versionId, trx) {
    return (trx || db)('design_published_works')
      .where({ design_version_id: versionId })
      .orderBy('sort_order')
      .select('*');
  }

  listRelatedDocuments(versionId, trx) {
    return (trx || db)('design_related_documents')
      .leftJoin('design_files', 'design_related_documents.file_id', 'design_files.id')
      .where('design_related_documents.design_version_id', versionId)
      .orderBy('design_related_documents.sort_order')
      .select('design_related_documents.*', 'design_files.path as file_path', 'design_files.original_name as file_name');
  }

  async replaceCollection(table, versionId, rows = [], trx) {
    const runner = trx || db;
    await runner(table).where({ design_version_id: versionId }).del();
    if (rows.length) {
      await runner(table).insert(rows.map((row, i) => ({ ...row, design_version_id: versionId, sort_order: i })));
    }
  }

  // ── Comments ─────────────────────────────────────────────────────────────
  commentsQuery(designId, { includeHidden = false } = {}, trx) {
    const q = (trx || db)('design_comments')
      .join('users as author', 'design_comments.user_id', 'author.id')
      .where('design_comments.design_id', designId)
      .whereNull('design_comments.deleted_at')
      .orderBy('design_comments.created_at', 'asc')
      .select('design_comments.*', ...AUTHOR_COLUMNS.map((c) => c.replace('owner.', 'author.')));
    if (!includeHidden) q.where('design_comments.status', COMMENT_STATUS.VISIBLE);
    return q;
  }

  findComment(id, trx) {
    return (trx || db)('design_comments').where({ id }).whereNull('deleted_at').first();
  }

  createComment(data, trx) {
    return (trx || db)('design_comments').insert(data).then(([id]) => id);
  }

  // ── Engagement ───────────────────────────────────────────────────────────
  findStar(designId, userId, trx) {
    return (trx || db)('design_stars').where({ design_id: designId, user_id: userId }).first();
  }

  addStar(designId, userId, trx) {
    return (trx || db)('design_stars').insert({ design_id: designId, user_id: userId });
  }

  removeStar(designId, userId, trx) {
    return (trx || db)('design_stars').where({ design_id: designId, user_id: userId }).del();
  }

  findOwnership(designId, userId, trx) {
    return (trx || db)('design_ownerships').where({ design_id: designId, user_id: userId }).first();
  }

  listOwnerships(designId, trx) {
    return (trx || db)('design_ownerships')
      .join('users', 'design_ownerships.user_id', 'users.id')
      .where('design_ownerships.design_id', designId)
      .orderBy('design_ownerships.created_at', 'desc')
      .select(
        'design_ownerships.*',
        'users.name as user_name',
        'users.handle as user_handle',
        'users.affiliation as user_affiliation',
        'users.avatar_path as user_avatar_path',
      );
  }

  /** Recomputes the rating aggregate after an ownership row changes. */
  async refreshRating(designId, trx) {
    const runner = trx || db;
    const row = await runner('design_ownerships')
      .where({ design_id: designId })
      .whereNotNull('rating')
      .select(runner.raw('COUNT(*) as count'), runner.raw('AVG(rating) as average'))
      .first();
    const [{ owners }] = await runner('design_ownerships')
      .where({ design_id: designId })
      .count({ owners: 'id' });

    await runner('designs')
      .where({ id: designId })
      .update({
        rating_count: Number(row?.count) || 0,
        average_rating: Number(row?.average) || 0,
        ownership_count: Number(owners) || 0,
      });
  }

  recordDownload(data, trx) {
    return (trx || db)('design_downloads').insert(data);
  }

  recordView(data, trx) {
    return (trx || db)('design_views').insert(data);
  }

  /** Designs the caller has starred, for "did I star this?" flags in lists. */
  async starredIds(userId, designIds = [], trx) {
    if (!userId || !designIds.length) return new Set();
    const rows = await (trx || db)('design_stars')
      .where('user_id', userId)
      .whereIn('design_id', designIds)
      .pluck('design_id');
    return new Set(rows);
  }

  /** Simple "more like this": same component type or shared organs. */
  related(design, limit = 4, trx) {
    return this.baseQuery(trx)
      .select(LIST_COLUMNS)
      .where('designs.status', DESIGN_STATUS.PUBLISHED)
      .whereNot('designs.id', design.id)
      .where((b) => {
        b.where('designs.component_type_id', design.component_type_id);
        if (design.current_version_id) {
          b.orWhereExists((sub) =>
            sub
              .select(db.raw(1))
              .from('design_version_organs as a')
              .join('design_version_organs as b', 'a.organ_id', 'b.organ_id')
              .whereRaw('a.design_version_id = designs.current_version_id')
              .where('b.design_version_id', design.current_version_id),
          );
        }
      })
      .orderBy('designs.download_count', 'desc')
      .limit(limit);
  }

  /** Aggregate counters for the admin dashboard (SCR-032). */
  async stats(trx) {
    const runner = trx || db;
    const [totals] = await runner('designs')
      .whereNull('deleted_at')
      .select(
        runner.raw('COUNT(*) as total'),
        runner.raw("SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published"),
        runner.raw("SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending"),
        runner.raw("SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft"),
        runner.raw('COALESCE(SUM(download_count), 0) as downloads'),
        runner.raw('COALESCE(SUM(view_count), 0) as views'),
      );
    return {
      total: Number(totals.total) || 0,
      published: Number(totals.published) || 0,
      pending: Number(totals.pending) || 0,
      draft: Number(totals.draft) || 0,
      downloads: Number(totals.downloads) || 0,
      views: Number(totals.views) || 0,
    };
  }

  static get LIST_COLUMNS() {
    return LIST_COLUMNS;
  }

  /** Parses repeatable filter params into arrays. */
  static normaliseFilterInput(query = {}, key) {
    return toArray(query[key]);
  }
}

module.exports = new DesignRepository();
module.exports.LIST_COLUMNS = LIST_COLUMNS;
module.exports.AUTHOR_COLUMNS = AUTHOR_COLUMNS;
