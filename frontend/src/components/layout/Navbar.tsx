import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Logo, Logomark } from '@/components/ui/Logo';
import { nav, site } from '@/lib/content';
import { cn } from '@/lib/utils';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { canAccess, ROLE_LABEL } from '@/lib/access';
import type { ScreenKey } from '@/lib/access';

/** "Dr. M. van der Berg" -> "MB" for the avatar chip. */
function initialsOf(name: string) {
  const parts = name.replace(/^(Dr|Prof|Mr|Ms|Mrs)\.?\s+/i, '').trim().split(/\s+/);
  const letters = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0]?.slice(0, 2);
  return (letters || '?').toUpperCase();
}

const ease = [0.22, 1, 0.36, 1] as const;

const panelVariants = {
  closed: {
    clipPath: 'inset(0 0 100% 0)',
    transition: { duration: 0.45, ease, when: 'afterChildren' as const },
  },
  open: {
    clipPath: 'inset(0 0 0% 0)',
    transition: { duration: 0.55, ease, when: 'beforeChildren' as const },
  },
};

const listVariants = {
  closed: {
    transition: { staggerChildren: 0.03, staggerDirection: -1 },
  },
  open: {
    transition: { staggerChildren: 0.07, delayChildren: 0.12 },
  },
};

const itemVariants = {
  closed: { opacity: 0, y: 28, filter: 'blur(6px)' },
  open: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.55, ease },
  },
};

type NavbarProps = {
  /** marketing = transparent over hero until scroll; app = always solid, same primary links */
  mode?: 'marketing' | 'app';
};

function navLinkClass(isActive: boolean) {
  return cn(
    'relative text-sm font-medium transition-colors after:absolute after:-bottom-1.5 after:left-0 after:h-px after:bg-coral after:transition-all after:duration-300',
    isActive
      ? 'text-aubergine after:w-full'
      : 'text-ink-70 after:w-0 hover:text-aubergine hover:after:w-full',
  );
}

/**
 * One primary navigation for the whole product.
 * Marketing and app shells share the same labels so Forum / Designs never swap the bar.
 */
