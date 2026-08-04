/**
 * Design library endpoints (SCR-017..023).
 *
 * Reading is public — browse, detail, viewer and comments all work for a signed
 * -out visitor, and the client simply sends no token. Writing needs an account:
 * the API checks `design.create` / `design.update.own` and rejects anything else,
 * so these helpers do not try to guess permissions, they just surface the error.
 *
 * Types mirror `design.serializer.js`. When the backend contract changes, the
 * mismatch should show up here as a type error rather than as a blank screen.
 */
import { api, toQuery } from './client';
import type { ApiPagination } from './types';

// ── Shared value objects ───────────────────────────────────────────────────

export type TaxonomyRef = { slug: string; name: string };

/**
 * Cover images per design — mirrors MAX_COVER_IMAGES on the API, which rejects
 * any upload that nominates more than this.
 */
export const MAX_COVER_IMAGES = 3;

/**
 * Mirrors ALLOWED_DESIGN_EXTENSIONS on the API. Checking client-side is a
 * courtesy — the server enforces the same list — but it saves uploading 500 MB
 * only to be turned away, and it can name the file that was the problem.
 */
export const ACCEPTED_DESIGN_EXTENSIONS = [
  // Mesh — gets a 3D preview
  'stl', '3mf', 'obj', 'mtl', 'ply', 'glb', 'gltf', 'fbx',
  // CAD interchange
  'step', 'stp', 'iges', 'igs',
  // 2D fabrication: drawings and photomasks
  'dxf', 'dwg', 'gds', 'gdsii',
  // Machine toolpaths — same G-code, different CAM tools
  'gcode', 'nc', 'tap', 'ngc', 'cnc',
  // Editable CAD source
  'fcstd', 'scad',
  // Docs and data
  'pdf', 'docx', 'xlsx', 'json', 'csv', 'txt', 'md',
  // Images, including microscopy TIFFs
  'jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'tif', 'tiff',
];

/**
 * The subset the API files under `kind: 'model'` — geometry the 3D viewer can
 * render, and therefore what may be a version's primary file.
 */
export const MODEL_EXTENSIONS = [
  'stl', '3mf', 'obj', 'ply', 'glb', 'gltf', 'fbx', 'step', 'stp', 'iges', 'igs',
];

/**
 * Cover images. Narrower than the file list on purpose: these end up in an
 * `<img>` on the browse card and the design page, so the formats every browser
 * decodes are the only ones offered — a TIFF micrograph would upload fine and
 * then render as a broken tile.
 */
export const COVER_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

export const MAX_DESIGN_FILE_BYTES = 500 * 1024 * 1024;
export const MAX_COVER_BYTES = 10 * 1024 * 1024;

/** `.stl,.3mf,…` for an `<input type="file" accept>`. */
export function acceptAttribute(extensions: string[]) {
  return extensions.map((ext) => `.${ext}`).join(',');
}

export function extensionOf(fileName: string) {
  const dot = fileName.lastIndexOf('.');
  return dot === -1 ? '' : fileName.slice(dot + 1).toLowerCase();
}

export type OperatingRange = {
  min: number | null;
  max: number | null;
  unit: string | null;
} | null;

export type DesignStatus = 'draft' | 'pending' | 'published' | 'rejected' | 'archived';

export type PublishAs = 'person' | 'institute' | 'person_from_institute';

export type DesignFile = {
  id: string;
  numericId: number;
  name: string;
  /** Uppercased extension, e.g. "STL". */
  type: string;
  kind: 'model' | 'document' | 'image' | 'archive' | 'data' | 'other';
  /** Human-readable, e.g. "4.2 MB". */
  size: string;
  sizeBytes: number;
  mimeType: string | null;
  url: string | null;
  isPrimary: boolean;
  isCover: boolean;
  downloads: number;
};

export type DesignCredit = {
  name: string;
  affiliation: string | null;
  role: string | null;
  url: string | null;
  userId: number | null;
};

export type PublishedWork = {
  title: string;
  authors: string | null;
  publication: string | null;
  year: number | null;
  doi: string | null;
  url: string | null;
};

