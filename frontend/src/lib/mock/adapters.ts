/**
 * Temporary bridge: renders the seeded mock designs through the same types the
 * API returns, so the library screens can show demo content and real uploads at
 * the same time while the database fills up.
 *
 * Everything here is scaffolding. Mock rows are tagged with `isMock` and carry
 * a `mock:` id prefix so a screen can tell them apart — they have no backend
 * record, so download, star, comment and edit are not offered on them. Deleting
 * this file and its call sites is the whole removal job.
 */
import type {
  DesignDetail,
  DesignListItem,
  DesignVersion,
  TaxonomyRef,
} from '@/lib/api/designs';
import { COMPONENT_TYPES, MATERIALS, RESOURCE_TYPES } from '@/lib/designFields';
import { mockDesigns, type MockDesign, type MockOperatingRange } from '@/lib/mock';

/** Marks a row as demo content rather than something the API knows about. */
export type MockFlag = { isMock?: boolean };

export type BrowseItem = DesignListItem & MockFlag;
export type DetailItem = DesignDetail & MockFlag;

export const MOCK_ID_PREFIX = 'mock:';

export function isMockId(identifier: string | undefined): boolean {
  return Boolean(identifier && identifier.startsWith(MOCK_ID_PREFIX));
}

/** Strips the prefix so the raw mock id can be looked up. */
function bareId(identifier: string) {
  return identifier.startsWith(MOCK_ID_PREFIX) ? identifier.slice(MOCK_ID_PREFIX.length) : identifier;
}

function slugToRef(list: readonly { slug: string; label: string }[], slug: string): TaxonomyRef | null {
  const match = list.find((entry) => entry.slug === slug);
  return match ? { slug: match.slug, name: match.label } : slug ? { slug, name: slug } : null;
}

/** Mock ranges may carry a single `value`; the API always sends min/max. */
function toRange(range: MockOperatingRange | undefined) {
  if (!range) return null;
  const min = range.value ?? range.min ?? null;
  const max = range.value ?? range.max ?? null;
  if (min === null && max === null) return null;
  return { min, max, unit: range.unit ?? null };
}

/** Mock ids double as slugs — they are already url-safe. */
export function mockToListItem(design: MockDesign): BrowseItem {
  return {
    id: `${MOCK_ID_PREFIX}${design.id}`,
    numericId: -1,
    slug: `${MOCK_ID_PREFIX}${design.id}`,
    title: design.title,
    summary: design.summary,
    status: design.status,
    version: design.version,
    // Demo rows ship no stored media, so the card falls back to its drawing.
    coverImageUrl: null,
    componentType: slugToRef(COMPONENT_TYPES, design.componentType),
    resourceType: slugToRef(RESOURCE_TYPES, design.resourceType),
    organs: design.organs,
    organSlugs: design.organs.map((o) => o.toLowerCase()),
    organ: design.organ || design.organs[0] || null,
    material: design.material,
    fabricationMethod: design.testedFabricationMethod,
    licence: design.licence,
    licenseName: design.licence,
    author: design.author,
    authorHandle: design.authorHandle,
    authorAffiliation: design.authorAffiliation,
    authorAvatarUrl: null,
    publishAs: design.publishAs,
    instituteName: design.instituteName ?? null,
    downloads: design.downloads,
    stars: design.stars,
    views: 0,
    comments: 0,
    owners: design.ownerships?.length ?? 0,
    rating: design.ownerships?.length
      ? design.ownerships.reduce((sum, o) => sum + o.rating, 0) / design.ownerships.length
      : 0,
    ratingCount: design.ownerships?.length ?? 0,
    iso22916: design.iso22916,
    featured: false,
    tags: design.tags,
    isStarred: false,
    publishedAt: design.createdAt,
    updatedAt: design.updatedAt,
    createdAt: design.createdAt,
    isMock: true,
  };
}

