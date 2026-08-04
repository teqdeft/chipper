import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FieldShell, TextInput } from '@/components/ui/app/FormField';
import { FormAlert, SubmitButton } from '@/components/ui/app/FormAlert';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { Reveal } from '@/components/ui/Reveal';
import { authApi } from '@/lib/api/auth';
import { useToast } from '@/app/providers/ToastProvider';
import { describeError } from '@/lib/api/errors';

/** SCR-011 — Forgot password (CHIP-003). */
export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [alert, setAlert] = useState<{ title?: string; message: string; tone: 'error' | 'warning' } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAlert(null);
    setIsLoading(true);

    try {
      const result = await authApi.forgotPassword(email);
      toast.success('Check your inbox', `If an account exists for ${email}, a reset code is on its way.`);
      // The API deliberately answers the same way for unknown addresses, so the
      // next screen simply asks for the code rather than confirming the account.
      navigate('/reset-password', {
        state: { email, devOtp: result.devOtp, expiresInMinutes: result.expiresInMinutes },
      });
    } catch (err) {
      const described = describeError(err);
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
    <div>
      <PageHeader
        eyebrow="Account recovery"
        title="Reset your password"
        lede="Enter the email associated with your account and we will send a reset code."
      />

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

          <SubmitButton isLoading={isLoading} loadingLabel="Sending…">
            Send reset code
          </SubmitButton>
        </form>
      </Reveal>

      <Reveal delay={0.15}>
        <p className="mt-6 text-center text-sm text-muted">
          <Link to="/login" className="font-semibold text-deep-coral hover:underline">
            ← Back to sign in
          </Link>
        </p>
      </Reveal>
    </div>
  );
}
