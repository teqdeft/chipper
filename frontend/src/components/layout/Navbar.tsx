import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  AnimatePresence,
  motion,
  useDragControls,
  useReducedMotion,
  type PanInfo,
} from 'framer-motion';
import { Logo } from '@/components/ui/Logo';
import { nav, site } from '@/lib/content';
import { cn, initialsOf } from '@/lib/utils';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { canAccess, ROLE_LABEL } from '@/lib/access';
import type { ScreenKey } from '@/lib/access';
import { messageApi } from '@/lib/api/messages';
import { notificationApi } from '@/lib/api/notifications';

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
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const itemVariants = {
  closed: { opacity: 0, y: 22, filter: 'blur(5px)' },
  open: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.5, ease },
  },
};

type NavbarProps = {
  /** marketing = transparent over hero until scroll; app = always solid, same primary links */
  mode?: 'marketing' | 'app';
};

function navLinkClass(isActive: boolean, onDark: boolean) {
  return cn(
    'relative text-sm font-medium transition-colors after:absolute after:-bottom-1.5 after:left-0 after:h-px after:bg-coral after:transition-all after:duration-300',
    onDark
      ? isActive
        ? 'text-canvas after:w-full'
        : 'text-canvas/70 after:w-0 hover:text-canvas hover:after:w-full'
      : isActive
        ? 'text-aubergine after:w-full'
        : 'text-muted after:w-0 hover:text-aubergine hover:after:w-full',
  );
}

/**
 * One primary navigation for the whole product.
 * Marketing and app shells share the same labels so Forum / Designs never swap the bar.
 */
