import { Suspense, lazy, startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { ErrorState, LoadingState } from '@/components/ui/app/LoadingState';
import { Reveal } from '@/components/ui/Reveal';
import { useApiResource } from '@/hooks/useApiResource';
import { designApi } from '@/lib/api/designs';
import type { DesignFile, ViewerPayload } from '@/lib/api/designs';
import { findMockDetail, isMockId, type DetailItem } from '@/lib/mock/adapters';
import { DEFAULT_UP_AXIS, isViewableFormat, type UpAxis, type ViewableFormat } from '@/lib/modelFormats';
import { cn } from '@/lib/utils';
import type { ModelStats, ModelViewerHandle, ViewerTool } from '@/components/designs/ModelViewer';

// three.js is the single largest dependency in the app and only this screen
// needs it, so it stays out of the main bundle.
const ModelViewer = lazy(() => import('@/components/designs/ModelViewer'));

type ControlProps = {
  label: string;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  onClick?: () => void;
};

/** Floating glass chip — tools live over the stage, not in a heavy chrome bar. */
function ViewerControl({ label, active, disabled, title, onClick }: ControlProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={active}
      className={cn(
        'rounded-btn px-3.5 py-2 text-xs font-semibold tracking-tight',
        'transition-all duration-300 ease-premium',
        'disabled:cursor-not-allowed disabled:opacity-35',
        active
          ? 'bg-aubergine text-canvas shadow-soft'
          : 'bg-transparent text-muted enabled:hover:bg-aubergine/[0.06] enabled:hover:text-aubergine',
      )}
    >
      {label}
    </button>
  );
}

const TOOLS: { label: string; value: ViewerTool }[] = [
  { label: 'Orbit', value: 'orbit' },
  { label: 'Zoom', value: 'zoom' },
  { label: 'Pan', value: 'pan' },
];

/** Bounding-box extents. Every format the viewer reads is authored in mm. */
function formatSize({ x, y, z }: ModelStats['size']) {
  const round = (n: number) => (n >= 100 ? n.toFixed(0) : n.toFixed(1));
  return `${round(x)} × ${round(y)} × ${round(z)} mm`;
}

/** A toolpath has no surfaces, so quoting "0 triangles" would just read as broken. */
function describeComplexity({ triangles, segments }: ModelStats) {
  if (triangles > 0) return `${triangles.toLocaleString()} triangles`;
  if (segments > 0) return `${segments.toLocaleString()} toolpath moves`;
  return 'no surfaces';
}

