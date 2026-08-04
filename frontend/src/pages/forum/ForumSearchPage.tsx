import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { ErrorState, LoadingState } from '@/components/ui/app/LoadingState';
import { FieldShell, TextInput, TextSelect } from '@/components/ui/app/FormField';
import { Pagination } from '@/components/ui/app/Pagination';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { useApiResource } from '@/hooks/useApiResource';
import { forumApi } from '@/lib/api/forum';
import { TopicRow } from './TopicRow';

/** SCR-028 — Forum search with keyword and filters. */
export default function ForumSearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const category = params.get('category') ?? 'all';
  const status = params.get('status') ?? 'all';
  const sort = (params.get('sort') as 'active' | 'newest' | 'views' | 'replies') || 'active';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const [keyword, setKeyword] = useState(q);

  useEffect(() => {
    setKeyword(q);
  }, [q]);

  // Debounce typing into the URL so the API is not hit on every keystroke.
  useEffect(() => {
    if (keyword === q) return;
    const timer = window.setTimeout(() => {
      patchParams({ q: keyword.trim() || null, page: null });
    }, 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  const { data: home } = useApiResource(() => forumApi.home(), []);

  const { data, isLoading, error, reload } = useApiResource(
    () =>
      forumApi.search({
        q: q || undefined,
        category: category !== 'all' ? category : undefined,
        status: status !== 'all' ? (status as 'open' | 'solved' | 'locked') : undefined,
        sort,
        page,
        limit: 20,
      }),
    [q, category, status, sort, page],
  );

  const results = data?.items ?? [];
  const total = data?.pagination?.totalItems ?? results.length;

  function patchParams(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next, { replace: true });
  }

  return (
    <div className="container-content space-y-8">
      <PageHeader
        eyebrow="Forum"
        title="Search topics"
        lede="Find solved threads, fabrication notes and metadata discussions across the community."
        actions={
          <Link to="/forum" className="btn-ghost text-sm">
            Back to forum
          </Link>
        }
      />

      <Reveal delay={0.06}>
        <div className="grid gap-4 rounded-card border border-line bg-surface p-5 shadow-soft sm:grid-cols-2 lg:grid-cols-4 lg:p-6">
          <FieldShell label="Keyword" className="sm:col-span-2 lg:col-span-4">
            <TextInput
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search titles, posts, authors…"
              autoFocus
            />
          </FieldShell>

          <FieldShell label="Category">
            <TextSelect
              value={category}
              onChange={(e) => patchParams({ category: e.target.value === 'all' ? null : e.target.value, page: null })}
            >
              <option value="all">All spaces</option>
              {(home?.categories ?? []).map((cat) => (
                <option key={cat.slug} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </TextSelect>
          </FieldShell>

          <FieldShell label="Status">
            <TextSelect
              value={status}
              onChange={(e) => patchParams({ status: e.target.value === 'all' ? null : e.target.value, page: null })}
            >
              <option value="all">Any status</option>
              <option value="open">Open</option>
              <option value="solved">Solved</option>
              <option value="locked">Locked</option>
            </TextSelect>
          </FieldShell>

          <FieldShell label="Sort by">
            <TextSelect
              value={sort}
              onChange={(e) => patchParams({ sort: e.target.value, page: null })}
            >
              <option value="active">Most active</option>
              <option value="newest">Newest</option>
              <option value="replies">Most replies</option>
              <option value="views">Most views</option>
            </TextSelect>
          </FieldShell>
        </div>
      </Reveal>

      <Reveal delay={0.1} as="section">
        <p className="text-sm text-muted">
          {isLoading ? 'Searching…' : `${total} ${total === 1 ? 'result' : 'results'}`}
        </p>

        {isLoading ? (
          <div className="mt-4">
            <LoadingState label="Searching topics…" />
          </div>
        ) : error ? (
          <div className="mt-4">
            <ErrorState error={error} onRetry={reload} />
          </div>
        ) : results.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No matching topics"
              body="Try broadening your keyword or clearing filters."
              actionLabel="Browse all topics"
              actionTo="/forum"
            />
          </div>
        ) : (
          <>
            <RevealGroup
              className="mt-4 divide-y divide-line overflow-hidden rounded-card border border-line bg-surface shadow-soft"
              stagger={0.04}
            >
              {results.map((topic) => (
                <RevealItem key={topic.id}>
                  <TopicRow topic={topic} />
                </RevealItem>
              ))}
            </RevealGroup>

            <div className="mt-6">
              <Pagination
                pagination={data?.pagination}
                onPage={(next) => patchParams({ page: String(next) })}
              />
            </div>
          </>
        )}
      </Reveal>
    </div>
  );
}
