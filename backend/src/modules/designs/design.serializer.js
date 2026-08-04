/**
 * Design serialisers.
 *
 * The list shape intentionally matches the frontend's MockDesign type (title,
 * summary, organ, material, licence, status, author, authorHandle, version,
 * downloads, stars, updatedAt, tags, iso22916) so the browse and detail screens
 * can switch from mocks to the API without touching their markup.
 */
const { publicUrlFor } = require('../../middlewares/upload');
const { MAX_COVER_IMAGES } = require('../../config/constants');
const { parseJson, formatBytes } = require('../../utils/helpers');
const { toAuthorRef } = require('../users/user.serializer');

/** Card/row shape for SCR-017 (browse) and SCR-022 (my designs). */
function toDesignList(row, { organs = [], tags = [], starred = false, coverPath = null, coverImageUrl } = {}) {
  if (!row) return null;
  return {
    // The card thumbnail. Callers that already hold the version's files pass the
    // url outright; browse passes the stored path and lets this resolve it.
    coverImageUrl: coverImageUrl !== undefined ? coverImageUrl : publicUrlFor(coverPath),
    id: row.uuid,
    numericId: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    status: row.status,
    version: row.version || null,
    componentType: row.component_type_slug
      ? { slug: row.component_type_slug, name: row.component_type_name }
      : null,
    resourceType: row.resource_type_slug
      ? { slug: row.resource_type_slug, name: row.resource_type_name }
      : null,
    organs: organs.map((o) => o.name),
    organSlugs: organs.map((o) => o.slug),
    // Singular aliases kept for the existing card markup.
    organ: organs[0]?.name || null,
    material: row.material_name || null,
    fabricationMethod: row.fabrication_name || null,
    licence: row.license_code || null,
    licenseName: row.license_name || null,
    author: row.author_name,
    authorHandle: row.author_handle,
    authorAffiliation: row.author_affiliation || null,
    // Already joined in for every list query — the card avatar reads it here
    // rather than fetching the uploader separately per row.
    authorAvatarUrl: publicUrlFor(row.author_avatar_path),
    publishAs: row.publish_as,
    instituteName: row.institute_name || null,
    downloads: Number(row.download_count) || 0,
    stars: Number(row.star_count) || 0,
    views: Number(row.view_count) || 0,
    comments: Number(row.comment_count) || 0,
    owners: Number(row.ownership_count) || 0,
    rating: Number(row.average_rating) || 0,
    ratingCount: Number(row.rating_count) || 0,
    iso22916: Boolean(row.is_iso22916),
    featured: Boolean(row.is_featured),
    tags: tags.map((t) => t.name),
    isStarred: starred,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  };
}

function toFile(file) {
  if (!file) return null;
  return {
    id: file.uuid || file.id,
    numericId: file.id,
    name: file.original_name,
    type: (file.extension || '').toUpperCase(),
    kind: file.kind,
    size: formatBytes(file.size_bytes),
    sizeBytes: Number(file.size_bytes) || 0,
    mimeType: file.mime_type,
    url: publicUrlFor(file.path),
    isPrimary: Boolean(file.is_primary),
    isCover: Boolean(file.is_cover),
    downloads: Number(file.download_count) || 0,
  };
}