export default function DesignViewerPage() {
  const { id = '' } = useParams<{ id: string }>();

  const [tool, setTool] = useState<ViewerTool>('orbit');
  const [wireframe, setWireframe] = useState(false);
  const [upAxis, setUpAxis] = useState<UpAxis>('y');
  const [stats, setStats] = useState<ModelStats | null>(null);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [hintVisible, setHintVisible] = useState(true);
  const modelRef = useRef<ModelViewerHandle>(null);

  const mock = useMemo<DetailItem | null>(() => (isMockId(id) ? findMockDetail(id) : null), [id]);

  const viewer = useApiResource<ViewerPayload>(() => designApi.viewer(id), [id], {
    enabled: Boolean(id) && !mock,
  });

  // Both sources are reduced to the handful of things this screen renders.
  const title = mock?.title ?? viewer.data?.design.title ?? '';
  const version = mock?.currentVersion?.version ?? viewer.data?.design.version ?? '';
  const slug = mock?.slug ?? id;
  const allFiles = mock ? (mock.currentVersion?.files ?? []) : (viewer.data?.allFiles ?? []);
  const formats = viewer.data?.supportedFormats ?? [];

  /**
   * The API already filters by extension, but a file is only renderable if it
   * also has a stored URL — mock designs carry filenames with nothing behind
   * them, and a file whose upload was rolled back has none either.
   */
  const renderable = useMemo(() => {
    const candidates = mock ? (mock.currentVersion?.files ?? []) : (viewer.data?.viewableFiles ?? []);
    return candidates.filter(
      (file): file is DesignFile & { url: string } => Boolean(file.url) && isViewableFormat(file.type),
    );
  }, [mock, viewer.data]);

  const activeFile = useMemo(
    () =>
      renderable.find((file) => file.id === activeFileId) ??
      renderable.find((file) => file.isPrimary) ??
      renderable[0] ??
      null,
    [renderable, activeFileId],
  );

  const activeFormat = activeFile ? (activeFile.type.toLowerCase() as ViewableFormat) : null;

  // A new file means new geometry, and a new format means a different up-axis
  // convention; stale dimensions and a stale orientation would both carry over.
  useEffect(() => {
    setStats(null);
    setHintVisible(true);
    if (activeFormat) setUpAxis(DEFAULT_UP_AXIS[activeFormat]);
  }, [activeFile?.id, activeFormat]);

  // Gesture hint fades once the part is on screen — Sketchfab-style quiet stage.
  useEffect(() => {
    if (!stats) return;
    const t = window.setTimeout(() => setHintVisible(false), 3200);
    return () => window.clearTimeout(t);
  }, [stats]);

  const handleLoaded = useCallback((next: ModelStats) => setStats(next), []);

  if (!mock && viewer.isLoading) return <LoadingState label="Loading viewer…" />;

  if (!mock && (viewer.error || !viewer.data)) {
    return (
      <div className="container-content">
        {viewer.error?.retryable ? (
          <ErrorState error={viewer.error} onRetry={viewer.reload} />
        ) : (
          <Reveal>
            <EmptyState
              title="Design not found"
              body="We couldn't load this design for viewing."
              actionLabel="Browse designs"
              actionTo="/designs"
            />
          </Reveal>
        )}
      </div>
    );
  }

  return (
    <div className="container-content flex min-h-[calc(100vh-6rem)] flex-col pb-8">
      <Reveal>
        <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <Link
              to={`/designs/${encodeURIComponent(slug)}`}
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors duration-300 ease-premium hover:text-deep-coral"
            >
              <span aria-hidden className="transition-transform duration-300 ease-premium group-hover:-translate-x-0.5">
                ←
              </span>
              Back to detail
            </Link>
            <h1 className="mt-2 truncate font-display text-2xl font-bold tracking-tight text-aubergine sm:text-3xl">
              {title}
            </h1>
            <p className="mt-1 text-xs text-muted">
              {version}
              {allFiles.length ? ` · ${allFiles.length} ${allFiles.length === 1 ? 'file' : 'files'}` : null}
            </p>
          </div>

          {mock ? (
            <span className="btn-primary pointer-events-none !px-5 !py-2.5 text-sm opacity-45" aria-disabled>
              Download
            </span>
          ) : (
            <Link
              to={`/designs/${encodeURIComponent(slug)}/download`}
              className="btn-primary !px-5 !py-2.5 text-sm"
            >
              Download
            </Link>
          )}
        </header>
      </Reveal>

      <Reveal delay={0.08} className="relative flex flex-1 flex-col">
        {/* Preview stage — styleguide preview gradient (coral-tint → yellow-tint). */}
        <div className="relative flex min-h-[min(72vh,44rem)] flex-1 flex-col overflow-hidden rounded-card border border-line bg-preview shadow-lift">

          {/* Top meta — floats over the canvas */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-4 sm:p-5">
            <div className="pointer-events-auto flex min-w-0 flex-col gap-2">
              <span className="inline-flex w-fit items-center rounded-pill border border-line/70 bg-surface/75 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-eyebrow text-muted backdrop-blur-md">
                3D viewer
              </span>

              {renderable.length > 1 ? (
                <div className="flex max-w-[min(100%,28rem)] flex-wrap gap-1.5">
                  {renderable.map((file) => (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() => setActiveFileId(file.id)}
                      className={cn(
                        'max-w-[12rem] truncate rounded-pill border px-3 py-1 text-xs font-semibold backdrop-blur-md transition-all duration-300 ease-premium',
                        file.id === activeFile?.id
                          ? 'border-aubergine/20 bg-aubergine text-canvas shadow-soft'
                          : 'border-line/70 bg-surface/75 text-muted hover:border-line-strong hover:text-aubergine',
                      )}
                    >
                      {file.name}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="pointer-events-auto rounded-pill border border-line/70 bg-surface/75 px-3.5 py-1.5 text-xs text-muted backdrop-blur-md">
              {activeFile
                ? stats
                  ? `${formatSize(stats.size)} · ${describeComplexity(stats)}`
                  : activeFile.type
                : 'No geometry'}
            </div>
          </div>

          {/* Stage */}
          <div className="relative flex-1 min-h-[26rem]">
            {activeFile ? (
              <Suspense
                fallback={
                  <div className="absolute inset-0 flex items-center justify-center">
                    <LoadingState label="Starting viewer…" />
                  </div>
                }
              >
                <ModelViewer
                  // Remount on file change so the scene is rebuilt from scratch.
                  key={activeFile.id}
                  ref={modelRef}
                  url={activeFile.url}
                  format={activeFormat!}
                  tool={tool}
                  wireframe={wireframe}
                  upAxis={upAxis}
                  onLoaded={handleLoaded}
                />
              </Suspense>
            ) : (
              <div className="flex h-full items-center justify-center bg-canvas p-8">
                <div className="text-center">
                  <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-coral/40">
                    <span className="font-display text-3xl font-extrabold text-coral/60">3D</span>
                  </div>
                  <p className="font-display text-2xl font-bold text-aubergine">Nothing to render</p>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
                    {allFiles.length
                      ? 'This version has files, but none in a format the browser can render. STEP, IGES, DXF and DWG are download-only for now.'
                      : 'This version has no files attached.'}
                    {formats.length ? ` Renderable formats: ${formats.join(', ')}.` : ''}
                  </p>
                  {!mock ? (
                    <Link to={`/designs/${encodeURIComponent(slug)}/download`} className="btn-ghost mt-6 w-full sm:w-auto">
                      Download the files
                    </Link>
                  ) : null}
                </div>
              </div>
            )}

            {/* Gesture cue — disappears after the model settles. */}
            {activeFile && hintVisible ? (
              <div
                className={cn(
                  'pointer-events-none absolute inset-x-0 bottom-28 z-10 flex justify-center px-4 transition-opacity duration-700 ease-premium sm:bottom-32',
                  stats ? 'opacity-100' : 'opacity-0',
                )}
              >
                <p className="rounded-pill border border-line/60 bg-surface/70 px-4 py-2 text-xs font-medium text-muted shadow-soft backdrop-blur-md">
                  Drag to orbit · Scroll to zoom · Right-drag to pan
                </p>
              </div>
            ) : null}
          </div>

          {/* Floating toolbar */}
          <div className="absolute inset-x-0 bottom-0 z-20 flex justify-center p-4 sm:p-5">
            <div className="flex max-w-full flex-wrap items-center justify-center gap-1 rounded-card border border-line/70 bg-surface/80 p-1.5 shadow-lift backdrop-blur-xl">
              <div className="flex items-center gap-0.5 rounded-btn bg-aubergine/[0.04] p-0.5">
                {TOOLS.map(({ label, value }) => (
                  <ViewerControl
                    key={value}
                    label={label}
                    active={tool === value}
                    disabled={!activeFile}
                    onClick={() => setTool(value)}
                  />
                ))}
              </div>

              <span aria-hidden className="mx-1 hidden h-6 w-px bg-line sm:block" />

              <ViewerControl
                label="Wireframe"
                active={wireframe}
                disabled={!activeFile}
                onClick={() => startTransition(() => setWireframe((on) => !on))}
              />
              <ViewerControl
                label={upAxis === 'z' ? 'Z-up' : 'Y-up'}
                active={upAxis === 'z'}
                disabled={!activeFile}
                title="Which axis the file treats as up. STL and 3MF are usually Z-up; flip this if the model appears lying on its side."
                onClick={() => setUpAxis((axis) => (axis === 'z' ? 'y' : 'z'))}
              />
              <ViewerControl
                label="Reset"
                disabled={!activeFile}
                onClick={() => {
                  setTool('orbit');
                  modelRef.current?.resetView();
                }}
              />

              {activeFile?.name ? (
                <>
                  <span aria-hidden className="mx-1 hidden h-6 w-px bg-line sm:block" />
                  <span className="hidden max-w-[10rem] truncate px-2 text-xs text-muted sm:inline">
                    {activeFile.name}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
