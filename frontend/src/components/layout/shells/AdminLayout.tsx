import { useMemo, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { AnimatedOutlet, Reveal } from '@/components/ui/Reveal';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { ROLE_LABEL, canAccess, type ScreenKey } from '@/lib/access';
import { cn } from '@/lib/utils';

type NavItem = { to: string; label: string; screen: ScreenKey; end?: boolean };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ to: '/admin', label: 'Dashboard', screen: 'admin', end: true }],
  },
  {
    label: 'Moderation',
    items: [
      { to: '/admin/designs', label: 'Designs', screen: 'admin/designs' },
      { to: '/admin/moderation', label: 'Reports', screen: 'admin/moderation' },
      { to: '/admin/comments', label: 'Comments', screen: 'admin/comments' },
    ],
  },
  {
    label: 'Community',
    items: [{ to: '/admin/users', label: 'Users', screen: 'admin/users' }],
  },
  {
    label: 'Content',
    items: [
      { to: '/admin/news', label: 'News', screen: 'admin/news' },
      { to: '/admin/forum', label: 'Forum', screen: 'admin/forum' },
      { to: '/admin/taxonomies', label: 'Taxonomies', screen: 'admin/taxonomies' },
    ],
  },
  {
    label: 'System',
    items: [{ to: '/admin/audit', label: 'Audit log', screen: 'admin/audit' }],
  },
];

function NavLinkItem({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          'block whitespace-nowrap rounded-field px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-aubergine text-canvas shadow-soft'
            : 'text-muted hover:bg-periwinkle-tint/70 hover:text-aubergine',
        )
      }
    >
      {item.label}
    </NavLink>
  );
}

export default function AdminLayout() {
  const { user, viewer, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [isLeaving, setIsLeaving] = useState(false);

  const groups = useMemo(
    () =>
      NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((item) => canAccess(viewer, item.screen)),
      })).filter((group) => group.items.length > 0),
    [viewer],
  );

  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  /**
   * The console has its own entrance at /admin/login, so leaving it ends the
   * staff session. Navigating away without signing out left the admin browsing
   * the public site as themselves, which is not what "exit" implies.
   */
  async function handleExit() {
    setIsLeaving(true);
    const firstName = user?.name.split(' ')[0];
    try {
      await logout();
      toast.success('Signed out of admin', firstName ? `See you soon, ${firstName}.` : undefined);
    } catch {
      toast.info('Signed out on this device');
    }
    navigate('/', { replace: true });
  }

  const initials =
    user?.name
      ?.split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() ?? 'ST';

  return (
    <div className="min-h-screen bg-canvas text-aubergine">
      <div className="pointer-events-none fixed inset-0 bg-preview opacity-40" aria-hidden />

      <div className="relative lg:grid lg:min-h-screen lg:grid-cols-[260px_1fr]">
        {/* Desktop sidebar */}
        <aside className="hidden border-r border-line bg-surface/90 backdrop-blur-md lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-y-auto">
          <div className="flex items-center gap-3 border-b border-line px-5 py-5">
            <Link to="/admin" aria-label="Admin dashboard">
              <Logo className="h-6 text-aubergine" />
            </Link>
            <span className="rounded-field bg-aubergine px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-eyebrow text-canvas">
              Admin
            </span>
          </div>

          <nav className="flex-1 space-y-6 px-3 py-5">
            {groups.map((group) => (
              <div key={group.label}>
                <p className="mb-1.5 px-3 text-[0.65rem] font-semibold uppercase tracking-eyebrow text-muted/80">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <NavLinkItem key={item.to} item={item} />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t border-line p-4">
            <div className="flex items-center gap-3 rounded-card border border-line bg-canvas/60 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral-tint font-display text-xs font-bold text-deep-coral">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-aubergine">{user?.name}</p>
                <p className="truncate text-xs text-muted">
                  {user ? ROLE_LABEL[user.role] : 'Admin'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleExit}
              disabled={isLeaving}
              className="mt-3 w-full rounded-field border border-line px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-deep-coral/30 hover:bg-coral-tint/40 hover:text-deep-coral disabled:opacity-60"
            >
              {isLeaving ? 'Signing out…' : 'Exit admin'}
            </button>
          </div>
        </aside>

        {/* Main column */}
        <div className="min-w-0">
          <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur-md lg:hidden">
            <div className="flex h-14 items-center justify-between px-4 sm:px-6">
              <div className="flex items-center gap-2.5">
                <Link to="/admin" aria-label="Admin dashboard">
                  <Logo className="h-5 text-aubergine" />
                </Link>
                <span className="rounded-field bg-aubergine px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-eyebrow text-canvas">
                  Admin
                </span>
              </div>
              <button
                type="button"
                onClick={handleExit}
                disabled={isLeaving}
                className="text-sm font-medium text-muted transition-colors hover:text-aubergine disabled:opacity-60"
              >
                {isLeaving ? 'Signing out…' : 'Exit'}
              </button>
            </div>
            <nav className="-mx-0 flex gap-1.5 overflow-x-auto overscroll-x-contain border-t border-line px-4 py-2.5 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden">
              {flatItems.map((item) => (
                <NavLinkItem key={item.to} item={item} />
              ))}
            </nav>
          </header>

          <main id="main" className="relative mx-auto max-w-6xl px-3 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-10">
            <Reveal y={10}>
              <AnimatedOutlet />
            </Reveal>
          </main>
        </div>
      </div>
    </div>
  );
}
