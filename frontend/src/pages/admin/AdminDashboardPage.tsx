import { Link } from 'react-router-dom';
import { AdminSection, AdminStatCard } from '@/components/admin';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { ErrorState, LoadingState } from '@/components/ui/app/LoadingState';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { useApiResource } from '@/hooks/useApiResource';
import { useAuth } from '@/app/providers/AuthProvider';
import { canAccess } from '@/lib/access';
import { adminApi } from '@/lib/api/admin';

const allShortcuts = [
  { to: '/admin/users', label: 'Users', desc: 'Roles, bans and reputation', screen: 'admin/users' as const },
  { to: '/admin/designs', label: 'Designs', desc: 'Publish, archive and review queue', screen: 'admin/designs' as const },
  { to: '/admin/moderation', label: 'Moderation', desc: 'Flagged content queue', screen: 'admin/moderation' as const },
  { to: '/admin/comments', label: 'Comments', desc: 'Hide or remove discussion', screen: 'admin/comments' as const },
  { to: '/admin/news', label: 'News', desc: 'Announcements and guides', screen: 'admin/news' as const },
  { to: '/admin/forum', label: 'Forum', desc: 'Categories, pin and lock', screen: 'admin/forum' as const },
  { to: '/admin/taxonomies', label: 'Taxonomies', desc: 'Organs, materials, licenses', screen: 'admin/taxonomies' as const },
  { to: '/admin/audit', label: 'Audit log', desc: 'Staff action history', screen: 'admin/audit' as const },
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
  const { viewer } = useAuth();
  const { data, isLoading, error, reload } = useApiResource(() => adminApi.dashboard(), []);

  const shortcuts = allShortcuts.filter((s) => canAccess(viewer, s.screen));

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
      label: 'Pending',
      value: String(data.pendingReview),
      sub: 'awaiting review',
      highlight: data.pendingReview > 0,
    },
    {
      label: 'Flagged',
      value: String(data.flagged),
      sub: 'open reports',
      highlight: data.flagged > 0,
    },
  ];

  const communityStats: Array<{ label: string; shortLabel: string; value: string }> = [
    { label: 'Members', shortLabel: 'Members', value: data.detail.users.total.toLocaleString() },
    {
      label: 'New members (30 days)',
      shortLabel: 'New (30d)',
      value: data.detail.users.newLast30Days.toLocaleString(),
    },
    { label: 'Forum topics', shortLabel: 'Topics', value: data.detail.forum.topics.toLocaleString() },
    { label: 'Forum posts', shortLabel: 'Posts', value: data.detail.forum.posts.toLocaleString() },
    {
      label: 'Unanswered topics',
      shortLabel: 'Unanswered',
      value: data.detail.forum.unanswered.toLocaleString(),
    },
    { label: 'Design views', shortLabel: 'Views', value: data.detail.designs.views.toLocaleString() },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 lg:space-y-10">
      <PageHeader
        eyebrow="Administration"
        title="Dashboard"
        lede="Platform health at a glance. Jump to queues that need attention."
        actions={
          data.flagged > 0 ? (
            <Link to="/admin/moderation" className="btn-primary w-full text-sm sm:w-auto">
              Review flagged ({data.flagged})
            </Link>
          ) : data.pendingReview > 0 ? (
            <Link to="/admin/designs" className="btn-primary w-full text-sm sm:w-auto">
              Review pending ({data.pendingReview})
            </Link>
          ) : null
        }
      />

      {(data.flagged > 0 || data.pendingReview > 0) && (
        <Reveal>
          <div className="flex flex-col gap-3 rounded-card border border-coral/30 bg-gradient-to-r from-coral-tint/60 to-yellow-tint/40 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-aubergine">Needs attention</p>
              <p className="mt-0.5 text-sm text-muted">
                {data.pendingReview > 0 ? `${data.pendingReview} designs pending review` : null}
                {data.pendingReview > 0 && data.flagged > 0 ? (
                  <span className="hidden sm:inline"> · </span>
                ) : null}
                {data.pendingReview > 0 && data.flagged > 0 ? <br className="sm:hidden" /> : null}
                {data.flagged > 0 ? `${data.flagged} open reports` : null}
              </p>
            </div>
            <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap">
              {data.pendingReview > 0 ? (
                <Link to="/admin/designs" className="btn-ghost w-full text-sm sm:w-auto">
                  Open designs
                </Link>
              ) : null}
              {data.flagged > 0 ? (
                <Link to="/admin/moderation" className="btn-primary w-full text-sm sm:w-auto">
                  Open queue
                </Link>
              ) : null}
            </div>
          </div>
        </Reveal>
      )}

      <RevealGroup
        className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5"
        stagger={0.05}
      >
        {stats.map((stat) => (
          <RevealItem key={stat.label} className="min-w-0">
            <AdminStatCard {...stat} className="h-full p-3.5 sm:p-5" />
          </RevealItem>
        ))}
      </RevealGroup>

      <div className="grid gap-6 sm:gap-8 lg:grid-cols-[1.2fr_1fr]">
        <AdminSection title="Recently created designs" panel={false}>
          {data.recentDesigns.length === 0 ? (
            <p className="text-sm text-muted">Nothing yet.</p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface shadow-soft">
              {data.recentDesigns.map((design) => (
                <li
                  key={design.id}
                  className="flex flex-col gap-2 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/designs/${design.slug}`}
                      className="block truncate font-semibold text-aubergine hover:text-deep-coral"
                    >
                      {design.title}
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {design.author} · {new Date(design.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="shrink-0 self-start sm:self-center">
                    <StatusBadge
                      tone={designStatusTone[design.status as keyof typeof designStatusTone] ?? 'ink'}
                    >
                      {design.status}
                    </StatusBadge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AdminSection>

        <AdminSection title="Community" panel={false}>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line shadow-soft sm:grid-cols-1 sm:gap-0 sm:bg-surface sm:p-1">
            {communityStats.map((row) => (
              <div
                key={row.label}
                className="flex flex-col gap-1 bg-surface px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:border-b sm:border-line sm:px-4 sm:last:border-0"
              >
                <dt className="text-xs text-muted sm:text-sm">
                  <span className="sm:hidden">{row.shortLabel}</span>
                  <span className="hidden sm:inline">{row.label}</span>
                </dt>
                <dd className="font-display text-base font-bold tabular-nums text-aubergine sm:text-[1rem]">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </AdminSection>
      </div>

      <AdminSection title="Quick links" panel={false}>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
          {shortcuts.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="card group flex min-w-0 flex-col p-4 transition-[border-color,box-shadow] duration-300 hover:border-line-strong hover:shadow-card-hover sm:p-5"
            >
              <span className="font-display text-base font-bold text-aubergine transition-colors group-hover:text-deep-coral">
                {item.label}
              </span>
              <p className="mt-1 text-sm text-muted">{item.desc}</p>
            </Link>
          ))}
        </div>
      </AdminSection>
    </div>
  );
}
