import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { Stepper } from '@/components/ui/app/Stepper';
import { FieldShell, TextInput, TextSelect, TextTextarea } from '@/components/ui/app/FormField';
import { FormAlert } from '@/components/ui/app/FormAlert';
import { ErrorState, LoadingState } from '@/components/ui/app/LoadingState';
import { Reveal } from '@/components/ui/Reveal';
import { useApiResource } from '@/hooks/useApiResource';
import { useToast } from '@/app/providers/ToastProvider';
import { designApi, taxonomyApi } from '@/lib/api/designs';
import type { ComponentType, ComponentTypeField, DesignPayload, Taxonomies } from '@/lib/api/designs';
import { ApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils';

/**
 * SCR-021 — upload wizard.
 *
 * Three server calls, in order: create the draft, attach the files, then submit
 * it for review. The draft is created once and its slug kept, so a failure at
 * the file or publish step is resumable rather than producing a second design.
 *
 * Every option list and every component-type-dependent field comes from
 * `/taxonomies`, which is also what the API validates against — so the form can
 * never offer a value the backend would reject.
 */

const steps = [
  { label: 'Files', description: 'Upload geometry' },
  { label: 'Core', description: 'Name & description' },
  { label: 'Classification', description: 'Type & publish as' },
  { label: 'Type fields', description: 'Component specs' },
  { label: 'How to use', description: 'ISO operating data' },
  { label: 'Credits & cite', description: 'Licence & people' },
  { label: 'Review', description: 'Publish' },
];

const MAX_FILE_BYTES = 500 * 1024 * 1024;

type FormState = {
  title: string;
  summary: string;
  description: string;
  keywords: string;
  componentType: string;
  resourceType: string;
  publishAs: 'person' | 'institute' | 'person_from_institute';
  instituteName: string;
  organs: string[];
  material: string;
  fabricationMethod: string;
  /** Component-type-dependent values, keyed by the taxonomy's field key. */
  typeSpecific: Record<string, string>;
  clipString: string;
  maxHeightMm: string;
  clampingZoneHeightMm: string;
  exclusionZones: string;
  clampingStrategy: string;
  temperatureMin: string;
  temperatureMax: string;
  pressureMin: string;
  pressureMax: string;
  flowMin: string;
  flowMax: string;
  iso22916: boolean;
  creditsNote: string;
  creditName: string;
  creditAffiliation: string;
  creditRole: string;
  license: string;
  customLicenseText: string;
  howToCite: string;
  publishedWorkTitle: string;
  publishedWorkAuthors: string;
  publishedWorkDoi: string;
  relatedDocTitle: string;
  relatedDocType: string;
  relatedDocUrl: string;
  versionNote: string;
};

const initialForm: FormState = {
  title: '',
  summary: '',
  description: '',
  keywords: '',
  componentType: '',
  resourceType: '',
  publishAs: 'person',
  instituteName: '',
  organs: [],
  material: '',
  fabricationMethod: '',
  typeSpecific: {},
  clipString: '',
  maxHeightMm: '',
  clampingZoneHeightMm: '',
  exclusionZones: '',
  clampingStrategy: '',
  temperatureMin: '',
  temperatureMax: '',
  pressureMin: '',
  pressureMax: '',
  flowMin: '',
  flowMax: '',
  iso22916: false,
  creditsNote: '',
  creditName: '',
  creditAffiliation: '',
  creditRole: '',
  license: '',
  customLicenseText: '',
  howToCite: '',
  publishedWorkTitle: '',
  publishedWorkAuthors: '',
  publishedWorkDoi: '',
  relatedDocTitle: '',
  relatedDocType: '',
  relatedDocUrl: '',
  versionNote: '',
};

type Errors = Partial<Record<string, string>>;

const numberOrNull = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Per-step required fields, mirroring the API's create validator.
 *
 * Validating here keeps the user from reaching step 7 before learning that a
 * licence was never chosen; the server still enforces the same set, so this is
 * a courtesy, not the guarantee.
 */
function validateStep(step: number, form: FormState, files: File[], fields: ComponentTypeField[]): Errors {
  const errors: Errors = {};
  const required = (key: keyof FormState, message: string) => {
    if (!String(form[key] ?? '').trim()) errors[key] = message;
  };

  if (step === 0 && files.length === 0) {
    errors.files = 'Upload at least one file — a design without geometry cannot be published';
  }

  if (step === 1) {
    required('title', 'Give the design a name');
    if (form.title.trim() && form.title.trim().length < 3) errors.title = 'Use at least 3 characters';
    required('summary', 'Write a short summary — it is what people read on browse cards');
    if (form.summary.trim() && form.summary.trim().length < 10) {
      errors.summary = 'A summary needs at least 10 characters';
    }
    required('description', 'Describe the design');
    if (form.description.trim() && form.description.trim().length < 20) {
      errors.description = 'A description needs at least 20 characters';
    }
  }

  if (step === 2) {
    required('componentType', 'Choose a component type');
    required('resourceType', 'Choose a resource type');
    required('material', 'Choose the tested material');
    required('fabricationMethod', 'Choose the tested fabrication method');
    if (form.publishAs !== 'person' && !form.instituteName.trim()) {
      errors.instituteName = 'Name the institute you are publishing under';
    }
    if (form.componentType === 'organ-chip' && form.organs.length === 0) {
      errors.organs = 'Select at least one tested organ';
    }
  }

  if (step === 3) {
    for (const field of fields) {
      const value = form.typeSpecific[field.key];
      if (field.required && !String(value ?? '').trim()) {
        errors[`typeSpecific.${field.key}`] = `${field.label} is required`;
        continue;
      }
      if (!String(value ?? '').trim()) continue;

      if (field.dataType === 'number') {
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) {
          errors[`typeSpecific.${field.key}`] = `${field.label} must be a number`;
        } else if (field.min !== null && parsed < field.min) {
          errors[`typeSpecific.${field.key}`] = `${field.label} must be at least ${field.min}`;
        } else if (field.max !== null && parsed > field.max) {
          errors[`typeSpecific.${field.key}`] = `${field.label} must be at most ${field.max}`;
        }
      }

      if (field.dataType === 'range') {
        const [min, max] = String(value).split(/[-–]/).map((part) => Number(part.trim()));
        if (!Number.isFinite(min) || !Number.isFinite(max)) {
          errors[`typeSpecific.${field.key}`] = `${field.label} must be a range, e.g. 0.5–12`;
        } else if (min > max) {
          errors[`typeSpecific.${field.key}`] = `${field.label}: minimum cannot exceed maximum`;
        }
      }
    }
  }

  if (step === 5) {
    required('license', 'Choose a licence');
    if (form.license.toLowerCase() === 'custom' && !form.customLicenseText.trim()) {
      errors.customLicenseText = 'Custom licences need their terms written out';
    }
  }

  return errors;
}

