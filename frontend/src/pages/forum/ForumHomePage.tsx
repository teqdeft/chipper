import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { ErrorState, LoadingState } from '@/components/ui/app/LoadingState';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { useAuth } from '@/app/providers/AuthProvider';
import { useApiResource } from '@/hooks/useApiResource';
import { forumApi } from '@/lib/api/forum';
import { TopicRow } from './TopicRow';

/** SCR-024 — Forum home: categories, community pulse, recent conversations. */
export default function ForumHomePage() {
  const { isAuthenticated } = useAuth();
  const { data, isLoading, error, reload } = useApiResource(() => forumApi.home(), []);

  const categories = data?.categories ?? [];
  const recent = data?.recentTopics ?? [];
  const stats = data?.stats;

  return (
    <div className="container-content space-y-10">
      <div className="rounded-card border border-line bg-surface px-5 py-7 shadow-soft sm:px-8 sm:py-9">
        <PageHeader
          eyebrow="Community"
          title="Forum"
          lede="Ask fabrication questions, start discussions, and learn from makers working with organ-on-chip designs, metadata and ISO 22916."
          actions={
            <>
              <Link to="/forum/search" className="btn-ghost text-sm">
                Search topics
              </Link>
              <Link to="/forum/new" className="btn-primary text-sm">
                {isAuthenticated ? 'Start a discussion' : 'Ask a question'}
              </Link>
            </>
          }
        />

        {stats ? (
          <Reveal delay={0.14} className="mt-6 grid grid-cols-3 gap-3 sm:max-w-md">
            <Stat label="Topics" value={stats.topics} />
            <Stat label="Posts" value={stats.posts} />
            <Stat label="Open" value={stats.unanswered} />
          </Reveal>
        ) : null}
      </div>

      {isLoading ? (
        <LoadingState label="Loading community…" />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <>
          <Reveal delay={0.06} as="section" aria-labelledby="forum-categories">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 id="forum-categories" className="font-display text-lg font-bold text-aubergine">
                  Spaces
                </h2>
                <p className="mt-1 text-sm text-muted">Browse conversations by topic area.</p>
              </div>
            </div>

            {categories.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="No categories yet"
                  body="Forum spaces will appear here once they are published."
                />
              </div>
            ) : (
              <RevealGroup className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" stagger={0.05}>
                {categories.map((cat) => (
                  <RevealItem key={cat.slug}>
                    <Link
                      to={`/forum/${cat.slug}`}
                      className="group flex h-full flex-col gap-3 rounded-card border border-line bg-surface p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-display text-base font-bold text-aubergine group-hover:text-deep-coral">
                          {cat.name}
                        </span>
                        {cat.locked ? (
                          <span className="rounded-full bg-aubergine/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                            Read-only
                          </span>
                        ) : null}
                      </div>
                      {cat.description ? (
                        <p className="line-clamp-2 text-sm leading-relaxed text-muted">{cat.description}</p>
                      ) : null}
                      <div className="mt-auto flex gap-4 pt-1 text-xs font-medium text-muted">
                        <span>{cat.topics} topics</span>
                        <span>{cat.posts} posts</span>
                      </div>
                    </Link>
                  </RevealItem>
                ))}
              </RevealGroup>
            )}
          </Reveal>

          <Reveal delay={0.1} as="section" aria-labelledby="forum-recent">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 id="forum-recent" className="font-display text-lg font-bold text-aubergine">
                  Recent conversations
                </h2>
                <p className="mt-1 text-sm text-muted">Latest questions and discussions from the community.</p>
              </div>
              <Link to="/forum/search" className="text-sm font-medium text-deep-coral hover:underline">
                Advanced search
              </Link>
            </div>

            {recent.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="No conversations yet"
                  body="Be the first to ask a question or start a discussion."
                  actionLabel="Start a discussion"
                  actionTo="/forum/new"
                />
              </div>
            ) : (
              <RevealGroup
                className="mt-4 divide-y divide-line overflow-hidden rounded-card border border-line bg-surface shadow-soft"
                stagger={0.04}
              >
                {recent.map((topic) => (
                  <RevealItem key={topic.id}>
                    <TopicRow topic={topic} />
                  </RevealItem>
                ))}
              </RevealGroup>
            )}
          </Reveal>

          {!isAuthenticated ? (
            <Reveal delay={0.12}>
              <div className="rounded-card border border-line bg-aubergine px-5 py-6 text-canvas sm:px-7">
                <h2 className="font-display text-lg font-bold">Join the conversation</h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-canvas/80">
                  Signed-in members can ask questions, reply to threads and vote on helpful answers.
                  Browsing stays open to everyone.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link to="/register" className="btn-primary text-sm">
                    Create an account
                  </Link>
                  <Link
                    to="/login"
                    className="rounded-btn border border-canvas/30 px-4 py-2 text-sm font-semibold text-canvas transition-colors hover:bg-canvas/10"
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            </Reveal>
          ) : null}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card border border-line/80 bg-surface/80 px-3 py-3 backdrop-blur-sm">
      <p className="font-display text-xl font-extrabold tabular-nums text-aubergine">{value}</p>
      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}
