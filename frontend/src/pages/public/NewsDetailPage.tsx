import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { ErrorState, LoadingState } from '@/components/ui/app/LoadingState';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { useApiResource } from '@/hooks/useApiResource';
import { contentApi } from '@/lib/api/content';

function formatDate(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** SCR-005 — News detail by slug, loaded from admin-published content. */
export default function NewsDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading, error, reload } = useApiResource(
    () => contentApi.getNews(slug!),
    [slug],
    { enabled: Boolean(slug) },
  );

  if (isLoading) {
    return (
      <div className="container-content page-pad-top pb-16 sm:pb-24">
        <LoadingState label="Loading article…" />
      </div>
    );
  }

  if (error || !data?.article) {
    const notFound =
      !error ||
      error.title === 'Not found' ||
      /not found/i.test(error.message);
    return (
      <div className="container-content page-pad-top pb-16 sm:pb-24">
        {error && !notFound ? (
          <ErrorState error={error} onRetry={reload} />
        ) : (
          <Reveal>
            <EmptyState
              title="Article not found"
              body="This news item may have moved or never existed."
              actionLabel="Back to news"
              actionTo="/news"
            />
          </Reveal>
        )}
        <Reveal delay={0.08}>
          <p className="mt-6 text-center text-sm text-muted">
            Or{' '}
            <Link to="/404" className="font-semibold text-deep-coral hover:underline">
              view the 404 page
            </Link>
          </p>
        </Reveal>
      </div>
    );
  }

  const article = data.article;
  const dateLabel = formatDate(article.date ?? article.publishedAt);
  const paragraphs = article.body?.length
    ? article.body
    : article.bodyRaw
      ? String(article.bodyRaw).split('\n\n').filter(Boolean)
      : [];

  return (
    <article className="container-content page-pad-top pb-16 sm:pb-24">
      <Reveal>
        <Link to="/news" className="text-sm font-semibold text-deep-coral hover:underline">
          ← All news
        </Link>
      </Reveal>

      <header className="mt-6 max-w-2xl">
        <Reveal delay={0.05}>
          <div className="flex flex-wrap items-center gap-2">
            {article.category ? <StatusBadge tone="coral">{article.category}</StatusBadge> : null}
            {dateLabel && (article.date || article.publishedAt) ? (
              <time className="text-xs text-muted" dateTime={article.date ?? article.publishedAt ?? undefined}>
                {dateLabel}
              </time>
            ) : null}
          </div>
        </Reveal>
        <PageHeader
          title={article.title}
          lede={article.excerpt ?? undefined}
          className="mt-4"
        />
      </header>

      {paragraphs.length > 0 ? (
        <RevealGroup className="prose-custom mt-10 max-w-prose space-y-5 border-t border-line pt-10" stagger={0.05}>
          {paragraphs.map((paragraph, i) => (
            <RevealItem key={i}>
              <p className="text-base leading-relaxed text-muted">{paragraph}</p>
            </RevealItem>
          ))}
        </RevealGroup>
      ) : null}

      {data.related?.length ? (
        <Reveal delay={0.12}>
          <aside className="mt-14 border-t border-line pt-10">
            <h2 className="font-display text-lg font-bold text-aubergine">More updates</h2>
            <ul className="mt-4 space-y-3">
              {data.related.map((item) => (
                <li key={item.slug}>
                  <Link
                    to={`/news/${item.slug}`}
                    className="group flex flex-col gap-0.5 rounded-card border border-line px-4 py-3 transition-colors hover:border-line-strong hover:bg-periwinkle-tint/30"
                  >
                    <span className="font-semibold text-aubergine group-hover:text-deep-coral">
                      {item.title}
                    </span>
                    {item.excerpt ? (
                      <span className="line-clamp-1 text-sm text-muted">{item.excerpt}</span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        </Reveal>
      ) : null}
    </article>
  );
}
