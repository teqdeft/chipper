import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { Avatar } from '@/components/ui/app/Avatar';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { FieldShell, TextInput, TextSelect } from '@/components/ui/app/FormField';
import { ErrorState, Skeleton } from '@/components/ui/app/LoadingState';
import { Pagination } from '@/components/ui/app/Pagination';
import { Reveal, premiumEase } from '@/components/ui/Reveal';
import { useApiResource } from '@/hooks/useApiResource';
import { useAuth } from '@/app/providers/AuthProvider';
import { designApi, taxonomyApi } from '@/lib/api/designs';
import type { BrowseParams, DesignListItem, Taxonomies } from '@/lib/api/designs';
import { filterMockItems, mockBrowseItems, type BrowseItem } from '@/lib/mock/adapters';
import { cn } from '@/lib/utils';

type SortKey = 'newest' | 'popular' | 'title';

/** Maps the three UI sort options onto the API's sort columns. */
const SORTS: Record<SortKey, { sortBy: NonNullable<BrowseParams['sortBy']>; sortOrder: 'asc' | 'desc' }> = {
  newest: { sortBy: 'published_at', sortOrder: 'desc' },
  popular: { sortBy: 'download_count', sortOrder: 'desc' },
  title: { sortBy: 'title', sortOrder: 'asc' },
};

type FilterKey = 'componentType' | 'resourceType' | 'organ' | 'material' | 'fabricationMethod' | 'license';

type FilterState = Record<FilterKey, string[]> & { iso22916: boolean };

const emptyFilters: FilterState = {
  componentType: [],
  resourceType: [],
  organ: [],
  material: [],
  fabricationMethod: [],
  license: [],
  iso22916: false,
};

const PAGE_SIZE = 12;

/**
 * Filter rail groups. Options come from the taxonomy endpoint so the rail always
 * offers exactly what the backend can filter on — a hard-coded list drifts the
 * moment an admin adds a material.
 */
function filterGroupsFrom(taxonomies: Taxonomies | null): {
  key: FilterKey;
  label: string;
  options: { value: string; label: string }[];
}[] {
  if (!taxonomies) return [];
  const asOptions = (list: { slug: string; name: string }[]) =>
    list.map((item) => ({ value: item.slug, label: item.name }));

  return [
    { key: 'componentType', label: 'Component type', options: asOptions(taxonomies.componentTypes) },
    { key: 'resourceType', label: 'Resource type', options: asOptions(taxonomies.resourceTypes) },
    { key: 'organ', label: 'Organ model', options: asOptions(taxonomies.organs) },
    { key: 'material', label: 'Material', options: asOptions(taxonomies.materials) },
    { key: 'fabricationMethod', label: 'Fabrication', options: asOptions(taxonomies.fabricationMethods) },
    {
      key: 'license',
      label: 'Licence & compliance',
      options: taxonomies.licenses.map((l) => ({ value: l.code, label: l.code })),
    },
  ];
}

/**
 * Who the card is credited to.
 *
 * The uploader, except when the design was deliberately published under an
 * institute — that is a publishing choice, not the same thing as the uploader's
 * affiliation, which would otherwise replace every person's name with their
 * university.
 */
function bylineOf(design: BrowseItem) {
  if (design.publishAs === 'institute' && design.instituteName) return design.instituteName;
  return design.author;
}

function statusTone(status: DesignListItem['status']) {
  if (status === 'published') return 'green' as const;
  if (status === 'pending') return 'yellow' as const;
  return 'ink' as const;
}

function statusLabel(status: DesignListItem['status']) {
  if (status === 'published') return 'Published';
  if (status === 'pending') return 'Under review';
  if (status === 'draft') return 'Draft';
  if (status === 'rejected') return 'Rejected';
  return 'Archived';
}

