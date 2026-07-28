import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { mockAdminStats } from '@/lib/mock';

const shortcuts = [
  { to: '/admin/users', label: 'Users', desc: 'Roles, bans and reputation' },
  { to: '/admin/designs', label: 'Designs', desc: 'Publish, archive and review queue' },
  { to: '/admin/moderation', label: 'Moderation', desc: 'Flagged content queue' },
  { to: '/admin/comments', label: 'Comments', desc: 'Hide or remove discussion' },
  { to: '/admin/news', label: 'News & pages', desc: 'Announcements and guides' },
  { to: '/admin/forum', label: 'Forum', desc: 'Categories, pin and lock' },
];

/** SCR-032 — Admin dashboard with stats and shortcuts. */
export default function AdminDashboardPage() {
  const stats = [
    { label: 'Designs', value: mockAdminStats.designs.toLocaleString(), tone: 'periwinkle' as const },
    { label: 'Downloads', value: mockAdminStats.downloads.toLocaleString(), tone: 'coral' as const },
    { label: 'Active users', value: mockAdminStats.activeUsers.toLocaleString(), tone: 'green' as const },
    { label: 'Pending review', value: String(mockAdminStats.pendingReview), tone: 'yellow' as const },
    { label: 'Flagged items', value: String(mockAdminStats.flagged), tone: 'coral' as const },
  ];

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Administration"
        title="Dashboard"
        lede="Platform health at a glance. Jump to queues that need attention."
        actions={
          mockAdminStats.flagged > 0 ? (
            <Link to="/admin/moderation" className="btn-primary text-sm">
              Review flagged ({mockAdminStats.flagged})
            </Link>
          ) : null
        }
      />

      <RevealGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" stagger={0.06}>
        {stats.map((stat) => (
          <RevealItem key={stat.label}>
            <div className="card p-5">
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-ink-55">{stat.label}</p>
              <p className="mt-2 font-display text-2xl font-extrabold tabular-nums text-aubergine">{stat.value}</p>
              {stat.label === 'Pending review' && mockAdminStats.pendingReview > 0 ? (
                <StatusBadge tone={stat.tone} className="mt-3">
                  Needs review
                </StatusBadge>
              ) : null}
            </div>
          </RevealItem>
        ))}
      </RevealGroup>

      <Reveal delay={0.1} as="section">
        <h2 className="font-display text-lg font-bold text-aubergine">Quick links</h2>
        <RevealGroup className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
          {shortcuts.map((item) => (
            <RevealItem key={item.to}>
              <Link to={item.to} className="card card-hover group p-5">
                <span className="font-display text-base font-bold text-aubergine group-hover:text-deep-coral">
                  {item.label}
                </span>
                <p className="mt-1 text-sm text-ink-55">{item.desc}</p>
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      </Reveal>
    </div>
  );
}
