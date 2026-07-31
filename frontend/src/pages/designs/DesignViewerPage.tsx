import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { ErrorState, LoadingState } from '@/components/ui/app/LoadingState';
import { Reveal } from '@/components/ui/Reveal';
import { useApiResource } from '@/hooks/useApiResource';
import { designApi } from '@/lib/api/designs';
import type { ViewerPayload } from '@/lib/api/designs';
import { findMockDetail, isMockId, type DetailItem } from '@/lib/mock/adapters';
import { cn } from '@/lib/utils';

type ControlProps = {
  label: string;
  active?: boolean;
  onClick?: () => void;
};

function ViewerControl({ label, active, onClick }: ControlProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-field border px-3 py-2 text-xs font-semibold transition-colors',
        active
          ? 'border-coral bg-coral/15 text-deep-coral'
          : 'border-line bg-canvas text-ink-70 hover:border-line-strong hover:text-aubergine',
      )}
    >
      {label}
    </button>
  );
}

export default function DesignViewerPage() {
  const { id = '' } = useParams<{ id: string }>();
  const [tool, setTool] = useState('Orbit');

  const mock = useMemo<DetailItem | null>(() => (isMockId(id) ? findMockDetail(id) : null), [id]);

  const viewer = useApiResource<ViewerPayload>(() => designApi.viewer(id), [id], {
    enabled: Boolean(id) && !mock,
  });

  if (!mock && viewer.isLoading) return <LoadingState label="Loading viewer…" />;

  if (!mock && viewer.error) {
    return (
      <div className="container-content">
        {viewer.error.retryable ? (
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

  // Both sources are reduced to the handful of things this screen renders.
  const title = mock?.title ?? viewer.data?.design.title ?? '';
  const version = mock?.currentVersion?.version ?? viewer.data?.design.version ?? '';
  const slug = mock?.slug ?? id;
  const viewable = mock ? (mock.currentVersion?.files ?? []) : (viewer.data?.viewableFiles ?? []);
  const allFiles = mock ? (mock.currentVersion?.files ?? []) : (viewer.data?.allFiles ?? []);
  const formats = viewer.data?.supportedFormats ?? ['stl', '3mf', 'obj'];

  if (!mock && !viewer.data) {
    return (
      <div className="container-content">
        <Reveal>
          <EmptyState
            title="Design not found"
            body="We couldn't load this design for viewing."
            actionLabel="Browse designs"
            actionTo="/designs"
          />
        </Reveal>
      </div>
    );
  }

  return (
    <div className="container-content flex min-h-[calc(100vh-8rem)] flex-col">
      <Reveal>
        <header className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
          <div className="min-w-0">
            <Link
              to={`/designs/${encodeURIComponent(slug)}`}
              className="text-sm font-medium text-ink-70 hover:text-deep-coral"
            >
              ← Back to detail
            </Link>
            <h1 className="mt-1 truncate font-display text-xl font-bold text-aubergine sm:text-2xl">
              {title}
            </h1>
            <p className="text-xs text-ink-55">
              SCR-019 · {version} · {allFiles.length} {allFiles.length === 1 ? 'file' : 'files'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {['Orbit', 'Zoom', 'Pan'].map((label) => (
              <ViewerControl
                key={label}
                label={label}
                active={tool === label}
                onClick={() => setTool(label)}
              />
            ))}
            <ViewerControl label="Reset view" onClick={() => setTool('Orbit')} />
            {mock ? (
              <span className="btn-primary pointer-events-none !px-4 !py-2 text-sm opacity-45" aria-disabled>
                Download
              </span>
            ) : (
              <Link
                to={`/designs/${encodeURIComponent(slug)}/download`}
                className="btn-primary !px-4 !py-2 text-sm"
              >
                Download
              </Link>
            )}
          </div>
        </header>
      </Reveal>

      <Reveal
        delay={0.08}
        className="relative flex flex-1 flex-col overflow-hidden rounded-[16px] border border-line bg-aubergine shadow-soft"
      >
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-4 border-b border-canvas/10 bg-aubergine/80 px-4 py-2 backdrop-blur-sm">
          <span className="eyebrow text-coral/80">3D viewer</span>
          <span className="text-xs text-canvas/60">Placeholder · no WebGL loaded</span>
        </div>

        <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-aubergine via-[#5a1030] to-deep-periwinkle/40 p-8">
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-coral/40">
              <span className="font-display text-3xl font-extrabold text-coral/60">3D</span>
            </div>
            <p className="font-display text-2xl font-bold text-canvas">3D viewer placeholder</p>
            {viewable.length > 0 ? (
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-canvas/70">
                {viewable.length} renderable {viewable.length === 1 ? 'file' : 'files'} attached —{' '}
                {viewable.map((f) => f.name).join(', ')}
              </p>
            ) : (
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-canvas/70">
                No renderable geometry on this version. Supported formats: {formats.join(', ')}.
              </p>
            )}
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-canvas/10 bg-aubergine/90 px-4 py-3 text-xs text-canvas/60">
          <span>Left drag · orbit · Scroll · zoom · Right drag · pan</span>
          <span>{tool}</span>
        </footer>
      </Reveal>
    </div>
  );
}
