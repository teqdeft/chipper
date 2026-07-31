import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { FieldShell, TextSelect, TextTextarea } from '@/components/ui/app/FormField';
import { ErrorState, LoadingState } from '@/components/ui/app/LoadingState';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { useApiResource } from '@/hooks/useApiResource';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { designApi } from '@/lib/api/designs';
import type { DesignComment, DesignDetail, DesignVersion } from '@/lib/api/designs';
import { ApiError } from '@/lib/api/client';
import { findMockDetail, isMockId, type DetailItem } from '@/lib/mock/adapters';
import { formatRange } from '@/lib/designFields';
import { formatListDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

function statusTone(status: DesignDetail['status']) {
  if (status === 'published') return 'green' as const;
  if (status === 'pending') return 'yellow' as const;
  return 'ink' as const;
}

function statusLabel(status: DesignDetail['status']) {
  if (status === 'published') return 'Published';
  if (status === 'pending') return 'Under review';
  if (status === 'draft') return 'Draft';
  if (status === 'rejected') return 'Rejected';
  return 'Archived';
}

function publishAsLabel(value: DesignDetail['publishAs']) {
  if (value === 'institute') return 'Institute';
  if (value === 'person_from_institute') return 'Person from institute';
  return 'Person';
}

/**
 * Renders the component-type-dependent block.
 *
 * The keys are defined by `component_type_fields` on the server, so rather than
 * hard-coding one branch per type this formats whatever came back — a new field
 * added by an admin shows up without a frontend change.
 */
function typeSpecificRows(version: DesignVersion | null): [string, string][] {
  if (!version?.typeSpecific) return [];

  return Object.entries(version.typeSpecific)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => {
      const label = key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
      if (value !== null && typeof value === 'object' && 'min' in value) {
        const unit = value.unit ? ` ${value.unit}` : '';
        return [label, `${value.min}–${value.max}${unit}`] as [string, string];
      }
      if (typeof value === 'boolean') return [label, value ? 'Yes' : 'No'] as [string, string];
      return [label, String(value)] as [string, string];
    });
}

function MetaRow({ label, value }: { label: string; value: ReactNode }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex justify-between gap-4 border-b border-line pb-3 last:border-0 last:pb-0">
      <dt className="text-sm text-ink-55">{label}</dt>
      <dd className="text-right text-sm font-semibold text-aubergine">{value}</dd>
    </div>
  );
}