export type RelatedDocument = {
  title: string;
  documentType: string | null;
  url: string | null;
  fileName?: string | null;
  description: string | null;
  relatedDesignId?: number | null;
};

/** Component-type-dependent block — the shape is defined by the taxonomy. */
export type TypeSpecific = Record<string, string | number | boolean | { min: number; max: number; unit?: string } | null>;

// ── Design shapes ──────────────────────────────────────────────────────────

/** Card/row shape returned by browse and "my designs". */
export type DesignListItem = {
  id: string;
  numericId: number;
  slug: string;
  title: string;
  summary: string | null;
  status: DesignStatus;
  version: string | null;
  /** First cover image of the current version — the card thumbnail. */
  coverImageUrl: string | null;
  componentType: TaxonomyRef | null;
  resourceType: TaxonomyRef | null;
  organs: string[];
  organSlugs: string[];
  organ: string | null;
  material: string | null;
  fabricationMethod: string | null;
  licence: string | null;
  licenseName: string | null;
  author: string;
  authorHandle: string;
  authorAffiliation: string | null;
  /** Uploader's profile picture, when they have uploaded one. */
  authorAvatarUrl: string | null;
  publishAs: PublishAs;
  instituteName: string | null;
  downloads: number;
  stars: number;
  views: number;
  comments: number;
  owners: number;
  rating: number;
  ratingCount: number;
  iso22916: boolean;
  featured: boolean;
  tags: string[];
  isStarred: boolean;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
};

/**
 * "My designs" row. Adds the version branched behind a live one: a published
 * design whose uploader started v1.1 still reports `status: 'published'`, so
 * without this the pending draft would be invisible in the list.
 */
export type OwnDesignListItem = DesignListItem & {
  pendingVersion: { id: number; version: string; status: 'draft' | 'pending' } | null;
};

