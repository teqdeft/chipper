import { FormEvent, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { FieldShell, TextInput } from '@/components/ui/app/FormField';
import { PasswordInput } from '@/components/ui/app/PasswordInput';
import { FormAlert, SubmitButton } from '@/components/ui/app/FormAlert';
import { Reveal } from '@/components/ui/Reveal';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { describeError } from '@/lib/api/errors';
import { ROLE_LABEL, ROLE_LEVEL } from '@/lib/access';

type LocationState = { from?: { pathname?: string }; email?: string } | null;

/**
 * Dedicated staff sign-in for the admin console.
 *
 * Same credentials and API as /login — this is a separate *entrance*, not a
 * separate auth system. What it adds:
 *  - lives at /admin/login, so the console has its own door and guarded admin
 *    routes send staff here instead of the public sign-in
 *  - checks the role immediately: a non-staff account is signed out again on
 *    the spot with a clear message, rather than landing on an access screen
 *  - goes straight to the dashboard (or the admin page that redirected here)
 */
export default function AdminLoginPage() {
  const { login, logout, isAuthenticated, hasRole, isLoading: isSessionLoading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  // Pre-filled when the community sign-in redirected a staff account here.
  const [form, setForm] = useState({ email: state?.email ?? '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<{ title?: string; message: string; tone: 'error' | 'warning' } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Already signed in as staff? Straight to the console.
  if (!isSessionLoading && isAuthenticated && hasRole('moderator')) {
    return <Navigate to={state?.from?.pathname ?? '/admin'} replace />;
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

      // The console is moderator+. Anyone else gets signed out immediately —
      // leaving a member session open from a page they cannot use would only
      // confuse ("I signed in, where am I?").
      if (ROLE_LEVEL[user.role] < ROLE_LEVEL.moderator) {
        await logout();
        setAlert({
          title: 'Not a staff account',
          message: `${user.email} is a ${ROLE_LABEL[user.role]} account. The console needs Moderator access or above — use the regular sign-in for the community site.`,
          tone: 'warning',
        });
        return;
      }

      toast.success(`Welcome, ${user.name.split(' ')[0]}`, 'Signed in to the admin console.');
      navigate(state?.from?.pathname ?? '/admin', { replace: true });
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
    <div className="flex min-h-screen items-center justify-center bg-aubergine px-4 py-12">
      <div className="w-full max-w-sm">
        <Reveal>
          <div className="flex items-center justify-center gap-3">
            <Logo className="h-7 text-canvas" />
            <span className="rounded-field bg-coral px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-eyebrow text-aubergine">
              Admin
            </span>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="mt-8 rounded-[16px] border border-line bg-canvas p-6 shadow-soft sm:p-8">
            <h1 className="font-display text-xl font-extrabold tracking-tight text-aubergine">
              Staff sign in
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-70">
              Moderator or administrator access required.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
              {alert ? (
                <FormAlert
                  tone={alert.tone}
                  title={alert.title}
                  message={alert.message}
                  onDismiss={() => setAlert(null)}
                />
              ) : null}

              <FieldShell label="Email" error={fieldErrors.email}>
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

              <SubmitButton isLoading={isLoading} loadingLabel="Signing in…">
                Sign in to console
              </SubmitButton>
            </form>
          </div>
        </Reveal>

        <Reveal delay={0.14}>
          <p className="mt-6 text-center text-sm text-canvas/70">
            Not staff?{' '}
            <Link to="/login" className="font-semibold text-coral hover:underline">
              Community sign-in
            </Link>
            {' · '}
            <Link to="/" className="font-semibold text-coral hover:underline">
              Back to Chipper
            </Link>
          </p>
        </Reveal>
      </div>
    </div>
  );
}
