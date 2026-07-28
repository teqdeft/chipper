import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { FieldShell, TextInput, TextSelect, TextTextarea } from '@/components/ui/app/FormField';
import { FormAlert, SubmitButton } from '@/components/ui/app/FormAlert';
import { LoadingState } from '@/components/ui/app/LoadingState';
import { Reveal } from '@/components/ui/Reveal';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { userApi } from '@/lib/api/users';
import { describeError } from '@/lib/api/errors';

const ACCOUNT_TYPES = [
  { value: 'academic', label: 'Researcher / academic' },
  { value: 'student', label: 'Student' },
  { value: 'industry', label: 'Industry' },
  { value: 'other', label: 'Other' },
] as const;

type FormState = {
  name: string;
  handle: string;
  affiliation: string;
  accountType: string;
  country: string;
  website: string;
  orcid: string;
  bio: string;
  expertise: string;
};

const EMPTY: FormState = {
  name: '',
  handle: '',
  affiliation: '',
  accountType: '',
  country: '',
  website: '',
  orcid: '',
  bio: '',
  expertise: '',
};

/** SCR-014 — Profile edit (CHIP-004). Always shows the signed-in user's own data. */
export default function ProfileEditPage() {
  const { user, setUser, isLoading: isSessionLoading } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<{ title?: string; message: string; tone: 'error' | 'warning' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Seed the form from the session, and re-seed whenever the user object changes
  // (after a save, or once hydration finishes on a hard refresh).
  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name ?? '',
      handle: user.handle ?? '',
      affiliation: user.affiliation ?? '',
      accountType: user.accountType ?? '',
      country: user.country ?? '',
      website: user.website ?? '',
      orcid: user.orcid ?? '',
      bio: user.bio ?? '',
      expertise: (user.expertise ?? []).join(', '),
    });
  }, [user]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((e) => ({ ...e, [key]: '' }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAlert(null);
    setFieldErrors({});
    setIsSaving(true);

    try {
      const updated = await userApi.updateMe({
        name: form.name,
        handle: form.handle,
        // Empty strings clear the field; undefined would leave it untouched.
        affiliation: form.affiliation || null,
        accountType: (form.accountType || null) as never,
        country: form.country || null,
        website: form.website || null,
        orcid: form.orcid || null,
        bio: form.bio || null,
        expertise: form.expertise
          .split(',')
          .map((term) => term.trim())
          .filter(Boolean),
      });

      setUser(updated);
      toast.success('Profile saved', 'Your public profile is up to date.');
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
      setIsSaving(false);
    }
  }

  async function handleAvatar(file: File | undefined) {
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      setUser(await userApi.uploadAvatar(file));
      toast.success('Profile picture updated');
    } catch (err) {
      toast.fromError(err);
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function handleRemoveAvatar() {
    setIsUploadingAvatar(true);
    try {
      setUser(await userApi.removeAvatar());
      toast.success('Profile picture removed');
    } catch (err) {
      toast.fromError(err);
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  // The route guard already blocks guests; this only covers the moment between
  // mount and hydration finishing.
  if (isSessionLoading || !user) {
    return (
      <div className="container-content pb-16 sm:pb-24">
        <LoadingState label="Loading your profile…" />
      </div>
    );
  }

  return (
    <div className="container-content pb-16 sm:pb-24 sm:pt-28 pt-24">
      <PageHeader
        eyebrow="Settings"
        title="Edit profile"
        lede="How you appear to the community. Your handle is used in URLs and citations."
        actions={
          <Link to={`/u/${user.handle}`} className="btn-ghost text-sm">
            View public profile
          </Link>
        }
      />

      <Reveal delay={0.08}>
        <div className="mt-10 max-w-xl sm:mt-12">
          <div className="flex items-center gap-4 border-b border-line pb-6">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-periwinkle-tint font-display text-lg font-bold text-aubergine ring-1 ring-line">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                user.name.slice(0, 1).toUpperCase()
              )}
            </span>
            <div className="flex flex-wrap gap-2">
              <label className="btn-ghost cursor-pointer text-sm">
                {isUploadingAvatar ? 'Uploading…' : 'Change picture'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  disabled={isUploadingAvatar}
                  onChange={(e) => void handleAvatar(e.target.files?.[0])}
                />
              </label>
              {user.avatarUrl ? (
                <button
                  type="button"
                  onClick={() => void handleRemoveAvatar()}
                  disabled={isUploadingAvatar}
                  className="btn-ghost text-sm"
                >
                  Remove
                </button>
              ) : null}
            </div>
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

            <FieldShell label="Display name" error={fieldErrors.name}>
              <TextInput
                name="name"
                type="text"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                required
              />
            </FieldShell>

            <FieldShell
              label="Handle"
              hint={`Used in your profile URL — /u/${form.handle || 'your.handle'}`}
              error={fieldErrors.handle}
            >
              <TextInput
                name="handle"
                type="text"
                value={form.handle}
                onChange={(e) => update('handle', e.target.value.toLowerCase())}
                required
              />
            </FieldShell>

            <FieldShell label="Affiliation" error={fieldErrors.affiliation}>
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
                onChange={(e) => update('accountType', e.target.value)}
              >
                <option value="">Not specified</option>
                {ACCOUNT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </TextSelect>
            </FieldShell>

            <FieldShell label="Country" error={fieldErrors.country}>
              <TextInput
                name="country"
                type="text"
                value={form.country}
                onChange={(e) => update('country', e.target.value)}
              />
            </FieldShell>

            <FieldShell label="Website" error={fieldErrors.website}>
              <TextInput
                name="website"
                type="url"
                placeholder="https://yourlab.org"
                value={form.website}
                onChange={(e) => update('website', e.target.value)}
              />
            </FieldShell>

            <FieldShell label="ORCID" hint="e.g. 0000-0002-1825-0097" error={fieldErrors.orcid}>
              <TextInput
                name="orcid"
                type="text"
                placeholder="0000-0002-1825-0097"
                value={form.orcid}
                onChange={(e) => update('orcid', e.target.value)}
              />
            </FieldShell>

            <FieldShell label="Bio" error={fieldErrors.bio}>
              <TextTextarea
                name="bio"
                rows={4}
                value={form.bio}
                onChange={(e) => update('bio', e.target.value)}
              />
            </FieldShell>

            <FieldShell label="Expertise" hint="Comma-separated tags" error={fieldErrors.expertise}>
              <TextInput
                name="expertise"
                type="text"
                placeholder="Lung, PDMS, Soft lithography"
                value={form.expertise}
                onChange={(e) => update('expertise', e.target.value)}
              />
            </FieldShell>

            <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
              <SubmitButton isLoading={isSaving} loadingLabel="Saving…" className="w-auto">
                Save changes
              </SubmitButton>
              <Link to="/settings/account" className="btn-ghost">
                Account settings
              </Link>
            </div>
          </form>
        </div>
      </Reveal>
    </div>
  );
}
