import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { ErrorState, LoadingState } from '@/components/ui/app/LoadingState';
import { Pagination } from '@/components/ui/app/Pagination';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { useApiResource } from '@/hooks/useApiResource';
import { forumApi, type ForumTopic } from '@/lib/api/forum';
import { TopicRow } from './TopicRow';

/** SCR-025 — Forum category listing. */
export default function ForumCategoryPage() {
  const { category } = useParams<{ category: string }>();
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [category]);

  const { data, isLoading, error, reload } = useApiResource(
    () => forumApi.categoryTopics(category!, { page, limit: 20, sort: 'active' }),
    [category, page],
    { enabled: Boolean(category) },
  );

  const topics = data?.items ?? [];
  const meta = data?.category;
  const pinned = topics.filter((t) => t.pinned);
  const rest = topics.filter((t) => !t.pinned);

  if (!category) {
    return (
      <div className="container-content">
        <EmptyState
          title="Category not found"
          body="This forum category does not exist or may have been archived."
          actionLabel="Back to forum"
          actionTo="/forum"
        />
      </div>
    );
  }

  return (
    <div className="container-content space-y-8">
      <PageHeader
        eyebrow="Forum"
        title={meta?.name ?? category}
        lede={meta?.description || 'Questions, tips and discussions from makers in this space.'}
        actions={
          <>
            <Link to="/forum" className="btn-ghost text-sm">
              All spaces
            </Link>
            <Link to="/forum/new" className="btn-primary text-sm">
              New topic
            </Link>
          </>
        }
      />

      {isLoading ? (
        <LoadingState label="Loading topics…" />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : topics.length === 0 ? (
        <Reveal delay={0.06}>
          <EmptyState
            title="No topics yet"
            body="Be the first to start a conversation in this space."
            actionLabel="Ask a question"
            actionTo="/forum/new"
          />
        </Reveal>
      ) : (
        <Reveal delay={0.06} className="space-y-6">
          {pinned.length > 0 ? (
            <TopicList label="Pinned" topics={pinned} />
          ) : null}
          {rest.length > 0 ? (
            <TopicList label={pinned.length ? 'Conversations' : undefined} topics={rest} />
          ) : null}

          <Pagination
            pagination={data?.pagination}
            onPage={(next) => {
              setPage(next);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </Reveal>
      )}
    </div>
  );
}

function TopicList({ label, topics }: { label?: string; topics: ForumTopic[] }) {
  if (!topics.length) return null;

  return (
    <section>
      {label ? (
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-eyebrow text-muted">{label}</h2>
      ) : null}
      <RevealGroup
        className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface shadow-soft"
        stagger={0.04}
      >
        {topics.map((topic) => (
          <RevealItem key={topic.id}>
            <TopicRow topic={topic} showCategory={false} />
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}
