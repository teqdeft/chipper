/**
 * Design library business rules (SCR-017..023 · CHIP-008..029).
 *
 * Key invariants:
 *  - A design is only visible to the public when status = published. Owners,
 *    moderators and admins see more; everyone else gets a 404 rather than a 403,
 *    so unpublished work is not even discoverable.
 *  - Metadata is written to a *version*, never to the design row alone. Editing a
 *    published design creates a new version; the previous one stays downloadable.
 *  - Type-specific fields are validated against component_type_fields, so the
 *    rules live in data, not in code.
 *  - Downloads always identify a user (CHIP-025, "security-critical" in the
 *    screen inventory) and are recorded before the file is streamed.
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const config = require('../../config');
const { db } = require('../../database/connection');
const ApiError = require('../../utils/ApiError');
const { getPagination, buildPaginationMeta, applySorting } = require('../../utils/pagination');
const { uuid, uniqueSlug, nextVersion, toArray, pick } = require('../../utils/helpers');
const {
  DESIGN_STATUS, SORTABLE_DESIGN_FIELDS, COMMENT_STATUS, NOTIFICATION_TYPE, ENTITY_TYPE,
  PUBLISH_AS, COMPONENT_TYPE, FILE_KIND, MAX_COVER_IMAGES,
} = require('../../config/constants');
const { PERMISSIONS, roleHasPermission } = require('../../config/permissions');
const {
  describeFile, removeStoredFile, copyStoredFile, cleanupFiles, kindOf,
} = require('../../middlewares/upload');
const designRepository = require('./design.repository');
const taxonomyService = require('../taxonomy/taxonomy.service');
const notificationService = require('../notifications/notification.service');
const auditService = require('../../services/audit.service');
const serializer = require('./design.serializer');

const VERSION_METADATA_FIELDS = [
  'title', 'summary', 'description', 'component_type_id', 'resource_type_id', 'license_id',
  'custom_license_text', 'how_to_cite', 'credits_note', 'tested_material_id',
  'tested_fabrication_method_id', 'clip_string', 'max_height_mm', 'clamping_zone_height_mm',
  'exclusion_zones', 'clamping_strategy', 'operating_temp_min', 'operating_temp_max',
  'operating_temp_unit', 'operating_pressure_min', 'operating_pressure_max', 'operating_pressure_unit',
  'operating_flow_min', 'operating_flow_max', 'operating_flow_unit', 'is_iso22916', 'iso22916_note',
];

const canModerateDesigns = (user) => Boolean(user && roleHasPermission(user.role, PERMISSIONS.DESIGN_MODERATE));
const isOwner = (design, user) => Boolean(user && Number(design.owner_id) === Number(user.id));

/**
 * Resolves every taxonomy slug in the payload to its id.
 *
 * A value the vocabulary does not know resolves to null, which would silently
 * drop the field and leave a draft that fails at publish time with no clue as
 * to why. So anything the caller actually sent must resolve, and the mismatch
 * is reported against the field the client can fix.
 */
async function resolveTaxonomyIds(payload) {
  const [componentTypeId, resourceTypeId, licenseId, materialId, fabricationId, organIds] = await Promise.all([
    taxonomyService.resolveId('component_types', payload.componentType),
    taxonomyService.resolveId('resource_types', payload.resourceType),
    payload.license ? db('licenses').where({ code: payload.license }).first('id').then((r) => r?.id ?? null) : null,
    taxonomyService.resolveId('materials', payload.testedMaterial),
    taxonomyService.resolveId('fabrication_methods', payload.testedFabricationMethod),
    taxonomyService.resolveIds('organs', toArray(payload.organs)),
  ]);

  const unknown = [];
  const check = (value, id, field, label) => {
    if (value && !id) unknown.push({ field, message: `"${value}" is not a known ${label}` });
  };

  check(payload.componentType, componentTypeId, 'componentType', 'component type');
  check(payload.resourceType, resourceTypeId, 'resourceType', 'resource type');
  check(payload.license, licenseId, 'license', 'licence');
  check(payload.testedMaterial, materialId, 'testedMaterial', 'material');
  check(payload.testedFabricationMethod, fabricationId, 'testedFabricationMethod', 'fabrication method');

  // resolveIds dedupes, so the request is deduped too before counting.
  const requestedOrgans = [...new Set(toArray(payload.organs).map((o) => String(o).toLowerCase()))];
  if (requestedOrgans.length && organIds.length !== requestedOrgans.length) {
    unknown.push({ field: 'organs', message: 'One or more organs are not in the vocabulary' });
  }

  if (unknown.length) throw ApiError.validation('Some values are not recognised', unknown);

  return { componentTypeId, resourceTypeId, licenseId, materialId, fabricationId, organIds };
}

/**
 * Maps an API payload onto design_versions columns.
 *
 * Every plain field here is left `undefined` when the payload does not carry it,
 * so `pick` drops it and an update only touches what was sent. The taxonomy FKs
 * need the same treatment spelled out: `resolveTaxonomyIds` maps an absent field
 * to null, and null survives `pick`, so writing them unconditionally would blank
 * out every taxonomy link a PATCH did not happen to mention — leaving a design
 * that reads fine but can no longer pass the publish gate.
 *
 * None of these fields accept null or '' from the validator, so "sent" is exactly
 * "not undefined"; there is no way to clear one on purpose that this would break.
 */