/** Full metadata snapshot for one version (SCR-018 sidebar + "How to use"). */
function toVersion(version, { organs = [], files = [], credits = [], works = [], documents = [] } = {}) {
  if (!version) return null;
  return {
    id: version.id,
    version: version.version,
    versionNumber: version.version_number,
    note: version.version_note,
    status: version.status,
    title: version.title,
    summary: version.summary,
    description: version.description,
    componentType: version.component_type_slug
      ? { slug: version.component_type_slug, name: version.component_type_name }
      : null,
    license: version.license_code
      ? {
          code: version.license_code,
          name: version.license_name,
          url: version.license_url,
          summary: version.license_summary,
        }
      : null,
    customLicenseText: version.custom_license_text || null,
    howToCite: version.how_to_cite || null,
    creditsNote: version.credits_note || null,
    testedMaterial: version.material_slug ? { slug: version.material_slug, name: version.material_name } : null,
    testedFabricationMethod: version.fabrication_slug
      ? { slug: version.fabrication_slug, name: version.fabrication_name }
      : null,
    organs: organs.map((o) => ({ slug: o.slug, name: o.name })),
    // "How to use this chip" — the ISO 22916 block.
    howToUse: {
      clipString: version.clip_string || null,
      maxHeightMm: version.max_height_mm !== null ? Number(version.max_height_mm) : null,
      clampingZoneHeightMm:
        version.clamping_zone_height_mm !== null ? Number(version.clamping_zone_height_mm) : null,
      exclusionZones: version.exclusion_zones || null,
      clampingStrategy: version.clamping_strategy || null,
      operatingParameters: {
        temperature: range(version.operating_temp_min, version.operating_temp_max, version.operating_temp_unit),
        pressure: range(
          version.operating_pressure_min,
          version.operating_pressure_max,
          version.operating_pressure_unit,
        ),
        flowRate: range(version.operating_flow_min, version.operating_flow_max, version.operating_flow_unit),
      },
    },
    iso22916: Boolean(version.is_iso22916),
    iso22916Note: version.iso22916_note || null,
    typeSpecific: parseJson(version.type_specific, {}),
    files: files.map(toFile),
    credits: credits.map((c) => ({
      name: c.name,
      affiliation: c.affiliation,
      role: c.role,
      url: c.url,
      userId: c.user_id,
    })),
    publishedWorks: works.map((w) => ({
      title: w.title,
      authors: w.authors,
      publication: w.publication,
      year: w.year,
      doi: w.doi,
      url: w.url,
    })),
    relatedDocuments: documents.map((d) => ({
      title: d.title,
      documentType: d.document_type,
      url: d.url || publicUrlFor(d.file_path),
      fileName: d.file_name,
      description: d.description,
      relatedDesignId: d.related_design_id,
    })),
    downloads: Number(version.download_count) || 0,
    publishedAt: version.published_at,
    createdAt: version.created_at,
    updatedAt: version.updated_at,
  };
}

function range(min, max, unit) {
  if (min === null && max === null) return null;
  return {
    min: min !== null ? Number(min) : null,
    max: max !== null ? Number(max) : null,
    unit: unit || null,
  };
}

/** SCR-018 — everything about one design. */
function toDesignDetail(design, extras = {}) {
  const {
    organs = [], tags = [], version, versions = [], starred = false,
    owned = null, viewerRating = null, canEdit = false, canModerate = false,
  } = extras;

  // The version's files are already serialised here, so the thumbnail is read
  // off them rather than queried again.
  const images = (version?.files || []).filter((f) => f.kind === 'image' && f.url);
  const covers = images.filter((f) => f.isCover);

  return {
    ...toDesignList(design, {
      organs,
      tags,
      starred,
      coverImageUrl: (covers[0] || images[0])?.url ?? null,
    }),
    coverImages: (covers.length ? covers : images).slice(0, MAX_COVER_IMAGES).map((f) => f.url),
    author: toAuthorRef(design) || {
      id: design.author_id,
      name: design.author_name,
      handle: design.author_handle,
    },
    authorName: design.author_name,
    currentVersion: version,
    versions: versions.map((v) => ({
      id: v.id,
      version: v.version,
      status: v.status,
      note: v.version_note,
      publishedAt: v.published_at,
      license: v.license_code,
    })),
    viewer: {
      isStarred: starred,
      hasOne: Boolean(owned),
      rating: viewerRating,
      canEdit,
      canModerate,
    },
  };
}

function toComment(row, { canModerate = false } = {}) {
  if (!row) return null;
  return {
    id: row.id,
    body: row.status === 'hidden' && !canModerate ? '[This comment has been hidden]' : row.body,
    status: row.status,
    parentId: row.parent_id,
    author: {
      id: row.author_id,
      name: row.author_name,
      handle: row.author_handle,
      affiliation: row.author_affiliation,
      avatarUrl: publicUrlFor(row.author_avatar_path),
    },
    editedAt: row.edited_at,
    at: row.created_at,
    createdAt: row.created_at,
  };
}

function toOwnership(row) {
  return {
    id: row.id,
    rating: row.rating,
    note: row.note,
    user: {
      name: row.user_name,
      handle: row.user_handle,
      affiliation: row.user_affiliation,
      avatarUrl: publicUrlFor(row.user_avatar_path),
    },
    at: row.created_at,
  };
}

module.exports = { toDesignList, toDesignDetail, toVersion, toFile, toComment, toOwnership };
