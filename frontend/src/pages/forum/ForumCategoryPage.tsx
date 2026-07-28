import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { mockCategories, mockThreads } from '@/lib/mock';

/** SCR-025 — Forum category listing. */
export default function ForumCategoryPage() {
  const { category } = useParams<{ category: string }>();
  const meta = mockCategories.find((c) => c.slug === category);
  const threads = mockThreads.filter((t) => t.categorySlug === category);
  const pinned = threads.filter((t) => t.pinned);
  const rest = threads.filter((t) => !t.pinned);

  if (!meta) {
    return (
      <div className="container-content">
        <Reveal>
          <EmptyState
            title="Category not found"
            body="This forum category does not exist or may have been archived."
            actionLabel="Back to forum"
            actionTo="/forum"
          />
        </Reveal>
      </div>
    );
  }

  return (
    <div className="container-content space-y-8">
      <PageHeader
        eyebrow="Forum"
        title={meta.name}
        lede={`${meta.topics} topics · fabrication, metadata and community support.`}
        actions={
          <>
            <Link to="/forum" className="btn-ghost text-sm">
              All categories
            </Link>
            <Link to="/forum/new" className="btn-primary text-sm">
              New topic
            </Link>
          </>
        }
      />

      {threads.length === 0 ? (
        <Reveal delay={0.06}>
          <EmptyState
            title="No topics yet"
            body="Be the first to start a conversation in this category."
            actionLabel="Ask a question"
            actionTo="/forum/new"
          />
        </Reveal>
      ) : (
        <Reveal delay={0.06} className="space-y-6">
          {pinned.length > 0 ? <ThreadList label="Pinned" threads={pinned} /> : null}
          {rest.length > 0 ? <ThreadList label={pinned.length ? 'Topics' : undefined} threads={rest} /> : null}
        </Reveal>
      )}
    </div>
  );
}

function ThreadList({ label, threads }: { label?: string; threads: typeof mockThreads }) {
  if (!threads.length) return null;

  return (
    <section>
      {label ? (
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-eyebrow text-ink-55">{label}</h2>
      ) : null}
      <RevealGroup
        className="divide-y divide-line overflow-hidden rounded-[16px] border border-line bg-canvas shadow-soft"
        stagger={0.05}
      >
        {threads.map((thread) => (
          <RevealItem key={thread.id}>
            <Link
              to={`/forum/t/${thread.id}`}
              className="flex flex-col gap-2 px-4 py-4 transition-colors hover:bg-periwinkle-tint/30 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {thread.status === 'solved' ? <StatusBadge tone="green">Solved</StatusBadge> : null}
                  {thread.status === 'open' ? <StatusBadge tone="coral">Open</StatusBadge> : null}
                  {thread.status === 'locked' ? <StatusBadge tone="ink">Locked</StatusBadge> : null}
                  <span className="font-semibold text-aubergine">{thread.title}</span>
                </div>
                <p className="mt-1 line-clamp-1 text-sm text-ink-55">{thread.excerpt}</p>
                <p className="mt-1 text-xs text-ink-40">Started by {thread.author}</p>
              </div>
              <div className="flex shrink-0 gap-4 text-xs font-medium text-ink-55">
                <span>{thread.replies} replies</span>
                <span>{thread.views} views</span>
                <span>{thread.updatedAt}</span>
              </div>
            </Link>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}