export default function DesignDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { isAuthenticated, hasPermission } = useAuth();

  const [version, setVersion] = useState<string | undefined>(undefined);

  /** Demo rows are served from the bundled fixtures, never from the API. */
  const mock = useMemo<DetailItem | null>(() => (isMockId(id) ? findMockDetail(id) : null), [id]);

  const resource = useApiResource<DesignDetail>(
    () => designApi.detail(id, version),
    [id, version],
    { enabled: Boolean(id) && !mock },
  );

  const design: (DesignDetail & { isMock?: boolean }) | null = mock ?? resource.data;
  const isMock = Boolean(mock);

  // ── Engagement state, seeded from the response and updated optimistically ──
  const [starred, setStarred] = useState(false);
  const [stars, setStars] = useState(0);
  const [hasOne, setHasOne] = useState(false);
  const [rating, setRating] = useState(5);
  const [busy, setBusy] = useState<'star' | 'ownership' | 'comment' | null>(null);

  useEffect(() => {
    if (!design) return;
    setStarred(design.viewer?.isStarred ?? false);
    setStars(design.stars);
    setHasOne(design.viewer?.hasOne ?? false);
    setRating(design.viewer?.rating ?? 5);
  }, [design]);

  const comments = useApiResource<{ items: DesignComment[] }>(
    () => designApi.comments(id, { limit: 50 }),
    [id],
    { enabled: Boolean(id) && !isMock },
  );

  const [commentBody, setCommentBody] = useState('');

  const toggleStar = useCallback(async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setBusy('star');
    // Flip immediately; the server's counts replace these on the way back.
    setStarred((s) => !s);
    setStars((n) => n + (starred ? -1 : 1));
    try {
      const result = await designApi.toggleStar(id);
      setStarred(result.starred);
      setStars(result.stars);
    } catch (error) {
      setStarred((s) => !s);
      setStars((n) => n + (starred ? 1 : -1));
      toast.fromError(error);
    } finally {
      setBusy(null);
    }
  }, [id, isAuthenticated, navigate, starred, toast]);

  const submitOwnership = useCallback(async () => {
    setBusy('ownership');
    try {
      await designApi.setOwnership(id, { hasOne: true, rating });
      toast.success('Thanks', 'Your acknowledgement was saved.');
      resource.reload();
    } catch (error) {
      toast.fromError(error);
    } finally {
      setBusy(null);
    }
  }, [id, rating, resource, toast]);

  const postComment = useCallback(async () => {
    const body = commentBody.trim();
    if (!body) return;
    setBusy('comment');
    try {
      await designApi.addComment(id, body);
      setCommentBody('');
      comments.reload();
    } catch (error) {
      toast.fromError(error);
    } finally {
      setBusy(null);
    }
  }, [commentBody, comments, id, toast]);

  if (!mock && resource.isLoading) return <LoadingState label="Loading design…" />;

  if (!design) {
    const notFound = resource.error instanceof ApiError && resource.error.status === 404;
    if (resource.error && !notFound) {
      return (
        <div className="container-content">
          <ErrorState error={resource.error} onRetry={resource.reload} />
        </div>
      );
    }
    return (
      <div className="container-content">
        <Reveal>
          <EmptyState
            title="Design not found"
            body="This design may have been removed or the link is incorrect."
            actionLabel="Browse designs"
            actionTo="/designs"
          />
        </Reveal>
      </div>
    );
  }

  const current = design.currentVersion;
  const howToUse = current?.howToUse;
  const flow = formatRange(howToUse?.operatingParameters.flowRate ?? undefined);
  const pressure = formatRange(howToUse?.operatingParameters.pressure ?? undefined);
  const temperature = formatRange(howToUse?.operatingParameters.temperature ?? undefined);
  const typeRows = typeSpecificRows(current);
  const files = current?.files ?? [];
  const licenceCode = current?.license?.code ?? design.licence;
  const canComment = isAuthenticated && hasPermission('comment.create');
  const isOwner = design.viewer?.canEdit;

  return (
    <div className="container-content space-y-10">
      <Reveal>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link to="/designs" className="font-medium text-ink-70 hover:text-deep-coral">
            ← Browse
          </Link>
          <span className="text-ink-40">/</span>
          <span className="truncate text-aubergine">{design.title}</span>
        </div>
      </Reveal>

      {isMock ? (
        <Reveal delay={0.02}>
          <p className="rounded-field border border-line bg-periwinkle-tint/30 px-4 py-3 text-sm text-ink-70">
            <span className="font-semibold text-deep-periwinkle">Demo design.</span> This is sample
            content shipped with the app — it has no stored files, so download, starring and comments
            are switched off here.
          </p>
        </Reveal>
      ) : null}

      {/* Maker-first header — style guide §012 */}
      <Reveal delay={0.04} className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral font-display text-sm font-bold text-aubergine">
            {(design.authorName || '?').slice(0, 1)}
          </span>
          <div className="min-w-0">
            <p className="text-sm text-ink-70">
              by{' '}
              <Link
                to={`/u/${design.authorHandle}`}
                className="font-semibold text-aubergine hover:text-deep-coral"
              >
                {design.authorName}
              </Link>
              {design.author?.affiliation ? <span>, {design.author.affiliation}</span> : null}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 max-w-3xl">
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-aubergine sm:text-4xl">
                {design.title}
              </h1>
              {current?.version ? (
                <span className="pill bg-periwinkle-tint text-deep-periwinkle">{current.version}</span>
              ) : null}
            </div>
            <p className="mt-3 text-base leading-relaxed text-ink-70">{design.summary}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            {isOwner ? (
              <Link to={`/my-designs/${design.slug}/edit`} className="btn-ghost">
                Edit
              </Link>
            ) : null}
            <Link to={`/designs/${encodeURIComponent(design.slug)}/view`} className="btn-ghost">
              Open project
            </Link>
            {isMock ? (
              <span className="btn-get pointer-events-none opacity-45" aria-disabled>
                Download
              </span>
            ) : (
              <Link to={`/designs/${encodeURIComponent(design.slug)}/download`} className="btn-get">
                Download
              </Link>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={statusTone(design.status)}>{statusLabel(design.status)}</StatusBadge>
          <span className="text-sm text-ink-55">
            Reused <span className="data-unit">{design.downloads}×</span>
          </span>
          <button
            type="button"
            onClick={toggleStar}
            disabled={isMock || busy === 'star'}
            className={cn(
              'inline-flex items-center gap-1 rounded-pill border px-2.5 py-1 text-sm transition-colors',
              starred
                ? 'border-coral bg-coral/15 text-deep-coral'
                : 'border-line text-ink-55 hover:border-line-strong',
              isMock && 'pointer-events-none opacity-45',
            )}
            aria-pressed={starred}
          >
            <span className="text-coral">★</span> {stars}
          </button>
          {design.iso22916 ? <StatusBadge tone="periwinkle">ISO 22916</StatusBadge> : null}
        </div>

        {/* Spec chips — change per component type */}
        <div className="flex flex-wrap gap-2">
          {design.componentType ? <span className="pill">{design.componentType.name}</span> : null}
          {design.organs.map((organ) => (
            <span key={organ} className="pill">
              {organ} organ
            </span>
          ))}
          {flow ? (
            <span className="pill">
              <span className="data-unit">{flow}</span> flow
            </span>
          ) : null}
          {pressure ? (
            <span className="pill">
              <span className="data-unit">{pressure}</span>
            </span>
          ) : null}
          {design.material ? <span className="pill">{design.material}</span> : null}
          {licenceCode ? <span className="pill">{licenceCode}</span> : null}
          {design.resourceType ? <span className="pill">{design.resourceType.name}</span> : null}
        </div>
      </Reveal>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <Reveal delay={0.08} className="space-y-6">
          <RevealGroup className="card overflow-hidden" stagger={0.05}>
            <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <RevealItem
                  key={n}
                  className={cn(
                    'flex aspect-square items-center justify-center bg-gradient-to-br from-periwinkle-tint/50 to-coral/10 transition-transform duration-500 ease-premium hover:scale-[1.02]',
                    n === 1 && 'col-span-2 row-span-2 sm:col-span-2 sm:row-span-2',
                  )}
                >
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink-40">
                    {n === 1 ? '3D preview' : `Gallery ${n}`}
                  </span>
                </RevealItem>
              ))}
            </div>
          </RevealGroup>

          {current?.description ? (
            <section className="card p-5 sm:p-6">
              <h2 className="font-display text-lg font-bold text-aubergine">Description</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-70">
                {current.description}
              </p>
            </section>
          ) : null}

          <section className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="font-display text-lg font-bold text-aubergine">Files</h2>
              {design.versions.length > 1 ? (
                <FieldShell label="Version" className="w-36">
                  <TextSelect
                    value={current?.version ?? ''}
                    onChange={(e) => setVersion(e.target.value)}
                  >
                    {design.versions.map((v) => (
                      <option key={v.id} value={v.version}>
                        {v.version}
                      </option>
                    ))}
                  </TextSelect>
                </FieldShell>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-ink-55">All metadata below is version-tracked.</p>
            {files.length === 0 ? (
              <p className="mt-4 text-sm text-ink-55">No files attached to this version yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-line">
                {files.map((file) => (
                  <li
                    key={file.id}
                    className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-aubergine">{file.name}</p>
                      <p className="text-xs text-ink-55">
                        {file.type} · {file.size}
                        {file.isPrimary ? ' · primary' : ''}
                      </p>
                    </div>
                    <span className="pill shrink-0">{current?.version}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold text-aubergine">How to use this chip</h2>
            <dl className="mt-4 space-y-3">
              <MetaRow label="CLIP-string" value={howToUse?.clipString} />
              <MetaRow
                label="Max height"
                value={howToUse?.maxHeightMm != null ? `${howToUse.maxHeightMm} mm` : null}
              />
              <MetaRow
                label="Clamping zone height"
                value={
                  howToUse?.clampingZoneHeightMm != null ? `${howToUse.clampingZoneHeightMm} mm` : null
                }
              />
              <MetaRow label="Exclusion zones" value={howToUse?.exclusionZones} />
              <MetaRow label="Temperature" value={temperature} />
              <MetaRow label="Pressure" value={pressure} />
              <MetaRow label="Flow rate" value={flow} />
              <MetaRow label="Clamping strategy" value={howToUse?.clampingStrategy} />
            </dl>
            {!howToUse?.clipString &&
            howToUse?.maxHeightMm == null &&
            !howToUse?.exclusionZones &&
            !flow &&
            !pressure ? (
              <p className="mt-2 text-sm text-ink-55">
                No operating guidance declared for this version.
              </p>
            ) : null}
          </section>

          {typeRows.length > 0 ? (
            <section className="card p-5 sm:p-6">
              <h2 className="font-display text-lg font-bold text-aubergine">
                {design.componentType?.name ?? 'Component'} specs
              </h2>
              <dl className="mt-4 space-y-3">
                {typeRows.map(([label, value]) => (
                  <MetaRow key={label} label={label} value={value} />
                ))}
              </dl>
            </section>
          ) : null}

          {current && current.publishedWorks.length > 0 ? (
            <section className="card p-5 sm:p-6">
              <h2 className="font-display text-lg font-bold text-aubergine">Published work</h2>
              <ul className="mt-4 space-y-4">
                {current.publishedWorks.map((work) => (
                  <li key={work.title} className="rounded-field border border-line bg-canvas p-4">
                    <p className="text-sm font-semibold text-aubergine">{work.title}</p>
                    <p className="mt-1 text-sm text-ink-70">
                      {[work.authors, work.publication, work.year].filter(Boolean).join(' · ')}
                    </p>
                    {work.doi ? <p className="mt-1 text-xs text-deep-coral">DOI: {work.doi}</p> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {current && current.relatedDocuments.length > 0 ? (
            <section className="card p-5 sm:p-6">
              <h2 className="font-display text-lg font-bold text-aubergine">Related documents</h2>
              <ul className="mt-4 divide-y divide-line">
                {current.relatedDocuments.map((doc) => (
                  <li
                    key={doc.title}
                    className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-semibold text-aubergine">{doc.title}</p>
                      {doc.description ? (
                        <p className="mt-0.5 text-xs text-ink-55">{doc.description}</p>
                      ) : null}
                    </div>
                    {doc.documentType ? <span className="pill shrink-0">{doc.documentType}</span> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="card p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold text-aubergine">
              Comments{design.comments ? ` (${design.comments})` : ''}
            </h2>

            {isMock ? (
              <p className="mt-4 text-sm text-ink-55">Comments are disabled on demo designs.</p>
            ) : comments.isLoading ? (
              <p className="mt-4 text-sm text-ink-55">Loading comments…</p>
            ) : (
              <RevealGroup className="mt-4 space-y-4" stagger={0.06}>
                {(comments.data?.items ?? []).length === 0 ? (
                  <p className="text-sm text-ink-55">No comments yet — start the conversation.</p>
                ) : (
                  (comments.data?.items ?? []).map((comment) => (
                    <RevealItem key={comment.id}>
                      <div className="rounded-field border border-line bg-canvas p-4">
                        <div className="flex items-center justify-between gap-2">
                          <Link
                            to={`/u/${comment.author.handle}`}
                            className="text-sm font-semibold text-aubergine hover:text-deep-coral"
                          >
                            {comment.author.name}
                          </Link>
                          <span className="text-xs text-ink-55">{formatListDate(comment.at)}</span>
                        </div>
                        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-70">
                          {comment.body}
                        </p>
                      </div>
                    </RevealItem>
                  ))
                )}
              </RevealGroup>
            )}

            {!isMock ? (
              <div className="mt-5 space-y-3 border-t border-line pt-5">
                {canComment ? (
                  <>
                    <FieldShell label="Add a comment">
                      <TextTextarea
                        value={commentBody}
                        onChange={(e) => setCommentBody(e.target.value)}
                        placeholder="Ask about operating parameters, fabrication, or reuse…"
                        className="min-h-[88px]"
                      />
                    </FieldShell>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={postComment}
                      disabled={!commentBody.trim() || busy === 'comment'}
                    >
                      {busy === 'comment' ? 'Posting…' : 'Post comment'}
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-ink-55">
                    {isAuthenticated ? (
                      'Confirm your email address to join the discussion.'
                    ) : (
                      <>
                        <Link to="/login" className="font-semibold text-deep-coral hover:underline">
                          Sign in
                        </Link>{' '}
                        to join the discussion.
                      </>
                    )}
                  </p>
                )}
              </div>
            ) : null}
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold text-aubergine">“I have one”</h2>
            <p className="mt-2 text-sm text-ink-70">
              Acknowledge that you fabricated or run this design, and optionally rate it.
            </p>
            {design.ratingCount > 0 ? (
              <p className="mt-3 text-sm text-ink-70">
                <span className="text-coral">★</span> {design.rating.toFixed(1)} from{' '}
                <span className="data-unit">{design.ratingCount}</span>{' '}
                {design.ratingCount === 1 ? 'person' : 'people'} · {design.owners} have one
              </p>
            ) : null}

            {isMock ? (
              <p className="mt-4 text-sm text-ink-55">Not available on demo designs.</p>
            ) : !isAuthenticated ? (
              <p className="mt-4 text-sm text-ink-55">
                <Link to="/login" className="font-semibold text-deep-coral hover:underline">
                  Sign in
                </Link>{' '}
                to acknowledge this design.
              </p>
            ) : (
              <>
                <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-field border border-line p-4">
                  <input
                    type="checkbox"
                    checked={hasOne}
                    onChange={(e) => setHasOne(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-coral"
                  />
                  <span className="text-sm font-semibold text-aubergine">I have one</span>
                </label>
                {hasOne ? (
                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <FieldShell label="Rating" className="w-36">
                      <TextSelect
                        value={String(rating)}
                        onChange={(e) => setRating(Number(e.target.value))}
                      >
                        {[5, 4, 3, 2, 1].map((n) => (
                          <option key={n} value={n}>
                            {n} star{n === 1 ? '' : 's'}
                          </option>
                        ))}
                      </TextSelect>
                    </FieldShell>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={submitOwnership}
                      disabled={busy === 'ownership'}
                    >
                      {busy === 'ownership' ? 'Saving…' : 'Submit acknowledgement'}
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </section>
        </Reveal>

        <Reveal delay={0.1} className="space-y-6 lg:sticky lg:top-28 lg:self-start">
          <section className="card p-5 sm:p-6">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink-55">
              Metadata
            </h2>
            <dl className="mt-4 space-y-3">
              <MetaRow label="ID" value={design.slug} />
              <MetaRow label="Name" value={design.title} />
              <MetaRow label="Updated" value={formatListDate(design.updatedAt)} />
              <MetaRow label="Created" value={formatListDate(design.createdAt)} />
              <MetaRow label="Component type" value={design.componentType?.name} />
              <MetaRow label="Resource type" value={design.resourceType?.name} />
              <MetaRow label="Publish as" value={publishAsLabel(design.publishAs)} />
              <MetaRow label="Institute" value={design.instituteName} />
              <MetaRow label="Tested material" value={current?.testedMaterial?.name ?? design.material} />
              <MetaRow
                label="Tested fabrication"
                value={current?.testedFabricationMethod?.name ?? design.fabricationMethod}
              />
              <MetaRow label="Version" value={current?.version} />
              <MetaRow label="Downloads" value={String(design.downloads)} />
              <MetaRow label="Stars" value={String(stars)} />
            </dl>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink-55">
              Licence &amp; cite
            </h2>
            <p className="mt-3 font-display text-xl font-bold text-deep-coral">
              {licenceCode ?? 'Not declared'}
            </p>
            {current?.license?.summary ? (
              <p className="mt-2 text-sm leading-relaxed text-ink-70">{current.license.summary}</p>
            ) : null}
            {current?.howToCite ? (
              <p className="mt-3 rounded-field border border-line bg-periwinkle-tint/30 p-3 text-sm leading-relaxed text-ink-70">
                {current.howToCite}
              </p>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-ink-70">
                Always cite the author and version when publishing results.
              </p>
            )}
            <Link
              to="/licenses"
              className="mt-3 inline-block text-sm font-semibold text-deep-coral hover:underline"
            >
              Read licence guide →
            </Link>
          </section>

          {current && (current.credits.length > 0 || current.creditsNote) ? (
            <section className="card p-5 sm:p-6">
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink-55">
                Credits
              </h2>
              {current.creditsNote ? (
                <p className="mt-3 text-sm leading-relaxed text-ink-70">{current.creditsNote}</p>
              ) : null}
              <ul className="mt-4 space-y-4">
                {current.credits.map((credit) => (
                  <li key={credit.name + (credit.role ?? '')} className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pink/60 font-display text-xs font-bold text-aubergine">
                      {credit.name.slice(0, 1)}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-aubergine">{credit.name}</p>
                      {credit.affiliation ? (
                        <p className="text-xs text-ink-70">{credit.affiliation}</p>
                      ) : null}
                      {credit.role ? <p className="text-xs text-ink-55">{credit.role}</p> : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {design.tags.length > 0 ? (
            <section className="card p-5 sm:p-6">
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink-55">
                Keywords
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {design.tags.map((tag) => (
                  <Link key={tag} to={`/designs?tag=${encodeURIComponent(tag)}`} className="pill text-ink-70">
                    {tag}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </Reveal>
      </div>
    </div>
  );
}
