import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { FieldShell, TextInput } from '@/components/ui/app/FormField';
import { PasswordInput } from '@/components/ui/app/PasswordInput';
import { FormAlert, SubmitButton } from '@/components/ui/app/FormAlert';
import { LoadingState } from '@/components/ui/app/LoadingState';
import { Reveal } from '@/components/ui/Reveal';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { authApi } from '@/lib/api/auth';
import { userApi } from '@/lib/api/users';
import type { UserSettings } from '@/lib/api/users';
import { describeError } from '@/lib/api/errors';

/** The preference toggles, so the markup stays a loop rather than three copies. */
const PREFERENCES: Array<{ key: keyof UserSettings; label: string; hint: string }> = [
  {
    key: 'emailNotifications',
    label: 'Email notifications',
    hint: 'Master switch — turn this off to stop all notification emails',
  },
  {
    key: 'notifyDesignComments',
    label: 'Comments on my designs',
    hint: 'When someone comments on one of your uploads',
  },
  { key: 'notifyForumReplies', label: 'Forum replies', hint: 'When someone replies to a thread you follow' },
  { key: 'notifyMentions', label: 'Mentions', hint: 'When someone @mentions you in the forum' },
  { key: 'notifyMessages', label: 'Direct messages', hint: 'When another member messages you' },
  { key: 'notifyNewsletter', label: 'Platform news', hint: 'Occasional announcements. No sponsors, no spam' },
  { key: 'profilePublic', label: 'Public profile', hint: 'Let anyone view your profile page at /u/your.handle' },
  { key: 'showEmail', label: 'Show email on profile', hint: 'Display your address to signed-in members' },
];

type Alert = { title?: string; message: string; tone: 'error' | 'warning' | 'success' } | null;

