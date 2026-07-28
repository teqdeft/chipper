import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { mockNews } from '@/lib/mock';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 2;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** SCR-004 — News list with mock pagination. */
export default function NewsListPage() {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(mockNews.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const slice = mockNews.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="container-content pt-24 sm:pt-28 pb-16 sm:pb-24">
      <PageHeader
        eyebrow="News"
        title="Updates from the Playground."
        lede="Announcements, guides and events from the Chipper team and community."
      />

      <RevealGroup className="mt-12 space-y-6 sm:mt-16" stagger={0.07}>
        {slice.map((item) => (
          <RevealItem key={item.slug} as="li" className="list-none">
            <Link
              to={`/news/${item.slug}`}
              className="group block rounded-[16px] border border-line bg-canvas p-6 transition-[border-color,box-shadow] duration-300 hover:border-line-strong hover:shadow-soft sm:p-8"
            >
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone="coral">{item.category}</StatusBadge>
                <time className="text-xs text-ink-55" dateTime={item.date}>
                  {formatDate(item.date)}
                </time>
              </div>
              <h2 className="mt-3 font-display text-xl font-bold text-aubergine transition-colors group-hover:text-deep-coral sm:text-2xl">
                {item.title}
              </h2>
              <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-70 sm:text-base">{item.excerpt}</p>
              <span className="mt-4 inline-flex text-sm font-semibold text-deep-coral">Read more →</span>
            </Link>
          </RevealItem>
        ))}
      </RevealGroup>

      {totalPages > 1 && (
        <Reveal delay={0.1}>
          <nav className="mt-10 flex items-center justify-between border-t border-line pt-8" aria-label="Pagination">
            <button
              type="button"
              className={cn('btn-ghost !px-4 !py-2 text-sm', safePage <= 1 && 'pointer-events-none opacity-40')}
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span className="text-sm text-ink-70">
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              className={cn('btn-ghost !px-4 !py-2 text-sm', safePage >= totalPages && 'pointer-events-none opacity-40')}
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </nav>
        </Reveal>
      )}
    </div>
  );
}