function mockToVersion(design: MockDesign): DesignVersion {
  return {
    id: -1,
    version: design.version,
    versionNumber: 1,
    note: null,
    status: design.status,
    title: design.title,
    summary: design.summary,
    description: design.description,
    componentType: slugToRef(COMPONENT_TYPES, design.componentType),
    license: design.licence
      ? { code: design.licence, name: design.licence, url: null, summary: null }
      : null,
    customLicenseText: null,
    howToCite: design.howToCite || null,
    creditsNote: design.creditsNote ?? null,
    testedMaterial: design.material
      ? { slug: design.material.toLowerCase(), name: design.material }
      : null,
    testedFabricationMethod: design.testedFabricationMethod
      ? { slug: design.testedFabricationMethod.toLowerCase(), name: design.testedFabricationMethod }
      : null,
    organs: design.organs.map((name) => ({ slug: name.toLowerCase(), name })),
    howToUse: {
      clipString: design.clipString ?? null,
      maxHeightMm: design.maxHeightMm ?? null,
      clampingZoneHeightMm: design.clampingZoneHeightMm ?? null,
      exclusionZones: design.exclusionZones ?? null,
      clampingStrategy: design.clampingStrategy ?? null,
      operatingParameters: {
        temperature: toRange(design.operatingParameters?.temperature),
        pressure: toRange(design.operatingParameters?.pressure),
        flowRate: toRange(design.operatingParameters?.flowRate),
      },
    },
    iso22916: design.iso22916,
    iso22916Note: design.iso22916Note ?? null,
    typeSpecific: design.typeSpecific as DesignVersion['typeSpecific'],
    files: design.files.map((file, index) => ({
      id: `${MOCK_ID_PREFIX}file-${index}`,
      numericId: -1,
      name: file.name,
      type: file.type,
      kind: 'model' as const,
      size: file.size,
      sizeBytes: 0,
      mimeType: null,
      // No stored bytes exist for demo rows — the screens disable download.
      url: null,
      isPrimary: index === 0,
      isCover: false,
      downloads: 0,
    })),
    credits: design.credits.map((credit) => ({
      name: credit.name,
      affiliation: credit.affiliation ?? null,
      role: credit.role ?? null,
      url: null,
      userId: null,
    })),
    publishedWorks: design.publishedWorks.map((work) => ({
      title: work.title,
      authors: work.authors ?? null,
      publication: work.publication ?? null,
      year: work.year ?? null,
      doi: work.doi ?? null,
      url: work.url ?? null,
    })),
    relatedDocuments: design.relatedDocuments.map((doc) => ({
      title: doc.title,
      documentType: doc.documentType ?? null,
      url: doc.url ?? null,
      description: doc.description ?? null,
    })),
    downloads: design.downloads,
    publishedAt: design.createdAt,
    createdAt: design.createdAt,
    updatedAt: design.updatedAt,
  };
}

export function mockToDetail(design: MockDesign): DetailItem {
  const list = mockToListItem(design);
  return {
    ...list,
    author: {
      id: -1,
      name: design.author,
      handle: design.authorHandle,
      affiliation: design.authorAffiliation,
      avatarUrl: null,
    },
    authorName: design.author,
    coverImages: [],
    currentVersion: mockToVersion(design),
    versions: [
      {
        id: -1,
        version: design.version,
        status: design.status,
        note: null,
        publishedAt: design.createdAt,
        license: design.licence,
      },
    ],
    viewer: { isStarred: false, hasOne: false, rating: null, canEdit: false, canModerate: false },
    isMock: true,
  };
}

/** Public demo rows, in the same shape browse returns. */
export function mockBrowseItems(): BrowseItem[] {
  return mockDesigns
    .filter((design) => design.status === 'published')
    .map(mockToListItem);
}

export function findMockDetail(identifier: string): DetailItem | null {
  const id = bareId(identifier);
  const design = mockDesigns.find((d) => d.id === id);
  return design ? mockToDetail(design) : null;
}

/** Filters demo rows with the same criteria the API applies server-side. */
export function filterMockItems(
  items: BrowseItem[],
  criteria: {
    search?: string;
    componentType?: string[];
    resourceType?: string[];
    organ?: string[];
    material?: string[];
    fabricationMethod?: string[];
    license?: string[];
    iso22916?: boolean;
  },
): BrowseItem[] {
  const search = criteria.search?.trim().toLowerCase();
  const anyOf = (selected: string[] | undefined, values: (string | null)[]) => {
    if (!selected?.length) return true;
    const haystack = values.filter(Boolean).map((v) => String(v).toLowerCase());
    return selected.some((value) => haystack.includes(value.toLowerCase()));
  };

  return items.filter((item) => {
    if (search) {
      const hit =
        item.title.toLowerCase().includes(search) ||
        (item.summary ?? '').toLowerCase().includes(search) ||
        item.author.toLowerCase().includes(search) ||
        item.tags.some((tag) => tag.toLowerCase().includes(search));
      if (!hit) return false;
    }
    if (criteria.iso22916 && !item.iso22916) return false;
    if (!anyOf(criteria.componentType, [item.componentType?.slug ?? null])) return false;
    if (!anyOf(criteria.resourceType, [item.resourceType?.slug ?? null])) return false;
    if (!anyOf(criteria.organ, item.organSlugs)) return false;
    // Materials and fabrication methods are slugs on the API side; the mock
    // rows carry display names, so both spellings are offered for matching.
    if (!anyOf(criteria.material, [item.material, item.material?.replace(/\s+/g, '-') ?? null])) return false;
    if (
      !anyOf(criteria.fabricationMethod, [
        item.fabricationMethod,
        item.fabricationMethod?.replace(/\s+/g, '-') ?? null,
      ])
    ) {
      return false;
    }
    if (!anyOf(criteria.license, [item.licence])) return false;
    return true;
  });
}

/** The demo material/licence names, for filter rails that merge both sources. */
export const MOCK_MATERIAL_NAMES = MATERIALS;