export type DesignVersion = {
  id: number;
  version: string;
  versionNumber: number;
  note: string | null;
  status: DesignStatus;
  title: string | null;
  summary: string | null;
  description: string | null;
  componentType: TaxonomyRef | null;
  license: { code: string; name: string; url: string | null; summary: string | null } | null;
  customLicenseText: string | null;
  howToCite: string | null;
  creditsNote: string | null;
  testedMaterial: TaxonomyRef | null;
  testedFabricationMethod: TaxonomyRef | null;
  organs: TaxonomyRef[];
  howToUse: {
    clipString: string | null;
    maxHeightMm: number | null;
    clampingZoneHeightMm: number | null;
    exclusionZones: string | null;
    clampingStrategy: string | null;
    operatingParameters: {
      temperature: OperatingRange;
      pressure: OperatingRange;
      flowRate: OperatingRange;
    };
  };
  iso22916: boolean;
  iso22916Note: string | null;
  typeSpecific: TypeSpecific;
  files: DesignFile[];
  credits: DesignCredit[];
  publishedWorks: PublishedWork[];
  relatedDocuments: RelatedDocument[];
  downloads: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VersionSummary = {
  id: number;
  version: string;
  status: DesignStatus;
  note: string | null;
  publishedAt: string | null;
  license: string | null;
};

/**
 * Detail response. Note `author` widens to an object here — the list shape's
 * `author` string is overwritten by the serializer — so the plain name is read
 * from `authorName`.
 */
export type DesignDetail = Omit<DesignListItem, 'author'> & {
  author: {
    id: number;
    name: string;
    handle: string;
    affiliation: string | null;
    avatarUrl: string | null;
  } | null;
  authorName: string;
  /** Up to MAX_COVER_IMAGES cover urls, in gallery order. */
  coverImages: string[];
  currentVersion: DesignVersion | null;
  versions: VersionSummary[];
  viewer: {
    isStarred: boolean;
    hasOne: boolean;
    rating: number | null;
    canEdit: boolean;
    canModerate: boolean;
  };
};

export type DesignComment = {
  id: number;
  body: string;
  status: 'visible' | 'hidden' | 'removed';
  parentId: number | null;
  author: {
    id: number;
    name: string;
    handle: string;
    affiliation: string | null;
    avatarUrl: string | null;
  };
  editedAt: string | null;
  at: string;
  createdAt: string;
};

export type DesignOwnership = {
  id: number;
  rating: number | null;
  note: string | null;
  user: { name: string; handle: string; affiliation: string | null; avatarUrl: string | null };
  at: string;
};

export type DownloadInfo = {
  design: { id: string; slug: string; title: string };
  version: { id: number; version: string } | null;
  license: { code: string; name: string; url: string | null } | null;
  howToCite: string | null;
  files: DesignFile[];
  requiresLogin: boolean;
  isAuthenticated: boolean;
};

export type ViewerPayload = {
  design: { id: string; title: string; version: string };
  viewableFiles: DesignFile[];
  allFiles: DesignFile[];
  supportedFormats: string[];
};

/** Counts per filter value, keyed by facet then slug. */
export type BrowseFacets = Record<string, { slug: string; name?: string; count: number }[]>;

export type BrowseParams = {
  page?: number;
  limit?: number;
  search?: string;
  componentType?: string[];
  resourceType?: string[];
  organ?: string[];
  material?: string[];
  fabricationMethod?: string[];
  license?: string[];
  tag?: string[];
  status?: string[];
  author?: string;
  iso22916?: boolean;
  featured?: boolean;
  minRating?: number;
  mine?: boolean;
  facets?: boolean;
  sortBy?:
    | 'created_at'
    | 'updated_at'
    | 'published_at'
    | 'title'
    | 'download_count'
    | 'star_count'
    | 'view_count'
    | 'average_rating';
  sortOrder?: 'asc' | 'desc';
};

// ── Write payloads ─────────────────────────────────────────────────────────

export type RangeInput = { min?: number | null; max?: number | null; unit?: string | null };

/**
 * Create/update body. Everything the API treats as mandatory on create is
 * non-optional here, so a missing field is a compile error rather than a 422.
 */
export type DesignPayload = {
  title: string;
  summary: string;
  description: string;
  componentType: string;
  resourceType: string;
  publishAs: PublishAs;
  testedMaterial: string;
  testedFabricationMethod: string;
  license: string;
  instituteName?: string | null;
  organs?: string[];
  customLicenseText?: string | null;
  howToCite?: string | null;
  creditsNote?: string | null;
  clipString?: string | null;
  maxHeightMm?: number | null;
  clampingZoneHeightMm?: number | null;
  exclusionZones?: string | null;
  clampingStrategy?: string | null;
  operatingParameters?: {
    temperature?: RangeInput;
    pressure?: RangeInput;
    flowRate?: RangeInput;
  };
  iso22916?: boolean;
  iso22916Note?: string | null;
  typeSpecific?: Record<string, unknown>;
  tags?: string[];
  credits?: { name: string; affiliation?: string | null; role?: string | null; url?: string | null }[];
  publishedWorks?: {
    title: string;
    authors?: string | null;
    publication?: string | null;
    year?: number | null;
    doi?: string | null;
    url?: string | null;
  }[];
  relatedDocuments?: {
    title: string;
    documentType?: string | null;
    url?: string | null;
    description?: string | null;
  }[];
  version?: string;
  versionNote?: string | null;
  versionBump?: 'major' | 'minor';
};

/** A PATCH sends only what changed. */
export type DesignUpdatePayload = Partial<DesignPayload>;

export type PublishResult = {
  status: DesignStatus;
  requiresReview: boolean;
  message: string;
  design: DesignDetail;
};

// ── Taxonomies ─────────────────────────────────────────────────────────────

/** One component-type-dependent field, as defined in `component_type_fields`. */
export type ComponentTypeField = {
  key: string;
  label: string;
  hint: string | null;
  dataType: 'string' | 'text' | 'number' | 'range' | 'boolean' | 'select';
  unit: string | null;
  /** `{ source: 'model_types' }` points at another taxonomy list. */
  options: { source?: string; values?: string[] } | null;
  min: number | null;
  max: number | null;
  required: boolean;
  filterable: boolean;
};

export type ComponentType = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  fields: ComponentTypeField[];
  workingPrinciples: { id: number; slug: string; name: string }[];
};