/** SCR-015 — Account settings (CHIP-004). */
export default function AccountSettingsPage() {
  const { user, logout, isLoading: isSessionLoading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // ── Password ───────────────────────────────────────────────────────────
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [passwordAlert, setPasswordAlert] = useState<Alert>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // ── Preferences ────────────────────────────────────────────────────────
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // ── Deletion ───────────────────────────────────────────────────────────
  const [showDelete, setShowDelete] = useState(false);
  const [deleteForm, setDeleteForm] = useState({ password: '', confirm: '', reason: '' });
  const [deleteAlert, setDeleteAlert] = useState<Alert>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    userApi
      .settings()
      .then((loaded) => {
        if (!cancelled) setSettings(loaded);
      })
      .catch(() => {
        // Preferences failing to load should not block the password form.
        if (!cancelled) setSettings(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handlePasswordSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordAlert(null);
    setPasswordErrors({});

    if (passwords.next !== passwords.confirm) {
      setPasswordErrors({ confirm: 'Passwords do not match' });
      return;
    }

    setIsChangingPassword(true);
    try {
      await authApi.changePassword(passwords.current, passwords.next, passwords.confirm);
      setPasswords({ current: '', next: '', confirm: '' });
      setPasswordAlert({
        tone: 'success',
        title: 'Password updated',
        message: 'Every other session has been signed out. This device stays signed in.',
      });
      toast.success('Password updated', 'Use your new password next time you sign in.');
    } catch (err) {
      const described = describeError(err);
      setPasswordErrors(described.fieldErrors);
      setPasswordAlert({
        title: described.title,
        message: described.message,
        tone: described.tone === 'info' ? 'warning' : described.tone,
      });
    } finally {
      setIsChangingPassword(false);
    }
  }

  /**
   * Saves immediately on toggle, rolling back if the request fails.
   *
   * Confirmed inline rather than with a toast: there are eight switches here and
   * a notification per flick would be noise. Failures still raise a toast,
   * because a silent rollback would look like the toggle simply did not work.
   */
  async function togglePreference(key: keyof UserSettings, value: boolean) {
    if (!settings) return;
    const previous = settings;
    setSettings({ ...settings, [key]: value });
    setIsSavingSettings(true);
    setJustSaved(false);

    try {
      setSettings(await userApi.updateSettings({ [key]: value }));
      setJustSaved(true);
    } catch (err) {
      setSettings(previous);
      toast.fromError(err);
    } finally {
      setIsSavingSettings(false);
    }
  }

  // Clear the "Saved" tick a couple of seconds after it appears.
  useEffect(() => {
    if (!justSaved) return;
    const timer = setTimeout(() => setJustSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [justSaved]);

  async function handleDelete(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setDeleteAlert(null);

    if (deleteForm.confirm !== 'DELETE') {
      setDeleteAlert({ tone: 'warning', message: 'Type DELETE to confirm.' });
      return;
    }

    setIsDeleting(true);
    try {
      await userApi.deleteAccount(deleteForm.password, deleteForm.reason || undefined);
      await logout();
      toast.info('Account removed', 'Your personal data has been deleted.');
      navigate('/', { replace: true });
    } catch (err) {
      const described = describeError(err);
      setDeleteAlert({
        title: described.title,
        message: described.message,
        tone: described.tone === 'info' ? 'warning' : described.tone,
      });
    } finally {
      setIsDeleting(false);
    }
  }

  if (isSessionLoading || !user) {
    return (
      <div className="container-content pb-16 sm:pb-24">
        <LoadingState label="Loading your account…" />
      </div>
    );
  }

  return (
    <div className="container-content pb-16 sm:pb-24">
      <PageHeader
        eyebrow="Settings"
        title="Account"
        lede="Password, notifications and account management."
        actions={
          <Link to="/settings/profile" className="btn-ghost text-sm">
            Edit profile
          </Link>
        }
      />

      <Reveal delay={0.06} className="mt-10 max-w-xl space-y-12 sm:mt-12">
        {/* ── Identity ─────────────────────────────────────────────────── */}
        <section>
          <h2 className="font-display text-lg font-bold text-aubergine">Sign-in details</h2>
          <dl className="mt-4 divide-y divide-line rounded-field border border-line">
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <dt className="text-sm text-muted">Email</dt>
              <dd className="text-sm font-semibold text-aubergine">{user.email}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <dt className="text-sm text-muted">Status</dt>
              <dd className="text-sm font-semibold text-aubergine">
                {user.emailVerified ? 'Verified' : 'Awaiting verification'}
              </dd>
            </div>
          </dl>
          {!user.emailVerified ? (
            <p className="mt-3 text-sm text-muted">
              <Link
                to="/verify-email"
                state={{ email: user.email }}
                className="font-semibold text-deep-coral hover:underline"
              >
                Confirm your email
              </Link>{' '}
              to unlock uploading and posting.
            </p>
          ) : null}
        </section>

        {/* ── Password ─────────────────────────────────────────────────── */}
        <section className="border-t border-line pt-10">
          <h2 className="font-display text-lg font-bold text-aubergine">Change password</h2>
          <form className="mt-4 space-y-4" onSubmit={handlePasswordSubmit} noValidate>
            {passwordAlert ? (
              <FormAlert
                tone={passwordAlert.tone}
                title={passwordAlert.title}
                message={passwordAlert.message}
                onDismiss={() => setPasswordAlert(null)}
              />
            ) : null}

            <FieldShell label="Current password" error={passwordErrors.currentPassword}>
              <PasswordInput
                name="currentPassword"
                autoComplete="current-password"
                value={passwords.current}
                onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
                required
              />
            </FieldShell>

            <FieldShell label="New password" error={passwordErrors.newPassword}>
              <PasswordInput
                name="newPassword"
                autoComplete="new-password"
                value={passwords.next}
                onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))}
                showRequirements
                required
              />
            </FieldShell>

            <FieldShell label="Confirm new password" error={passwordErrors.confirm}>
              <PasswordInput
                name="confirmPassword"
                autoComplete="new-password"
                value={passwords.confirm}
                onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                required
              />
            </FieldShell>

            <SubmitButton isLoading={isChangingPassword} loadingLabel="Updating…" className="w-auto">
              Update password
            </SubmitButton>
          </form>
        </section>

        {/* ── Notifications ────────────────────────────────────────────── */}
        <section className="border-t border-line pt-10">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-lg font-bold text-aubergine">Notifications &amp; privacy</h2>
            <span className="text-xs" aria-live="polite">
              {isSavingSettings ? (
                <span className="text-muted">Saving…</span>
              ) : justSaved ? (
                <span className="inline-flex items-center gap-1 align-middle font-medium text-green">
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden>
                    <path
                      d="m4.5 10.4 3.2 3.1 7.8-8"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Saved
                </span>
              ) : null}
            </span>
          </div>

          {!settings ? (
            <LoadingState label="Loading preferences…" className="min-h-[20vh]" />
          ) : (
            <div className="mt-4 space-y-3">
              {PREFERENCES.map((preference) => (
                <label
                  key={preference.key}
                  className="flex cursor-pointer items-start gap-3 rounded-field border border-line px-4 py-3"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 accent-coral"
                    checked={Boolean(settings[preference.key])}
                    onChange={(e) => void togglePreference(preference.key, e.target.checked)}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-aubergine">{preference.label}</span>
                    <span className="block text-xs text-muted">{preference.hint}</span>
                  </span>
                </label>
              ))}
              <p className="text-xs text-muted">Changes save as you toggle them.</p>
            </div>
          )}
        </section>

        {/* ── Deletion ─────────────────────────────────────────────────── */}
        <section className="border-t border-line pt-10">
          <h2 className="font-display text-lg font-bold text-deep-coral">Delete account</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Permanently remove your account and personal data. Published designs stay in the library with your
            identifiers removed, so citations in other people&rsquo;s work keep resolving.
          </p>

          {!showDelete ? (
            <button
              type="button"
              onClick={() => setShowDelete(true)}
              className="btn-ghost mt-4 !border-deep-coral !text-deep-coral"
            >
              Delete my account
            </button>
          ) : (
            <form className="mt-4 space-y-4" onSubmit={handleDelete} noValidate>
              {deleteAlert ? (
                <FormAlert
                  tone={deleteAlert.tone}
                  title={deleteAlert.title}
                  message={deleteAlert.message}
                  onDismiss={() => setDeleteAlert(null)}
                />
              ) : null}

              <FieldShell label="Your password">
                <PasswordInput
                  autoComplete="current-password"
                  value={deleteForm.password}
                  onChange={(e) => setDeleteForm((f) => ({ ...f, password: e.target.value }))}
                  required
                />
              </FieldShell>

              <FieldShell label="Reason" hint="Optional — helps us improve">
                <TextInput
                  type="text"
                  value={deleteForm.reason}
                  onChange={(e) => setDeleteForm((f) => ({ ...f, reason: e.target.value }))}
                />
              </FieldShell>

              <FieldShell label="Type DELETE to confirm">
                <TextInput
                  type="text"
                  placeholder="DELETE"
                  value={deleteForm.confirm}
                  onChange={(e) => setDeleteForm((f) => ({ ...f, confirm: e.target.value }))}
                  required
                />
              </FieldShell>

              <div className="flex flex-wrap gap-3">
                <SubmitButton
                  isLoading={isDeleting}
                  loadingLabel="Deleting…"
                  className="w-auto !bg-deep-coral !text-canvas"
                >
                  Permanently delete
                </SubmitButton>
                <button type="button" onClick={() => setShowDelete(false)} className="btn-ghost">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>
      </Reveal>
    </div>
  );
}
