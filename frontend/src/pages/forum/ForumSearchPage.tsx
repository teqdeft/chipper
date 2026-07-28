import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { FieldShell, TextInput, TextSelect } from '@/components/ui/app/FormField';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { mockCategories, mockThreads } from '@/lib/mock';

/** SCR-028 — Forum search with keyword and filters. */
export default function ForumSearchPage() {
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('recent');

  const results = useMemo(() => {
    let list = [...mockThreads];

    if (keyword.trim()) {
      const q = keyword.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.excerpt.toLowerCase().includes(q) ||
          t.author.toLowerCase().includes(q),
      );
    }

    if (category !== 'all') {
      list = list.filter((t) => t.categorySlug === category);
    }

    if (status !== 'all') {
      list = list.filter((t) => t.status === status);
    }

    if (sort === 'recent') {
      list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    } else if (sort === 'replies') {
      list.sort((a, b) => b.replies - a.replies);
    } else if (sort === 'views') {
      list.sort((a, b) => b.views - a.views);
    }

    return list;
  }, [keyword, category, status, sort]);

  return (
    <div className="container-content space-y-8">
      <PageHeader
        eyebrow="Forum"
        title="Search topics"
        lede="Find solved threads, fabrication notes and metadata discussions across all categories."
        actions={
          <Link to="/forum" className="btn-ghost text-sm">
            Back to forum
          </Link>
        }
      />

      <Reveal delay={0.06}>
        <div className="card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4 lg:p-6">
        <FieldShell label="Keyword" className="sm:col-span-2 lg:col-span-4">
          <TextInput
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search titles, excerpts, authors…"
            autoFocus
          />
        </FieldShell>

        <FieldShell label="Category">
          <TextSelect value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All categories</option>
            {mockCategories.map((cat) => (
              <option key={cat.slug} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </TextSelect>
        </FieldShell>

        <FieldShell label="Status">
          <TextSelect value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">Any status</option>
            <option value="open">Open</option>
            <option value="solved">Solved</option>
            <option value="locked">Locked</option>
          </TextSelect>
        </FieldShell>

        <FieldShell label="Sort by">
          <TextSelect value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="recent">Most recent</option>
            <option value="replies">Most replies</option>
            <option value="views">Most views</option>
          </TextSelect>
        </FieldShell>
        </div>
      </Reveal>

      <Reveal delay={0.1} as="section">
        <p className="text-sm text-ink-55">
          {results.length} {results.length === 1 ? 'result' : 'results'}
        </p>

        {results.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No matching topics"
              body="Try broadening your keyword or clearing filters."
              actionLabel="Browse all topics"
              actionTo="/forum"
            />
          </div>
        ) : (
          <RevealGroup
            className="mt-4 divide-y divide-line overflow-hidden rounded-[16px] border border-line bg-canvas shadow-soft"
            stagger={0.05}
          >
            {results.map((thread) => (
              <RevealItem key={thread.id}>
                <Link
                  to={`/forum/t/${thread.id}`}
                  className="block px-4 py-4 transition-colors hover:bg-periwinkle-tint/30 sm:px-5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {thread.status === 'solved' ? <StatusBadge tone="green">Solved</StatusBadge> : null}
                    {thread.status === 'open' ? <StatusBadge tone="coral">Open</StatusBadge> : null}
                    <span className="font-semibold text-aubergine">{thread.title}</span>
                  </div>
                  <p className="mt-1 text-sm text-ink-55">{thread.excerpt}</p>
                  <p className="mt-2 text-xs text-ink-40">
                    {thread.category} · {thread.author} · {thread.replies} replies · {thread.updatedAt}
                  </p>
                </Link>
              </RevealItem>
            ))}
          </RevealGroup>
        )}
      </Reveal>
    </div>
  );
}
