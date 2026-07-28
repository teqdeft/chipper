import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { mockCategories, mockThreads } from '@/lib/mock';

/** SCR-024 — Forum home: categories, recent topics, search, ask. */
export default function ForumHomePage() {
  const recent = [...mockThreads].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <div className="container-content space-y-10">
      <PageHeader
        eyebrow="Community"
        title="Forum"
        lede="Ask questions, share fabrication tips, and help others navigate metadata, licences and ISO 22916."
        actions={
          <>
            <Link to="/forum/search" className="btn-ghost text-sm">
              Search topics
            </Link>
            <Link to="/forum/new" className="btn-primary text-sm">
              Ask a question
            </Link>
          </>
        }
      />

      <Reveal delay={0.06} as="section" aria-labelledby="forum-categories">
        <h2 id="forum-categories" className="font-display text-lg font-bold text-aubergine">
          Categories
        </h2>
        <RevealGroup className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" stagger={0.06}>
          {mockCategories.map((cat) => (
            <RevealItem key={cat.slug}>
              <Link
                to={`/forum/${cat.slug}`}
                className="card card-hover group flex flex-col gap-2 p-5"
              >
                <span className="font-display text-base font-bold text-aubergine group-hover:text-deep-coral">
                  {cat.name}
                </span>
                <span className="text-sm text-ink-55">{cat.topics} topics</span>
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      </Reveal>

      <Reveal delay={0.1} as="section" aria-labelledby="forum-recent">
        <div className="flex items-end justify-between gap-4">
          <h2 id="forum-recent" className="font-display text-lg font-bold text-aubergine">
            Recent topics
          </h2>
          <Link to="/forum/search" className="text-sm font-medium text-deep-coral hover:underline">
            Advanced search
          </Link>
        </div>

        <RevealGroup
          className="mt-4 divide-y divide-line overflow-hidden rounded-[16px] border border-line bg-canvas shadow-soft"
          stagger={0.05}
        >
          {recent.map((thread) => (
            <RevealItem key={thread.id}>
              <Link
                to={`/forum/t/${thread.id}`}
                className="flex flex-col gap-2 px-4 py-4 transition-colors hover:bg-periwinkle-tint/30 sm:flex-row sm:items-center sm:justify-between sm:px-5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {thread.pinned ? <StatusBadge tone="yellow">Pinned</StatusBadge> : null}
                    {thread.status === 'solved' ? <StatusBadge tone="green">Solved</StatusBadge> : null}
                    {thread.status === 'locked' ? <StatusBadge tone="ink">Locked</StatusBadge> : null}
                    <span className="truncate font-semibold text-aubergine">{thread.title}</span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm text-ink-55">{thread.excerpt}</p>
                  <p className="mt-1 text-xs text-ink-40">
                    {thread.author} · {thread.category}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4 text-xs font-medium text-ink-55 sm:text-right">
                  <span>{thread.replies} replies</span>
                  <span>{thread.views} views</span>
                  <span className="hidden sm:inline">{thread.updatedAt}</span>
                </div>
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      </Reveal>
    </div>
  );
}
