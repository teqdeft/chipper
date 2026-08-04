import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { ErrorState, LoadingState } from '@/components/ui/app/LoadingState';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { useApiResource } from '@/hooks/useApiResource';
import { contentApi } from '@/lib/api/content';
import type { NewsArticle } from '@/lib/api/content';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 12;

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'Announcement', label: 'Announcements' },
  { value: 'Guide', label: 'Guides' },
  { value: 'Event', label: 'Events' },
] as const;

function formatDate(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function articleDate(item: NewsArticle) {
  return item.date ?? item.publishedAt;
}

/** SCR-004 — Premium editorial news index, admin-published. */
export default function NewsListPage() {
  const [category, setCategory] = useState('');
  /** Growing window — load more raises the limit so nothing gets replaced/hidden. */
  const [limit, setLimit] = useState(PAGE_SIZE);

  const { data, isLoading, error, reload } = useApiResource(
    () =>
      contentApi.listNews({
        page: 1,
        limit,
        category: category || undefined,
      }),
    [limit, category],
  );

  const items = data?.items ?? [];
  const totalItems = data?.pagination?.totalItems ?? items.length;
  const hasMore = items.length < totalItems;

  const { featured, rest } = useMemo(() => {
    if (items.length === 0) return { featured: null as NewsArticle | null, rest: [] as NewsArticle[] };
    const lead = items.find((a) => a.featured) ?? items[0];
    return {
      featured: lead,
      rest: items.filter((a) => a.slug !== lead.slug),
    };
  }, [items]);

  function setFilter(next: string) {
    setCategory(next);
    setLimit(PAGE_SIZE);
  }

  function loadMore() {
    setLimit((n) => n + PAGE_SIZE);
  }

  return (
    <div className="pb-16 sm:pb-24">
      <section className="border-b border-line bg-canvas">
        <div className="container-content page-pad-top pb-8 sm:pb-10">
          <Reveal y={14}>
            <p className="eyebrow text-deep-coral">Chipper News</p>
          </Reveal>
          <Reveal delay={0.06} y={20}>
            <h1 className="mt-2 max-w-2xl font-display text-display-sm font-extrabold tracking-tight text-aubergine">
              Updates from the Playground.
            </h1>
          </Reveal>
          <Reveal delay={0.12} y={16}>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-muted sm:text-[1.05rem]">
              Announcements, guides and events from the Chipper team and community — published from the admin desk.
            </p>
          </Reveal>

          <Reveal delay={0.18} y={12}>
            <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
              {CATEGORIES.map((filter) => {
                const active = category === filter.value;
                return (
                  <button
                    key={filter.value || 'all'}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilter(filter.value)}
                    className={cn(
                      'rounded-btn border px-3.5 py-1.5 text-sm font-semibold transition-[background-color,border-color,color,transform] duration-300 ease-premium',
                      active
                        ? 'border-aubergine bg-aubergine text-canvas'
                        : 'border-line bg-canvas/80 text-muted hover:border-line-strong hover:text-aubergine',
                    )}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </Reveal>
        </div>
      </section>

      <div className="container-content mt-6 sm:mt-8">
        {isLoading && items.length === 0 ? (
          <LoadingState label="Loading news…" />
        ) : error && items.length === 0 ? (
          <ErrorState error={error} onRetry={reload} />
        ) : items.length === 0 ? (
          <EmptyState
            title="No news yet"
            body="Published announcements, guides and events will appear here."
          />
        ) : (
          <>
            <div className="mb-4 flex items-baseline justify-between gap-4 sm:mb-5">
              <p className="text-sm text-muted">
                <span className="font-semibold text-aubergine">{totalItems}</span>
                {totalItems === 1 ? ' update' : ' updates'}
                {category ? (
                  <span>
                    {' '}
                    in <span className="text-muted">{category}</span>
                  </span>
                ) : null}
              </p>
              {items.length < totalItems ? (
                <p className="text-xs text-muted">
                  Showing {items.length} of {totalItems}
                </p>
              ) : null}
            </div>

            {featured ? (
              <Reveal y={18}>
                <FeaturedStory article={featured} />
              </Reveal>
            ) : null}

            {rest.length > 0 ? (
              <RevealGroup className="mt-5 grid gap-4 sm:mt-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5" stagger={0.06}>
                {rest.map((item) => (
                  <RevealItem key={item.slug} as="article">
                    <StoryCard article={item} />
                  </RevealItem>
                ))}
              </RevealGroup>
            ) : null}

            {hasMore || (isLoading && items.length > 0) ? (
              <div className="mt-8 flex justify-center border-t border-line pt-6">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={loadMore}
                  className="btn-ghost disabled:opacity-50"
                >
                  {isLoading ? 'Loading…' : 'Load more updates'}
                </button>
              </div>
            ) : items.length > 1 ? (
              <p className="mt-8 border-t border-line pt-6 text-center text-sm text-muted">
                You’re caught up — {totalItems} {totalItems === 1 ? 'update' : 'updates'} shown.
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function FeaturedStory({ article }: { article: NewsArticle }) {
  const date = articleDate(article);
  const dateLabel = formatDate(date);

  return (
    <Link
      to={`/news/${article.slug}`}
      className="group block rounded-card border border-line bg-surface shadow-soft transition-[border-color,box-shadow,transform] duration-500 ease-premium hover:-translate-y-0.5 hover:border-line-strong hover:shadow-card-hover"
    >
      <div className="grid gap-6 p-6 sm:gap-8 sm:p-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:p-10">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-btn bg-coral/15 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-eyebrow text-deep-coral">
              Latest
            </span>
            {article.category ? <StatusBadge tone="coral">{article.category}</StatusBadge> : null}
            {dateLabel && date ? (
              <time className="text-xs text-muted" dateTime={date}>
                {dateLabel}
              </time>
            ) : null}
          </div>
          <h2 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-aubergine transition-colors duration-300 group-hover:text-deep-coral sm:text-3xl lg:text-[2.15rem] lg:leading-[1.1]">
            {article.title}
          </h2>
          {article.excerpt ? (
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
              {article.excerpt}
            </p>
          ) : null}
        </div>
        <div className="flex items-end justify-start lg:justify-end">
          <span className="inline-flex items-center gap-2 text-sm font-bold text-deep-coral transition-transform duration-300 ease-premium group-hover:translate-x-1">
            Read story
            <span aria-hidden>→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

function StoryCard({ article }: { article: NewsArticle }) {
  const date = articleDate(article);
  const dateLabel = formatDate(date);

  return (
    <Link
      to={`/news/${article.slug}`}
      className="group flex h-full flex-col rounded-card border border-line bg-surface p-5 transition-[border-color,box-shadow,transform] duration-300 ease-premium hover:-translate-y-0.5 hover:border-line-strong hover:shadow-soft sm:p-6"
    >
      <div className="flex flex-wrap items-center gap-2">
        {article.category ? <StatusBadge tone="coral">{article.category}</StatusBadge> : null}
        {dateLabel && date ? (
          <time className="text-xs text-muted" dateTime={date}>
            {dateLabel}
          </time>
        ) : null}
      </div>
      <h3 className="mt-3 font-display text-lg font-bold leading-snug text-aubergine transition-colors duration-300 group-hover:text-deep-coral sm:text-xl">
        {article.title}
      </h3>
      {article.excerpt ? (
        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted">{article.excerpt}</p>
      ) : (
        <span className="flex-1" />
      )}
      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-deep-coral transition-transform duration-300 ease-premium group-hover:translate-x-0.5">
        Read more <span aria-hidden>→</span>
      </span>
    </Link>
  );
}
