import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { FieldShell, TextInput, TextSelect, TextTextarea } from '@/components/ui/app/FormField';
import { FormAlert } from '@/components/ui/app/FormAlert';
import { ErrorState, LoadingState } from '@/components/ui/app/LoadingState';
import { Reveal } from '@/components/ui/Reveal';
import { useApiResource } from '@/hooks/useApiResource';
import { useToast } from '@/app/providers/ToastProvider';
import { designApi, taxonomyApi } from '@/lib/api/designs';
import type { DesignDetail, DesignUpdatePayload, Taxonomies } from '@/lib/api/designs';
import { ApiError } from '@/lib/api/client';

/**
 * SCR-023 — edit metadata.
 *
 * Editing a published design creates a new draft version server-side, so the
 * live one keeps its downloads and numbers; editing a draft edits it in place.
 * The banner tells the user which of the two is about to happen.
 */
export default function EditDesignPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const design = useApiResource<DesignDetail>(() => designApi.detail(id), [id], {
    enabled: Boolean(id),
  });
  const taxonomies = useApiResource<Taxonomies>(() => taxonomyApi.all(), []);

  const [form, setForm] = useState({
    title: '',
    summary: '',
    description: '',
    componentType: '',
    resourceType: '',
    material: '',
    fabricationMethod: '',
    license: '',
    howToCite: '',
    clipString: '',
    keywords: '',
    versionNote: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /** Seeds the form once, so typing is not overwritten by a background reload. */
  const seeded = useRef(false);

  useEffect(() => {
    const data = design.data;
    if (!data || seeded.current) return;
    seeded.current = true;

    const version = data.currentVersion;
    setForm({
      title: data.title ?? '',
      summary: data.summary ?? '',
      description: version?.description ?? '',
      componentType: data.componentType?.slug ?? '',
      resourceType: data.resourceType?.slug ?? '',
      material: version?.testedMaterial?.slug ?? '',
      fabricationMethod: version?.testedFabricationMethod?.slug ?? '',
      license: version?.license?.code ?? '',
      howToCite: version?.howToCite ?? '',
      clipString: version?.howToUse.clipString ?? '',
      keywords: data.tags.join(', '),
      versionNote: '',
    });
  }, [design.data]);

  const isPublished = design.data?.status === 'published';

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: '' } : e));
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!form.title.trim()) next.title = 'Give the design a name';
    if (!form.summary.trim()) next.summary = 'A summary is required';
    else if (form.summary.trim().length < 10) next.summary = 'A summary needs at least 10 characters';
    if (!form.description.trim()) next.description = 'A description is required';
    else if (form.description.trim().length < 20) {
      next.description = 'A description needs at least 20 characters';
    }
    if (!form.componentType) next.componentType = 'Choose a component type';
    if (!form.resourceType) next.resourceType = 'Choose a resource type';
    if (!form.material) next.material = 'Choose the tested material';
    if (!form.fabricationMethod) next.fabricationMethod = 'Choose the tested fabrication method';
    if (!form.license) next.license = 'Choose a licence';
    return next;
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();

    const found = validate();
    if (Object.keys(found).length) {
      setErrors(found);
      setSaveError('Some required details are still missing.');
      return;
    }

    setSaving(true);
    setSaveError(null);

    const payload: DesignUpdatePayload = {
      title: form.title.trim(),
      summary: form.summary.trim(),
      description: form.description.trim(),
      componentType: form.componentType,
      resourceType: form.resourceType,
      testedMaterial: form.material,
      testedFabricationMethod: form.fabricationMethod,
      license: form.license,
      howToCite: form.howToCite.trim() || null,
      clipString: form.clipString.trim() || null,
      tags: form.keywords
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 20),
      versionNote: form.versionNote.trim() || null,
    };

    try {
      await designApi.update(id, payload);
      toast.success('Saved', isPublished ? 'A new draft version was created.' : 'Your changes are saved.');
      navigate('/my-designs');
    } catch (error) {
      if (error instanceof ApiError) {
        const fieldErrors = error.fieldErrors;
        if (Object.keys(fieldErrors).length) setErrors(fieldErrors);
        setSaveError(error.message);
      } else {
        setSaveError('Something went wrong. Please try again.');
      }
      toast.fromError(error);
    } finally {
      setSaving(false);
    }
  }

  const data = design.data;
  const options = taxonomies.data;

  const licenseOptions = useMemo(() => options?.licenses ?? [], [options]);

  if (design.isLoading || taxonomies.isLoading) return <LoadingState label="Loading design…" />;

  if (design.error) {
    const notFound = design.error instanceof Object && 'retryable' in design.error;
    return (
      <div className="container-content">
        {notFound ? (
          <ErrorState error={design.error} onRetry={design.reload} />
        ) : (
          <EmptyState
            title="Design not found"
            body="You can only edit designs you own."
            actionLabel="My designs"
            actionTo="/my-designs"
          />
        )}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container-content">
        <EmptyState
          title="Design not found"
          body="You can only edit designs you own."
          actionLabel="My designs"
          actionTo="/my-designs"
        />
      </div>
    );
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
        lede={`Update version-tracked metadata for "${data.title}".`}
        actions={
          <StatusBadge tone={data.status === 'published' ? 'green' : 'ink'}>{data.status}</StatusBadge>
        }
      />

      {isPublished ? (
        <Reveal delay={0.04}>
          <FormAlert
            tone="info"
            title="This design is live"
            message="Saving creates a new draft version. The published version keeps its files and download count until you publish the new one."
          />
        </Reveal>
      ) : null}

      {saveError ? (
        <Reveal delay={0.05}>
          <FormAlert
            tone="error"
            title="Could not save"
            message={saveError}
            onDismiss={() => setSaveError(null)}
          />
        </Reveal>
      ) : null}

      <Reveal delay={0.08}>
        <form onSubmit={handleSave} className="card space-y-5 p-5 sm:p-8" noValidate>
          <FieldShell label="Name *" error={errors.title}>
            <TextInput value={form.title} onChange={(e) => update('title', e.target.value)} />
          </FieldShell>

          <FieldShell label="Summary *" error={errors.summary}>
            <TextTextarea value={form.summary} onChange={(e) => update('summary', e.target.value)} />
          </FieldShell>

          <FieldShell label="Description *" error={errors.description}>
            <TextTextarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              className="min-h-[100px]"
            />
          </FieldShell>

          <div className="grid gap-5 sm:grid-cols-2">
            <FieldShell label="Component type *" error={errors.componentType}>
              <TextSelect
                value={form.componentType}
                onChange={(e) => update('componentType', e.target.value)}
              >
                <option value="">Select type</option>
                {(options?.componentTypes ?? []).map((c) => (
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
                <option value="">Select type</option>
                {(options?.resourceTypes ?? []).map((r) => (
                  <option key={r.slug} value={r.slug}>
                    {r.name}
                  </option>
                ))}
              </TextSelect>
            </FieldShell>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <FieldShell label="Tested material *" error={errors.material}>
              <TextSelect value={form.material} onChange={(e) => update('material', e.target.value)}>
                <option value="">Select material</option>
                {(options?.materials ?? []).map((m) => (
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
                {(options?.fabricationMethods ?? []).map((m) => (
                  <option key={m.slug} value={m.slug}>
                    {m.name}
                  </option>
                ))}
              </TextSelect>
            </FieldShell>
          </div>

          <FieldShell label="Licence *" error={errors.license}>
            <TextSelect value={form.license} onChange={(e) => update('license', e.target.value)}>
              <option value="">Select licence</option>
              {licenseOptions.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name} ({l.code})
                </option>
              ))}
            </TextSelect>
          </FieldShell>

          <FieldShell label="CLIP-string">
            <TextInput value={form.clipString} onChange={(e) => update('clipString', e.target.value)} />
          </FieldShell>

          <FieldShell label="How to cite">
            <TextTextarea
              value={form.howToCite}
              onChange={(e) => update('howToCite', e.target.value)}
              className="min-h-[80px]"
            />
          </FieldShell>

          <FieldShell label="Keywords" hint="Comma-separated">
            <TextInput value={form.keywords} onChange={(e) => update('keywords', e.target.value)} />
          </FieldShell>

          <FieldShell
            label="Version note"
            hint="Describe what changed — shown in version history when you publish"
          >
            <TextTextarea
              value={form.versionNote}
              onChange={(e) => update('versionNote', e.target.value)}
              placeholder="e.g. Fixed inlet port spacing, updated assembly PDF"
              className="min-h-[80px]"
            />
          </FieldShell>

          <div className="flex flex-wrap gap-3 border-t border-line pt-6">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <Link to="/my-designs" className="btn-ghost">
              Cancel
            </Link>
          </div>
        </form>
      </Reveal>
    </div>
  );
}