export default function Navbar({ mode = 'marketing' }: NavbarProps) {
  const { pathname } = useLocation();
  // isLoading matters: until /auth/me settles, isAuthenticated is false. Without
  // it the bar renders "Sign in" on every page load and a signed-in user watches
  // their profile vanish and come back on each refresh.
  const { user, viewer, isAuthenticated, isLoading: isSessionLoading } = useAuth();
  const isHome = pathname === '/';
  /** True while the sticky bar still sits on the aubergine hero band. */
  const [overAubergine, setOverAubergine] = useState(mode === 'marketing' && isHome);
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileAccountOpen, setMobileAccountOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const reduced = useReducedMotion();
  const onDarkHero = mode === 'marketing' && isHome && overAubergine && !open && !mobileAccountOpen;
  const solid = mode === 'app' || !isHome || !overAubergine || open || mobileAccountOpen;
  const anyOverlay = open || mobileAccountOpen;

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadMessages(0);
      setUnreadNotifications(0);
      return;
    }
    let cancelled = false;
    const load = () => {
      void messageApi
        .unreadCount()
        .then((count) => {
          if (!cancelled) setUnreadMessages(count);
        })
        .catch(() => {});
      void notificationApi
        .unreadCount()
        .then((count) => {
          if (!cancelled) setUnreadNotifications(count);
        })
        .catch(() => {});
    };
    load();
    const timer = window.setInterval(load, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isAuthenticated, pathname]);

  useEffect(() => {
    if (mode === 'app' || !isHome) {
      setOverAubergine(false);
      return;
    }

    let cancelled = false;
    let observer: IntersectionObserver | null = null;

    const attach = () => {
      const hero = document.getElementById('hero');
      if (!hero || cancelled) return false;
      observer = new IntersectionObserver(
        ([entry]) => {
          // Nav sits on aubergine while the hero sticky band still intersects the top.
          setOverAubergine(entry.isIntersecting);
        },
        { rootMargin: '-1px 0px -70% 0px', threshold: [0, 0.01, 0.1] },
      );
      observer.observe(hero);
      return true;
    };

    if (!attach()) {
      // Hero mounts with the page; retry once on next frame if needed.
      const raf = requestAnimationFrame(() => {
        if (!attach()) setOverAubergine(true);
      });
      return () => {
        cancelled = true;
        cancelAnimationFrame(raf);
        observer?.disconnect();
      };
    }

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [mode, isHome, pathname]);

  useEffect(() => {
    document.body.style.overflow = anyOverlay ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [anyOverlay]);

  useEffect(() => {
    setOpen(false);
    setAccountOpen(false);
    setMobileAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open && !accountOpen && !mobileAccountOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setAccountOpen(false);
        setMobileAccountOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, accountOpen, mobileAccountOpen]);

  function openMobileAccount() {
    setOpen(false);
    setMobileAccountOpen(true);
  }

  function openMobileNav() {
    setMobileAccountOpen(false);
    setOpen((v) => !v);
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 overflow-x-clip">
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 h-14 border-b transition-[background-color,border-color,opacity] duration-500 ease-premium sm:h-[68px]',
          anyOverlay
            ? 'border-transparent bg-transparent opacity-0'
            : solid
              ? 'border-line bg-canvas/90 opacity-100 backdrop-blur-md'
              : 'border-transparent bg-transparent opacity-100',
        )}
        aria-hidden
      />

      <nav
        className="container-content relative z-20 flex h-14 min-w-0 items-center justify-between sm:h-[68px]"
        aria-label="Primary"
      >
        <Link
          to="/"
          className="rounded-btn"
          aria-label="Chipper home"
          onClick={() => {
            setOpen(false);
            setMobileAccountOpen(false);
          }}
        >
          <Logo
            className={cn(
              'h-6 transition-colors duration-500 ease-premium sm:h-7',
              onDarkHero ? 'text-canvas' : 'text-aubergine',
            )}
          />
        </Link>

        {/* Full desktop nav from lg — at md the logo + links + Upload row
            overflows the viewport and paints a white horizontal strip. */}
        <ul className="hidden items-center gap-6 lg:flex xl:gap-8">
          {nav.map((item) => (
            <li key={item.href}>
              <NavLink
                to={item.href}
                className={({ isActive }) => navLinkClass(isActive, onDarkHero)}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-2 lg:flex xl:gap-3">
          {isSessionLoading ? (
            <div className="flex items-center gap-2" aria-hidden>
              <span className="h-9 w-24 animate-pulse rounded-btn bg-periwinkle-tint/60" />
              <span className="h-9 w-9 animate-pulse rounded-full bg-periwinkle-tint/60" />
            </div>
          ) : isAuthenticated ? (
            <>
              <Link
                to="/members"
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-btn transition-colors',
                  onDarkHero
                    ? 'text-canvas/75 hover:bg-canvas/10 hover:text-canvas'
                    : 'text-muted hover:bg-periwinkle-tint/60 hover:text-aubergine',
                )}
                aria-label="Find members"
                title="Find members"
              >
                <IconSearch />
              </Link>
              <Link
                to="/messages"
                className={cn(
                  'relative flex h-10 w-10 items-center justify-center rounded-btn transition-colors',
                  onDarkHero
                    ? 'text-canvas/75 hover:bg-canvas/10 hover:text-canvas'
                    : 'text-muted hover:bg-periwinkle-tint/60 hover:text-aubergine',
                )}
                aria-label={unreadMessages > 0 ? `Messages, ${unreadMessages} unread` : 'Messages'}
                title="Messages"
              >
                <IconMail />
                {unreadMessages > 0 ? (
                  <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-deep-coral px-1 text-[0.6rem] font-bold leading-none text-canvas">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                ) : null}
              </Link>
              <Link
                to="/notifications"
                className={cn(
                  'relative flex h-10 w-10 items-center justify-center rounded-btn transition-colors',
                  onDarkHero
                    ? 'text-canvas/75 hover:bg-canvas/10 hover:text-canvas'
                    : 'text-muted hover:bg-periwinkle-tint/60 hover:text-aubergine',
                )}
                aria-label={
                  unreadNotifications > 0
                    ? `Notifications, ${unreadNotifications} unread`
                    : 'Notifications'
                }
                title="Notifications"
              >
                <IconBell />
                {unreadNotifications > 0 ? (
                  <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-deep-coral px-1 text-[0.6rem] font-bold leading-none text-canvas">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                ) : null}
              </Link>
              {canAccess(viewer, 'upload') ? (
                <Link to="/upload" className="btn-primary !px-4 !py-2.5 text-sm">
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
                      className="absolute right-0 mt-2 w-52 overflow-hidden rounded-card border border-line bg-surface py-1.5 shadow-soft"
                    >
                      <AccountLinks onNavigate={() => setAccountOpen(false)} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className={cn(
                  'btn-ghost !px-4 !py-2.5 text-sm transition-colors duration-500',
                  onDarkHero && 'btn-ghost-invert',
                )}
              >
                Sign in
              </Link>
              <Link to="/register" className="btn-primary !px-4 !py-2.5 text-sm">
                Upload a design
              </Link>
            </>
          )}
        </div>

        {/* gap-2.5, not less: the avatar's ring-offset eats into anything tighter
            and the two controls read as one blob. */}
        <div className="flex items-center gap-2.5 lg:hidden">
          {isSessionLoading ? (
            <span className="h-9 w-9 animate-pulse rounded-full bg-periwinkle-tint/60" aria-hidden />
          ) : isAuthenticated ? (
            <button
              type="button"
              className={cn(
                'relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-periwinkle-tint text-[0.65rem] font-bold text-aubergine ring-1 transition-all duration-300 ease-premium',
                mobileAccountOpen ? 'ring-coral/50 ring-offset-2 ring-offset-canvas' : 'ring-line',
              )}
              aria-label="Account menu"
              aria-expanded={mobileAccountOpen}
              onClick={() => (mobileAccountOpen ? setMobileAccountOpen(false) : openMobileAccount())}
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initialsOf(user?.name ?? '')
              )}
            </button>
          ) : null}
          <button
            type="button"
            className={cn(
              'relative flex h-10 w-10 items-center justify-center rounded-btn shadow-sm transition-colors duration-500 ease-premium',
              onDarkHero ? 'bg-canvas/15 ring-1 ring-canvas/35' : 'bg-aubergine',
            )}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={openMobileNav}
          >
            <span className="relative block h-3.5 w-5">
              <span
                className={cn(
                  'absolute left-0 h-[1.5px] w-5 origin-center rounded-full bg-surface transition-all duration-300 ease-premium',
                  open ? 'top-[6px] rotate-45' : 'top-0',
                )}
              />
              <span
                className={cn(
                  'absolute left-0 top-[6px] h-[1.5px] w-5 rounded-full bg-surface transition-all duration-300 ease-premium',
                  open ? 'translate-x-1 scale-x-0 opacity-0' : 'opacity-100',
                )}
              />
              <span
                className={cn(
                  'absolute left-0 h-[1.5px] w-5 origin-center rounded-full bg-surface transition-all duration-300 ease-premium',
                  open ? 'top-[6px] -rotate-45' : 'top-[12px]',
                )}
              />
            </span>
          </button>
        </div>
      </nav>

      {/* â”€â”€ Mobile site navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            className="fixed inset-0 z-10 flex flex-col lg:hidden"
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
                  'radial-gradient(85% 50% at 100% 0%, rgba(252,113,71,0.14) 0%, transparent 55%)',
                  'radial-gradient(70% 45% at 0% 100%, rgba(153,153,221,0.12) 0%, transparent 50%)',
                  'linear-gradient(180deg, #FFFCF9 0%, rgba(255,231,222,0.25) 100%)',
                ].join(', '),
              }}
              aria-hidden
            />

            <div className="relative flex h-full flex-col overflow-y-auto overscroll-contain px-gutter pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[calc(3.5rem+0.75rem)] sm:pt-[calc(68px+1rem)]">
              <motion.div
                className="mb-auto flex min-h-0 flex-1 flex-col"
                variants={reduced ? undefined : listVariants}
                initial="closed"
                animate="open"
                exit="closed"
              >
                <motion.p
                  className="mb-5 font-sans text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted"
                  variants={reduced ? undefined : itemVariants}
                >
                  Menu
                </motion.p>

                <nav aria-label="Mobile">
                  <ul className="flex flex-col">
                    {nav.map((item) => (
                      <motion.li
                        key={item.href}
                        variants={reduced ? undefined : itemVariants}
                        className="border-b border-[rgba(69,8,31,0.08)] last:border-b-0"
                      >
                        <NavLink
                          to={item.href}
                          onClick={() => setOpen(false)}
                          className="group flex items-center justify-between py-4"
                        >
                          {({ isActive }) => (
                            <>
                              <span
                                className={cn(
                                  'font-display text-[1.65rem] font-bold leading-none tracking-[-0.03em] transition-colors sm:text-[1.85rem]',
                                  isActive ? 'text-coral' : 'text-aubergine group-active:text-coral',
                                )}
                              >
                                {item.label}
                              </span>
                              <span
                                className={cn(
                                  'flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300',
                                  isActive
                                    ? 'bg-coral/12 text-coral'
                                    : 'bg-transparent text-muted group-active:bg-periwinkle-tint/60 group-active:text-aubergine',
                                )}
                                aria-hidden
                              >
                                <IconChevron />
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
                initial={reduced ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0, y: 10 }}
                transition={{ duration: 0.4, delay: reduced ? 0 : 0.28, ease }}
              >
                {isSessionLoading ? (
                  <div className="flex flex-col gap-2.5" aria-hidden>
                    <span className="h-12 w-full animate-pulse rounded-btn bg-periwinkle-tint/60" />
                    <span className="h-12 w-full animate-pulse rounded-btn bg-periwinkle-tint/40" />
                  </div>
                ) : isAuthenticated ? (
                  <div className="flex flex-col gap-3">
                    {canAccess(viewer, 'upload') ? (
                      <Link to="/upload" onClick={() => setOpen(false)} className="btn-primary w-full justify-center">
                        Upload a design
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={openMobileAccount}
                      className="flex w-full items-center gap-3 rounded-card border border-line/70 bg-surface/80 px-3.5 py-3 text-left shadow-[0_10px_30px_-20px_rgba(69,8,31,0.5)] backdrop-blur-sm transition-colors active:bg-periwinkle-tint/30"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-periwinkle-tint text-[0.7rem] font-bold text-aubergine ring-1 ring-line">
                        {user?.avatarUrl ? (
                          <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          initialsOf(user?.name ?? '')
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-aubergine">{user?.name}</span>
                        <span className="block truncate text-xs text-muted">View account</span>
                      </span>
                      <IconChevron className="shrink-0 text-muted" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    <Link to="/register" onClick={() => setOpen(false)} className="btn-primary w-full justify-center">
                      Upload a design
                    </Link>
                    <Link
                      to="/login"
                      onClick={() => setOpen(false)}
                      className="flex h-12 w-full items-center justify-center rounded-btn border border-line bg-canvas/80 text-sm font-semibold text-aubergine transition-colors active:bg-periwinkle-tint/40"
                    >
                      Sign in
                    </Link>
                    <p className="pt-2 text-center font-sans text-[0.7rem] font-medium tracking-eyebrow text-muted">
                      {site.domain}
                    </p>
                  </div>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* â”€â”€ Mobile account sheet (GitHub-style) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <AnimatePresence>
        {mobileAccountOpen && isAuthenticated && (
          <MobileAccountOverlay
            reduced={!!reduced}
            unreadNotifications={unreadNotifications}
            onClose={() => setMobileAccountOpen(false)}
          />
        )}
      </AnimatePresence>
    </header>
  );
}

/**
 * Bottom sheet with drag-to-dismiss from the handle / header.
 * Soft ambient wash + icon rows for a modern mobile account feel.
 */
function MobileAccountOverlay({
  reduced,
  unreadNotifications,
  onClose,
}: {
  reduced: boolean;
  unreadNotifications: number;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const dragControls = useDragControls();

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y > 110 || info.velocity.y > 650) {
      onClose();
    }
  }

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Account menu"
      className="fixed inset-0 z-10 flex flex-col justify-end lg:hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
    >
      <motion.button
        type="button"
        className="absolute inset-0 bg-[rgba(69,8,31,0.28)] backdrop-blur-[6px]"
        aria-label="Close account menu"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      <motion.div
        className="relative z-10 flex max-h-[min(90vh,680px)] flex-col overflow-hidden rounded-t-[28px] bg-canvas shadow-[0_-24px_80px_-24px_rgba(69,8,31,0.4)]"
        initial={reduced ? false : { y: '100%' }}
        animate={{ y: 0 }}
        exit={reduced ? undefined : { y: '100%' }}
        transition={{ duration: 0.42, ease }}
        drag={reduced ? false : 'y'}
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.55 }}
        onDragEnd={handleDragEnd}
      >
        {/* Ambient wash behind the sheet content */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-44"
          style={{
            background:
              'radial-gradient(90% 120% at 50% -20%, rgba(252,113,71,0.14) 0%, transparent 62%), radial-gradient(70% 100% at 100% 10%, rgba(153,153,221,0.12) 0%, transparent 55%)',
          }}
          aria-hidden
        />

        {/* Drag handle + header */}
        <div
          className="relative shrink-0 touch-none select-none px-5 pb-1 pt-3.5"
          onPointerDown={(e) => {
            if (!reduced) dragControls.start(e);
          }}
        >
          <div className="mb-3.5 flex justify-center">
            <span className="h-1 w-11 rounded-full bg-[rgba(69,8,31,0.12)]" aria-hidden />
          </div>
          <div className="flex w-full items-center justify-between pb-1">
            <p className="font-sans text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted">
              Account
            </p>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(69,8,31,0.05)] text-muted transition-colors active:bg-periwinkle-tint/70 active:text-aubergine"
              aria-label="Close"
            >
              <IconClose />
            </button>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.4rem,env(safe-area-inset-bottom))]">
          {/* Identity hero â€” soft fill, no hard border */}
          <div className="mb-5 overflow-hidden rounded-card bg-gradient-to-br from-periwinkle-tint/50 via-canvas to-coral-tint/35">
            <div className="flex items-center gap-3.5 px-4 py-4">
              <span className="relative flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center overflow-hidden rounded-full bg-canvas text-sm font-bold text-aubergine shadow-[0_0_0_3px_rgba(228,230,251,0.8)]">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initialsOf(user?.name ?? '')
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-[1.15rem] font-bold leading-tight tracking-[-0.025em] text-aubergine">
                  {user?.name}
                </p>
                <p className="mt-0.5 truncate text-[0.8rem] text-muted">@{user?.handle}</p>
              </div>
              {user ? (
                <span className="shrink-0 rounded-full bg-canvas/80 px-2.5 py-1 font-sans text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-aubergine/80">
                  {ROLE_LABEL[user.role]}
                </span>
              ) : null}
            </div>
            {user?.affiliation ? (
              <div className="border-t border-[rgba(69,8,31,0.06)] px-4 py-2.5">
                <p className="truncate text-xs text-muted">{user.affiliation}</p>
              </div>
            ) : null}
          </div>

          <MobileAccountSheet
            onNavigate={onClose}
            reduced={reduced}
            unreadNotifications={unreadNotifications}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

type SheetItem = {
  to: string;
  label: string;
  hint?: string;
  screen?: ScreenKey;
  icon: 'search' | 'mail' | 'bell' | 'upload' | 'grid' | 'user' | 'edit' | 'gear';
};

/**
 * Bottom-sheet account actions â€” icon chips + staggered reveal.
 */
function MobileAccountSheet({
  onNavigate,
  reduced,
  unreadNotifications,
}: {
  onNavigate: () => void;
  reduced: boolean;
  unreadNotifications: number;
}) {
  const { user, viewer, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const primary: SheetItem[] = [
    { to: '/members', label: 'Find members', hint: 'Search the community', screen: 'members', icon: 'search' },
    { to: '/messages', label: 'Messages', hint: 'Inbox & replies', icon: 'mail' },
    {
      to: '/notifications',
      label: 'Notifications',
      hint:
        unreadNotifications > 0
          ? `${unreadNotifications} unread`
          : 'Alerts & updates',
      icon: 'bell',
    },
    ...(canAccess(viewer, 'upload')
      ? [
          {
            to: '/upload',
            label: 'Upload a design',
            hint: 'Share your work',
            screen: 'upload' as ScreenKey,
            icon: 'upload' as const,
          },
        ]
      : []),
    ...(canAccess(viewer, 'my-designs')
      ? [
          {
            to: '/my-designs',
            label: 'My designs',
            hint: 'Manage your uploads',
            screen: 'my-designs' as ScreenKey,
            icon: 'grid' as const,
          },
        ]
      : []),
  ];

  const account: SheetItem[] = [
    { to: user ? `/u/${user.handle}` : '/login', label: 'Public profile', icon: 'user' },
    { to: '/settings/profile', label: 'Edit profile', screen: 'settings/profile', icon: 'edit' },
    { to: '/settings/account', label: 'Account settings', screen: 'settings/account', icon: 'gear' },
  ];

  const visiblePrimary = primary.filter((item) => !item.screen || canAccess(viewer, item.screen));
  const visibleAccount = account.filter((item) => !item.screen || canAccess(viewer, item.screen));

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
      toast.info('Signed out on this device');
    }
    navigate('/', { replace: true });
  }

  const listMotion = reduced
    ? undefined
    : {
        hidden: {},
        show: { transition: { staggerChildren: 0.045, delayChildren: 0.08 } },
      };

  const rowMotion = reduced
    ? undefined
    : {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0, transition: { duration: 0.35, ease } },
      };

  return (
    <div className="flex flex-col gap-5 pb-1">
      <section>
        <p className="mb-2.5 px-0.5 font-sans text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">
          Shortcuts
        </p>
        <motion.ul
          className="overflow-hidden rounded-card bg-[rgba(69,8,31,0.035)]"
          variants={listMotion}
          initial={reduced ? undefined : 'hidden'}
          animate={reduced ? undefined : 'show'}
        >
          {visiblePrimary.map((item, i) => (
            <motion.li
              key={item.to}
              variants={rowMotion}
              className={cn(i > 0 && 'border-t border-[rgba(69,8,31,0.05)]')}
            >
              <Link
                to={item.to}
                onClick={onNavigate}
                className="group flex items-center gap-3.5 px-3.5 py-3.5 transition-colors active:bg-[rgba(69,8,31,0.04)]"
              >
                <SheetIcon kind={item.icon} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-aubergine">{item.label}</span>
                  {item.hint ? <span className="mt-0.5 block text-xs text-muted">{item.hint}</span> : null}
                </span>
                <IconChevron className="shrink-0 text-muted transition-transform duration-300 group-active:translate-x-0.5" />
              </Link>
            </motion.li>
          ))}
        </motion.ul>
      </section>

      <section>
        <p className="mb-2.5 px-0.5 font-sans text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">
          Settings
        </p>
        <motion.ul
          className="overflow-hidden rounded-card bg-[rgba(69,8,31,0.035)]"
          variants={listMotion}
          initial={reduced ? undefined : 'hidden'}
          animate={reduced ? undefined : 'show'}
        >
          {visibleAccount.map((item, i) => (
            <motion.li
              key={item.to}
              variants={rowMotion}
              className={cn(i > 0 && 'border-t border-[rgba(69,8,31,0.05)]')}
            >
              <Link
                to={item.to}
                onClick={onNavigate}
                className="group flex items-center gap-3.5 px-3.5 py-3.5 transition-colors active:bg-[rgba(69,8,31,0.04)]"
              >
                <SheetIcon kind={item.icon} muted />
                <span className="min-w-0 flex-1 text-sm font-medium text-aubergine">{item.label}</span>
                <IconChevron className="shrink-0 text-muted transition-transform duration-300 group-active:translate-x-0.5" />
              </Link>
            </motion.li>
          ))}
        </motion.ul>
      </section>

      <button
        type="button"
        onClick={() => void handleSignOut()}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-card bg-deep-coral/[0.08] text-sm font-semibold text-deep-coral transition-colors active:bg-deep-coral/[0.13]"
      >
        Sign out
      </button>
    </div>
  );
}

function SheetIcon({
  kind,
  muted = false,
}: {
  kind: SheetItem['icon'];
  muted?: boolean;
}) {
  return (
    <span
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-card',
        muted
          ? 'bg-[rgba(69,8,31,0.05)] text-aubergine'
          : 'bg-gradient-to-br from-periwinkle-tint to-periwinkle/40 text-aubergine shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]',
      )}
    >
      {kind === 'search' && <IconSearch />}
      {kind === 'mail' && <IconMail />}
      {kind === 'bell' && <IconBell />}
      {kind === 'upload' && <IconUpload />}
      {kind === 'grid' && <IconGrid />}
      {kind === 'user' && <IconUser />}
      {kind === 'edit' && <IconEdit />}
      {kind === 'gear' && <IconGear />}
    </span>
  );
}

