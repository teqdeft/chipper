import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { ErrorState, LoadingState } from '@/components/ui/app/LoadingState';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { useApiResource } from '@/hooks/useApiResource';
import { adminApi } from '@/lib/api/admin';

const shortcuts = [
  { to: '/admin/users', label: 'Users', desc: 'Roles, bans and reputation' },
  { to: '/admin/designs', label: 'Designs', desc: 'Publish, archive and review queue' },
  { to: '/admin/moderation', label: 'Moderation', desc: 'Flagged content queue' },
  { to: '/admin/comments', label: 'Comments', desc: 'Hide or remove discussion' },
  { to: '/admin/news', label: 'News & pages', desc: 'Announcements and guides' },
  { to: '/admin/forum', label: 'Forum', desc: 'Categories, pin and lock' },
];

const designStatusTone = {
  published: 'green',
  pending: 'yellow',
  draft: 'ink',
  rejected: 'coral',
  archived: 'ink',
} as const;

/** SCR-032 — Admin dashboard (CHIP-036, CHIP-038). */
export default function AdminDashboardPage() {
  const { data, isLoading, error, reload } = useApiResource(() => adminApi.dashboard(), []);

  if (isLoading) return <LoadingState label="Loading platform stats…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const stats = [
    { label: 'Designs', value: data.designs.toLocaleString(), sub: `${data.detail.designs.published} published` },
    {
      label: 'Downloads',
      value: data.downloads.toLocaleString(),
      sub: `${data.detail.last7Days.downloads} this week`,
    },
    {
      label: 'Active users',
      value: data.activeUsers.toLocaleString(),
      sub: `${data.detail.last7Days.signups} new this week`,
    },
    {
      label: 'Pending review',
      value: String(data.pendingReview),
      sub: 'designs awaiting a decision',
      highlight: data.pendingReview > 0,
    },
    { label: 'Flagged items', value: String(data.flagged), sub: 'open reports', highlight: data.flagged > 0 },
  ];

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Administration"
        title="Dashboard"
        lede="Platform health at a glance. Jump to queues that need attention."
        actions={
          data.flagged > 0 ? (
            <Link to="/admin/moderation" className="btn-primary text-sm">
              Review flagged ({data.flagged})
            </Link>
          ) : data.pendingReview > 0 ? (
            <Link to="/admin/designs" className="btn-primary text-sm">
              Review pending ({data.pendingReview})
            </Link>
          ) : null
        }
      />

      <RevealGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" stagger={0.06}>
        {stats.map((stat) => (
          <RevealItem key={stat.label}>
            <div className="card p-5">
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-muted">{stat.label}</p>
              <p className="mt-2 font-display text-2xl font-extrabold tabular-nums text-aubergine">
                {stat.value}
              </p>
              <p className="mt-1 text-xs text-muted">{stat.sub}</p>
              {stat.highlight ? (
                <StatusBadge tone="yellow" className="mt-3">
                  Needs attention
                </StatusBadge>
              ) : null}
            </div>
          </RevealItem>
        ))}
      </RevealGroup>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <Reveal delay={0.08} as="section">
          <h2 className="font-display text-lg font-bold text-aubergine">Recently created designs</h2>
          {data.recentDesigns.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Nothing yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line rounded-card border border-line bg-surface shadow-soft">
              {data.recentDesigns.map((design) => (
                <li key={design.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <Link
                      to={`/designs/${design.slug}`}
                      className="block truncate font-semibold text-aubergine hover:text-deep-coral"
                    >
                      {design.title}
                    </Link>
                    <p className="text-xs text-muted">
                      {design.author} · {new Date(design.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge
                    tone={designStatusTone[design.status as keyof typeof designStatusTone] ?? 'ink'}
                  >
                    {design.status}
                  </StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </Reveal>

        <Reveal delay={0.1} as="section">
          <h2 className="font-display text-lg font-bold text-aubergine">Community</h2>
          <dl className="mt-4 space-y-3 rounded-card border border-line bg-surface p-5 shadow-soft">
            {[
              ['Members', data.detail.users.total.toLocaleString()],
              ['New members (30 days)', data.detail.users.newLast30Days.toLocaleString()],
              ['Forum topics', data.detail.forum.topics.toLocaleString()],
              ['Forum posts', data.detail.forum.posts.toLocaleString()],
              ['Unanswered topics', data.detail.forum.unanswered.toLocaleString()],
              ['Design views', data.detail.designs.views.toLocaleString()],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-4 border-b border-line pb-3 last:border-0 last:pb-0"
              >
                <dt className="text-sm text-muted">{label}</dt>
                <dd className="font-display font-bold tabular-nums text-aubergine">{value}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>

      <Reveal delay={0.12} as="section">
        <h2 className="font-display text-lg font-bold text-aubergine">Quick links</h2>
        <RevealGroup className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
          {shortcuts.map((item) => (
            <RevealItem key={item.to}>
              <Link to={item.to} className="card card-hover group p-5">
                <span className="font-display text-base font-bold text-aubergine group-hover:text-deep-coral">
                  {item.label}
                </span>
                <p className="mt-1 text-sm text-muted">{item.desc}</p>
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      </Reveal>
    </div>
  );
}