function toggleInList(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center rounded-pill border px-3 py-1.5 font-sans text-[0.78rem] font-semibold leading-none transition-[background-color,border-color,color,transform] duration-300 ease-premium',
        active
          ? 'border-coral bg-coral text-aubergine shadow-soft'
          : 'border-line bg-canvas text-muted hover:border-line-strong hover:bg-periwinkle-tint/40',
      )}
    >
      {label}
    </button>
  );
}

function ChipPreview({ design }: { design: BrowseItem }) {
  const slug = design.componentType?.slug ?? '';
  const isSensor = slug.includes('sensor');
  const isPump = slug === 'pump';

  // The uploader's own cover wins over the generic drawing. Demo rows and
  // designs that predate cover images fall through to the drawing below.
  if (design.coverImageUrl) {
    return (
      <img
        src={design.coverImageUrl}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-500 ease-premium group-hover:scale-[1.04]"
      />
    );
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-preview">
      <svg
        viewBox="0 0 200 120"
        className="relative z-[1] h-[70%] w-[70%] transition-transform duration-500 ease-premium group-hover:scale-[1.04]"
        aria-hidden
      >
        <rect x="36" y="28" width="128" height="64" rx="10" fill="#FFFCF9" stroke="#45081F" strokeWidth="2" />
        {isPump ? (
          <>
            <circle cx="100" cy="60" r="16" fill="none" stroke="#FC7147" strokeWidth="2.5" />
            <circle cx="100" cy="60" r="5" fill="#9999DD" />
            <path d="M52 60 H84 M116 60 H148" stroke="#45081F" strokeWidth="2" strokeLinecap="round" />
          </>
        ) : isSensor ? (
          <>
            <rect x="60" y="44" width="80" height="32" rx="6" fill="#E4E6FB" stroke="#403DD6" strokeWidth="1.8" />
            <path d="M44 60 H60 M140 60 H156" stroke="#45081F" strokeWidth="2" strokeLinecap="round" />
            <circle cx="100" cy="60" r="4" fill="#FC7147" />
          </>
        ) : (
          <>
            <path d="M52 48 H148 M52 72 H148" stroke="#9999DD" strokeWidth="7" strokeLinecap="round" opacity="0.5" />
            <path d="M52 48 H148 M52 72 H148" stroke="#45081F" strokeWidth="1.6" strokeLinecap="round" />
            <rect x="82" y="42" width="36" height="36" rx="5" fill="#FFBBD6" stroke="#45081F" strokeWidth="1.4" />
          </>
        )}
      </svg>
    </div>
  );
}

function SpecLine({ design }: { design: BrowseItem }) {
  const parts = [
    design.componentType?.name,
    design.organ ? `${design.organ} organ` : null,
    design.material,
    design.fabricationMethod,
    design.licence,
  ].filter(Boolean) as string[];

  if (!parts.length) return null;

  return (
    <p className="mt-2 truncate text-[0.72rem] leading-none text-muted">
      {parts.map((part, i) => (
        <span key={part}>
          {i > 0 ? <span className="mx-1.5 text-muted">·</span> : null}
          <span>{part}</span>
        </span>
      ))}
    </p>
  );
}

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.98 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.55, delay: Math.min(i, 8) * 0.05, ease: premiumEase },
  }),
  exit: { opacity: 0, y: 10, scale: 0.98, transition: { duration: 0.2, ease: premiumEase } },
};

