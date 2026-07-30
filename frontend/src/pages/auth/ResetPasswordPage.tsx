import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { FieldShell } from '@/components/ui/app/FormField';
import { PasswordInput } from '@/components/ui/app/PasswordInput';
import { FormAlert, SubmitButton } from '@/components/ui/app/FormAlert';
import { LockedEmail } from '@/components/ui/app/LockedEmail';
import { OtpInput } from '@/components/ui/app/OtpInput';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { authApi } from '@/lib/api/auth';
import { useToast } from '@/app/providers/ToastProvider';
import { describeError } from '@/lib/api/errors';

const OTP_LENGTH = 6;

type LocationState = { email?: string; devOtp?: string; expiresInMinutes?: number } | null;

/** SCR-012 — Reset password (CHIP-003). Accepts the emailed code or a magic link. */
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const state = location.state as LocationState;
  const linkToken = searchParams.get('token');

  // Carried from forgot-password — never editable on this screen.
  const email = (state?.email ?? '').trim();

  const [otp, setOtp] = useState('');
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const toast = useToast();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<{ title?: string; message: string; tone: 'error' | 'warning' } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const expiresIn = state?.expiresInMinutes ?? 60;

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((e) => ({ ...e, [key]: '' }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAlert(null);
    setFieldErrors({});

    if (form.password !== form.confirmPassword) {
      setFieldErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }
    if (!linkToken && !email) {
      setAlert({ tone: 'warning', message: 'Start again from the forgot-password step.' });
      return;
    }
    if (!linkToken && otp.length !== OTP_LENGTH) {
      setAlert({ tone: 'warning', message: `Enter the ${OTP_LENGTH}-digit code from your email.` });
      return;
    }

    setIsLoading(true);
    try {
      const credential = linkToken ? { token: linkToken } : { email, otp };
      await authApi.resetPassword({
        ...credential,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      navigate('/login', { replace: true, state: { passwordReset: true } });
    } catch (err) {
      const described = describeError(err);
      setFieldErrors(described.fieldErrors);
      setAlert({
        title: described.title,
        message: described.message,
        tone: described.tone === 'info' ? 'warning' : described.tone,
      });
      if (described.fieldErrors.otp || described.title.includes('code')) setOtp('');
      if (described.retryable || described.action) toast.fromError(err);
    } finally {
      setIsLoading(false);
    }
  }

  if (!linkToken && !email) {
    return (
      <div className="text-center">
        <StatusBadge tone="yellow" className="mb-4">
          Reset password
        </StatusBadge>
        <h1 className="font-display text-display-sm font-extrabold tracking-tight text-aubergine">
          Request a code first
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-70">
          Enter your email on the previous step so we know where to send the reset code.
        </p>
        <Link to="/forgot-password" className="btn-primary mt-8 inline-flex w-full justify-center">
          Forgot password
        </Link>
        <p className="mt-6 text-sm text-ink-70">
          <Link to="/login" className="font-semibold text-deep-coral hover:underline">
            ← Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center">
        <StatusBadge tone="yellow" className="mb-4">
          New password
        </StatusBadge>
        <h1 className="font-display text-display-sm font-extrabold tracking-tight text-aubergine">
          Choose a new password
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-70">
          Your reset {linkToken ? 'link' : 'code'} is valid for {expiresIn} minutes. Pick something
          strong you have not used here before.
        </p>
      </div>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
        {alert ? (
          <FormAlert
            tone={alert.tone}
            title={alert.title}
            message={alert.message}
            onDismiss={() => setAlert(null)}
          />
        ) : null}
        {state?.devOtp ? (
          <FormAlert tone="info" message={`Development mode: your code is ${state.devOtp}`} />
        ) : null}

        {!linkToken ? (
          <>
            <LockedEmail email={email} />

            <div>
              <span className="mb-2.5 block text-center text-sm font-semibold text-aubergine">
                Reset code
              </span>
              <OtpInput
                value={otp}
                onChange={setOtp}
                length={OTP_LENGTH}
                autoFocus
              />
            </div>
          </>
        ) : null}

        <FieldShell label="New password" error={fieldErrors.password}>
          <PasswordInput
            name="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            showRequirements
            required
          />
        </FieldShell>

        <FieldShell label="Confirm password" error={fieldErrors.confirmPassword}>
          <PasswordInput
            name="confirmPassword"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(e) => update('confirmPassword', e.target.value)}
            required
          />
        </FieldShell>

        <SubmitButton isLoading={isLoading} loadingLabel="Updating…">
          Update password
        </SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-ink-70">
        Need a new code?{' '}
        <Link to="/forgot-password" className="font-semibold text-deep-coral hover:underline">
          Start over
        </Link>
        {' · '}
        <Link to="/login" className="font-semibold text-deep-coral hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
