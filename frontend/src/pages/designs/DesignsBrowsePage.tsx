import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { FieldShell, TextInput, TextSelect } from '@/components/ui/app/FormField';
import { Reveal, RevealGroup, RevealItem, premiumEase } from '@/components/ui/Reveal';
import { mockDesigns } from '@/lib/mock';
import { cn } from '@/lib/utils';

type SortKey = 'newest' | 'popular' | 'title';

const organs = [...new Set(mockDesigns.map((d) => d.organ))].sort();
const materials = [...new Set(mockDesigns.map((d) => d.material))].sort();
const licences = [...new Set(mockDesigns.map((d) => d.licence))].sort();

function statusTone(status: (typeof mockDesigns)[number]['status']) {
  if (status === 'published') return 'green' as const;
  if (status === 'pending') return 'yellow' as const;
  return 'ink' as const;
}

const cardVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.55, delay: i * 0.06, ease: premiumEase },
  }),
  exit: { opacity: 0, y: 12, scale: 0.98, transition: { duration: 0.22, ease: premiumEase } },
};

export default function DesignsBrowsePage() {
  const reduced = useReducedMotion();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [filters, setFilters] = useState({ organ: '', material: '', licence: '' });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let results = mockDesigns.filter((d) => d.status === 'published');

    if (q) {
      results = results.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.summary.toLowerCase().includes(q) ||
          d.tags.some((t) => t.toLowerCase().includes(q)) ||
          d.author.toLowerCase().includes(q),
      );
    }
    if (filters.organ) results = results.filter((d) => d.organ === filters.organ);
    if (filters.material) results = results.filter((d) => d.material === filters.material);
    if (filters.licence) results = results.filter((d) => d.licence === filters.licence);

    return [...results].sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title);
      if (sort === 'popular') return b.downloads - a.downloads;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [query, sort, filters]);

  const activeFilterCount = [filters.organ, filters.material, filters.licence].filter(Boolean).length;
  const resultKey = `${query}|${sort}|${filters.organ}|${filters.material}|${filters.licence}`;

  function clearFilters() {
    setFilters({ organ: '', material: '', licence: '' });
  }

  return (
    <div className="container-content space-y-8">
      <PageHeader
        eyebrow="Design library"
        title="Browse open designs"
        lede="Inspect, cite and reuse organ-on-chip designs with provenance, licence and version history in plain sight."
        actions={
          <Link to="/upload" className="btn-primary">
            Upload a design
          </Link>
        }
      />

      <Reveal delay={0.05} className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <FieldShell label="Search" className="flex-1">
          <TextInput
            type="search"
            placeholder="Search by title, tag, or author…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
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

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <Reveal
          delay={0.08}
          className={cn('hidden lg:block', sidebarOpen && '!block')}
        >
          <aside className="space-y-1 rounded-[16px] border border-line bg-canvas p-5 shadow-soft lg:sticky lg:top-28">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-sm font-bold text-aubergine">Filters</h2>
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

            <RevealGroup className="space-y-5" stagger={0.07}>
              <RevealItem>
                <FieldShell label="Organ">
                  <TextSelect
                    value={filters.organ}
                    onChange={(e) => setFilters((f) => ({ ...f, organ: e.target.value }))}
                  >
                    <option value="">All organs</option>
                    {organs.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </TextSelect>
                </FieldShell>
              </RevealItem>
              <RevealItem>
                <FieldShell label="Material">
                  <TextSelect
                    value={filters.material}
                    onChange={(e) => setFilters((f) => ({ ...f, material: e.target.value }))}
                  >
                    <option value="">All materials</option>
                    {materials.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </TextSelect>
                </FieldShell>
              </RevealItem>
              <RevealItem>
                <FieldShell label="Licence">
                  <TextSelect
                    value={filters.licence}
                    onChange={(e) => setFilters((f) => ({ ...f, licence: e.target.value }))}
                  >
                    <option value="">All licences</option>
                    {licences.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </TextSelect>
                </FieldShell>
              </RevealItem>
            </RevealGroup>
          </aside>
        </Reveal>

        <div className="min-w-0 space-y-6">
          <Reveal delay={0.1}>
            <motion.p
              key={resultKey + '-count'}
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: premiumEase }}
              className="text-sm text-ink-70"
            >
              <span className="data-unit">{filtered.length}</span>{' '}
              {filtered.length === 1 ? 'design' : 'designs'} found
              {activeFilterCount > 0 ? ' with current filters' : ''}
            </motion.p>
          </Reveal>

          {filtered.length === 0 ? (
            <EmptyState
              title="No designs match"
              body="Try broadening your search or clearing filters to see more of the library."
            >
              <button type="button" onClick={clearFilters} className="btn-ghost mt-6 inline-flex">
                Clear filters
              </button>
            </EmptyState>
          ) : (
            <motion.div
              layout
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
            >
              <AnimatePresence mode="popLayout">
                {filtered.map((design, i) => (
                  <motion.div
                    key={design.id}
                    layout
                    custom={i}
                    variants={reduced ? undefined : cardVariants}
                    initial={reduced ? false : 'hidden'}
                    animate="show"
                    exit="exit"
                    whileHover={
                      reduced
                        ? undefined
                        : { y: -4, transition: { duration: 0.35, ease: premiumEase } }
                    }
                    className="h-full"
                  >
                    <Link
                      to={`/designs/${design.id}`}
                      className="card group relative flex h-full flex-col overflow-hidden transition-[border-color,box-shadow] duration-500 ease-premium hover:border-line-strong hover:shadow-card-hover"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden border-b border-line bg-gradient-to-br from-periwinkle-tint/70 via-canvas to-coral/15">
                        <motion.div
                          className="absolute -inset-8 opacity-40"
                          style={{
                            background:
                              'radial-gradient(circle at 30% 20%, rgba(252,113,71,0.35), transparent 55%), radial-gradient(circle at 80% 70%, rgba(153,153,221,0.4), transparent 50%)',
                          }}
                          animate={
                            reduced
                              ? undefined
                              : { x: [0, 12, 0], y: [0, -8, 0] }
                          }
                          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                          aria-hidden
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <motion.span
                            className="font-display text-5xl font-extrabold text-aubergine/12"
                            whileHover={reduced ? undefined : { scale: 1.08 }}
                            transition={{ duration: 0.45, ease: premiumEase }}
                          >
                            {design.organ.slice(0, 1)}
                          </motion.span>
                        </div>
                        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                          <StatusBadge tone={statusTone(design.status)}>{design.status}</StatusBadge>
                          {design.iso22916 ? (
                            <StatusBadge tone="periwinkle">ISO 22916</StatusBadge>
                          ) : null}
                        </div>
                        <motion.div
                          className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-canvas/80 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                          aria-hidden
                        />
                      </div>

                      <div className="flex flex-1 flex-col p-4 sm:p-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="pill bg-periwinkle-tint text-deep-periwinkle">
                            {design.version}
                          </span>
                          <span className="pill">{design.material}</span>
                        </div>
                        <h2 className="mt-3 font-display text-lg font-bold text-aubergine transition-colors duration-300 group-hover:text-deep-coral">
                          {design.title}
                        </h2>
                        <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-ink-70">
                          {design.summary}
                        </p>
                        <div className="mt-4 flex items-center justify-between border-t border-line pt-4 text-xs text-ink-55">
                          <span>{design.author}</span>
                          <span>
                            <span className="text-coral">★</span> {design.stars} · {design.downloads}{' '}
                            dl
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