function buildVersionColumns(payload, ids, typeSpecific) {
  const operating = payload.operatingParameters || {};
  const whenSent = (key, id) => (payload[key] !== undefined ? id : undefined);

  return {
    title: payload.title,
    summary: payload.summary,
    description: payload.description,
    component_type_id: whenSent('componentType', ids.componentTypeId),
    resource_type_id: whenSent('resourceType', ids.resourceTypeId),
    license_id: whenSent('license', ids.licenseId),
    custom_license_text: payload.customLicenseText,
    how_to_cite: payload.howToCite,
    credits_note: payload.creditsNote,
    tested_material_id: whenSent('testedMaterial', ids.materialId),
    tested_fabrication_method_id: whenSent('testedFabricationMethod', ids.fabricationId),
    clip_string: payload.clipString,
    max_height_mm: payload.maxHeightMm,
    clamping_zone_height_mm: payload.clampingZoneHeightMm,
    exclusion_zones: payload.exclusionZones,
    clamping_strategy: payload.clampingStrategy,
    operating_temp_min: operating.temperature?.min,
    operating_temp_max: operating.temperature?.max,
    operating_temp_unit: operating.temperature?.unit,
    operating_pressure_min: operating.pressure?.min,
    operating_pressure_max: operating.pressure?.max,
    operating_pressure_unit: operating.pressure?.unit,
    operating_flow_min: operating.flowRate?.min,
    operating_flow_max: operating.flowRate?.max,
    operating_flow_unit: operating.flowRate?.unit,
    is_iso22916: payload.iso22916,
    iso22916_note: payload.iso22916Note,
    type_specific: typeSpecific ? JSON.stringify(typeSpecific) : undefined,
  };
}

/** Writes the version-scoped child collections (organs, credits, works, docs). */
async function writeVersionCollections(versionId, payload, ids, trx) {
  if (payload.organs !== undefined) await designRepository.replaceOrgans(versionId, ids.organIds, trx);

  if (payload.credits !== undefined) {
    await designRepository.replaceCollection(
      'design_credits',
      versionId,
      (payload.credits || []).map((c) => ({
        name: c.name,
        affiliation: c.affiliation || null,
        role: c.role || null,
        url: c.url || null,
        user_id: c.userId || null,
      })),
      trx,
    );
  }

  if (payload.publishedWorks !== undefined) {
    await designRepository.replaceCollection(
      'design_published_works',
      versionId,
      (payload.publishedWorks || []).map((w) => ({
        title: w.title,
        authors: w.authors || null,
        publication: w.publication || null,
        year: w.year || null,
        doi: w.doi || null,
        url: w.url || null,
      })),
      trx,
    );
  }

  if (payload.relatedDocuments !== undefined) {
    await designRepository.replaceCollection(
      'design_related_documents',
      versionId,
      (payload.relatedDocuments || []).map((d) => ({
        title: d.title,
        document_type: d.documentType || null,
        url: d.url || null,
        description: d.description || null,
        related_design_id: d.relatedDesignId || null,
        file_id: d.fileId || null,
      })),
      trx,
    );
  }
}

/**
 * Which files in an upload are the gallery covers.
 *
 * `coverIndexes` is the current parameter (up to three); `coverIndex` is the
 * older single-cover one and still works, so an existing client keeps working.
 * A cover the gallery cannot render is a bug the uploader cannot see, so
 * anything that is not an image is rejected rather than silently accepted.
 */
function resolveCoverIndexes(files, { coverIndex, coverIndexes }) {
  const requested = toArray(coverIndexes).length
    ? toArray(coverIndexes)
    : coverIndex !== undefined && coverIndex !== null
      ? [coverIndex]
      : [];

  const indexes = [
    ...new Set(
      requested
        .map(Number)
        .filter((n) => Number.isInteger(n) && n >= 0 && n < files.length),
    ),
  ];

  if (indexes.length > MAX_COVER_IMAGES) {
    throw ApiError.validation(`Choose at most ${MAX_COVER_IMAGES} cover images`, [
      { field: 'coverIndexes', message: `A design shows at most ${MAX_COVER_IMAGES} cover images` },
    ]);
  }

  const notImages = indexes.filter((i) => kindOf(files[i].originalname) !== FILE_KIND.IMAGE);
  if (notImages.length) {
    throw ApiError.validation('Cover images must be images', [
      {
        field: 'coverIndexes',
        message: `"${files[notImages[0]].originalname}" is not an image — covers must be JPG, PNG, WebP or GIF`,
      },
    ]);
  }

  return indexes;
}