/**
 * Account menu.
 *
 * Entries the signed-in role cannot open are hidden rather than shown and then
 * blocked â€” the same `canAccess` rule the route guards use, so the menu and the
 * router can never disagree.
 */
function AccountLinks({ onNavigate }: { onNavigate: () => void }) {
  const { user, viewer, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // No Admin entry here on purpose: the console has its own entrance at
  // /admin/login and staff sign in there â€” the community menu never offers
  // an admin route, whoever is signed in.
  const items: Array<{ to: string; label: string; screen?: ScreenKey }> = [
    { to: user ? `/u/${user.handle}` : '/login', label: 'Public profile' },
    { to: '/members', label: 'Find members', screen: 'members' },
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
      // is signed out either way â€” say so rather than showing a scary error.
      toast.info('Signed out on this device');
    }
    navigate('/', { replace: true });
  }

  return (
    <>
      {user ? (
        <div className="border-b border-line px-3.5 pb-2 pt-1">
          <p className="truncate text-sm font-semibold text-aubergine">{user.name}</p>
          <p className="truncate text-xs text-muted">
            {ROLE_LABEL[user.role]}
            {user.affiliation ? ` Â· ${user.affiliation}` : ''}
          </p>
        </div>
      ) : null}

      <ul>
        {visible.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              onClick={onNavigate}
              className="block px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-periwinkle-tint/50 hover:text-aubergine"
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

function IconChevron({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M9 5.5 15.5 12 9 18.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.75" />
      <path d="m15.5 15.5 4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
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
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
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

function IconUpload() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 16V5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="m8 9 4-4 4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 19h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconGrid() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="9" r="3.25" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M5.5 19.5c1.4-3 3.7-4.5 6.5-4.5s5.1 1.5 6.5 4.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 19h3.2L18.4 8.8a1.7 1.7 0 0 0 0-2.4l-1.8-1.8a1.7 1.7 0 0 0-2.4 0L4 14.8V19Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="m13.2 5.6 3.2 3.2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconGear() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 3.5v2.2M12 18.3v2.2M4.9 6.5l1.6 1.6M17.5 15.9l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.9 17.5l1.6-1.6M17.5 8.1l1.6-1.6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
