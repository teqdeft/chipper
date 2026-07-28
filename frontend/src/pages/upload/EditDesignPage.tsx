import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { FieldShell, TextInput, TextSelect, TextTextarea } from '@/components/ui/app/FormField';
import { Reveal } from '@/components/ui/Reveal';
import { mockDesigns } from '@/lib/mock';

function statusTone(status: (typeof mockDesigns)[number]['status']) {
  if (status === 'published') return 'green' as const;
  if (status === 'pending') return 'yellow' as const;
  return 'ink' as const;
}

export default function EditDesignPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const design = mockDesigns.find((d) => d.id === id);

  const [title, setTitle] = useState(design?.title ?? '');
  const [summary, setSummary] = useState(design?.summary ?? '');
  const [organ, setOrgan] = useState(design?.organ ?? '');
  const [material, setMaterial] = useState(design?.material ?? '');
  const [licence, setLicence] = useState(design?.licence ?? 'CC BY 4.0');
  const [versionNote, setVersionNote] = useState('');
  const [saved, setSaved] = useState(false);

  if (!design) {
    return (
      <div className="container-content">
        <Reveal>
          <EmptyState
            title="Design not found"
            body="You can only edit designs you own."
            actionLabel="My designs"
            actionTo="/my-designs"
          />
        </Reveal>
      </div>
    );
  }

  function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaved(true);
    navigate('/my-designs');
  }

  return (
    <div className="container-content max-w-2xl space-y-8">
      <Reveal>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link to="/my-designs" className="font-medium text-ink-70 hover:text-deep-coral">
            ← My designs
          </Link>
        </div>
      </Reveal>

      <PageHeader
        eyebrow="SCR-023 · Edit design"
        title="Edit design"
        lede={`Update metadata for "${design.title}". Changes apply to the current version unless you publish a new one.`}
        actions={<StatusBadge tone={statusTone(design.status)}>{design.status}</StatusBadge>}
      />

      <Reveal delay={0.08}>
        <form onSubmit={handleSave} className="card space-y-5 p-5 sm:p-8">
        <FieldShell label="Title">
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} required />
        </FieldShell>

        <FieldShell label="Summary">
          <TextTextarea value={summary} onChange={(e) => setSummary(e.target.value)} required />
        </FieldShell>

        <div className="grid gap-5 sm:grid-cols-2">
          <FieldShell label="Organ">
            <TextSelect value={organ} onChange={(e) => setOrgan(e.target.value)}>
              {['Lung', 'Liver', 'Gut', 'Kidney', 'Heart', 'Skin'].map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </TextSelect>
          </FieldShell>

          <FieldShell label="Material">
            <TextSelect value={material} onChange={(e) => setMaterial(e.target.value)}>
              {['PDMS', 'COC', 'PMMA', 'Glass', 'Other'].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </TextSelect>
          </FieldShell>
        </div>

        <FieldShell label="Licence">
          <TextSelect value={licence} onChange={(e) => setLicence(e.target.value)}>
            {['CC BY 4.0', 'CC BY-SA 4.0', 'MIT', 'GPL-3.0'].map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </TextSelect>
        </FieldShell>

        <FieldShell
          label="Version note"
          hint="Describe what changed — shown in version history when you publish"
        >
          <TextTextarea
            value={versionNote}
            onChange={(e) => setVersionNote(e.target.value)}
            placeholder="e.g. Fixed inlet port spacing, updated assembly PDF"
            className="min-h-[80px]"
          />
        </FieldShell>

        <div className="flex flex-wrap gap-3 border-t border-line pt-6">
          <button type="submit" className="btn-primary">
            Save changes
          </button>
          <Link to="/my-designs" className="btn-ghost">
            Cancel
          </Link>
        </div>

        {saved ? <p className="text-sm text-green">Saving…</p> : null}
        </form>
      </Reveal>
    </div>
  );
}
