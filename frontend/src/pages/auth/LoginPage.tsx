import { FormEvent, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FieldShell, TextInput } from '@/components/ui/app/FormField';
import { FormAlert, SubmitButton } from '@/components/ui/app/FormAlert';
import { Reveal } from '@/components/ui/Reveal';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { describeError } from '@/lib/api/errors';

type LocationState = {
  from?: { pathname?: string };
  screen?: string;
  /** Set by the verify-email and reset-password screens on success. */
  verified?: boolean;
  passwordReset?: boolean;
} | null;

/** SCR-010 — Login (CHIP-002). */
export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  const toast = useToast();
  const [form, setForm] = useState({ email: '', password: '' });
  const [remember, setRemember] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<{ title: string; message: string; tone: 'error' | 'warning' } | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Confirmations handed over from the verify / reset screens.
  useEffect(() => {
    if (state?.verified) toast.success('Email confirmed', 'Your account is active — sign in to continue.');
    if (state?.passwordReset) toast.success('Password updated', 'Sign in with your new password.');
    // Only announce once, on arrival.
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
    setIsLoading(true);

    try {
      const user = await login(form.email, form.password, remember);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}`);
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
      <Reveal>
        <p className="eyebrow text-deep-coral">Welcome back</p>
        <h1 className="mt-2 font-display text-display-sm font-extrabold tracking-tight text-aubergine">
          Sign in to Chipper
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-70">
          Access your designs, messages and upload dashboard.
        </p>
      </Reveal>

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

          {needsVerification ? (
            <p className="text-sm text-ink-70">
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
            <TextInput
              name="password"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              required
            />
          </FieldShell>

          <div className="flex items-center justify-between gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-70">
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
        <p className="mt-6 text-center text-sm text-ink-70">
          No account yet?{' '}
          <Link to="/register" className="font-semibold text-deep-coral hover:underline">
            Create one
          </Link>
        </p>
      </Reveal>
    </div>
  );
}