export default function Navbar({ mode = 'marketing' }: NavbarProps) {
  const { pathname } = useLocation();
  const { user, viewer, isAuthenticated } = useAuth();
  const isHome = pathname === '/';
  const [scrolled, setScrolled] = useState(mode === 'app' || !isHome);
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const reduced = useReducedMotion();
  const solid = mode === 'app' || !isHome || scrolled || open;

  useEffect(() => {
    if (mode === 'app' || !isHome) {
      setScrolled(true);
      return;
    }
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [mode, isHome]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open && !accountOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setAccountOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, accountOpen]);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 h-14 border-b transition-[background-color,border-color,opacity] duration-500 ease-premium sm:h-[68px]',
          open
            ? 'border-transparent bg-transparent opacity-0'
            : solid
              ? 'border-line bg-canvas/90 opacity-100 backdrop-blur-md'
              : 'border-transparent bg-transparent opacity-100',
        )}
        aria-hidden
      />

      <nav
        className="container-content relative z-20 flex h-14 items-center justify-between sm:h-[68px]"
        aria-label="Primary"
      >
        <Link to="/" className="rounded-btn" aria-label="Chipper home" onClick={() => setOpen(false)}>
          <Logo className="h-6 text-aubergine sm:h-7" />
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {nav.map((item) => (
            <li key={item.href}>
              <NavLink to={item.href} className={({ isActive }) => navLinkClass(isActive)}>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-2 md:flex lg:gap-3">
          {isAuthenticated ? (
            <>
              <Link
                to="/messages"
                className="flex h-10 w-10 items-center justify-center rounded-btn text-ink-70 transition-colors hover:bg-periwinkle-tint/60 hover:text-aubergine"
                aria-label="Messages"
                title="Messages"
              >
                <IconMail />
              </Link>
              <Link
                to="/notifications"
                className="relative flex h-10 w-10 items-center justify-center rounded-btn text-ink-70 transition-colors hover:bg-periwinkle-tint/60 hover:text-aubergine"
                aria-label="Notifications"
                title="Notifications"
              >
                <IconBell />
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-coral" aria-hidden />
              </Link>
              {/* Uploading is Uploader+ (SCR-021) — hide it rather than
                  send the user to a blocked screen. */}
              {canAccess(viewer, 'upload') ? (
                <Link to="/upload" className="btn-primary !px-4 !py-2 text-sm">
                  <Logomark className="h-3.5 w-auto" />
                  Upload
                </Link>
              ) : null}
              <div className="relative">
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-periwinkle-tint text-xs font-bold text-aubergine ring-1 ring-line transition-shadow hover:ring-line-strong"
                  aria-label="Account menu"
                  aria-expanded={accountOpen}
                  onClick={() => setAccountOpen((v) => !v)}
                >
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initialsOf(user?.name ?? '')
                  )}
                </button>
                <AnimatePresence>
                  {accountOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.2, ease }}
                      className="absolute right-0 mt-2 w-52 overflow-hidden rounded-[12px] border border-line bg-canvas py-1.5 shadow-soft"
                    >
                      <AccountLinks onNavigate={() => setAccountOpen(false)} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost !px-4 !py-2 text-sm">
                Sign in
              </Link>
              {/* Guests get the join CTA; the guard sends them here anyway. */}
              <Link to="/register" className="btn-primary !px-4 !py-2 text-sm">
                <Logomark className="h-3.5 w-auto" />
                Upload a design
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="relative flex h-11 w-11 items-center justify-center md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="relative block h-3.5 w-5">
            <span
              className={cn(
                'absolute left-0 h-[1.5px] w-5 origin-center rounded-full bg-aubergine transition-all duration-300 ease-premium',
                open ? 'top-[6px] rotate-45' : 'top-0',
              )}
            />
            <span
              className={cn(
                'absolute left-0 top-[6px] h-[1.5px] w-5 rounded-full bg-aubergine transition-all duration-300 ease-premium',
                open ? 'translate-x-1 scale-x-0 opacity-0' : 'opacity-100',
              )}
            />
            <span
              className={cn(
                'absolute left-0 h-[1.5px] w-5 origin-center rounded-full bg-aubergine transition-all duration-300 ease-premium',
                open ? 'top-[6px] -rotate-45' : 'top-[12px]',
              )}
            />
          </span>
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            className="fixed inset-0 z-10 flex flex-col md:hidden"
            initial={reduced ? { opacity: 0 } : 'closed'}
            animate={reduced ? { opacity: 1 } : 'open'}
            exit={reduced ? { opacity: 0 } : 'closed'}
            variants={reduced ? undefined : panelVariants}
            transition={reduced ? { duration: 0.2 } : undefined}
            style={reduced ? undefined : { willChange: 'clip-path' }}
          >
            <div
              className="absolute inset-0 bg-canvas"
              style={{
                backgroundImage: [
                  'radial-gradient(90% 55% at 85% -10%, rgba(252,113,71,0.16) 0%, transparent 58%)',
                  'radial-gradient(70% 50% at -10% 90%, rgba(153,153,221,0.14) 0%, transparent 52%)',
                  'linear-gradient(165deg, #FFFCF9 0%, #FFF7F1 48%, #FFFCF9 100%)',
                ].join(', '),
              }}
              aria-hidden
            />

            <div
              className="pointer-events-none absolute inset-0 opacity-[0.035]"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(69,8,31,1) 1px, transparent 1px), linear-gradient(90deg, rgba(69,8,31,1) 1px, transparent 1px)',
                backgroundSize: '48px 48px',
                maskImage: 'linear-gradient(180deg, black 0%, transparent 85%)',
              }}
              aria-hidden
            />

            <div className="relative flex h-full flex-col px-gutter pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(3.5rem+0.5rem)] sm:pt-[calc(68px+0.75rem)]">
              <motion.div
                className="mb-auto flex min-h-0 flex-1 flex-col justify-center"
                variants={reduced ? undefined : listVariants}
                initial="closed"
                animate="open"
                exit="closed"
              >
                <motion.div
                  className="mb-8 flex items-center gap-3 sm:mb-10"
                  variants={reduced ? undefined : itemVariants}
                >
                  <motion.span
                    className="h-px w-8 bg-coral"
                    initial={reduced ? false : { scaleX: 0, originX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.6, delay: 0.2, ease }}
                  />
                  <p className="eyebrow text-deep-coral">{site.tagline}</p>
                </motion.div>

                <nav aria-label="Mobile">
                  <ul className="flex flex-col gap-1">
                    {nav.map((item, i) => (
                      <motion.li key={item.href} variants={reduced ? undefined : itemVariants}>
                        <NavLink
                          to={item.href}
                          onClick={() => setOpen(false)}
                          className="group flex items-center gap-4 py-2.5 sm:py-3"
                        >
                          {({ isActive }) => (
                            <>
                              <span
                                className={cn(
                                  'w-7 shrink-0 font-sans text-[0.7rem] font-semibold tabular-nums tracking-eyebrow',
                                  isActive ? 'text-coral' : 'text-coral/80',
                                )}
                              >
                                {String(i + 1).padStart(2, '0')}
                              </span>
                              <span
                                className={cn(
                                  'relative font-display text-[clamp(1.45rem,6.5vw,1.85rem)] font-bold leading-[0.95] tracking-[-0.03em]',
                                  isActive ? 'text-coral' : 'text-aubergine',
                                )}
                              >
                                {item.label}
                                <span
                                  className={cn(
                                    'absolute -bottom-1 left-0 h-[2px] bg-coral transition-[width] duration-300 ease-premium',
                                    isActive ? 'w-full' : 'w-0 group-active:w-full',
                                  )}
                                />
                              </span>
                            </>
                          )}
                        </NavLink>
                      </motion.li>
                    ))}
                  </ul>
                </nav>
              </motion.div>

              <motion.div
                className="shrink-0 pt-8"
                initial={reduced ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0, y: 12 }}
                transition={{ duration: 0.45, delay: reduced ? 0 : 0.35, ease }}
              >
                <div className="h-px w-full bg-gradient-to-r from-transparent via-[rgba(69,8,31,0.14)] to-transparent" />

                <div className="mt-6 flex flex-col gap-4">
                  <Link to="/upload" onClick={() => setOpen(false)} className="btn-primary w-full">
                    <Logomark className="h-3.5 w-auto" />
                    Upload a design
                  </Link>
                  {mode === 'app' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        to="/messages"
                        onClick={() => setOpen(false)}
                        className="rounded-btn border border-line px-3 py-2.5 text-center text-sm font-semibold text-aubergine"
                      >
                        Messages
                      </Link>
                      <Link
                        to="/notifications"
                        onClick={() => setOpen(false)}
                        className="rounded-btn border border-line px-3 py-2.5 text-center text-sm font-semibold text-aubergine"
                      >
                        Alerts
                      </Link>
                      <Link
                        to="/my-designs"
                        onClick={() => setOpen(false)}
                        className="rounded-btn border border-line px-3 py-2.5 text-center text-sm font-semibold text-aubergine"
                      >
                        My designs
                      </Link>
                      <Link
                        to="/settings/profile"
                        onClick={() => setOpen(false)}
                        className="rounded-btn border border-line px-3 py-2.5 text-center text-sm font-semibold text-aubergine"
                      >
                        Settings
                      </Link>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-4 px-0.5">
                      <Link
                        to="/login"
                        onClick={() => setOpen(false)}
                        className="text-sm font-semibold text-aubergine underline decoration-line-strong underline-offset-4 transition-colors active:text-coral"
                      >
                        Sign in
                      </Link>
                      <span className="font-sans text-[0.72rem] font-medium tracking-eyebrow text-ink-40">
                        {site.domain}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

/**
 * Account menu.
 *
 * Entries the signed-in role cannot open are hidden rather than shown and then
 * blocked — the same `canAccess` rule the route guards use, so the menu and the
 * router can never disagree.
 */
function AccountLinks({ onNavigate }: { onNavigate: () => void }) {
  const { user, viewer, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // No Admin entry here on purpose: the console has its own entrance at
  // /admin/login and staff sign in there — the community menu never offers
  // an admin route, whoever is signed in.
  const items: Array<{ to: string; label: string; screen?: ScreenKey }> = [
    { to: user ? `/u/${user.handle}` : '/login', label: 'Public profile' },
    { to: '/my-designs', label: 'My designs', screen: 'my-designs' },
    { to: '/settings/profile', label: 'Edit profile', screen: 'settings/profile' },
    { to: '/settings/account', label: 'Account settings', screen: 'settings/account' },
  ];

  const visible = items.filter((item) => !item.screen || canAccess(viewer, item.screen));

  async function handleSignOut() {
    onNavigate();
    const firstName = user?.name.split(' ')[0];
    try {
      await logout();
      toast.success(
        'Signed out',
        firstName ? `See you soon, ${firstName}. Come back anytime.` : 'Come back anytime.',
      );
    } catch {
      // logout() clears local state even if the revoke call fails, so the user
      // is signed out either way — say so rather than showing a scary error.
      toast.info('Signed out on this device');
    }
    navigate('/', { replace: true });
  }

  return (
    <>
      {user ? (
        <div className="border-b border-line px-3.5 pb-2 pt-1">
          <p className="truncate text-sm font-semibold text-aubergine">{user.name}</p>
          <p className="truncate text-xs text-ink-55">
            {ROLE_LABEL[user.role]}
            {user.affiliation ? ` · ${user.affiliation}` : ''}
          </p>
        </div>
      ) : null}

      <ul>
        {visible.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              onClick={onNavigate}
              className="block px-3.5 py-2 text-sm font-medium text-ink-70 transition-colors hover:bg-periwinkle-tint/50 hover:text-aubergine"
            >
              {item.label}
            </Link>
          </li>
        ))}
        <li className="mt-1 border-t border-line pt-1">
          <button
            type="button"
            onClick={handleSignOut}
            className="block w-full px-3.5 py-2 text-left text-sm font-medium text-deep-coral transition-colors hover:bg-periwinkle-tint/50"
          >
            Sign out
          </button>
        </li>
      </ul>
    </>
  );
}

function IconMail() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path d="m5.5 8 6.5 5 6.5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6.5 10a5.5 5.5 0 0 1 11 0c0 4 1.5 5.5 1.5 5.5H5S6.5 14 6.5 10Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M10 18.5a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
