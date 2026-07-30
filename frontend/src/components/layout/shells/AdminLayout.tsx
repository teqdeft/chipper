import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { AnimatedOutlet, Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { cn } from '@/lib/utils';

const adminNav = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/designs', label: 'Designs' },
  { to: '/admin/moderation', label: 'Moderation' },
  { to: '/admin/comments', label: 'Comments' },
  { to: '/admin/news', label: 'News & pages' },
  { to: '/admin/forum', label: 'Forum' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [isLeaving, setIsLeaving] = useState(false);

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
      // logout() clears local state even if the revoke call fails.
      toast.info('Signed out on this device');
    }
    navigate('/', { replace: true });
  }

  return (
    <div className="min-h-screen bg-canvas text-aubergine">
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/95 backdrop-blur-md">
        <div className="container-content flex h-14 items-center justify-between sm:h-16">
          <div className="flex items-center gap-3">
            <Link to="/" aria-label="Chipper home">
              <Logo className="h-6 text-aubergine" />
            </Link>
            <span className="rounded-field bg-aubergine px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-eyebrow text-canvas">
              Admin
            </span>
          </div>
          <button
            type="button"
            onClick={handleExit}
            disabled={isLeaving}
            className="text-sm font-medium text-ink-70 transition-colors hover:text-aubergine disabled:opacity-60"
          >
            {isLeaving ? 'Signing out…' : 'Exit admin'}
          </button>
        </div>
      </header>

      <div className="container-content grid gap-8 py-6 lg:grid-cols-[220px_1fr] lg:py-10">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Reveal y={12}>
            <RevealGroup
              className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:pb-0"
              stagger={0.04}
            >
              {adminNav.map((item) => (
                <RevealItem key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        'block whitespace-nowrap rounded-btn px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-aubergine text-canvas'
                          : 'text-ink-70 hover:bg-periwinkle-tint/60 hover:text-aubergine',
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                </RevealItem>
              ))}
            </RevealGroup>
          </Reveal>
        </aside>
        <main id="main" className="min-w-0">
          <AnimatedOutlet />
        </main>
      </div>
    </div>
  );
}
