import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { Stepper } from '@/components/ui/app/Stepper';
import { FieldShell, TextInput, TextSelect, TextTextarea } from '@/components/ui/app/FormField';
import { Reveal } from '@/components/ui/Reveal';

const steps = [
  { label: 'Files', description: 'Upload geometry' },
  { label: 'Core metadata', description: 'Title & summary' },
  { label: 'Type fields', description: 'Organ & material' },
  { label: 'License', description: 'Reuse terms' },
  { label: 'ISO check', description: '22916 compliance' },
  { label: 'Review', description: 'Publish' },
];

type FormState = {
  files: string;
  title: string;
  summary: string;
  organ: string;
  material: string;
  licence: string;
  iso22916: boolean;
  componentType: string;
};

const initialForm: FormState = {
  files: '',
  title: '',
  summary: '',
  organ: '',
  material: '',
  licence: 'CC BY 4.0',
  iso22916: false,
  componentType: '',
};

export default function UploadWizardPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function next() {
    setStep((s) => Math.min(s + 1, steps.length - 1));
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function publish() {
    navigate('/my-designs');
  }

  return (
    <div className="container-content max-w-3xl space-y-8">
      <PageHeader
        eyebrow="SCR-021 · Upload wizard"
        title="Upload a design"
        lede="Add your organ-on-chip geometry with metadata, licence and ISO 22916 declarations."
      />

      <Reveal delay={0.05}>
        <Stepper steps={steps} current={step} />
      </Reveal>

      <Reveal delay={0.08}>
        <div className="card p-5 sm:p-8">
        {step === 0 && (
          <div className="space-y-6">
            <h2 className="font-display text-lg font-bold text-aubergine">Design files</h2>
            <div className="rounded-field border-2 border-dashed border-line-strong bg-periwinkle-tint/20 px-6 py-12 text-center">
              <p className="font-display text-base font-bold text-aubergine">Drop files here</p>
              <p className="mt-2 text-sm text-ink-70">STL, STEP, PDF, or ZIP — up to 500 MB</p>
              <label className="btn-ghost mt-6 inline-flex cursor-pointer">
                Choose files
                <input
                  type="file"
                  className="sr-only"
                  multiple
                  onChange={(e) => update('files', e.target.files?.length ? `${e.target.files.length} file(s) selected` : '')}
                />
              </label>
            </div>
            {form.files ? (
              <p className="text-sm font-semibold text-green">✓ {form.files}</p>
            ) : null}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <h2 className="font-display text-lg font-bold text-aubergine">Core metadata</h2>
            <FieldShell label="Title" hint="Clear, descriptive name for the library">
              <TextInput
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                placeholder="e.g. Alveolar barrier · dual channel"
              />
            </FieldShell>
            <FieldShell label="Summary" hint="One or two sentences for browse cards">
              <TextTextarea
                value={form.summary}
                onChange={(e) => update('summary', e.target.value)}
                placeholder="What does this design do and who is it for?"
              />
            </FieldShell>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="font-display text-lg font-bold text-aubergine">Type fields</h2>
            <FieldShell label="Organ">
              <TextSelect value={form.organ} onChange={(e) => update('organ', e.target.value)}>
                <option value="">Select organ</option>
                {['Lung', 'Liver', 'Gut', 'Kidney', 'Heart', 'Skin'].map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </TextSelect>
            </FieldShell>
            <FieldShell label="Material">
              <TextSelect value={form.material} onChange={(e) => update('material', e.target.value)}>
                <option value="">Select material</option>
                {['PDMS', 'COC', 'PMMA', 'Glass', 'Other'].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </TextSelect>
            </FieldShell>
            <FieldShell label="Component type" hint="ISO 22916 vocabulary">
              <TextInput
                value={form.componentType}
                onChange={(e) => update('componentType', e.target.value)}
                placeholder="e.g. Barrier chip, Perfusion cassette"
              />
            </FieldShell>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="font-display text-lg font-bold text-aubergine">Licence</h2>
            <FieldShell label="Choose a licence" hint="Determines how others may reuse your work">
              <TextSelect value={form.licence} onChange={(e) => update('licence', e.target.value)}>
                {['CC BY 4.0', 'CC BY-SA 4.0', 'MIT', 'GPL-3.0', 'Custom'].map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </TextSelect>
            </FieldShell>
            <p className="text-sm leading-relaxed text-ink-70">
              Open licences keep provenance intact. You can change the licence when publishing a new major version.
            </p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <h2 className="font-display text-lg font-bold text-aubergine">ISO 22916 check</h2>
            <label className="flex cursor-pointer items-start gap-3 rounded-field border border-line p-4">
              <input
                type="checkbox"
                checked={form.iso22916}
                onChange={(e) => update('iso22916', e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-coral"
              />
              <span>
                <span className="block text-sm font-semibold text-aubergine">
                  This design aligns with ISO 22916 component metadata
                </span>
                <span className="mt-1 block text-sm text-ink-70">
                  I have declared organ, material, component type and key operating parameters using the shared
                  MPS vocabulary.
                </span>
              </span>
            </label>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <h2 className="font-display text-lg font-bold text-aubergine">Review & publish</h2>
            <dl className="divide-y divide-line rounded-field border border-line">
              {[
                ['Files', form.files || 'None selected'],
                ['Title', form.title || '—'],
                ['Summary', form.summary || '—'],
                ['Organ', form.organ || '—'],
                ['Material', form.material || '—'],
                ['Licence', form.licence],
                ['ISO 22916', form.iso22916 ? 'Declared compliant' : 'Not declared'],
              ].map(([k, v]) => (
                <div key={k} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:justify-between">
                  <dt className="text-sm text-ink-55">{k}</dt>
                  <dd className="text-sm font-semibold text-aubergine sm:text-right">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="text-sm text-ink-70">
              Publishing sends your design to review. You'll be notified when it's live in the library.
            </p>
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
          <div>
            {step > 0 ? (
              <button type="button" onClick={back} className="btn-ghost">
                Back
              </button>
            ) : (
              <Link to="/my-designs" className="btn-ghost">
                Cancel
              </Link>
            )}
          </div>
          <div className="flex gap-3">
            {step < steps.length - 1 ? (
              <button type="button" onClick={next} className="btn-primary">
                Next
              </button>
            ) : (
              <button type="button" onClick={publish} className="btn-primary">
                Publish
              </button>
            )}
          </div>
        </div>
        </div>
      </Reveal>

      <Reveal delay={0.12}>
        <p className="text-center text-xs text-ink-55">
        Need help?{' '}
        <Link to="/how-it-works" className="font-semibold text-deep-coral hover:underline">
          Read the upload guide
        </Link>
        </p>
      </Reveal>
    </div>
  );
}
