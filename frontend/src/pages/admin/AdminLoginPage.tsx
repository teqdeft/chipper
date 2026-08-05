import { FormEvent, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { FieldShell, TextInput } from '@/components/ui/app/FormField';
import { PasswordInput } from '@/components/ui/app/PasswordInput';
import { FormAlert, SubmitButton } from '@/components/ui/app/FormAlert';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { describeError } from '@/lib/api/errors';
import { ROLE_LABEL, ROLE_LEVEL, SCREEN_ACCESS, canAccess } from '@/lib/access';
import type { ScreenKey, Viewer } from '@/lib/access';

type LocationState = { from?: { pathname?: string }; email?: string } | null;

function consolePathIfAllowed(pathname: string | undefined, viewer: Viewer) {
  if (!pathname || pathname === '/admin/login') return '/admin';
  if (pathname === '/admin' || pathname === '/admin/') return '/admin';
  if (!pathname.startsWith('/admin/')) return '/admin';
  const screen = pathname.slice(1) as ScreenKey;
  if (!(screen in SCREEN_ACCESS)) return '/admin';
  return canAccess(viewer, screen) ? pathname : '/admin';
}

const CAPABILITIES = [
  { title: 'Design review', body: 'Assess submissions and maintain library quality standards.' },
  { title: 'Member oversight', body: 'Manage roles, account status, and community trust signals.' },
  { title: 'Platform content', body: 'Publish news, pages, and forum structure with full auditability.' },
];

/**
 * Dedicated staff sign-in for the admin console.
 *
 * Same credentials and API as /login — this is a separate *entrance*, not a
 * separate auth system.
 */
export default function AdminLoginPage() {
  const { login, logout, isAuthenticated, hasRole, viewer, isLoading: isSessionLoading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  const [form, setForm] = useState({ email: state?.email ?? '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<{ title?: string; message: string; tone: 'error' | 'warning' } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Already staff — enter the console. Only resume a deep link if they can open it.
  if (!isSessionLoading && isAuthenticated && hasRole('moderator')) {
    return <Navigate to={consolePathIfAllowed(state?.from?.pathname, viewer)} replace />;
  }

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((e) => ({ ...e, [key]: '' }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAlert(null);
    setFieldErrors({});
    setIsLoading(true);

    try {
      const user = await login(form.email, form.password);

      if (ROLE_LEVEL[user.role] < ROLE_LEVEL.moderator) {
        await logout();
        setAlert({
          title: 'Not an admin account',
          message: `${user.email} is a ${ROLE_LABEL[user.role]} account. The console needs Moderator access or above — use the regular sign-in for the community site.`,
          tone: 'warning',
        });
        return;
      }

      toast.success(`Welcome, ${user.name.split(' ')[0]}`, 'Signed in to the admin console.');
      const nextViewer = {
        role: user.role,
        permissions: user.permissions ?? [],
        emailVerified: user.emailVerified,
      };
      navigate(consolePathIfAllowed(state?.from?.pathname, nextViewer), { replace: true });
    } catch (err) {
      const described = describeError(err);
      setFieldErrors(described.fieldErrors);
      setAlert({
        title: described.title,
        message: described.message,
        tone: described.tone === 'info' ? 'warning' : described.tone,
      });
      if (described.retryable) toast.fromError(err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-canvas">
      {/* Ambient field — light side */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_100%_0%,rgba(255,231,222,0.85),transparent_55%),radial-gradient(ellipse_60%_50%_at_0%_100%,rgba(255,243,217,0.7),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(228,230,251,0.45),transparent_40%)]"
        aria-hidden
      />

      <div className="relative grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        {/* ── Brand panel ───────────────────────────────────────────────── */}
        <aside className="relative hidden overflow-hidden bg-aubergine lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-11 xl:px-16 xl:py-14">
          {/* Layered atmosphere */}
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="absolute -left-24 -top-28 h-[28rem] w-[28rem] rounded-full bg-coral/25 blur-3xl" />
            <div className="absolute -bottom-32 right-0 h-[26rem] w-[26rem] rounded-full bg-yellow/20 blur-3xl" />
            <div className="absolute left-1/3 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-periwinkle/15 blur-3xl" />
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(255,252,249,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,252,249,0.5) 1px, transparent 1px)',
                backgroundSize: '48px 48px',
              }}
            />
            {/* Soft chip silhouette hint */}
            <div className="absolute bottom-16 right-10 h-40 w-56 rotate-[-8deg] rounded-[2rem] border border-canvas/10 bg-gradient-to-br from-canvas/10 to-transparent shadow-[0_40px_80px_-40px_rgba(0,0,0,0.5)] backdrop-blur-[2px]" />
            <div className="absolute bottom-28 right-24 h-24 w-36 rotate-6 rounded-[1.5rem] border border-coral/20 bg-coral/10" />
          </div>

          <Reveal y={16}>
            <div className="relative flex items-center gap-3">
              <Logo className="h-8 text-canvas" />
              <span className="rounded-full bg-coral px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-eyebrow text-aubergine shadow-[0_8px_24px_-8px_rgba(252,113,71,0.8)]">
                Admin
              </span>
            </div>
          </Reveal>

          <div className="relative max-w-lg">
            <Reveal delay={0.06} y={20}>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-coral">
                Administration
              </p>
            </Reveal>
            <Reveal delay={0.12} y={24}>
              <h1 className="mt-4 font-display text-[clamp(2.4rem,4vw,3.5rem)] font-extrabold leading-[1.02] tracking-tight text-canvas">
                Platform administration for Chipper.
              </h1>
            </Reveal>
            <Reveal delay={0.18} y={20}>
              <p className="mt-5 max-w-md text-base leading-relaxed text-canvas/65 sm:text-lg">
                Authorised access for moderators and administrators to oversee designs, members, and published content.
              </p>
            </Reveal>

            <RevealGroup className="mt-10 grid gap-3" stagger={0.07}>
              {CAPABILITIES.map((item) => (
                <RevealItem key={item.title}>
                  <div className="group flex items-start gap-3 rounded-card border border-canvas/10 bg-canvas/[0.06] px-4 py-3.5 backdrop-blur-sm transition-colors duration-500 ease-premium hover:border-canvas/20 hover:bg-canvas/[0.1]">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-coral shadow-[0_0_0_3px_rgba(252,113,71,0.25)]" />
                    <div>
                      <p className="text-sm font-semibold text-canvas">{item.title}</p>
                      <p className="mt-0.5 text-sm text-canvas/55">{item.body}</p>
                    </div>
                  </div>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>

          <Reveal delay={0.28} y={12}>
            <div className="relative flex items-center justify-between gap-4 border-t border-canvas/10 pt-6">
              <p className="text-sm text-canvas/45">Chipper · Organ-on-a-chip research platform</p>
              <p className="text-xs font-medium uppercase tracking-eyebrow text-canvas/35">
                Restricted access
              </p>
            </div>
          </Reveal>
        </aside>

        {/* ── Form panel ────────────────────────────────────────────────── */}
        <main className="relative flex items-center justify-center px-4 py-12 sm:px-8 lg:px-12">
          <div className="w-full max-w-[420px]">
            <Reveal>
              <div className="mb-8 flex items-center justify-between gap-3 lg:hidden">
                <div className="flex items-center gap-2.5">
                  <Logo className="h-7 text-aubergine" />
                  <span className="rounded-full bg-coral px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-eyebrow text-aubergine">
                    Admin
                  </span>
                </div>
                <Link to="/" className="text-sm font-medium text-muted transition-colors hover:text-aubergine">
                  Home
                </Link>
              </div>
            </Reveal>

            <Reveal delay={0.05} y={18}>
              <div className="relative">
                {/* Soft glow behind card */}
                <div
                  className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-coral-tint/50 via-transparent to-yellow-tint/40 blur-2xl"
                  aria-hidden
                />

                <div className="relative overflow-hidden rounded-[1.25rem] border border-line bg-surface/95 p-7 shadow-[0_24px_80px_-32px_rgba(69,8,31,0.28)] backdrop-blur-md sm:p-9">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-coral via-yellow to-periwinkle" aria-hidden />

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[0.65rem] font-semibold uppercase tracking-eyebrow text-deep-coral">
                        Secure access
                      </p>
                      <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-aubergine sm:text-[1.75rem]">
                        Admin sign in
                      </h2>
                      <p className="mt-2 text-sm leading-relaxed text-muted">
                        Moderator or administrator credentials only.
                      </p>
                    </div>
                    <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full bg-aubergine text-canvas sm:flex">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path
                          d="M12 3l7 3v5c0 4.5-2.8 8.4-7 10-4.2-1.6-7-5.5-7-10V6l7-3z"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M9.5 12.2l1.7 1.7 3.5-3.6"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </div>

                  <form className="mt-7 space-y-4" onSubmit={handleSubmit} noValidate>
                    {alert ? (
                      <FormAlert
                        tone={alert.tone}
                        title={alert.title}
                        message={alert.message}
                        onDismiss={() => setAlert(null)}
                      />
                    ) : null}

                    <FieldShell label="Work email" error={fieldErrors.email}>
                      <TextInput
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@chipper.org"
                        value={form.email}
                        onChange={(e) => update('email', e.target.value)}
                        required
                      />
                    </FieldShell>

                    <FieldShell label="Password" error={fieldErrors.password}>
                      <PasswordInput
                        name="password"
                        autoComplete="current-password"
                        value={form.password}
                        onChange={(e) => update('password', e.target.value)}
                        required
                      />
                    </FieldShell>

                    <div className="pt-1">
                      <SubmitButton isLoading={isLoading} loadingLabel="Signing in…">
                        Enter console
                      </SubmitButton>
                    </div>
                  </form>

                  <div className="mt-6 flex items-center gap-3 border-t border-line pt-5">
                    <span className="h-px flex-1 bg-line" />
                    <span className="text-[0.65rem] font-semibold uppercase tracking-eyebrow text-muted">
                      Or continue
                    </span>
                    <span className="h-px flex-1 bg-line" />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2.5">
                    <Link
                      to="/login"
                      className="rounded-field border border-line bg-canvas/60 px-3 py-2.5 text-center text-xs font-semibold text-aubergine transition-colors hover:border-line-strong hover:bg-periwinkle-tint/50"
                    >
                      Community sign-in
                    </Link>
                    <Link
                      to="/"
                      className="rounded-field border border-line bg-canvas/60 px-3 py-2.5 text-center text-xs font-semibold text-aubergine transition-colors hover:border-line-strong hover:bg-periwinkle-tint/50"
                    >
                      Back to Chipper
                    </Link>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.14} y={12}>
              <p className="mt-8 text-center text-xs leading-relaxed text-muted">
                Sessions are admin-only. Leaving the console signs you out of this device.
              </p>
            </Reveal>
          </div>
        </main>
      </div>
    </div>
  );
}