/** Only the steps that actually gate progress are re-checked before publish. */
const VALIDATED_STEPS = [0, 1, 2, 3, 5];

export default function UploadWizardPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Survives a partial failure: once the draft exists, retrying the publish
   * must not create a second design.
   */
  const draftRef = useRef<{ slug: string; filesUploaded: boolean } | null>(null);

  const taxonomies = useApiResource<Taxonomies>(() => taxonomyApi.all(), []);

  // Defaults are applied once the vocabularies land, so the selects are never
  // empty and the first option is always a valid slug.
  useEffect(() => {
    const data = taxonomies.data;
    if (!data) return;
    setForm((f) => ({
      ...f,
      componentType: f.componentType || data.componentTypes[0]?.slug || '',
      resourceType: f.resourceType || data.resourceTypes[0]?.slug || '',
      license: f.license || data.licenses[0]?.code || '',
    }));
  }, [taxonomies.data]);

  const componentType: ComponentType | undefined = useMemo(
    () => taxonomies.data?.componentTypes.find((c) => c.slug === form.componentType),
    [taxonomies.data, form.componentType],
  );

  const typeFields = componentType?.fields ?? [];

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  }

  function updateTypeSpecific(key: string, value: string) {
    setForm((f) => ({ ...f, typeSpecific: { ...f.typeSpecific, [key]: value } }));
    setErrors((e) => (e[`typeSpecific.${key}`] ? { ...e, [`typeSpecific.${key}`]: undefined } : e));
  }

  function toggleOrgan(organ: string) {
    setForm((f) => ({
      ...f,
      organs: f.organs.includes(organ) ? f.organs.filter((o) => o !== organ) : [...f.organs, organ],
    }));
    setErrors((e) => (e.organs ? { ...e, organs: undefined } : e));
  }

  const addFiles = useCallback(
    (incoming: FileList | null) => {
      if (!incoming?.length) return;
      const accepted: File[] = [];
      const rejected: string[] = [];

      for (const file of Array.from(incoming)) {
        if (file.size > MAX_FILE_BYTES) {
          rejected.push(`${file.name} is larger than 500 MB`);
          continue;
        }
        accepted.push(file);
      }

      if (rejected.length) toast.warning('Some files were skipped', rejected.join(', '));
      if (accepted.length) {
        // Same name twice would collide server-side; keep the first.
        setFiles((current) => {
          const seen = new Set(current.map((f) => f.name.toLowerCase()));
          return [...current, ...accepted.filter((f) => !seen.has(f.name.toLowerCase()))];
        });
        setErrors((e) => ({ ...e, files: undefined }));
      }
    },
    [toast],
  );

  function removeFile(name: string) {
    setFiles((current) => current.filter((f) => f.name !== name));
  }

  function next() {
    const stepErrors = validateStep(step, form, files, typeFields);
    if (Object.keys(stepErrors).length) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    setStep((s) => Math.min(s + 1, steps.length - 1));
  }

  function back() {
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
  }

  /** Turns the flat form into the API's nested payload. */
  function buildPayload(): DesignPayload {
    const typeSpecific: Record<string, unknown> = {};
    for (const field of typeFields) {
      const raw = form.typeSpecific[field.key];
      if (raw === undefined || raw === '') continue;
      if (field.dataType === 'number') typeSpecific[field.key] = Number(raw);
      else if (field.dataType === 'boolean') typeSpecific[field.key] = raw === 'true';
      else if (field.dataType === 'range') {
        const [min, max] = String(raw).split(/[-–]/).map((part) => Number(part.trim()));
        typeSpecific[field.key] = { min, max };
      } else typeSpecific[field.key] = raw;
    }

    const range = (min: string, max: string, unit: string) => {
      const parsedMin = numberOrNull(min);
      const parsedMax = numberOrNull(max);
      if (parsedMin === null && parsedMax === null) return undefined;
      return { min: parsedMin, max: parsedMax, unit };
    };

    return {
      title: form.title.trim(),
      summary: form.summary.trim(),
      description: form.description.trim(),
      componentType: form.componentType,
      resourceType: form.resourceType,
      publishAs: form.publishAs,
      instituteName: form.publishAs === 'person' ? null : form.instituteName.trim(),
      organs: form.organs,
      testedMaterial: form.material,
      testedFabricationMethod: form.fabricationMethod,
      license: form.license,
      customLicenseText: form.license.toLowerCase() === 'custom' ? form.customLicenseText.trim() : null,
      howToCite: form.howToCite.trim() || null,
      creditsNote: form.creditsNote.trim() || null,
      clipString: form.clipString.trim() || null,
      maxHeightMm: numberOrNull(form.maxHeightMm),
      clampingZoneHeightMm: numberOrNull(form.clampingZoneHeightMm),
      exclusionZones: form.exclusionZones.trim() || null,
      clampingStrategy: form.clampingStrategy.trim() || null,
      operatingParameters: {
        temperature: range(form.temperatureMin, form.temperatureMax, '°C'),
        pressure: range(form.pressureMin, form.pressureMax, 'kPa'),
        flowRate: range(form.flowMin, form.flowMax, 'µL/min'),
      },
      iso22916: form.iso22916,
      typeSpecific,
      tags: form.keywords
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 20),
      credits: form.creditName.trim()
        ? [
            {
              name: form.creditName.trim(),
              affiliation: form.creditAffiliation.trim() || null,
              role: form.creditRole.trim() || null,
            },
          ]
        : undefined,
      publishedWorks: form.publishedWorkTitle.trim()
        ? [
            {
              title: form.publishedWorkTitle.trim(),
              authors: form.publishedWorkAuthors.trim() || null,
              doi: form.publishedWorkDoi.trim() || null,
            },
          ]
        : undefined,
      relatedDocuments: form.relatedDocTitle.trim()
        ? [
            {
              title: form.relatedDocTitle.trim(),
              documentType: form.relatedDocType.trim() || null,
              url: form.relatedDocUrl.trim() || null,
            },
          ]
        : undefined,
      versionNote: form.versionNote.trim() || null,
    };
  }

  /** Maps the API's field paths back onto the step that owns them. */
  function stepForField(field: string): number {
    if (field === 'files') return 0;
    if (['title', 'summary', 'description', 'tags'].includes(field)) return 1;
    if (
      ['componentType', 'resourceType', 'publishAs', 'instituteName', 'organs', 'testedMaterial', 'testedFabricationMethod'].includes(
        field,
      )
    ) {
      return 2;
    }
    if (field.startsWith('typeSpecific')) return 3;
    if (['license', 'customLicenseText', 'howToCite', 'creditsNote'].includes(field)) return 5;
    return 6;
  }

  async function publish() {
    // Re-run every gating step: a user can reach Review by editing state and
    // stepping back, and the last step has no validation of its own.
    for (const gated of VALIDATED_STEPS) {
      const stepErrors = validateStep(gated, form, files, typeFields);
      if (Object.keys(stepErrors).length) {
        setErrors(stepErrors);
        setStep(gated);
        setSubmitError('Some required details are still missing.');
        return;
      }
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      // 1 — the draft. Skipped on a retry so a second design is never created.
      if (!draftRef.current) {
        const created = await designApi.create(buildPayload());
        draftRef.current = { slug: created.slug, filesUploaded: false };
      }

      const draft = draftRef.current;

      // 2 — the files, under the names the user gave them.
      if (!draft.filesUploaded) {
        await designApi.addFiles(draft.slug, files, { primaryIndex: 0 });
        draft.filesUploaded = true;
      }

      // 3 — submit for review (or publish outright, if the account may).
      const result = await designApi.publish(draft.slug);

      toast.success(
        result.requiresReview ? 'Sent for review' : 'Design published',
        result.message,
      );
      navigate('/my-designs');
    } catch (error) {
      if (error instanceof ApiError) {
        const fieldErrors = error.fieldErrors;
        if (Object.keys(fieldErrors).length) {
          setErrors(fieldErrors);
          const first = Object.keys(fieldErrors)[0];
          setStep(stepForField(first));
        }
        setSubmitError(error.message);
      } else {
        setSubmitError('Something went wrong. Please try again.');
      }
      toast.fromError(error);
    } finally {
      setSubmitting(false);
    }
  }

  if (taxonomies.isLoading) return <LoadingState label="Loading the upload form…" />;

  if (taxonomies.error) {
    return (
      <div className="container-content">
        <ErrorState error={taxonomies.error} onRetry={taxonomies.reload} />
      </div>
    );
  }

  const data = taxonomies.data;
  const organs = data?.organs ?? [];
  const workingPrinciples = componentType?.workingPrinciples ?? [];
  const modelTypes = data?.modelTypes ?? [];

  /** Renders one component-type-dependent field from its taxonomy definition. */
  function renderTypeField(field: ComponentTypeField) {
    const value = form.typeSpecific[field.key] ?? '';
    const error = errors[`typeSpecific.${field.key}`];
    const label = `${field.label}${field.unit ? ` (${field.unit})` : ''}${field.required ? ' *' : ''}`;

    // `options.source` points at another taxonomy list rather than inlining values.
    if (field.dataType === 'select') {
      const source = field.options?.source;
      const choices =
        source === 'model_types'
          ? modelTypes.map((m) => ({ value: m.name, label: m.name }))
          : source === 'working_principles'
            ? workingPrinciples.map((p) => ({ value: p.name, label: p.name }))
            : (field.options?.values ?? []).map((v) => ({ value: v, label: v }));

      return (
        <FieldShell key={field.key} label={label} hint={field.hint ?? undefined} error={error}>
          <TextSelect value={value} onChange={(e) => updateTypeSpecific(field.key, e.target.value)}>
            <option value="">Select {field.label.toLowerCase()}</option>
            {choices.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </TextSelect>
        </FieldShell>
      );
    }

    if (field.dataType === 'text') {
      return (
        <FieldShell key={field.key} label={label} hint={field.hint ?? undefined} error={error}>
          <TextTextarea
            value={value}
            onChange={(e) => updateTypeSpecific(field.key, e.target.value)}
            className="min-h-[72px]"
          />
        </FieldShell>
      );
    }

    if (field.dataType === 'boolean') {
      return (
        <FieldShell key={field.key} label={label} hint={field.hint ?? undefined} error={error}>
          <TextSelect value={value} onChange={(e) => updateTypeSpecific(field.key, e.target.value)}>
            <option value="">Not declared</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </TextSelect>
        </FieldShell>
      );
    }

    return (
      <FieldShell
        key={field.key}
        label={label}
        hint={field.hint ?? (field.dataType === 'range' ? 'A range, e.g. 0.5–12' : undefined)}
        error={error}
      >
        <TextInput
          type={field.dataType === 'number' ? 'number' : 'text'}
          value={value}
          onChange={(e) => updateTypeSpecific(field.key, e.target.value)}
          placeholder={field.dataType === 'range' ? '0.5–12' : undefined}
        />
      </FieldShell>
    );
  }

  return (
    <div className="container-content max-w-3xl space-y-8">
      <PageHeader
        eyebrow="SCR-021 · Upload wizard"
        title="Upload a design"
        lede="Add your geometry with version-tracked metadata, licence, ISO 22916 fields and credits. Fields marked * are required."
      />

      <Reveal delay={0.05}>
        <Stepper steps={steps} current={step} />
      </Reveal>

      {submitError ? (
        <Reveal delay={0.06}>
          <FormAlert
            tone="error"
            title="Could not publish"
            message={submitError}
            details={Object.fromEntries(
              Object.entries(errors).filter(([, value]) => Boolean(value)) as [string, string][],
            )}
            onDismiss={() => setSubmitError(null)}
          />
        </Reveal>
      ) : null}

      <Reveal delay={0.08}>
        <div className="card p-5 sm:p-8">
          {step === 0 && (
            <div className="space-y-6">
              <h2 className="font-display text-lg font-bold text-aubergine">Design files *</h2>
              <p className="text-sm text-ink-70">
                Files are version-tracked with every publish and are stored under the exact names you
                upload them with. STL, STEP, PDF or ZIP — up to 500 MB each.
              </p>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  addFiles(e.dataTransfer.files);
                }}
                className={cn(
                  'rounded-field border-2 border-dashed px-6 py-12 text-center transition-colors',
                  errors.files
                    ? 'border-deep-coral bg-coral/5'
                    : 'border-line-strong bg-periwinkle-tint/20',
                )}
              >
                <p className="font-display text-base font-bold text-aubergine">Drop files here</p>
                <p className="mt-2 text-sm text-ink-70">STL, STEP, PDF, ZIP or images</p>
                <button
                  type="button"
                  className="btn-ghost mt-6 inline-flex"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="sr-only"
                  multiple
                  onChange={(e) => {
                    addFiles(e.target.files);
                    // Reset so re-picking the same file still fires onChange.
                    e.target.value = '';
                  }}
                />
              </div>

              {errors.files ? <p className="text-sm font-medium text-deep-coral">{errors.files}</p> : null}

              {files.length > 0 ? (
                <ul className="divide-y divide-line rounded-field border border-line">
                  {files.map((file, index) => (
                    <li key={file.name} className="flex items-center justify-between gap-4 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-aubergine">{file.name}</p>
                        <p className="text-xs text-ink-55">
                          {formatBytes(file.size)}
                          {index === 0 ? ' · primary file' : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(file.name)}
                        className="shrink-0 text-xs font-semibold text-deep-coral hover:underline"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <h2 className="font-display text-lg font-bold text-aubergine">Core metadata</h2>
              <FieldShell
                label="Name *"
                hint="Clear, descriptive name for the library"
                error={errors.title}
              >
                <TextInput
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                  placeholder="e.g. Lung-on-chip"
                />
              </FieldShell>
              <FieldShell
                label="Summary *"
                hint="One or two sentences for browse cards"
                error={errors.summary}
              >
                <TextTextarea
                  value={form.summary}
                  onChange={(e) => update('summary', e.target.value)}
                  placeholder="What does this design do and who is it for?"
                />
              </FieldShell>
              <FieldShell
                label="Description *"
                hint="Full description shown on the file page"
                error={errors.description}
              >
                <TextTextarea
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  placeholder="Fabrication notes, intended use, dimensions…"
                  className="min-h-[120px]"
                />
              </FieldShell>
              <FieldShell label="Keywords" hint="Comma-separated — facilitate searching">
                <TextInput
                  value={form.keywords}
                  onChange={(e) => update('keywords', e.target.value)}
                  placeholder="barrier, alveolar, soft-lithography"
                />
              </FieldShell>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h2 className="font-display text-lg font-bold text-aubergine">Classification</h2>

              <FieldShell label="Component type *" error={errors.componentType}>
                <TextSelect
                  value={form.componentType}
                  onChange={(e) => {
                    // Type-specific answers belong to the previous type.
                    setForm((f) => ({ ...f, componentType: e.target.value, typeSpecific: {} }));
                    setErrors((err) => ({ ...err, componentType: undefined }));
                  }}
                >
                  {(data?.componentTypes ?? []).map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </TextSelect>
              </FieldShell>

              <FieldShell label="Resource type *" error={errors.resourceType}>
                <TextSelect
                  value={form.resourceType}
                  onChange={(e) => update('resourceType', e.target.value)}
                >
                  {(data?.resourceTypes ?? []).map((r) => (
                    <option key={r.slug} value={r.slug}>
                      {r.name}
                    </option>
                  ))}
                </TextSelect>
              </FieldShell>

              <FieldShell label="Publish as *" error={errors.publishAs}>
                <TextSelect
                  value={form.publishAs}
                  onChange={(e) => update('publishAs', e.target.value as FormState['publishAs'])}
                >
                  {(data?.publishAs ?? []).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </TextSelect>
              </FieldShell>

              {form.publishAs !== 'person' ? (
                <FieldShell label="Institute name *" error={errors.instituteName}>
                  <TextInput
                    value={form.instituteName}
                    onChange={(e) => update('instituteName', e.target.value)}
                    placeholder="e.g. University of Twente"
                  />
                </FieldShell>
              ) : null}

              {form.componentType === 'organ-chip' ? (
                <fieldset>
                  <legend className="mb-2 text-sm font-semibold text-aubergine">Tested organs *</legend>
                  <div className="flex flex-wrap gap-2">
                    {organs.map((organ) => {
                      const active = form.organs.includes(organ.slug);
                      return (
                        <button
                          key={organ.slug}
                          type="button"
                          onClick={() => toggleOrgan(organ.slug)}
                          aria-pressed={active}
                          className={
                            active ? 'pill border-coral bg-coral/15 text-deep-coral' : 'pill text-ink-70'
                          }
                        >
                          {organ.name}
                        </button>
                      );
                    })}
                  </div>
                  {errors.organs ? (
                    <p className="mt-1.5 text-xs font-medium text-deep-coral">{errors.organs}</p>
                  ) : null}
                </fieldset>
              ) : null}

              <FieldShell label="Tested material *" error={errors.material}>
                <TextSelect value={form.material} onChange={(e) => update('material', e.target.value)}>
                  <option value="">Select material</option>
                  {(data?.materials ?? []).map((m) => (
                    <option key={m.slug} value={m.slug}>
                      {m.name}
                    </option>
                  ))}
                </TextSelect>
              </FieldShell>

              <FieldShell label="Tested fabrication method *" error={errors.fabricationMethod}>
                <TextSelect
                  value={form.fabricationMethod}
                  onChange={(e) => update('fabricationMethod', e.target.value)}
                >
                  <option value="">Select method</option>
                  {(data?.fabricationMethods ?? []).map((m) => (
                    <option key={m.slug} value={m.slug}>
                      {m.name}
                    </option>
                  ))}
                </TextSelect>
              </FieldShell>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <h2 className="font-display text-lg font-bold text-aubergine">
                {componentType?.name ?? 'Component'} fields
              </h2>
              <p className="text-sm text-ink-70">
                Specs change per component type — same structure as the file page.
              </p>

              {typeFields.length === 0 ? (
                <p className="text-sm text-ink-55">
                  No extra type-specific fields for this component type.
                </p>
              ) : (
                typeFields.map(renderTypeField)
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <h2 className="font-display text-lg font-bold text-aubergine">How to use this chip</h2>
              <p className="text-sm text-ink-70">
                ISO 22916 operating parameters — CLIP-string, clamping, temp, pressure, flow rate.
                Optional, but they are what makes a design reusable.
              </p>

              <FieldShell label="CLIP-string">
                <TextInput
                  value={form.clipString}
                  onChange={(e) => update('clipString', e.target.value)}
                  placeholder="CHIPPER-…"
                />
              </FieldShell>

              <div className="grid gap-5 sm:grid-cols-2">
                <FieldShell label="Max height (mm)">
                  <TextInput
                    type="number"
                    value={form.maxHeightMm}
                    onChange={(e) => update('maxHeightMm', e.target.value)}
                  />
                </FieldShell>
                <FieldShell label="Clamping zone height (mm)">
                  <TextInput
                    type="number"
                    value={form.clampingZoneHeightMm}
                    onChange={(e) => update('clampingZoneHeightMm', e.target.value)}
                  />
                </FieldShell>
              </div>

              <FieldShell label="Exclusion zones">
                <TextTextarea
                  value={form.exclusionZones}
                  onChange={(e) => update('exclusionZones', e.target.value)}
                  placeholder="Where not to clamp or bond…"
                  className="min-h-[72px]"
                />
              </FieldShell>

              <div className="space-y-4">
                <p className="text-sm font-semibold text-aubergine">Operating parameters</p>
                {[
                  { label: 'Temperature (°C)', min: 'temperatureMin', max: 'temperatureMax' },
                  { label: 'Pressure (kPa)', min: 'pressureMin', max: 'pressureMax' },
                  { label: 'Flow rate (µL/min)', min: 'flowMin', max: 'flowMax' },
                ].map((row) => (
                  <div key={row.label} className="grid gap-3 sm:grid-cols-[1fr_1fr] sm:items-end">
                    <FieldShell label={`${row.label} — min`}>
                      <TextInput
                        type="number"
                        value={form[row.min as keyof FormState] as string}
                        onChange={(e) => update(row.min as keyof FormState, e.target.value as never)}
                      />
                    </FieldShell>
                    <FieldShell label="max">
                      <TextInput
                        type="number"
                        value={form[row.max as keyof FormState] as string}
                        onChange={(e) => update(row.max as keyof FormState, e.target.value as never)}
                      />
                    </FieldShell>
                  </div>
                ))}
              </div>

              <FieldShell label="Clamping strategy">
                <TextTextarea
                  value={form.clampingStrategy}
                  onChange={(e) => update('clampingStrategy', e.target.value)}
                  className="min-h-[72px]"
                />
              </FieldShell>

              <label className="flex cursor-pointer items-start gap-3 rounded-field border border-line p-4">
                <input
                  type="checkbox"
                  checked={form.iso22916}
                  onChange={(e) => update('iso22916', e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-coral"
                />
                <span>
                  <span className="block text-sm font-semibold text-aubergine">
                    This design is ISO 22916 compliant
                  </span>
                  <span className="mt-1 block text-sm text-ink-70">
                    Confirmed before publishing — CLIP-string and clamping zone declared.
                  </span>
                </span>
              </label>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-5">
              <h2 className="font-display text-lg font-bold text-aubergine">Credits, licence &amp; cite</h2>

              <FieldShell label="Licence *" error={errors.license}>
                <TextSelect value={form.license} onChange={(e) => update('license', e.target.value)}>
                  {(data?.licenses ?? []).map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.name} ({l.code})
                    </option>
                  ))}
                </TextSelect>
              </FieldShell>

              {form.license.toLowerCase() === 'custom' ? (
                <FieldShell
                  label="Custom licence terms *"
                  hint="Spell out what a downloader may and may not do"
                  error={errors.customLicenseText}
                >
                  <TextTextarea
                    value={form.customLicenseText}
                    onChange={(e) => update('customLicenseText', e.target.value)}
                    className="min-h-[100px]"
                  />
                </FieldShell>
              ) : null}

              <FieldShell label="Credits" hint="Who should we thank for the existence of this chip?">
                <TextTextarea
                  value={form.creditsNote}
                  onChange={(e) => update('creditsNote', e.target.value)}
                  placeholder="Thanks note for the lab / collaborators"
                  className="min-h-[72px]"
                />
              </FieldShell>

              <div className="grid gap-5 sm:grid-cols-3">
                <FieldShell label="Credit name">
                  <TextInput
                    value={form.creditName}
                    onChange={(e) => update('creditName', e.target.value)}
                  />
                </FieldShell>
                <FieldShell label="Affiliation">
                  <TextInput
                    value={form.creditAffiliation}
                    onChange={(e) => update('creditAffiliation', e.target.value)}
                  />
                </FieldShell>
                <FieldShell label="Role">
                  <TextInput
                    value={form.creditRole}
                    onChange={(e) => update('creditRole', e.target.value)}
                    placeholder="Designer"
                  />
                </FieldShell>
              </div>

              <FieldShell label="How to cite">
                <TextTextarea
                  value={form.howToCite}
                  onChange={(e) => update('howToCite', e.target.value)}
                  placeholder="Author (year). Title (version). Chipper."
                  className="min-h-[72px]"
                />
              </FieldShell>

              <div className="grid gap-5 sm:grid-cols-3">
                <FieldShell label="Published work title" hint="Where this work is cited">
                  <TextInput
                    value={form.publishedWorkTitle}
                    onChange={(e) => update('publishedWorkTitle', e.target.value)}
                  />
                </FieldShell>
                <FieldShell label="Authors">
                  <TextInput
                    value={form.publishedWorkAuthors}
                    onChange={(e) => update('publishedWorkAuthors', e.target.value)}
                  />
                </FieldShell>
                <FieldShell label="DOI">
                  <TextInput
                    value={form.publishedWorkDoi}
                    onChange={(e) => update('publishedWorkDoi', e.target.value)}
                  />
                </FieldShell>
              </div>

              <div className="grid gap-5 sm:grid-cols-3">
                <FieldShell label="Related document" hint="SOPs, CNC programs">
                  <TextInput
                    value={form.relatedDocTitle}
                    onChange={(e) => update('relatedDocTitle', e.target.value)}
                  />
                </FieldShell>
                <FieldShell label="Document type">
                  <TextInput
                    value={form.relatedDocType}
                    onChange={(e) => update('relatedDocType', e.target.value)}
                    placeholder="SOP"
                  />
                </FieldShell>
                <FieldShell label="Link">
                  <TextInput
                    value={form.relatedDocUrl}
                    onChange={(e) => update('relatedDocUrl', e.target.value)}
                    placeholder="https://…"
                  />
                </FieldShell>
              </div>

              <FieldShell label="Version note" hint="What changed — shown in version history">
                <TextInput
                  value={form.versionNote}
                  onChange={(e) => update('versionNote', e.target.value)}
                  placeholder="Initial version"
                />
              </FieldShell>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-6">
              <h2 className="font-display text-lg font-bold text-aubergine">Review &amp; publish</h2>
              <dl className="divide-y divide-line rounded-field border border-line">
                {[
                  ['Files', files.length ? files.map((f) => f.name).join(', ') : 'None selected'],
                  ['Name', form.title || '—'],
                  ['Summary', form.summary || '—'],
                  ['Component type', componentType?.name ?? '—'],
                  [
                    'Resource type',
                    data?.resourceTypes.find((r) => r.slug === form.resourceType)?.name ?? '—',
                  ],
                  [
                    'Publish as',
                    data?.publishAs.find((o) => o.value === form.publishAs)?.label ?? '—',
                  ],
                  ...(form.publishAs !== 'person' ? [['Institute', form.instituteName || '—']] : []),
                  [
                    'Tested organs',
                    form.organs
                      .map((slug) => organs.find((o) => o.slug === slug)?.name ?? slug)
                      .join(', ') || '—',
                  ],
                  [
                    'Tested material',
                    data?.materials.find((m) => m.slug === form.material)?.name ?? '—',
                  ],
                  [
                    'Fabrication',
                    data?.fabricationMethods.find((m) => m.slug === form.fabricationMethod)?.name ?? '—',
                  ],
                  ['CLIP-string', form.clipString || '—'],
                  ['Licence', form.license || '—'],
                  ['ISO 22916', form.iso22916 ? 'Confirmed' : 'Not declared'],
                  ['Keywords', form.keywords || '—'],
                ].map(([key, value]) => (
                  <div key={key} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:justify-between">
                    <dt className="text-sm text-ink-55">{key}</dt>
                    <dd className="text-sm font-semibold text-aubergine sm:text-right">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-sm text-ink-70">
                Publishing sends your design to review. Metadata stays version-tracked, and your files
                keep the names you uploaded them with.
              </p>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
            <div>
              {step > 0 ? (
                <button type="button" onClick={back} className="btn-ghost" disabled={submitting}>
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
                <button type="button" onClick={publish} className="btn-primary" disabled={submitting}>
                  {submitting ? 'Publishing…' : 'Publish'}
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