export type LicenseOption = {
  id: number;
  code: string;
  name: string;
  family: string | null;
  url: string | null;
  summary: string | null;
  isCustom?: boolean;
};

export type Taxonomies = {
  componentTypes: ComponentType[];
  resourceTypes: { id: number; slug: string; name: string; description: string | null }[];
  organs: TaxonomyRef[];
  materials: TaxonomyRef[];
  fabricationMethods: TaxonomyRef[];
  modelTypes: TaxonomyRef[];
  licenses: LicenseOption[];
  tags: { id: number; slug: string; name: string; usageCount?: number }[];
  publishAs: { value: PublishAs; label: string }[];
};

// ── API ────────────────────────────────────────────────────────────────────

export const designApi = {
  /** SCR-017 — public browse. Works signed out. */
  browse(params: BrowseParams = {}) {
    return api.get<DesignListItem[]>(`/designs${toQuery(params)}`).then((r) => ({
      items: r.data ?? [],
      pagination: r.meta?.pagination as ApiPagination | undefined,
      facets: r.meta?.facets as BrowseFacets | undefined,
    }));
  },

  /** SCR-022 — the caller's own designs, drafts included. */
  mine(params: { page?: number; limit?: number; search?: string; status?: string[] } = {}) {
    return api.get<OwnDesignListItem[]>(`/designs/mine${toQuery(params)}`).then((r) => ({
      items: r.data ?? [],
      pagination: r.meta?.pagination as ApiPagination | undefined,
    }));
  },

  /** SCR-018 — accepts a uuid or a slug. */
  detail(identifier: string, version?: string) {
    return api
      .get<{ design: DesignDetail }>(`/designs/${encodeURIComponent(identifier)}${toQuery({ version })}`)
      .then((r) => r.data.design);
  },

  versions(identifier: string) {
    return api
      .get<(VersionSummary & { downloads: number; createdAt: string })[]>(
        `/designs/${encodeURIComponent(identifier)}/versions`,
      )
      .then((r) => r.data ?? []);
  },

  /** SCR-019 — files the in-browser viewer can render. */
  viewer(identifier: string, version?: string) {
    return api
      .get<ViewerPayload>(`/designs/${encodeURIComponent(identifier)}/viewer${toQuery({ version })}`)
      .then((r) => r.data);
  },

  related(identifier: string) {
    return api
      .get<DesignListItem[]>(`/designs/${encodeURIComponent(identifier)}/related`)
      .then((r) => r.data ?? []);
  },

  /** SCR-021 — creates the design as a draft with version v1.0. */
  create(payload: DesignPayload) {
    return api.post<{ design: DesignDetail }>('/designs', payload).then((r) => r.data.design);
  },

  update(identifier: string, payload: DesignUpdatePayload) {
    return api
      .patch<{ design: DesignDetail }>(`/designs/${encodeURIComponent(identifier)}`, payload)
      .then((r) => r.data.design);
  },

  remove(identifier: string) {
    return api.delete<{ deleted: boolean }>(`/designs/${encodeURIComponent(identifier)}`).then((r) => r.data);
  },

  /**
   * Branches a new draft version off the current one. Metadata and files are
   * carried forward unless opted out, so a bump only needs the files that
   * actually changed — the caller then uploads those against the returned id.
   */
  createVersion(
    identifier: string,
    body: {
      version?: string;
      bump?: 'major' | 'minor';
      note?: string;
      copyMetadata?: boolean;
      copyFiles?: boolean;
    } = {},
  ) {
    return api
      .post<{ version: DesignVersion }>(`/designs/${encodeURIComponent(identifier)}/versions`, body)
      .then((r) => r.data.version);
  },

  /** Submits for review, or publishes outright when the caller may moderate. */
  publish(identifier: string, body: { versionId?: number; note?: string } = {}) {
    return api
      .post<PublishResult>(`/designs/${encodeURIComponent(identifier)}/publish`, body)
      .then((r) => r.data);
  },

  /**
   * Attaches files to a version. The server keeps each file under the name it
   * was uploaded with, so what the user sees in the list is what lands on disk.
   */
  addFiles(
    identifier: string,
    files: File[],
    options: {
      versionId?: number;
      primaryIndex?: number;
      /** Positions in `files` of the gallery covers — at most MAX_COVER_IMAGES. */
      coverIndexes?: number[];
    } = {},
  ) {
    const form = new FormData();
    files.forEach((file) => form.append('files', file));
    if (options.versionId != null) form.append('versionId', String(options.versionId));
    if (options.primaryIndex != null) form.append('primaryIndex', String(options.primaryIndex));
    if (options.coverIndexes?.length) form.append('coverIndexes', options.coverIndexes.join(','));

    return api
      .upload<{ files: DesignFile[] }>(`/designs/${encodeURIComponent(identifier)}/files`, form)
      .then((r) => r.data?.files ?? []);
  },

  removeFile(identifier: string, fileId: string) {
    return api
      .delete<{ deleted: boolean }>(
        `/designs/${encodeURIComponent(identifier)}/files/${encodeURIComponent(fileId)}`,
      )
      .then((r) => r.data);
  },

  /** SCR-020 — what the gate screen shows before the user commits. */
  downloadInfo(identifier: string) {
    return api
      .get<DownloadInfo>(`/designs/${encodeURIComponent(identifier)}/download-info`)
      .then((r) => r.data);
  },

  /**
   * The download URL itself. The endpoint streams bytes rather than JSON and
   * requires a bearer token, so `downloadFile` below fetches it as a blob
   * instead of pointing the browser at it.
   */
  downloadUrl(identifier: string, params: { fileId?: string; version?: string; purpose?: string } = {}) {
    return `/designs/${encodeURIComponent(identifier)}/download${toQuery({ ...params, acceptLicense: true })}`;
  },

  // ── Engagement ───────────────────────────────────────────────────────────

  toggleStar(identifier: string) {
    return api
      .post<{ starred: boolean; stars: number }>(`/designs/${encodeURIComponent(identifier)}/star`)
      .then((r) => r.data);
  },

  /** "I have one", with an optional 1–5 rating. */
  setOwnership(identifier: string, body: { hasOne?: boolean; rating?: number | null; note?: string }) {
    return api
      .post<{
        hasOne: boolean;
        rating: number | null;
        owners: number;
        averageRating: number;
        ratingCount: number;
      }>(`/designs/${encodeURIComponent(identifier)}/ownership`, body)
      .then((r) => r.data);
  },

  listOwnerships(identifier: string) {
    return api
      .get<DesignOwnership[]>(`/designs/${encodeURIComponent(identifier)}/ownership`)
      .then((r) => r.data ?? []);
  },

  // ── Comments ─────────────────────────────────────────────────────────────

  comments(identifier: string, params: { page?: number; limit?: number } = {}) {
    return api
      .get<DesignComment[]>(`/designs/${encodeURIComponent(identifier)}/comments${toQuery(params)}`)
      .then((r) => ({ items: r.data ?? [], pagination: r.meta?.pagination as ApiPagination | undefined }));
  },

  addComment(identifier: string, body: string, parentId?: number) {
    return api
      .post<DesignComment>(`/designs/${encodeURIComponent(identifier)}/comments`, { body, parentId })
      .then((r) => r.data);
  },

  updateComment(commentId: number, body: string) {
    return api.patch<DesignComment>(`/designs/comments/${commentId}`, { body }).then((r) => r.data);
  },

  deleteComment(commentId: number) {
    return api.delete<{ deleted: boolean }>(`/designs/comments/${commentId}`).then((r) => r.data);
  },
};

export const taxonomyApi = {
  /** Every option list the wizard and the filter rail need, in one request. */
  all() {
    return api.get<Taxonomies>('/taxonomies').then((r) => r.data);
  },

  componentTypeFields(componentType: string) {
    return api
      .get<ComponentTypeField[]>(`/taxonomies/component-types/${encodeURIComponent(componentType)}/fields`)
      .then((r) => r.data ?? []);
  },

  workingPrinciples(componentType?: string) {
    return api
      .get<{ id: number; slug: string; name: string }[]>(`/taxonomies/working-principles${toQuery({ componentType })}`)
      .then((r) => r.data ?? []);
  },
};
