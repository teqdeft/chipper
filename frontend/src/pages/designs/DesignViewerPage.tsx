import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { Reveal } from '@/components/ui/Reveal';
import { mockDesigns } from '@/lib/mock';
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
  const { id } = useParams<{ id: string }>();
  const design = mockDesigns.find((d) => d.id === id);

  if (!design) {
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
            to={`/designs/${design.id}`}
            className="text-sm font-medium text-ink-70 hover:text-deep-coral"
          >
            ← Back to detail
          </Link>
          <h1 className="mt-1 truncate font-display text-xl font-bold text-aubergine sm:text-2xl">
            {design.title}
          </h1>
          <p className="text-xs text-ink-55">
            SCR-019 · {design.version} · {design.material}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ViewerControl label="Orbit" active />
          <ViewerControl label="Zoom" />
          <ViewerControl label="Pan" />
          <ViewerControl label="Reset view" />
          <Link to={`/designs/${design.id}/download`} className="btn-primary !px-4 !py-2 text-sm">
            Download
          </Link>
        </div>
      </header>
      </Reveal>

      <Reveal delay={0.08} className="relative flex flex-1 flex-col overflow-hidden rounded-[16px] border border-line bg-aubergine shadow-soft">
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
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-canvas/70">
              Interactive orbit, zoom and section controls will render the {design.organ.toLowerCase()} model here.
            </p>
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-canvas/10 bg-aubergine/90 px-4 py-3 text-xs text-canvas/60">
          <span>Left drag · orbit · Scroll · zoom · Right drag · pan</span>
          <span>{design.organ} · {design.material}</span>
        </footer>
      </Reveal>
    </div>
  );
}
