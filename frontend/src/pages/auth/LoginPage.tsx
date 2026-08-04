import { FormEvent, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FieldShell, TextInput } from '@/components/ui/app/FormField';
import { PasswordInput } from '@/components/ui/app/PasswordInput';
import { FormAlert, SubmitButton } from '@/components/ui/app/FormAlert';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { Reveal } from '@/components/ui/Reveal';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { describeError } from '@/lib/api/errors';
import { ROLE_LABEL, ROLE_LEVEL } from '@/lib/access';

type LocationState = {
  from?: { pathname?: string };
  screen?: string;
  /** Set by the verify-email and reset-password screens on success. */
  verified?: boolean;
  passwordReset?: boolean;
} | null;

/** SCR-010 — Login (CHIP-002). */
export default function LoginPage() {
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  const toast = useToast();
  const [form, setForm] = useState({ email: '', password: '' });
  const [remember, setRemember] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<{ title: string; message: string; tone: 'error' | 'warning' } | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [staffBlocked, setStaffBlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Confirmations handed over from the verify / reset screens. Announced once
  // on arrival, then cleared from history so a refresh does not repeat them.
  useEffect(() => {
    if (!state?.verified && !state?.passwordReset) return;

    if (state.verified) toast.success('Email confirmed', 'Your account is active — sign in to continue.');
    if (state.passwordReset) toast.success('Password updated', 'Sign in with your new password.');

    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((e) => ({ ...e, [key]: '' }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAlert(null);
    setFieldErrors({});
    setNeedsVerification(false);
    setStaffBlocked(false);
    setIsLoading(true);

    try {
      const user = await login(form.email, form.password, remember);

      // Mirror of the console's check, in the other direction: staff accounts
      // belong at /admin/login. Sign them straight back out here so the two
      // entrances stay strictly separated.
      if (ROLE_LEVEL[user.role] >= ROLE_LEVEL.moderator) {
        await logout();
        setStaffBlocked(true);
        setAlert({
          title: 'Staff account',
          message: `${user.email} has ${ROLE_LABEL[user.role]} access. Staff sign in at the admin console, not the community sign-in.`,
          tone: 'warning',
        });
        return;
      }

      toast.success(
        `Welcome back, ${user.name.split(' ')[0]}`,
        "You're signed in — pick up where you left off.",
      );
      // Return the user to whatever screen sent them here.
      navigate(state?.from?.pathname ?? '/designs', { replace: true });
    } catch (err) {
      const described = describeError(err);
      setFieldErrors(described.fieldErrors);
      setAlert({
        title: described.title,
        message: described.message,
        tone: described.tone === 'info' ? 'warning' : described.tone,
      });
      if (described.action) setNeedsVerification(true);
      // A connection failure is worth a toast too — the form alert alone can be
      // missed if the user has scrolled.
      if (described.retryable) toast.fromError(err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Welcome back"
        title="Sign in to Chipper"
        lede="Access your designs, messages and upload dashboard."
      />

      <Reveal delay={0.1}>
        <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
          {state?.screen ? <FormAlert tone="info" message={`Sign in to open ${state.screen}.`} /> : null}

          {alert ? (
            <FormAlert
              tone={alert.tone}
              title={alert.title}
              message={alert.message}
              onDismiss={() => setAlert(null)}
            />
          ) : null}

          {staffBlocked ? (
            <p className="text-sm text-muted">
              <Link
                to="/admin/login"
                state={{ email: form.email }}
                className="font-semibold text-deep-coral hover:underline"
              >
                Go to the admin console sign-in →
              </Link>
            </p>
          ) : null}

          {needsVerification ? (
            <p className="text-sm text-muted">
              Not confirmed yet?{' '}
              <Link
                to="/verify-email"
                state={{ email: form.email }}
                className="font-semibold text-deep-coral hover:underline"
              >
                Enter your verification code
              </Link>
            </p>
          ) : null}

          <FieldShell label="Email" error={fieldErrors.email}>
            <TextInput
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@university.nl"
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

          <div className="flex items-center justify-between gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 accent-coral"
              />
              Keep me signed in
            </label>
            <Link to="/forgot-password" className="text-sm font-semibold text-deep-coral hover:underline">
              Forgot password?
            </Link>
          </div>

          <SubmitButton isLoading={isLoading} loadingLabel="Signing in…">
            Sign in
          </SubmitButton>
        </form>
      </Reveal>

      <Reveal delay={0.15}>
        <p className="mt-6 text-center text-sm text-muted">
          No account yet?{' '}
          <Link to="/register" className="font-semibold text-deep-coral hover:underline">
            Create one
          </Link>
        </p>
      </Reveal>
    </div>
  );
}
