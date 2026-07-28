import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FieldShell, TextInput, TextSelect } from '@/components/ui/app/FormField';
import { PasswordInput } from '@/components/ui/app/PasswordInput';
import { FormAlert, SubmitButton } from '@/components/ui/app/FormAlert';
import { Reveal } from '@/components/ui/Reveal';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { describeError } from '@/lib/api/errors';

const ACCOUNT_TYPES = [
  { value: 'academic', label: 'Researcher / academic' },
  { value: 'student', label: 'Student' },
  { value: 'industry', label: 'Industry' },
  { value: 'other', label: 'Other' },
] as const;

/** SCR-009 — Register (CHIP-001). */
export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    affiliation: '',
    accountType: 'academic' as (typeof ACCOUNT_TYPES)[number]['value'],
    password: '',
    confirmPassword: '',
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [newsletter, setNewsletter] = useState(false);
  const toast = useToast();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<{ title?: string; message: string; tone: 'error' | 'warning' } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
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
    if (!acceptTerms) {
      setAlert({
        tone: 'warning',
        message: 'Please accept the terms and privacy policy to continue.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await register({
        name: form.name,
        email: form.email,
        password: form.password,
        confirmPassword: form.confirmPassword,
        affiliation: form.affiliation || undefined,
        accountType: form.accountType,
        newsletter,
        acceptTerms: true,
      });

      if (result.requiresVerification) {
        toast.success('Account created', `We sent a verification code to ${form.email}.`);
        // Carry the address and (in development) the code straight to SCR-013.
        navigate('/verify-email', {
          replace: true,
          state: { email: form.email, devOtp: result.verification?.devOtp },
        });
        return;
      }
      toast.success('Welcome to Chipper', 'Your account is ready — start exploring designs.');
      navigate('/designs', { replace: true });
    } catch (err) {
      const described = describeError(err);
      setFieldErrors(described.fieldErrors);
      setAlert({
        title: described.title,
        message: described.message,
        tone: described.tone === 'info' ? 'warning' : described.tone,
      });
      if (described.action || described.retryable) toast.fromError(err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <Reveal>
        <p className="eyebrow text-deep-coral">Get started</p>
        <h1 className="mt-2 font-display text-display-sm font-extrabold tracking-tight text-aubergine">
          Create your account
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-70">
          Join the Playground to upload designs, download files and participate in the forum.
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

          <FieldShell label="Full name" error={fieldErrors.name}>
            <TextInput
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Dr. M. van der Berg"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              required
            />
          </FieldShell>

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

          <FieldShell label="Affiliation" hint="University, institute or company" error={fieldErrors.affiliation}>
            <TextInput
              name="affiliation"
              type="text"
              placeholder="University of Twente"
              value={form.affiliation}
              onChange={(e) => update('affiliation', e.target.value)}
            />
          </FieldShell>

          <FieldShell label="Account type" error={fieldErrors.accountType}>
            <TextSelect
              name="accountType"
              value={form.accountType}
              onChange={(e) => update('accountType', e.target.value as typeof form.accountType)}
              required
            >
              {ACCOUNT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </TextSelect>
          </FieldShell>

          <FieldShell label="Password" error={fieldErrors.password}>
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

          <label className="flex cursor-pointer items-start gap-3 text-sm text-ink-70">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-coral"
              required
            />
            <span>
              I agree to the{' '}
              <Link to="/terms" className="font-semibold text-deep-coral hover:underline">
                Terms
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="font-semibold text-deep-coral hover:underline">
                Privacy policy
              </Link>
              .
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 text-sm text-ink-70">
            <input
              type="checkbox"
              checked={newsletter}
              onChange={(e) => setNewsletter(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-coral"
            />
            <span>Send me occasional platform news. No sponsors, no spam.</span>
          </label>

          <SubmitButton isLoading={isLoading} loadingLabel="Creating account…">
            Create account
          </SubmitButton>
        </form>
      </Reveal>

      <Reveal delay={0.15}>
        <p className="mt-6 text-center text-sm text-ink-70">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-deep-coral hover:underline">
            Sign in
          </Link>
        </p>
      </Reveal>
    </div>
  );
}