const designService = {
  /** SCR-017 — browse / search with filters, sorting and facet counts. */
  async browse(query, viewer = null) {
    const { page, limit } = getPagination(query);

    const [componentTypeIds, resourceTypeIds, organIds, materialIds, fabricationIds, tagIds, licenseIds] =
      await Promise.all([
        taxonomyService.resolveIds('component_types', toArray(query.componentType)),
        taxonomyService.resolveIds('resource_types', toArray(query.resourceType)),
        taxonomyService.resolveIds('organs', toArray(query.organ)),
        taxonomyService.resolveIds('materials', toArray(query.material)),
        taxonomyService.resolveIds('fabrication_methods', toArray(query.fabricationMethod)),
        taxonomyService.resolveIds('tags', toArray(query.tag)),
        toArray(query.license).length
          ? db('licenses').whereIn('code', toArray(query.license)).pluck('id')
          : Promise.resolve([]),
      ]);

    // Non-moderators may only widen beyond "published" for their own designs.
    let statuses = [];
    if (query.status) {
      const requested = toArray(query.status);
      statuses = canModerateDesigns(viewer) || query.mine ? requested : [DESIGN_STATUS.PUBLISHED];
    }

    const filters = {
      statuses,
      search: query.search,
      componentTypeIds,
      resourceTypeIds,
      organIds,
      materialIds,
      fabricationIds,
      tagIds,
      licenseIds,
      iso22916: query.iso22916,
      featured: query.featured,
      minRating: query.minRating,
      ownerId: query.mine && viewer ? viewer.id : undefined,
    };

    if (query.author) {
      const author = await db('users').where({ handle: String(query.author).toLowerCase() }).first('id');
      filters.ownerId = author ? author.id : -1;
    }

    const base = designRepository.browseQuery(filters);
    const [{ total }] = await base.clone().clearSelect().clearOrder().count({ total: 'designs.id' });

    applySorting(base, query, SORTABLE_DESIGN_FIELDS, { column: 'published_at', order: 'desc' });
    const rows = await base.limit(limit).offset((page - 1) * limit);

    const items = await this.decorateList(rows, viewer);
    const facets = query.facets ? await designRepository.facets(filters) : undefined;

    return {
      items,
      pagination: buildPaginationMeta({ total, page, limit }),
      facets,
    };
  },

  /** Attaches organs, tags, the card thumbnail and the viewer's star state. */
  async decorateList(rows, viewer) {
    if (!rows.length) return [];

    const designIds = rows.map((r) => r.id);
    const versionIds = rows.map((r) => r.current_version_id).filter(Boolean);

    const [organRows, tagRows, imageRows, starred] = await Promise.all([
      versionIds.length
        ? db('design_version_organs')
            .join('organs', 'design_version_organs.organ_id', 'organs.id')
            .whereIn('design_version_organs.design_version_id', versionIds)
            .select('design_version_organs.design_version_id', 'organs.slug', 'organs.name')
        : [],
      db('design_tags')
        .join('tags', 'design_tags.tag_id', 'tags.id')
        .whereIn('design_tags.design_id', designIds)
        .select('design_tags.design_id', 'tags.slug', 'tags.name'),
      // Covers first, so a design that predates cover images still gets a
      // thumbnail from whatever it did upload rather than a blank card.
      versionIds.length
        ? db('design_files')
            .whereIn('design_version_id', versionIds)
            .where('kind', FILE_KIND.IMAGE)
            .orderBy('is_cover', 'desc')
            .orderBy('sort_order')
            .orderBy('id')
            .select('design_version_id', 'path')
        : [],
      designRepository.starredIds(viewer?.id, designIds),
    ]);

    const organsByVersion = groupBy(organRows, 'design_version_id');
    const tagsByDesign = groupBy(tagRows, 'design_id');

    const coverByVersion = {};
    for (const image of imageRows) {
      if (!(image.design_version_id in coverByVersion)) {
        coverByVersion[image.design_version_id] = image.path;
      }
    }

    return rows.map((row) =>
      serializer.toDesignList(row, {
        organs: organsByVersion[row.current_version_id] || [],
        tags: tagsByDesign[row.id] || [],
        starred: starred.has(row.id),
        coverPath: coverByVersion[row.current_version_id] || null,
      }),
    );
  },

  /** SCR-018 — one design with its current (or requested) version. */
  async getDetail(identifier, { versionLabel, viewer, countView = true, context = {} } = {}) {
    const design = await designRepository.findBySlugOrId(identifier);
    if (!design) throw ApiError.notFound('Design not found');

    const owner = isOwner(design, viewer);
    const moderator = canModerateDesigns(viewer);
    if (design.status !== DESIGN_STATUS.PUBLISHED && !owner && !moderator) {
      throw ApiError.notFound('Design not found');
    }

    const versionRow = versionLabel
      ? await designRepository.findVersion(design.id, versionLabel)
      : await designRepository.findVersion(design.id, design.current_version_id);

    if (versionLabel && !versionRow) throw ApiError.notFound(`Version "${versionLabel}" not found`);
    // A non-owner may not read an unpublished version of a published design.
    if (versionRow && versionRow.status !== DESIGN_STATUS.PUBLISHED && !owner && !moderator) {
      throw ApiError.notFound('Version not found');
    }

    const versionId = versionRow?.id;
    const [organs, tags, files, credits, works, documents, versions, star, ownership] = await Promise.all([
      versionId ? designRepository.listOrgans(versionId) : [],
      designRepository.listTags(design.id),
      versionId ? designRepository.listFiles(versionId) : [],
      versionId ? designRepository.listCredits(versionId) : [],
      versionId ? designRepository.listPublishedWorks(versionId) : [],
      versionId ? designRepository.listRelatedDocuments(versionId) : [],
      designRepository.listVersions(design.id, { includeDrafts: owner || moderator }),
      viewer ? designRepository.findStar(design.id, viewer.id) : null,
      viewer ? designRepository.findOwnership(design.id, viewer.id) : null,
    ]);

    if (countView) {
      this.recordView(design, viewer, context).catch(() => {});
    }

    return serializer.toDesignDetail(design, {
      organs,
      tags,
      version: serializer.toVersion(versionRow, { organs, files, credits, works, documents }),
      versions,
      starred: Boolean(star),
      owned: ownership,
      viewerRating: ownership?.rating ?? null,
      canEdit: owner || moderator,
      canModerate: moderator,
    });
  },

  /** Deduped view counter — one view per user (or IP) per design per 24 h. */
  async recordView(design, viewer, context = {}) {
    const ipHash = context.ip
      ? crypto.createHash('sha256').update(`${context.ip}:${design.id}`).digest('hex')
      : null;

    const recent = await db('design_views')
      .where({ design_id: design.id })
      .where((b) => {
        if (viewer) b.where('user_id', viewer.id);
        else if (ipHash) b.where('ip_hash', ipHash);
        else b.whereRaw('1 = 0');
      })
      .where('created_at', '>', db.raw('DATE_SUB(NOW(), INTERVAL 1 DAY)'))
      .first();

    if (recent) return;

    await db.transaction(async (trx) => {
      await designRepository.recordView(
        { design_id: design.id, user_id: viewer?.id || null, ip_hash: ipHash },
        trx,
      );
      await designRepository.increment(design.id, 'view_count', 1, trx);
    });
  },

  /** SCR-021 — create a design (starts as a draft with version v1.0). */
  async create(payload, user, context = {}) {
    const ids = await resolveTaxonomyIds(payload);
    if (!ids.componentTypeId) {
      throw ApiError.validation('A component type is required', [
        { field: 'componentType', message: 'Choose a component type' },
      ]);
    }

    const typeSpecific = await taxonomyService.validateTypeSpecific(
      ids.componentTypeId,
      payload.typeSpecific || {},
      { strict: false },
    );

    const slug = await uniqueSlug(payload.title, (candidate) => designRepository.slugTaken(candidate));

    const designId = await db.transaction(async (trx) => {
      const id = await designRepository.create(
        {
          uuid: uuid(),
          slug,
          owner_id: user.id,
          component_type_id: ids.componentTypeId,
          resource_type_id: ids.resourceTypeId,
          title: payload.title,
          summary: payload.summary,
          status: DESIGN_STATUS.DRAFT,
          publish_as: payload.publishAs || 'person',
          institute_name: payload.instituteName || null,
          is_iso22916: Boolean(payload.iso22916),
        },
        trx,
      );

      const versionId = await designRepository.createVersion(
        {
          design_id: id,
          version: payload.version || 'v1.0',
          version_number: 1,
          version_note: payload.versionNote || 'Initial version',
          status: DESIGN_STATUS.DRAFT,
          created_by: user.id,
          ...buildVersionColumns(payload, ids, typeSpecific),
        },
        trx,
      );

      await designRepository.update(id, { current_version_id: versionId }, trx);
      await writeVersionCollections(versionId, payload, ids, trx);

      if (payload.tags) {
        const tagIds = await taxonomyService.upsertTags(payload.tags, trx);
        await designRepository.replaceTags(id, tagIds, trx);
      }

      return id;
    });

    await auditService.log({
      userId: user.id,
      action: 'design.create',
      entityType: ENTITY_TYPE.DESIGN,
      entityId: designId,
      context,
    });

    return this.getDetail(designId, { viewer: user, countView: false });
  },

  /**
   * SCR-023 — update metadata.
   * Editing a *published* design writes to a new draft version, so the live
   * version keeps its numbers; editing a draft edits it in place.
   */
  async update(identifier, payload, user, context = {}) {
    const design = await this.assertEditable(identifier, user);
    const ids = await resolveTaxonomyIds(payload);
    const componentTypeId = ids.componentTypeId || design.component_type_id;

    const typeSpecific =
      payload.typeSpecific !== undefined
        ? await taxonomyService.validateTypeSpecific(componentTypeId, payload.typeSpecific, { strict: false })
        : undefined;

    const current = await designRepository.findVersion(design.id, design.current_version_id);

    /**
     * A published design that already carries an unsubmitted draft is edited
     * *there*. Branching on every save would stack v1.1, v1.2, v1.3 for three
     * rounds of proof-reading and duplicate the file set each time. A draft that
     * has been submitted is left alone — a moderator is looking at it — so that
     * case still branches.
     */
    const queued =
      current && current.status === DESIGN_STATUS.PUBLISHED
        ? (await designRepository.unpublishedVersionsByDesign([design.id]))[design.id]
        : null;
    const reusable =
      queued && queued.status === DESIGN_STATUS.DRAFT
        ? await designRepository.findVersion(design.id, queued.id)
        : null;

    const target = reusable || current;
    const editInPlace = !target || target.status !== DESIGN_STATUS.PUBLISHED;

    // A branched draft inherits the published version's files. Without them it
    // would be a version nobody can publish — the gate demands a file and a
    // cover image, and this endpoint has no way to upload either.
    const carried =
      !editInPlace && target
        ? await this.prepareCarriedFiles(design.id, target.id, user.id)
        : { rows: [], paths: [] };

    let versionId;
    try {
      versionId = await db.transaction(async (trx) => {
        const columns = pick(buildVersionColumns(payload, { ...ids, componentTypeId }, typeSpecific), VERSION_METADATA_FIELDS);

        let targetVersionId;
        if (editInPlace && target) {
          await designRepository.updateVersion(target.id, columns, trx);
          targetVersionId = target.id;
        } else {
          // Branch a new draft version from the published one.
          const latest = await designRepository.latestVersion(design.id, trx);
          targetVersionId = await designRepository.createVersion(
            {
              ...pick(target || {}, VERSION_METADATA_FIELDS),
              ...columns,
              design_id: design.id,
              version: payload.version || nextVersion(latest?.version, payload.versionBump || 'minor'),
              version_number: (latest?.version_number || 0) + 1,
              version_note: payload.versionNote || 'Metadata update',
              status: DESIGN_STATUS.DRAFT,
              created_by: user.id,
              published_at: null,
              download_count: 0,
            },
            trx,
          );

          // Carry the previous version's collections forward as the starting point.
          if (target) await this.cloneVersionCollections(target.id, targetVersionId, trx);
          if (carried.rows.length) {
            await designRepository.addFiles(
              carried.rows.map((row) => ({ ...row, design_version_id: targetVersionId })),
              trx,
            );
          }
        }

        await writeVersionCollections(targetVersionId, payload, { ...ids, componentTypeId }, trx);

        await designRepository.update(
          design.id,
          {
            title: payload.title,
            summary: payload.summary,
            component_type_id: componentTypeId,
            resource_type_id: ids.resourceTypeId ?? design.resource_type_id,
            publish_as: payload.publishAs,
            institute_name: payload.instituteName,
            is_iso22916: payload.iso22916,
            // Only when the row being written is the design's own current
            // version. Editing a draft queued *behind* a live version must not
            // promote that draft — publishing is what moves the pointer.
            ...(editInPlace && !reusable ? { current_version_id: targetVersionId } : {}),
          },
          trx,
        );

        if (payload.tags) {
          const tagIds = await taxonomyService.upsertTags(payload.tags, trx);
          await designRepository.replaceTags(design.id, tagIds, trx);
        }

        return targetVersionId;
      });
    } catch (err) {
      await Promise.all(carried.paths.map((relative) => removeStoredFile(relative)));
      throw err;
    }

    await auditService.log({
      userId: user.id,
      action: 'design.update',
      entityType: ENTITY_TYPE.DESIGN,
      entityId: design.id,
      changes: {
        versionId,
        inPlace: editInPlace,
        reusedDraft: Boolean(reusable),
        carriedFiles: carried.rows.length,
      },
      context,
    });

    return this.getDetail(design.id, { viewer: user, countView: false });
  },

  /** Copies organs/credits/works/documents from one version to another. */
  async cloneVersionCollections(fromVersionId, toVersionId, trx) {
    const [organs, credits, works, documents] = await Promise.all([
      designRepository.listOrgans(fromVersionId, trx),
      designRepository.listCredits(fromVersionId, trx),
      designRepository.listPublishedWorks(fromVersionId, trx),
      designRepository.listRelatedDocuments(fromVersionId, trx),
    ]);

    await designRepository.replaceOrgans(toVersionId, organs.map((o) => o.id), trx);
    await designRepository.replaceCollection(
      'design_credits',
      toVersionId,
      credits.map((c) => pick(c, ['name', 'affiliation', 'role', 'url', 'user_id'])),
      trx,
    );
    await designRepository.replaceCollection(
      'design_published_works',
      toVersionId,
      works.map((w) => pick(w, ['title', 'authors', 'publication', 'year', 'doi', 'url'])),
      trx,
    );
    await designRepository.replaceCollection(
      'design_related_documents',
      toVersionId,
      documents.map((d) => pick(d, ['title', 'document_type', 'url', 'description', 'related_design_id', 'file_id'])),
      trx,
    );
  },

  /**
   * Duplicates a version's files for the version about to be branched from it.
   *
   * A new version starts as a copy of the last one, and files are the reason:
   * bumping v1.0 to v1.1 for one revised STL should not make the uploader
   * re-upload the assembly PDF and the cover images — and without a cover the
   * publish gate would reject the new version outright.
   *
   * Each carried file gets its own bytes (see `copyStoredFile`) so deleting it
   * from one version leaves the other intact. The bytes are copied before the
   * caller's transaction opens, because the new version's row does not exist
   * yet; the returned `paths` let the caller clean up if that transaction then
   * rolls back. Rows come back without `design_version_id` for the caller to
   * stamp on.
   */
  async prepareCarriedFiles(designId, fromVersionId, userId) {
    const source = await designRepository.listFiles(fromVersionId);
    const rows = [];
    const paths = [];

    for (const [index, file] of source.entries()) {
      // Sequential on purpose: a version can carry twenty files and copying
      // them all at once would put twenty concurrent reads on the disk.
      // eslint-disable-next-line no-await-in-loop
      const copy = await copyStoredFile(file.path, config.upload.folders.designs, {
        originalName: file.original_name,
      });
      if (!copy) continue; // Source bytes are gone — skip rather than fail the version.

      paths.push(copy.path);
      rows.push({
        ...copy,
        uuid: uuid(),
        design_id: designId,
        original_name: file.original_name,
        mime_type: file.mime_type,
        extension: file.extension,
        size_bytes: file.size_bytes,
        checksum: file.checksum,
        is_primary: Boolean(file.is_primary),
        is_cover: Boolean(file.is_cover),
        sort_order: index,
        uploaded_by: userId,
        // Downloads belong to the version that earned them.
        download_count: 0,
      });
    }

    return { rows, paths };
  },

  /** Explicitly starts a new version (SCR-023 "publish new version"). */
  async createVersion(identifier, payload, user, context = {}) {
    const design = await this.assertEditable(identifier, user);
    const latest = await designRepository.latestVersion(design.id);
    const source = await designRepository.findVersion(design.id, design.current_version_id);

    const version = payload.version || nextVersion(latest?.version, payload.bump || 'minor');
    const exists = await db('design_versions').where({ design_id: design.id, version }).first();
    if (exists) throw ApiError.conflict(`Version ${version} already exists`, { code: 'VERSION_EXISTS' });

    const carried =
      source && payload.copyFiles !== false
        ? await this.prepareCarriedFiles(design.id, source.id, user.id)
        : { rows: [], paths: [] };

    let versionId;
    try {
      versionId = await db.transaction(async (trx) => {
        const id = await designRepository.createVersion(
          {
            ...pick(source || {}, VERSION_METADATA_FIELDS),
            design_id: design.id,
            version,
            version_number: (latest?.version_number || 0) + 1,
            version_note: payload.note || null,
            status: DESIGN_STATUS.DRAFT,
            created_by: user.id,
            type_specific: source?.type_specific,
          },
          trx,
        );
        if (source && payload.copyMetadata !== false) await this.cloneVersionCollections(source.id, id, trx);
        if (carried.rows.length) {
          await designRepository.addFiles(
            carried.rows.map((row) => ({ ...row, design_version_id: id })),
            trx,
          );
        }
        return id;
      });
    } catch (err) {
      // The copies are orphans now — nothing points at them.
      await Promise.all(carried.paths.map((relative) => removeStoredFile(relative)));
      throw err;
    }

    await auditService.log({
      userId: user.id,
      action: 'design.version_create',
      entityType: ENTITY_TYPE.DESIGN,
      entityId: design.id,
      changes: { version, carriedFiles: carried.rows.length },
      context,
    });

    const created = await designRepository.findVersion(design.id, versionId);
    return serializer.toVersion(created, { files: await designRepository.listFiles(versionId) });
  },

  /** SCR-021 final step — submit for review, or publish directly. */
  async publish(identifier, { versionId, note } = {}, user, context = {}) {
    const design = await this.assertEditable(identifier, user);
    const version = versionId
      ? await designRepository.findVersion(design.id, versionId)
      : await designRepository.findVersion(design.id, design.current_version_id);

    if (!version) throw ApiError.badRequest('This design has no version to publish');

    /**
     * Publishing requires the metadata the library depends on.
     *
     * The create/update validators already demand this set, but a draft can
     * predate them or be assembled field by field, so the gate is re-checked
     * against what is actually stored rather than what was last submitted.
     */
    const [files, organs] = await Promise.all([
      designRepository.listFiles(version.id),
      designRepository.listOrgans(version.id),
    ]);

    const problems = [];
    const needs = (ok, field, message) => {
      if (!ok) problems.push({ field, message });
    };

    needs(design.title, 'title', 'A title is required');
    needs(version.summary, 'summary', 'A short summary is required');
    needs(version.description, 'description', 'A description is required');
    needs(version.component_type_id, 'componentType', 'A component type is required');
    needs(version.resource_type_id, 'resourceType', 'A resource type is required');
    needs(version.tested_material_id, 'testedMaterial', 'Declare the tested material');
    needs(
      version.tested_fabrication_method_id,
      'testedFabricationMethod',
      'Declare the tested fabrication method',
    );
    needs(
      version.license_id || version.custom_license_text,
      'license',
      'Choose a licence before publishing',
    );
    needs(files.length, 'files', 'Upload at least one file');
    // The cover is what the library is browsed by — a design without one is a
    // blank card, so it is a publish requirement rather than a nicety.
    needs(
      files.some((f) => f.is_cover && f.kind === FILE_KIND.IMAGE),
      'coverImages',
      `Add at least one cover image (up to ${MAX_COVER_IMAGES}) — it is what people see on browse cards`,
    );

    if (design.publish_as !== PUBLISH_AS.PERSON) {
      needs(design.institute_name, 'instituteName', 'Name the institute you are publishing under');
    }

    const componentType = await db('component_types').where({ id: version.component_type_id }).first('slug');
    if (componentType?.slug === COMPONENT_TYPE.ORGAN_CHIP) {
      needs(organs.length, 'organs', 'Select at least one tested organ');
    }

    if (problems.length) throw ApiError.validation('This design is not ready to publish', problems);

    // Strict validation of the type-specific block at publish time.
    await taxonomyService.validateTypeSpecific(
      version.component_type_id,
      require('../../utils/helpers').parseJson(version.type_specific, {}),
      { strict: true },
    );

    const reviewRequired = config.features.designReviewRequired && !canModerateDesigns(user);
    const status = reviewRequired ? DESIGN_STATUS.PENDING : DESIGN_STATUS.PUBLISHED;

    const wasPublished = design.status === DESIGN_STATUS.PUBLISHED;

    /**
     * Submitting a *branch* of a live design must not take the library entry
     * down. The design row keeps its published status and keeps pointing at the
     * approved version; only the branch goes to `pending`, and the moderator's
     * approval is what moves the pointer (see admin.service reviewDesign).
     */
    const holdLiveVersion =
      wasPublished &&
      status === DESIGN_STATUS.PENDING &&
      Number(design.current_version_id) !== Number(version.id);

    await db.transaction(async (trx) => {
      await designRepository.updateVersion(
        version.id,
        { status, published_at: status === DESIGN_STATUS.PUBLISHED ? db.fn.now() : null },
        trx,
      );
      if (!holdLiveVersion) {
        await designRepository.update(
          design.id,
          {
            status,
            current_version_id: version.id,
            published_at: status === DESIGN_STATUS.PUBLISHED ? db.fn.now() : design.published_at,
          },
          trx,
        );
      }
      // Counts designs the member has put in the library, not versions of them —
      // otherwise every bump would inflate the profile's upload count.
      if (status === DESIGN_STATUS.PUBLISHED && !wasPublished) {
        await trx('users').where({ id: design.owner_id }).increment('upload_count', 1);
      }
    });

    if (status === DESIGN_STATUS.PUBLISHED && !wasPublished) {
      await require('../users/user.repository').awardBadge(design.owner_id, 'first-upload').catch(() => {});
    }

    await auditService.log({
      userId: user.id,
      action: reviewRequired ? 'design.submit_review' : 'design.publish',
      entityType: ENTITY_TYPE.DESIGN,
      entityId: design.id,
      changes: { version: version.version, note },
      context,
    });

    return {
      // The status of the version that was submitted — the design row itself may
      // still read `published` when a branch went to review behind it.
      status,
      requiresReview: reviewRequired,
      message: reviewRequired
        ? holdLiveVersion
          ? `${version.version} has been sent to review. Downloads keep serving your live version until it is approved.`
          : 'Your design has been sent to review. You will be notified when it is live.'
        : `${version.version} published`,
      design: await this.getDetail(design.id, { viewer: user, countView: false }),
    };
  },

  /** Soft-deletes a design (owner) or archives it (moderator). */
  async remove(identifier, user, context = {}) {
    const design = await this.assertEditable(identifier, user);

    await db.transaction(async (trx) => {
      await designRepository.update(
        design.id,
        { status: DESIGN_STATUS.ARCHIVED, deleted_at: db.fn.now() },
        trx,
      );
      if (design.status === DESIGN_STATUS.PUBLISHED) {
        await trx('users').where({ id: design.owner_id }).decrement('upload_count', 1);
      }
    });

    await auditService.log({
      userId: user.id,
      action: 'design.delete',
      entityType: ENTITY_TYPE.DESIGN,
      entityId: design.id,
      context,
    });

    return { deleted: true };
  },

  // ── Files ────────────────────────────────────────────────────────────────

  /** Attaches uploaded files to a version. */
  async addFiles(identifier, { versionId, files, primaryIndex, coverIndex, coverIndexes }, user, context = {}) {
    if (!files?.length) throw ApiError.badRequest('No files were uploaded', { code: 'FILES_REQUIRED' });

    let design;
    let version;
    let covers;
    try {
      design = await this.assertEditable(identifier, user);

      version = versionId
        ? await designRepository.findVersion(design.id, versionId)
        : await designRepository.findVersion(design.id, design.current_version_id);

      if (!version) throw ApiError.badRequest('This design has no version to attach files to');

      covers = new Set(resolveCoverIndexes(files, { coverIndex, coverIndexes }));
    } catch (err) {
      // Nothing was written yet, so the bytes already on disk are orphans.
      await cleanupFiles(files);
      throw err;
    }

    const existing = await designRepository.listFiles(version.id);
    const rows = files.map((file, index) => {
      const described = describeFile(file);
      return {
        ...described,
        uuid: uuid(),
        design_id: design.id,
        design_version_id: version.id,
        uploaded_by: user.id,
        sort_order: existing.length + index,
        is_primary: index === Number(primaryIndex) || (!existing.length && index === 0 && described.kind === 'model'),
        is_cover: covers.has(index),
      };
    });

    await db.transaction(async (trx) => {
      // One primary per version; and a request that nominates covers replaces
      // the version's whole cover set, so the cap cannot be walked past by
      // uploading a few at a time.
      if (rows.some((r) => r.is_primary)) {
        await trx('design_files').where({ design_version_id: version.id }).update({ is_primary: false });
      }
      if (covers.size) {
        await trx('design_files').where({ design_version_id: version.id }).update({ is_cover: false });
      }
      await designRepository.addFiles(rows, trx);
    });

    await auditService.log({
      userId: user.id,
      action: 'design.files_add',
      entityType: ENTITY_TYPE.DESIGN,
      entityId: design.id,
      changes: { count: rows.length, versionId: version.id },
      context,
    });

    const all = await designRepository.listFiles(version.id);
    return all.map(serializer.toFile);
  },

  async removeFile(identifier, fileId, user, context = {}) {
    const design = await this.assertEditable(identifier, user);
    const file = await designRepository.findFile(fileId);
    if (!file || Number(file.design_id) !== Number(design.id)) throw ApiError.notFound('File not found');

    // Delete by the resolved numeric id — `fileId` may have arrived as a uuid.
    await designRepository.deleteFile(file.id);
    await removeStoredFile(file.path);

    await auditService.log({
      userId: user.id,
      action: 'design.file_remove',
      entityType: ENTITY_TYPE.DESIGN,
      entityId: design.id,
      changes: { file: file.original_name },
      context,
    });

    return { deleted: true };
  },

  /**
   * SCR-020 — download gate. Records who downloaded what before returning a
   * path for the controller to stream.
   */
  async prepareDownload(identifier, { fileId, versionLabel, acceptLicense }, user, context = {}) {
    const design = await designRepository.findBySlugOrId(identifier);
    if (!design) throw ApiError.notFound('Design not found');

    const owner = isOwner(design, user);
    if (design.status !== DESIGN_STATUS.PUBLISHED && !owner && !canModerateDesigns(user)) {
      throw ApiError.notFound('Design not found');
    }

    const version = versionLabel
      ? await designRepository.findVersion(design.id, versionLabel)
      : await designRepository.findVersion(design.id, design.current_version_id);
    if (!version) throw ApiError.notFound('Version not found');

    const files = await designRepository.listFiles(version.id);
    if (!files.length) throw ApiError.notFound('This version has no downloadable files');

    const file = fileId
      ? files.find((f) => String(f.uuid) === String(fileId) || Number(f.id) === Number(fileId))
      : files.find((f) => f.is_primary) || files[0];
    if (!file) throw ApiError.notFound('File not found');

    const absolutePath = path.join(config.upload.root, file.path);
    if (!absolutePath.startsWith(config.upload.root) || !fs.existsSync(absolutePath)) {
      throw ApiError.notFound('The stored file is missing. Please contact the uploader.');
    }

    await db.transaction(async (trx) => {
      await designRepository.recordDownload(
        {
          design_id: design.id,
          design_version_id: version.id,
          file_id: file.id,
          user_id: user?.id || null,
          ip_address: context.ip || null,
          user_agent: (context.userAgent || '').slice(0, 255),
          purpose: context.purpose || null,
          license_accepted: Boolean(acceptLicense),
        },
        trx,
      );
      await designRepository.increment(design.id, 'download_count', 1, trx);
      await trx('design_versions').where({ id: version.id }).increment('download_count', 1);
      await trx('design_files').where({ id: file.id }).increment('download_count', 1);
      if (user) await trx('users').where({ id: user.id }).increment('download_count', 1);
    });

    // First download by this member for this design → alert the owner once.
    if (user && Number(design.owner_id) !== Number(user.id)) {
      db('design_downloads')
        .where({ design_id: design.id, user_id: user.id })
        .count({ total: 'id' })
        .then(([{ total }]) => {
          if (Number(total) !== 1) return;
          return notificationService.notify({
            userId: design.owner_id,
            actorId: user.id,
            type: NOTIFICATION_TYPE.DESIGN_DOWNLOADED,
            title: `${user.name} downloaded your design`,
            body: design.title,
            link: `/designs/${design.slug}`,
            entityType: ENTITY_TYPE.DESIGN,
            entityId: design.id,
            email: false,
          });
        })
        .catch(() => {});
    }

    return {
      absolutePath,
      fileName: file.original_name,
      mimeType: file.mime_type || 'application/octet-stream',
      sizeBytes: Number(file.size_bytes) || 0,
      design: { id: design.uuid, title: design.title, version: version.version },
    };
  },

  // ── Engagement ───────────────────────────────────────────────────────────

  async toggleStar(identifier, user) {
    const design = await this.assertVisible(identifier, user);
    const existing = await designRepository.findStar(design.id, user.id);

    await db.transaction(async (trx) => {
      if (existing) {
        await designRepository.removeStar(design.id, user.id, trx);
        await designRepository.decrement(design.id, 'star_count', 1, trx);
      } else {
        await designRepository.addStar(design.id, user.id, trx);
        await designRepository.increment(design.id, 'star_count', 1, trx);
      }
    });

    if (!existing && Number(design.owner_id) !== Number(user.id)) {
      notificationService
        .notify({
          userId: design.owner_id,
          actorId: user.id,
          type: NOTIFICATION_TYPE.DESIGN_STARRED,
          title: `${user.name} starred your design`,
          body: design.title,
          link: `/designs/${design.slug}`,
          entityType: ENTITY_TYPE.DESIGN,
          entityId: design.id,
        })
        .catch(() => {});
    }

    const updated = await designRepository.findById(design.id);
    return { starred: !existing, stars: Number(updated.star_count) || 0 };
  },

  /** "I have one" acknowledgement, with an optional 1–5 rating. */
  async setOwnership(identifier, { hasOne = true, rating, note }, user) {
    const design = await this.assertVisible(identifier, user);
    const existing = await designRepository.findOwnership(design.id, user.id);

    await db.transaction(async (trx) => {
      if (!hasOne) {
        await trx('design_ownerships').where({ design_id: design.id, user_id: user.id }).del();
      } else if (existing) {
        await trx('design_ownerships')
          .where({ id: existing.id })
          .update({ rating: rating ?? existing.rating, note: note ?? existing.note });
      } else {
        await trx('design_ownerships').insert({
          design_id: design.id,
          user_id: user.id,
          rating: rating ?? null,
          note: note ?? null,
        });
      }
      await designRepository.refreshRating(design.id, trx);
    });

    const updated = await designRepository.findById(design.id);
    return {
      hasOne,
      rating: rating ?? existing?.rating ?? null,
      owners: Number(updated.ownership_count) || 0,
      averageRating: Number(updated.average_rating) || 0,
      ratingCount: Number(updated.rating_count) || 0,
    };
  },

  async listOwnerships(identifier, viewer) {
    const design = await this.assertVisible(identifier, viewer);
    const rows = await designRepository.listOwnerships(design.id);
    return rows.map(serializer.toOwnership);
  },

  // ── Comments ─────────────────────────────────────────────────────────────

  async listComments(identifier, query, viewer) {
    const design = await this.assertVisible(identifier, viewer);
    const { page, limit } = getPagination(query);
    const moderator = canModerateDesigns(viewer);

    const base = designRepository.commentsQuery(design.id, { includeHidden: moderator });
    const [{ total }] = await base.clone().clearSelect().clearOrder().count({ total: 'design_comments.id' });
    const rows = await base.limit(limit).offset((page - 1) * limit);

    return {
      items: rows.map((row) => serializer.toComment(row, { canModerate: moderator })),
      pagination: buildPaginationMeta({ total, page, limit }),
    };
  },

  async addComment(identifier, { body, parentId }, user) {
    const design = await this.assertVisible(identifier, user);

    if (parentId) {
      const parent = await designRepository.findComment(parentId);
      if (!parent || Number(parent.design_id) !== Number(design.id)) {
        throw ApiError.badRequest('The comment you are replying to does not exist');
      }
    }

    const commentId = await db.transaction(async (trx) => {
      const id = await designRepository.createComment(
        { design_id: design.id, user_id: user.id, parent_id: parentId || null, body },
        trx,
      );
      await designRepository.increment(design.id, 'comment_count', 1, trx);
      return id;
    });

    if (Number(design.owner_id) !== Number(user.id)) {
      notificationService
        .notify({
          userId: design.owner_id,
          actorId: user.id,
          type: NOTIFICATION_TYPE.DESIGN_COMMENT,
          title: `New comment on ${design.title}`,
          body: `${user.name}: ${String(body).slice(0, 140)}`,
          link: `/designs/${design.slug}`,
          entityType: ENTITY_TYPE.DESIGN,
          entityId: design.id,
        })
        .catch(() => {});
    }

    const row = await designRepository.commentsQuery(design.id).where('design_comments.id', commentId).first();
    return serializer.toComment(row);
  },

  async updateComment(commentId, { body }, user) {
    const comment = await designRepository.findComment(commentId);
    if (!comment) throw ApiError.notFound('Comment not found');

    const moderator = roleHasPermission(user.role, PERMISSIONS.COMMENT_MODERATE);
    if (Number(comment.user_id) !== Number(user.id) && !moderator) {
      throw ApiError.forbidden('You can only edit your own comments');
    }

    await db('design_comments').where({ id: commentId }).update({ body, edited_at: db.fn.now() });
    const row = await designRepository
      .commentsQuery(comment.design_id, { includeHidden: true })
      .where('design_comments.id', commentId)
      .first();
    return serializer.toComment(row, { canModerate: moderator });
  },

  async deleteComment(commentId, user) {
    const comment = await designRepository.findComment(commentId);
    if (!comment) throw ApiError.notFound('Comment not found');

    const moderator = roleHasPermission(user.role, PERMISSIONS.COMMENT_MODERATE);
    if (Number(comment.user_id) !== Number(user.id) && !moderator) {
      throw ApiError.forbidden('You can only delete your own comments');
    }

    await db.transaction(async (trx) => {
      await trx('design_comments')
        .where({ id: commentId })
        .update({ deleted_at: db.fn.now(), status: COMMENT_STATUS.REMOVED });
      await trx('designs').where({ id: comment.design_id }).decrement('comment_count', 1);
    });

    return { deleted: true };
  },

  // ── Related / mine ───────────────────────────────────────────────────────

  async related(identifier, viewer) {
    const design = await this.assertVisible(identifier, viewer);
    const rows = await designRepository.related(design, 4);
    return this.decorateList(rows, viewer);
  },

  /** SCR-022 — my designs, all statuses. */
  async listMine(query, user) {
    const { page, limit } = getPagination(query);
    const filters = {
      ownerId: user.id,
      statuses: query.status ? toArray(query.status) : Object.values(DESIGN_STATUS),
      search: query.search,
    };

    const base = designRepository.browseQuery(filters);
    const [{ total }] = await base.clone().clearSelect().clearOrder().count({ total: 'designs.id' });
    applySorting(base, query, SORTABLE_DESIGN_FIELDS, { column: 'updated_at', order: 'desc' });
    const rows = await base.limit(limit).offset((page - 1) * limit);

    const [items, queued] = await Promise.all([
      this.decorateList(rows, user),
      designRepository.unpublishedVersionsByDesign(rows.map((r) => r.id)),
    ]);

    return {
      // Only the owner's own list carries this — it drives the "submit the
      // draft you branched" action, which nobody else has any use for.
      items: items.map((item) => {
        const draft = queued[item.numericId];
        return {
          ...item,
          pendingVersion: draft
            ? { id: draft.id, version: draft.version, status: draft.status }
            : null,
        };
      }),
      pagination: buildPaginationMeta({ total, page, limit }),
    };
  },

  // ── Guards ───────────────────────────────────────────────────────────────

  /** Loads a design the caller is allowed to see, else 404. */
  async assertVisible(identifier, viewer) {
    const design = await designRepository.findBySlugOrId(identifier);
    if (!design) throw ApiError.notFound('Design not found');
    if (
      design.status !== DESIGN_STATUS.PUBLISHED &&
      !isOwner(design, viewer) &&
      !canModerateDesigns(viewer)
    ) {
      throw ApiError.notFound('Design not found');
    }
    return design;
  },

  /** Loads a design the caller may modify, else 404/403. */
  async assertEditable(identifier, user) {
    const design = await designRepository.findBySlugOrId(identifier);
    if (!design) throw ApiError.notFound('Design not found');
    if (!isOwner(design, user) && !canModerateDesigns(user)) {
      throw ApiError.forbidden('You can only modify your own designs', { code: 'NOT_OWNER' });
    }
    return design;
  },
};

/** Groups rows by a key into { key: rows[] }. */
function groupBy(rows, key) {
  return rows.reduce((acc, row) => {
    (acc[row[key]] = acc[row[key]] || []).push(row);
    return acc;
  }, {});
}

module.exports = designService;
