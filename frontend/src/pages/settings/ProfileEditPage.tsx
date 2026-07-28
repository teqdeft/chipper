import { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { FieldShell, TextInput, TextTextarea } from '@/components/ui/app/FormField';
import { Reveal } from '@/components/ui/Reveal';
import { mockUsers } from '@/lib/mock';

const user = mockUsers[0];

/** SCR-014 — Profile edit. */
export default function ProfileEditPage() {
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
  }

  return (
    <div className="container-content pt-24 sm:pt-28 pb-16 sm:pb-24">
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
        <form className="mt-10 max-w-xl space-y-5 sm:mt-12" onSubmit={handleSubmit} noValidate>
        <FieldShell label="Display name">
          <TextInput name="name" type="text" defaultValue={user.name} required />
        </FieldShell>

        <FieldShell label="Handle" hint="Used in your profile URL — e.g. /u/m.vanderberg">
          <TextInput name="handle" type="text" defaultValue={user.handle} required />
        </FieldShell>

        <FieldShell label="Affiliation">
          <TextInput name="affiliation" type="text" defaultValue={user.affiliation} required />
        </FieldShell>

        <FieldShell label="Bio">
          <TextTextarea name="bio" defaultValue={user.bio} rows={4} />
        </FieldShell>

        <FieldShell label="Expertise" hint="Comma-separated tags">
          <TextInput name="expertise" type="text" defaultValue={user.expertise.join(', ')} />
        </FieldShell>

        <div className="flex flex-wrap gap-3 border-t border-line pt-6">
          <button type="submit" className="btn-primary">
            Save changes
          </button>
          <Link to="/settings/account" className="btn-ghost">
            Account settings
          </Link>
        </div>
        </form>
      </Reveal>
    </div>
  );
}
