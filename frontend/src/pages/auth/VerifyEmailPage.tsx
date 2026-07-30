import { FormEvent, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { FormAlert, SubmitButton } from '@/components/ui/app/FormAlert';
import { LockedEmail } from '@/components/ui/app/LockedEmail';
import { OtpInput } from '@/components/ui/app/OtpInput';
import { authApi } from '@/lib/api/auth';
import { describeError } from '@/lib/api/errors';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';

const OTP_LENGTH = 6;

type LocationState = { email?: string; devOtp?: string; reason?: string } | null;

/** SCR-013 — Verify email (CHIP-001). Accepts the emailed code or a magic link. */
export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, refresh } = useAuth();

  const state = location.state as LocationState;
  const linkToken = searchParams.get('token');

  // Carried from register / login — never editable on this screen.
  const email = (state?.email ?? user?.email ?? '').trim();

  const [otp, setOtp] = useState('');
  const toast = useToast();
  const [status, setStatus] = useState<'idle' | 'verifying' | 'verified'>('idle');
  const [alert, setAlert] = useState<{ title?: string; message: string; tone: 'error' | 'warning' } | null>(null);
  const [notice, setNotice] = useState<string | null>(
    state?.devOtp ? `Development mode: your code is ${state.devOtp}` : null,
  );
  const [isResending, setIsResending] = useState(false);

  const submitOtp = async (code: string) => {
    if (!email) {
      setAlert({
        tone: 'warning',
        message: 'We do not know which email to verify. Start again from registration.',
      });
      return;
    }
    setAlert(null);
    setStatus('verifying');
    try {
      await authApi.verifyEmail({ email, otp: code });
      setStatus('verified');
      await refresh();
      toast.success('Welcome to Chipper', 'Your account is ready — start exploring designs.');
      setTimeout(() => navigate('/designs', { replace: true }), 1200);
    } catch (err) {
      const described = describeError(err);
      setStatus('idle');
      setOtp('');
      setAlert({
        title: described.title,
        message: described.message,
        tone: described.tone === 'info' ? 'warning' : described.tone,
      });
      if (described.retryable) toast.fromError(err);
    }
  };

  useEffect(() => {
    if (!linkToken) return;
    let cancelled = false;

    (async () => {
      setStatus('verifying');
      try {
        await authApi.verifyEmail({ token: linkToken });
        if (cancelled) return;
        setStatus('verified');
        await refresh();
        setTimeout(() => navigate('/designs', { replace: true }), 1200);
      } catch (err) {
        if (cancelled) return;
        const described = describeError(err);
        setStatus('idle');
        setAlert({
          title: described.title,
          message: `${described.message} Request a new code below.`,
          tone: 'warning',
        });
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkToken]);

  async function handleResend() {
    if (!email) {
      setAlert({
        tone: 'warning',
        message: 'We do not know which email to resend to. Start again from registration.',
      });
      return;
    }
    setAlert(null);
    setNotice(null);
    setIsResending(true);
    try {
      const result = await authApi.resendVerification(email);
      toast.success('Code sent', `Check ${email} for a fresh verification code.`);
      setNotice(
        result.devOtp
          ? `Development mode: your new code is ${result.devOtp}`
          : 'If that address still needs confirming, a new code is on its way.',
      );
      setOtp('');
    } catch (err) {
      const described = describeError(err);
      setAlert({
        title: described.title,
        message: described.message,
        tone: described.tone === 'info' ? 'warning' : described.tone,
      });
      if (described.retryable) toast.fromError(err);
    } finally {
      setIsResending(false);
    }
  }

  if (status === 'verified') {
    return (
      <div className="text-center">
        <StatusBadge tone="green" className="mb-4">
          Verified
        </StatusBadge>
        <h1 className="font-display text-display-sm font-extrabold tracking-tight text-aubergine">
          Your email is confirmed
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-70">
          Your account is active and you are signed in. Taking you to the designs…
        </p>
      </div>
    );
  }

  if (!email && !linkToken) {
    return (
      <div className="text-center">
        <StatusBadge tone="yellow" className="mb-4">
          Verification
        </StatusBadge>
        <h1 className="font-display text-display-sm font-extrabold tracking-tight text-aubergine">
          Start from registration
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-70">
          We need the email you signed up with before we can send a code.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Link to="/register" className="btn-primary w-full justify-center">
            Create an account
          </Link>
          <Link to="/login" className="btn-ghost w-full justify-center">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center">
        <StatusBadge tone="yellow" className="mb-4">
          Pending verification
        </StatusBadge>
        <h1 className="font-display text-display-sm font-extrabold tracking-tight text-aubergine">
          Enter your code
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-70">
          {state?.reason === 'unverified'
            ? 'Confirm your email to unlock uploading and posting.'
            : `We sent a ${OTP_LENGTH}-digit code. Enter it below to finish creating your account.`}
        </p>
      </div>

      <form
        className="mt-8 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          void submitOtp(otp);
        }}
        noValidate
      >
        {alert ? (
          <FormAlert
            tone={alert.tone}
            title={alert.title}
            message={alert.message}
            onDismiss={() => setAlert(null)}
          />
        ) : null}
        {notice ? <FormAlert tone="info" message={notice} onDismiss={() => setNotice(null)} /> : null}

        {email ? <LockedEmail email={email} /> : null}

        <div>
          <span className="mb-2.5 block text-center text-sm font-semibold text-aubergine">
            Verification code
          </span>
          <OtpInput
            value={otp}
            onChange={setOtp}
            length={OTP_LENGTH}
            disabled={status === 'verifying'}
            autoFocus={!linkToken}
            onComplete={(code) => void submitOtp(code)}
          />
        </div>

        <SubmitButton
          isLoading={status === 'verifying'}
          loadingLabel="Verifying…"
          disabled={otp.length !== OTP_LENGTH}
        >
          Verify email
        </SubmitButton>
      </form>

      <div className="mt-8 rounded-[16px] border border-line bg-canvas px-5 py-5 text-center sm:rounded-card">
        <p className="text-xs font-semibold uppercase tracking-eyebrow text-ink-55">Did not get it?</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-70">
          Check spam, or send a fresh code. Codes expire after 48 hours and work once.
        </p>
        <button
          type="button"
          onClick={() => void handleResend()}
          className="btn-ghost mt-4 w-full"
          disabled={isResending || !email}
        >
          {isResending ? 'Sending…' : 'Send a new code'}
        </button>
      </div>

      <p className="mt-6 text-center text-sm text-ink-70">
        Wrong address?{' '}
        <Link to="/register" className="font-semibold text-deep-coral hover:underline">
          Register again
        </Link>
        {' · '}
        <Link to="/login" className="font-semibold text-deep-coral hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
