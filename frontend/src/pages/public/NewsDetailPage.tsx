import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { mockNews } from '@/lib/mock';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** SCR-005 — News detail by slug. */
export default function NewsDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const article = mockNews.find((n) => n.slug === slug);

  if (!article) {
    return (
      <div className="container-content pt-24 sm:pt-28 pb-16 sm:pb-24">
        <Reveal>
          <EmptyState
            title="Article not found"
            body="This news item may have moved or never existed."
            actionLabel="Back to news"
            actionTo="/news"
          />
        </Reveal>
        <Reveal delay={0.08}>
          <p className="mt-6 text-center text-sm text-ink-55">
            Or{' '}
            <Link to="/404" className="font-semibold text-deep-coral hover:underline">
              view the 404 page
            </Link>
          </p>
        </Reveal>
      </div>
    );
  }

  return (
    <article className="container-content pt-24 sm:pt-28 pb-16 sm:pb-24">
      <Reveal>
        <Link to="/news" className="text-sm font-semibold text-deep-coral hover:underline">
          ← All news
        </Link>
      </Reveal>

      <header className="mt-6 max-w-2xl">
        <Reveal delay={0.05}>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone="coral">{article.category}</StatusBadge>
            <time className="text-xs text-ink-55" dateTime={article.date}>
              {formatDate(article.date)}
            </time>
          </div>
        </Reveal>
        <PageHeader title={article.title} lede={article.excerpt} className="mt-4" />
      </header>

      <RevealGroup className="prose-custom mt-10 max-w-prose space-y-5 border-t border-line pt-10" stagger={0.05}>
        {article.body.map((paragraph, i) => (
          <RevealItem key={i}>
            <p className="text-base leading-relaxed text-ink-70">{paragraph}</p>
          </RevealItem>
        ))}
      </RevealGroup>
    </article>
  );
}
