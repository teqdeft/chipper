import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { FieldShell, TextInput, TextTextarea } from '@/components/ui/app/FormField';
import { FormAlert } from '@/components/ui/app/FormAlert';
import { ErrorState, LoadingState } from '@/components/ui/app/LoadingState';
import { Reveal } from '@/components/ui/Reveal';
import { useApiResource } from '@/hooks/useApiResource';
import { useToast } from '@/app/providers/ToastProvider';
import {
  designApi,
  acceptAttribute,
  extensionOf,
  ACCEPTED_DESIGN_EXTENSIONS,
  COVER_EXTENSIONS,
  MODEL_EXTENSIONS,
  MAX_COVER_IMAGES,
  MAX_COVER_BYTES,
  MAX_DESIGN_FILE_BYTES,
} from '@/lib/api/designs';
import type { DesignDetail } from '@/lib/api/designs';
import { ApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils';

const ACCEPT_ATTRIBUTE = acceptAttribute(ACCEPTED_DESIGN_EXTENSIONS);
const COVER_ACCEPT_ATTRIBUTE = acceptAttribute(COVER_EXTENSIONS);

type Bump = 'minor' | 'major' | 'custom';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Mirrors `nextVersion` in the API's helpers, so the label shown on the button
 * is the label the server will assign. An unparseable current version falls
 * back to v1.0 there too.
 */
function nextVersionLabel(current: string | null | undefined, bump: 'major' | 'minor') {
  const match = /^v?(\d+)\.(\d+)(?:\.(\d+))?$/.exec((current ?? '').trim());
  if (!match) return 'v1.0';

  let major = Number(match[1]);
  let minor = Number(match[2]);
  if (bump === 'major') {
    major += 1;
    minor = 0;
  } else {
    minor += 1;
  }
  return `v${major}.${minor}`;
}

/**
 * SCR-023 — publish a new version of a design that is already live.
 *
 * Three server calls, in order: branch the version, attach whatever changed,
 * then submit it. The branch carries the previous version's metadata and files
 * forward, so this screen only has to collect what is actually new — and a file
 * uploaded under a name the previous version already used supersedes the copy
 * that was carried, which is what "I revised this part" means in practice.
 *
 * The live version keeps serving downloads throughout: the branch is a draft
 * and only replaces it once a moderator approves.
 */
export default function NewVersionPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const design = useApiResource<DesignDetail>(() => designApi.detail(id), [id], {
    enabled: Boolean(id),
  });

  const [bump, setBump] = useState<Bump>('minor');
  const [customVersion, setCustomVersion] = useState('');
  const [note, setNote] = useState('');
  const [carryForward, setCarryForward] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [covers, setCovers] = useState<File[]>([]);
  const [busy, setBusy] = useState<'draft' | 'review' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [versionError, setVersionError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const data = design.data;
  const currentVersion = data?.currentVersion ?? null;
  // Stable across renders so the `superseded` memo below only recomputes when
  // the design reloads or the picked files change.
  const carriedFiles = useMemo(() => currentVersion?.files ?? [], [currentVersion]);
  const carriedCovers = carriedFiles.filter((file) => file.isCover);

  /** A draft already queued behind the live version — branching again stacks another. */
  const queuedDraft = useMemo(
    () =>
      (data?.versions ?? []).find(
        (version) => version.status !== 'published' && version.id !== currentVersion?.id,
      ) ?? null,
    [data?.versions, currentVersion?.id],
  );

  const takenLabels = useMemo(
    () => new Set((data?.versions ?? []).map((version) => version.version.toLowerCase())),
    [data?.versions],
  );

  const nextLabel =
    bump === 'custom'
      ? customVersion.trim() || '—'
      : nextVersionLabel(currentVersion?.version, bump);

  const coverPreviews = useMemo(() => covers.map((file) => URL.createObjectURL(file)), [covers]);

  function addFiles(incoming: FileList | null) {
    if (!incoming?.length) return;

    const accepted: File[] = [];
    const rejected: string[] = [];

    for (const file of Array.from(incoming)) {
      if (file.size > MAX_DESIGN_FILE_BYTES) {
        rejected.push(`${file.name} is larger than 500 MB`);
        continue;
      }
      if (!ACCEPTED_DESIGN_EXTENSIONS.includes(extensionOf(file.name))) {
        rejected.push(`${file.name} is not a supported file type`);
        continue;
      }
      accepted.push(file);
    }

    if (rejected.length) toast.warning('Some files were skipped', rejected.join(', '));
    if (!accepted.length) return;

    setFiles((current) => {
      const seen = new Set(current.map((f) => f.name.toLowerCase()));
      return [...current, ...accepted.filter((f) => !seen.has(f.name.toLowerCase()))];
    });
    setError(null);
  }

  function addCovers(incoming: FileList | null) {
    if (!incoming?.length) return;

    const accepted: File[] = [];
    const rejected: string[] = [];

    for (const file of Array.from(incoming)) {
      if (!COVER_EXTENSIONS.includes(extensionOf(file.name))) {
        rejected.push(`${file.name} is not a ${COVER_EXTENSIONS.join('/').toUpperCase()} image`);
        continue;
      }
      if (file.size > MAX_COVER_BYTES) {
        rejected.push(`${file.name} is larger than 10 MB`);
        continue;
      }
      accepted.push(file);
    }

    if (rejected.length) toast.warning('Some images were skipped', rejected.join(', '));
    if (!accepted.length) return;

    setCovers((current) => {
      const seen = new Set(current.map((f) => f.name.toLowerCase()));
      const merged = [...current, ...accepted.filter((f) => !seen.has(f.name.toLowerCase()))];
      if (merged.length > MAX_COVER_IMAGES) {
        toast.warning(
          'Only the first three are used',
          `A design shows at most ${MAX_COVER_IMAGES} cover images.`,
        );
      }
      return merged.slice(0, MAX_COVER_IMAGES);
    });
    setError(null);
  }

  /** Carried files this upload will supersede, by name — shown before submitting. */
  const superseded = useMemo(() => {
    if (!carryForward) return [];
    const uploaded = new Set([...files, ...covers].map((f) => f.name.toLowerCase()));
    return carriedFiles.filter((file) => uploaded.has(file.name.toLowerCase()));
  }, [carryForward, files, covers, carriedFiles]);

  function validate(mode: 'draft' | 'review') {
    if (bump === 'custom') {
      const label = customVersion.trim();
      if (!label) return 'Enter a version number, or pick a minor/major bump.';
      if (!/^v?\d+\.\d+(\.\d+)?$/.test(label)) {
        return 'Version numbers look like v1.2 or v1.2.3.';
      }
      if (label.length > 20) return 'That version number is too long.';
      if (takenLabels.has(label.toLowerCase()) || takenLabels.has(`v${label.toLowerCase()}`)) {
        return `${label} already exists on this design.`;
      }
    }

    if (!carryForward && !files.length) {
      return 'Upload at least one file, or carry the previous version’s files forward.';
    }

    // The publish gate needs a file and a cover image on the version itself, so
    // catch it here rather than letting the submit fail after three calls.
    if (mode === 'review') {
      const willHaveFiles = files.length > 0 || (carryForward && carriedFiles.length > 0);
      const willHaveCover = covers.length > 0 || (carryForward && carriedCovers.length > 0);
      if (!willHaveFiles) return 'A version needs at least one file before it can be submitted.';
      if (!willHaveCover) {
        return 'A version needs at least one cover image before it can be submitted.';
      }
    }

    return null;
  }

  async function submit(mode: 'draft' | 'review') {
    const problem = validate(mode);
    if (problem) {
      setError(problem);
      if (bump === 'custom') setVersionError(problem);
      return;
    }

    setBusy(mode);
    setError(null);
    setVersionError(null);

    const picked = [...files, ...covers];
    // Only a geometry file may take over as primary — nominating a PDF would
    // leave the 3D viewer pointed at something it cannot render.
    const primaryIndex = files.findIndex((file) => MODEL_EXTENSIONS.includes(extensionOf(file.name)));

    try {
      const created = await designApi.createVersion(id, {
        ...(bump === 'custom'
          ? { version: customVersion.trim().replace(/^v?/i, 'v') }
          : { bump }),
        note: note.trim() || undefined,
        copyFiles: carryForward,
      });

      if (picked.length) {
        await designApi.addFiles(id, picked, {
          versionId: created.id,
          ...(primaryIndex >= 0 ? { primaryIndex } : {}),
          ...(covers.length ? { coverIndexes: covers.map((_, i) => files.length + i) } : {}),
        });

        // Drop the carried copies the upload replaces, so the version does not
        // list the same name twice. Its own bytes are a copy, so the live
        // version keeps everything it had.
        const uploaded = new Set(picked.map((f) => f.name.toLowerCase()));
        const stale = created.files.filter((file) => uploaded.has(file.name.toLowerCase()));
        for (const file of stale) {
          try {
            await designApi.removeFile(id, file.id);
          } catch {
            toast.warning(
              'Could not remove the old copy',
              `${created.version} lists ${file.name} twice — delete the older one from the design.`,
            );
          }
        }
      }

      if (mode === 'review') {
        const result = await designApi.publish(id, {
          versionId: created.id,
          note: note.trim() || undefined,
        });
        toast.success(result.requiresReview ? 'Sent for review' : 'Published', result.message);
      } else {
        toast.success(
          `${created.version} created`,
          'Saved as a draft — submit it from My designs when you are ready.',
        );
      }

      navigate('/my-designs');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.code === 'VERSION_EXISTS') setVersionError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
      toast.fromError(err);
    } finally {
      setBusy(null);
    }
  }

  if (design.isLoading && !data) return <LoadingState label="Loading design…" />;

  if (design.error) {
    return (
      <div className="container-content">
        <ErrorState error={design.error} onRetry={design.reload} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container-content">
        <EmptyState
          title="Design not found"
          body="You can only add versions to designs you own."
          actionLabel="My designs"
          actionTo="/my-designs"
        />
      </div>
    );
  }

  // Versioning only earns its keep once something is live. An unpublished draft
  // has nothing to protect, so editing it in place is the right move instead.
  if (data.status !== 'published') {
    return (
      <div className="container-content">
        <EmptyState
          title="This design is not published yet"
          body={`"${data.title}" is still ${data.status === 'pending' ? 'under review' : `a ${data.status}`}. Edit it in place — a new version only makes sense once a version is live and being downloaded.`}
          actionLabel="Edit this design"
          actionTo={`/my-designs/${encodeURIComponent(id)}/edit`}
        />
      </div>
    );
  }

  const working = busy !== null;

  return (
    <div className="container-content max-w-2xl space-y-8">
      <Reveal>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link to="/my-designs" className="font-medium text-muted hover:text-deep-coral">
            ← My designs
          </Link>
        </div>
      </Reveal>

      <PageHeader
        eyebrow="SCR-023 · New version"
        title="Publish a new version"
        lede={`Bump "${data.title}" past ${currentVersion?.version ?? 'its current version'} and upload only what changed.`}
        actions={<StatusBadge tone="green">{currentVersion?.version ?? 'live'}</StatusBadge>}
      />

      <Reveal delay={0.04}>
        <FormAlert
          tone="info"
          title={`${currentVersion?.version ?? 'The live version'} stays online`}
          message="The new version starts as a draft. Downloads keep serving the live version until a moderator approves this one."
        />
      </Reveal>

      {queuedDraft ? (
        <Reveal delay={0.05}>
          <FormAlert
            tone="warning"
            title={`${queuedDraft.version} is already waiting`}
            message={
              <>
                You have an unpublished {queuedDraft.version} (
                {queuedDraft.status === 'pending' ? 'under review' : 'draft'}) behind the live
                version. Creating another queues a second one —{' '}
                <Link
                  to={`/my-designs/${encodeURIComponent(id)}/edit`}
                  className="font-semibold underline"
                >
                  finish {queuedDraft.version} instead
                </Link>
                ?
              </>
            }
          />
        </Reveal>
      ) : null}

      {error ? (
        <Reveal delay={0.06}>
          <FormAlert
            tone="error"
            title="Could not create the version"
            message={error}
            onDismiss={() => setError(null)}
          />
        </Reveal>
      ) : null}

      {/* ── Version number ─────────────────────────────────────────────── */}
      <Reveal delay={0.07}>
        <section className="card space-y-5 p-5 sm:p-8">
          <div>
            <h2 className="font-display text-lg font-bold text-aubergine">Version number</h2>
            <p className="mt-1 text-sm text-muted">
              Counting up from {currentVersion?.version ?? 'v1.0'}. Version history on the design
              page lets people download any published version.
            </p>
          </div>

          <div className="space-y-3">
            {(
              [
                {
                  value: 'minor' as Bump,
                  label: `Minor — ${nextVersionLabel(currentVersion?.version, 'minor')}`,
                  hint: 'Revised files, corrected dimensions, better documentation.',
                },
                {
                  value: 'major' as Bump,
                  label: `Major — ${nextVersionLabel(currentVersion?.version, 'major')}`,
                  hint: 'A redesign — anyone who printed the old one gets a different chip.',
                },
                {
                  value: 'custom' as Bump,
                  label: 'Custom',
                  hint: 'Set the number yourself, e.g. v2.4.',
                },
              ]
            ).map((option) => (
              <label
                key={option.value}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-field border p-4 transition-colors',
                  bump === option.value
                    ? 'border-deep-periwinkle bg-periwinkle-tint/30'
                    : 'border-line hover:border-line-strong',
                )}
              >
                <input
                  type="radio"
                  name="bump"
                  value={option.value}
                  checked={bump === option.value}
                  onChange={() => {
                    setBump(option.value);
                    setVersionError(null);
                    setError(null);
                  }}
                  className="mt-0.5 h-4 w-4 accent-coral"
                />
                <span>
                  <span className="block text-sm font-semibold text-aubergine">{option.label}</span>
                  <span className="mt-0.5 block text-xs text-muted">{option.hint}</span>
                </span>
              </label>
            ))}
          </div>

          {bump === 'custom' ? (
            <FieldShell label="Version number" error={versionError ?? undefined} hint="Like v1.2 or v2.0.1">
              <TextInput
                value={customVersion}
                onChange={(e) => {
                  setCustomVersion(e.target.value);
                  setVersionError(null);
                }}
                placeholder="v2.0"
              />
            </FieldShell>
          ) : null}

          <FieldShell
            label="What changed"
            hint="Shown in version history — this is what tells people whether to re-download"
          >
            <TextTextarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Widened the inlet channel to 400 µm, updated the assembly PDF"
              className="min-h-[80px]"
            />
          </FieldShell>
        </section>
      </Reveal>

      {/* ── Files ──────────────────────────────────────────────────────── */}
      <Reveal delay={0.09}>
        <section className="card space-y-5 p-5 sm:p-8">
          <div>
            <h2 className="font-display text-lg font-bold text-aubergine">Files</h2>
            <p className="mt-1 text-sm text-muted">
              Every version has its own file set. Carry {currentVersion?.version ?? 'the live version'}
              ’s files forward and upload only the ones you revised.
            </p>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-field border border-line p-4">
            <input
              type="checkbox"
              checked={carryForward}
              onChange={(e) => {
                setCarryForward(e.target.checked);
                setError(null);
              }}
              className="mt-0.5 h-4 w-4 accent-coral"
            />
            <span>
              <span className="block text-sm font-semibold text-aubergine">
                Carry {currentVersion?.version ?? 'the live version'}’s {carriedFiles.length}{' '}
                {carriedFiles.length === 1 ? 'file' : 'files'} forward
              </span>
              <span className="mt-0.5 block text-xs text-muted">
                Each one is copied, so deleting it from this version leaves the live version
                untouched. Uncheck to start from an empty file set.
              </span>
            </span>
          </label>

          {carryForward && carriedFiles.length > 0 ? (
            <ul className="divide-y divide-line rounded-field border border-line bg-periwinkle-tint/10">
              {carriedFiles.map((file) => {
                const replaced = superseded.some((f) => f.id === file.id);
                return (
                  <li key={file.id} className="flex items-center justify-between gap-4 px-4 py-2.5">
                    <span
                      className={cn(
                        'min-w-0 truncate text-sm',
                        replaced ? 'text-muted line-through' : 'text-muted',
                      )}
                    >
                      {file.name}
                      {file.isCover ? ' · cover' : ''}
                      {file.isPrimary ? ' · primary' : ''}
                    </span>
                    <span className="shrink-0 text-xs text-muted">
                      {replaced ? 'replaced below' : file.size}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {!carryForward ? (
            <FormAlert
              tone="warning"
              title="Starting from an empty file set"
              message="This version will only have the files you upload here — including at least one cover image, or it cannot be submitted."
            />
          ) : null}

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              addFiles(e.dataTransfer.files);
            }}
            className="rounded-field border-2 border-dashed border-line-strong bg-periwinkle-tint/20 px-6 py-10 text-center"
          >
            <p className="font-display text-base font-bold text-aubergine">
              Drop revised files here
            </p>
            <p className="mt-2 text-sm text-muted">
              STL, 3MF, OBJ, PLY, GLB, FBX, STEP, IGES, DXF, GDSII, G-code, FreeCAD, OpenSCAD, PDF
              or images. Up to 500 MB each.
            </p>
            <button
              type="button"
              className="btn-ghost mt-5 w-full sm:w-auto"
              onClick={() => fileInputRef.current?.click()}
            >
              Choose files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="sr-only"
              multiple
              accept={ACCEPT_ATTRIBUTE}
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </div>

          {files.length > 0 ? (
            <ul className="divide-y divide-line rounded-field border border-line">
              {files.map((file) => (
                <li key={file.name} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-aubergine">{file.name}</p>
                    <p className="text-xs text-muted">
                      {formatBytes(file.size)}
                      {superseded.some((f) => f.name.toLowerCase() === file.name.toLowerCase())
                        ? ' · replaces the carried copy'
                        : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFiles((current) => current.filter((f) => f.name !== file.name))}
                    className="shrink-0 text-xs font-semibold text-deep-coral hover:underline"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="space-y-4 border-t border-line pt-6">
            <h3 className="font-display text-base font-bold text-aubergine">Cover images</h3>
            <p className="text-sm text-muted">
              {carryForward && carriedCovers.length
                ? `${carriedCovers.length} carried forward. Adding any here replaces the whole set.`
                : `One to ${MAX_COVER_IMAGES} photos or renders. The first is the browse-card thumbnail.`}
            </p>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                addCovers(e.dataTransfer.files);
              }}
              className="rounded-field border-2 border-dashed border-line-strong bg-periwinkle-tint/20 px-6 py-8 text-center"
            >
              <p className="text-sm text-muted">
                {covers.length}/{MAX_COVER_IMAGES} new cover images
              </p>
              <button
                type="button"
                className="btn-ghost mt-4 w-full sm:w-auto"
                onClick={() => coverInputRef.current?.click()}
                disabled={covers.length >= MAX_COVER_IMAGES}
              >
                Choose images
              </button>
              <input
                ref={coverInputRef}
                type="file"
                className="sr-only"
                multiple
                accept={COVER_ACCEPT_ATTRIBUTE}
                onChange={(e) => {
                  addCovers(e.target.files);
                  e.target.value = '';
                }}
              />
            </div>

            {coverPreviews.length > 0 ? (
              <ul className="grid grid-cols-3 gap-3">
                {coverPreviews.map((preview, index) => (
                  <li
                    key={covers[index].name}
                    className="relative overflow-hidden rounded-field border border-line"
                  >
                    <img
                      src={preview}
                      alt={covers[index].name}
                      className="aspect-square w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setCovers((current) => current.filter((_, i) => i !== index))
                      }
                      className="absolute right-1.5 top-1.5 rounded-pill bg-canvas/90 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider text-deep-coral"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      </Reveal>

      <Reveal delay={0.11}>
        <div className="card flex flex-col gap-3 p-5 sm:flex-row sm:flex-wrap sm:items-center sm:p-8">
          <button
            type="button"
            className="btn-primary"
            onClick={() => submit('review')}
            disabled={working}
          >
            {busy === 'review' ? 'Submitting…' : `Create ${nextLabel} & submit for review`}
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => submit('draft')}
            disabled={working}
          >
            {busy === 'draft' ? 'Saving…' : 'Save as draft'}
          </button>
          <Link to="/my-designs" className="text-sm font-semibold text-muted hover:text-aubergine">
            Cancel
          </Link>
        </div>
      </Reveal>
    </div>
  );
}
