import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { FieldShell, TextInput } from '@/components/ui/app/FormField';
import { PasswordInput } from '@/components/ui/app/PasswordInput';
import { FormAlert, SubmitButton } from '@/components/ui/app/FormAlert';
import { OtpInput } from '@/components/ui/app/OtpInput';
import { Reveal } from '@/components/ui/Reveal';
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

  const [email, setEmail] = useState(state?.email ?? '');
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
      // Clear a rejected code so the next attempt starts from an empty field.
      if (described.fieldErrors.otp || described.title.includes('code')) setOtp('');
      if (described.retryable || described.action) toast.fromError(err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <Reveal>
        <p className="eyebrow text-deep-coral">New password</p>
        <h1 className="mt-2 font-display text-display-sm font-extrabold tracking-tight text-aubergine">
          Choose a new password
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-70">
          Your reset {linkToken ? 'link' : 'code'} is valid for {expiresIn} minutes. Choose a strong password you
          have not used here before.
        </p>
      </Reveal>

      <Reveal delay={0.1}>
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

          {/* A magic-link visit already carries the credential in the URL. */}
          {!linkToken ? (
            <>
              <FieldShell label="Email">
                <TextInput
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@university.nl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </FieldShell>

              <div>
                <span className="mb-1.5 block text-sm font-semibold text-aubergine">Reset code</span>
                <OtpInput value={otp} onChange={setOtp} length={OTP_LENGTH} autoFocus={Boolean(email)} />
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
      </Reveal>

      <Reveal delay={0.15}>
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
      </Reveal>
    </div>
  );
}