export default function DesignsBrowsePage() {
  const reduced = useReducedMotion();
  const { hasPermission, isAuthenticated } = useAuth();
  const [search, setSearch] = useState('');
  /** Debounced copy of `search` — one request per pause, not per keystroke. */
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [page, setPage] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Any change to what is being asked for restarts at page one, otherwise a
  // narrower filter can land the viewer on an empty page 4.
  useEffect(() => {
    setPage(1);
  }, [query, sort, filters]);

  const taxonomies = useApiResource(() => taxonomyApi.all(), []);

  const params = useMemo<BrowseParams>(
    () => ({
      page,
      limit: PAGE_SIZE,
      search: query || undefined,
      componentType: filters.componentType,
      resourceType: filters.resourceType,
      organ: filters.organ,
      material: filters.material,
      fabricationMethod: filters.fabricationMethod,
      license: filters.license,
      iso22916: filters.iso22916 || undefined,
      ...SORTS[sort],
    }),
    [page, query, sort, filters],
  );

  const designs = useApiResource(() => designApi.browse(params), [params]);

  const groups = useMemo(() => filterGroupsFrom(taxonomies.data), [taxonomies.data]);

  type ActiveChip = { key: string; label: string; clear: () => void };

  const activeChips = useMemo(() => {
    const chips: ActiveChip[] = [];
    for (const group of groups) {
      for (const value of filters[group.key]) {
        const option = group.options.find((o) => o.value === value);
        chips.push({
          key: `${group.key}:${value}`,
          label: option?.label ?? value,
          clear: () =>
            setFilters((f) => ({ ...f, [group.key]: f[group.key].filter((v) => v !== value) })),
        });
      }
    }
    if (filters.iso22916) {
      chips.push({
        key: 'iso22916',
        label: 'ISO 22916',
        clear: () => setFilters((f) => ({ ...f, iso22916: false })),
      });
    }
    return chips;
  }, [filters, groups]);

  const toggleFilter = useCallback((key: FilterKey, value: string) => {
    setFilters((f) => ({ ...f, [key]: toggleInList(f[key], value) }));
  }, []);

  const clearFilters = useCallback(() => setFilters(emptyFilters), []);

  /**
   * Demo rows ride along with the real ones while the library fills up.
   * They are filtered by the same criteria, and only appear on the first page —
   * they are not part of the server's count, so paging them would either
   * duplicate them on every page or push real results off the end.
   */
  const mockItems = useMemo(
    () => (page === 1 ? filterMockItems(mockBrowseItems(), { ...params, search: query }) : []),
    [page, params, query],
  );

  const realItems = useMemo(() => designs.data?.items ?? [], [designs.data]);
  const items: BrowseItem[] = useMemo(() => [...realItems, ...mockItems], [realItems, mockItems]);
  const pagination = designs.data?.pagination;
  const totalCount = (pagination?.totalItems ?? realItems.length) + mockItems.length;
  const activeFilterCount = activeChips.length;
  const canUpload = isAuthenticated && hasPermission('design.create');

  const filterRail = (
    <aside className="rounded-card border border-line bg-surface/90 p-5 shadow-soft backdrop-blur-sm lg:sticky lg:top-28">
      <div className="mb-6 flex items-center justify-between gap-2">
        <h2 className="eyebrow text-muted">Filters</h2>
        {activeFilterCount > 0 ? (
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-semibold text-deep-coral hover:underline"
          >
            Clear all
          </button>
        ) : null}
      </div>

      {taxonomies.isLoading ? (
        <div className="space-y-5">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.key}>
              <p className="eyebrow mb-2.5 text-muted">{group.label}</p>
              <div className="flex flex-wrap gap-2">
                {group.options.map((option) => (
                  <FilterChip
                    key={option.value}
                    label={option.label}
                    active={filters[group.key].includes(option.value)}
                    onClick={() => toggleFilter(group.key, option.value)}
                  />
                ))}
                {group.key === 'license' ? (
                  <FilterChip
                    label="ISO 22916"
                    active={filters.iso22916}
                    onClick={() => setFilters((f) => ({ ...f, iso22916: !f.iso22916 }))}
                  />
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </aside>
  );

  return (
    <div className="container-content space-y-8 pb-16">
      <PageHeader
        eyebrow="Design library"
        title="Browse open designs"
        lede="Inspect, cite and reuse organ-on-chip designs with provenance, licence and version history in plain sight."
        actions={
          canUpload ? (
            <Link to="/upload" className="btn-primary w-full sm:w-auto">
              Upload a design
            </Link>
          ) : (
            <Link
              to={isAuthenticated ? '/how-it-works' : '/register'}
              className="btn-primary w-full sm:w-auto"
            >
              {isAuthenticated ? 'How uploading works' : 'Join to upload'}
            </Link>
          )
        }
      />

      <Reveal delay={0.05} className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <FieldShell label="Search" className="flex-1">
          <TextInput
            type="search"
            placeholder="Search by title, tag, or author…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </FieldShell>
        <FieldShell label="Sort by" className="w-full sm:w-48">
          <TextSelect value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="newest">Newest</option>
            <option value="popular">Most downloaded</option>
            <option value="title">Title A–Z</option>
          </TextSelect>
        </FieldShell>
        <button
          type="button"
          className="btn-ghost w-full sm:hidden"
          onClick={() => setSidebarOpen((v) => !v)}
        >
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </button>
      </Reveal>

      {activeChips.length > 0 ? (
        <Reveal delay={0.06} className="flex flex-wrap items-center gap-2">
          <span className="eyebrow text-muted">Active</span>
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.clear}
              className="inline-flex items-center gap-1.5 rounded-pill border border-coral bg-coral/15 px-3 py-1.5 text-[0.78rem] font-semibold text-deep-coral transition-colors duration-300 hover:bg-coral hover:text-aubergine"
              title="Remove filter"
            >
              {chip.label}
              <span aria-hidden className="text-muted">
                ×
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-semibold text-deep-coral hover:underline"
          >
            Clear
          </button>
        </Reveal>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[220px_1fr] xl:grid-cols-[240px_1fr]">
        <Reveal delay={0.08} className={cn('hidden lg:block', sidebarOpen && '!block')}>
          {filterRail}
        </Reveal>

        <div className="min-w-0 space-y-6">
          <Reveal delay={0.1}>
            <p className="text-sm text-muted" aria-live="polite">
              {designs.isLoading ? (
                'Loading designs…'
              ) : (
                <>
                  <span className="data-unit">{totalCount}</span>{' '}
                  {totalCount === 1 ? 'design' : 'designs'} found
                  {activeFilterCount > 0 ? ' with current filters' : ''}
                </>
              )}
            </p>
          </Reveal>

          {designs.error && items.length === 0 ? (
            <ErrorState error={designs.error} onRetry={designs.reload} />
          ) : designs.isLoading && !designs.data && items.length === 0 ? (
            <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[320px] w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              title="No designs match these filters"
              body={
                activeFilterCount > 0 || query
                  ? 'Clear the filters, or be the first to share one here.'
                  : 'Nothing has been published yet. Be the first to share a design.'
              }
            >
              {activeFilterCount > 0 || query ? (
                <button
                  type="button"
                  onClick={() => {
                    clearFilters();
                    setSearch('');
                  }}
                  className="btn-ghost mt-6 w-full sm:w-auto"
                >
                  Clear filters
                </button>
              ) : null}
            </EmptyState>
          ) : (
            <>
              <motion.div
                layout
                className={cn(
                  'grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-3',
                  // Keeps the grid readable while the next page loads.
                  designs.isLoading && 'opacity-60 transition-opacity',
                )}
              >
                <AnimatePresence mode="popLayout">
                  {items.map((design, i) => (
                    <motion.div
                      key={design.id}
                      layout
                      custom={i}
                      variants={reduced ? undefined : cardVariants}
                      initial={reduced ? false : 'hidden'}
                      animate="show"
                      exit="exit"
                      whileHover={reduced ? undefined : { y: -2, transition: { duration: 0.3, ease: premiumEase } }}
                      // min-w-0: a grid item defaults to min-width:auto, so it
                      // refuses to shrink below its min-content width. The spec
                      // line is `truncate` (white-space:nowrap), which makes that
                      // min-content the full untruncated string — and the card
                      // then pushes the page into a horizontal scroll on mobile.
                      className="h-full min-w-0"
                    >
                      <article className="group flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface shadow-soft transition-[border-color,box-shadow] duration-500 ease-premium hover:border-line-strong hover:shadow-card-hover">
                        <Link
                          to={`/designs/${encodeURIComponent(design.slug)}`}
                          className="relative h-[120px] shrink-0 overflow-hidden border-b border-line sm:h-[132px]"
                        >
                          <ChipPreview design={design} />
                          <span className="absolute right-2.5 top-2.5 rounded-pill bg-canvas/85 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider text-muted backdrop-blur-sm">
                            {design.resourceType?.name ?? 'Design'}
                          </span>
                          {design.isMock ? (
                            <span className="absolute left-2.5 top-2.5 rounded-pill bg-periwinkle-tint/90 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider text-deep-periwinkle backdrop-blur-sm">
                              Demo
                            </span>
                          ) : null}
                        </Link>

                        <div className="flex flex-1 flex-col px-4 pb-4 pt-3.5">
                          <div className="flex h-5 items-center gap-1.5">
                            <Avatar
                              name={bylineOf(design) || '?'}
                              src={design.authorAvatarUrl}
                              className="h-5 w-5 border-0 bg-coral font-display text-[0.55rem]"
                            />
                            <Link
                              to={`/u/${design.authorHandle}`}
                              className="min-w-0 flex-1 truncate text-[0.72rem] text-muted hover:text-deep-coral"
                              title={
                                design.authorAffiliation
                                  ? `${bylineOf(design)} · ${design.authorAffiliation}`
                                  : bylineOf(design)
                              }
                            >
                              {bylineOf(design)}
                            </Link>
                          </div>

                          <div className="mt-2.5 flex items-start gap-2">
                            <Link
                              to={`/designs/${encodeURIComponent(design.slug)}`}
                              className="min-w-0 flex-1 font-display text-[0.98rem] font-bold leading-snug text-aubergine transition-colors duration-300 line-clamp-2 group-hover:text-deep-coral"
                            >
                              {design.title}
                            </Link>
                            {design.version ? (
                              <span className="mt-0.5 shrink-0 rounded-pill bg-periwinkle-tint px-2 py-0.5 text-[0.65rem] font-bold leading-none text-deep-periwinkle">
                                {design.version}
                              </span>
                            ) : null}
                          </div>

                          <p className="mt-1.5 h-[2.5rem] text-[0.8rem] leading-snug text-muted line-clamp-2">
                            {design.summary}
                          </p>

                          <div className="mt-2.5 flex h-5 items-center gap-2 overflow-hidden text-[0.72rem]">
                            <StatusBadge
                              tone={statusTone(design.status)}
                              className="shrink-0 !px-1.5 !py-0 !text-[0.62rem] uppercase tracking-wide"
                            >
                              {statusLabel(design.status)}
                            </StatusBadge>
                            <span className="shrink-0 text-muted">
                              <span className="data-unit">{design.downloads}×</span>
                            </span>
                            <span className="shrink-0 text-muted">
                              <span className="text-coral">★</span> {design.stars}
                            </span>
                            {design.iso22916 ? (
                              <StatusBadge
                                tone="periwinkle"
                                className="ml-auto shrink-0 !px-1.5 !py-0 !text-[0.62rem]"
                              >
                                ISO 22916
                              </StatusBadge>
                            ) : null}
                          </div>

                          <SpecLine design={design} />

                          <div className="mt-auto flex flex-col gap-2 pt-3 sm:flex-row">
                            {design.isMock ? (
                              // Demo rows have no stored file to hand over.
                              <span
                                className="btn-get pointer-events-none h-9 flex-1 px-3 text-[0.75rem] opacity-45"
                                aria-disabled
                              >
                                Download
                              </span>
                            ) : (
                              <Link
                                to={`/designs/${design.slug}/download`}
                                className="btn-get h-9 flex-1 px-3 text-[0.75rem]"
                              >
                                Download
                              </Link>
                            )}
                            <Link
                              to={`/designs/${encodeURIComponent(design.slug)}`}
                              className="btn-ghost h-9 flex-1 px-3 text-[0.75rem]"
                            >
                              Open
                            </Link>
                          </div>
                        </div>
                      </article>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>

              <Pagination pagination={pagination} onPage={setPage} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
