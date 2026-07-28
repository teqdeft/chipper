import { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { FieldShell, TextInput } from '@/components/ui/app/FormField';
import { Reveal } from '@/components/ui/Reveal';

/** SCR-015 — Account settings. */
export default function AccountSettingsPage() {
  function handlePasswordSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
  }

  function handleNotificationsSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
        <section>
          <h2 className="font-display text-lg font-bold text-aubergine">Change password</h2>
          <form className="mt-4 space-y-4" onSubmit={handlePasswordSubmit} noValidate>
            <FieldShell label="Current password">
              <TextInput name="currentPassword" type="password" autoComplete="current-password" required />
            </FieldShell>
            <FieldShell label="New password">
              <TextInput name="newPassword" type="password" autoComplete="new-password" required />
            </FieldShell>
            <FieldShell label="Confirm new password">
              <TextInput name="confirmPassword" type="password" autoComplete="new-password" required />
            </FieldShell>
            <button type="submit" className="btn-primary">
              Update password
            </button>
          </form>
        </section>

        <section className="border-t border-line pt-10">
          <h2 className="font-display text-lg font-bold text-aubergine">Notifications</h2>
          <form className="mt-4 space-y-3" onSubmit={handleNotificationsSubmit}>
            <label className="flex cursor-pointer items-start gap-3 rounded-field border border-line px-4 py-3">
              <input type="checkbox" name="emailComments" defaultChecked className="mt-0.5 accent-coral" />
              <span>
                <span className="block text-sm font-semibold text-aubergine">Comments on my designs</span>
                <span className="block text-xs text-ink-55">Email when someone comments on your uploads</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-field border border-line px-4 py-3">
              <input type="checkbox" name="emailForum" defaultChecked className="mt-0.5 accent-coral" />
              <span>
                <span className="block text-sm font-semibold text-aubergine">Forum replies</span>
                <span className="block text-xs text-ink-55">Email when someone replies to your threads</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-field border border-line px-4 py-3">
              <input type="checkbox" name="emailDigest" className="mt-0.5 accent-coral" />
              <span>
                <span className="block text-sm font-semibold text-aubergine">Weekly digest</span>
                <span className="block text-xs text-ink-55">Summary of new designs in organs you follow</span>
              </span>
            </label>
            <button type="submit" className="btn-ghost mt-2">
              Save preferences
            </button>
          </form>
        </section>

        <section className="border-t border-line pt-10">
          <h2 className="font-display text-lg font-bold text-deep-coral">Delete account</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-70">
            Permanently remove your account and personal data. Published designs may remain archived for citation
            integrity with identifiers removed.
          </p>
          <button type="button" className="btn-ghost mt-4 !border-deep-coral !text-deep-coral">
            Delete my account
          </button>
        </section>
      </Reveal>
    </div>
  );
}
