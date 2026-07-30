import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { Reveal } from '@/components/ui/Reveal';
import { useAuth } from '@/app/providers/AuthProvider';
import { mockDesigns } from '@/lib/mock';
import { cn } from '@/lib/utils';

/**
 * SCR-020 — Download gate. The route is wrapped in RequireAccess("designs/download"),
 * so normally only signed-in accounts holding `design.download` land here; the
 * sign-in block below is a fallback for direct navigation edge cases.
 */
export default function DownloadGatePage() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated, hasPermission } = useAuth();
  const location = useLocation();
  const [confirmed, setConfirmed] = useState(false);

  const design = mockDesigns.find((d) => d.id === id);
  const canDownload = isAuthenticated && hasPermission('design.download');

  if (!design) {
    return (
      <div className="container-content">
        <Reveal>
          <EmptyState
            title="Design not found"
            body="This download link may be outdated."
            actionLabel="Browse designs"
            actionTo="/designs"
          />
        </Reveal>
      </div>
    );
  }

  return (
    <div className="container-content max-w-2xl space-y-8">
      <PageHeader
        eyebrow="SCR-020 · Download"
        title="Download design"
        lede={`You're about to download "${design.title}" under ${design.licence}.`}
      />

      <Reveal delay={0.08}>
        <div className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone="periwinkle">{design.version}</StatusBadge>
          <span className="pill">{design.licence}</span>
          <span className="pill">{design.material}</span>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-ink-70">
          Downloads are tracked for citation and community metrics. By confirming, you agree to the licence terms
          and will cite the author when reusing this design in publications.
        </p>

        {!canDownload ? (
          <div className="mt-6 rounded-field border border-dashed border-line-strong bg-canvas px-5 py-8 text-center">
            <h2 className="font-display text-lg font-bold text-aubergine">Sign in required</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-ink-70">
              You need a Chipper account to download designs. Sign in to accept the licence and start your download.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link to="/login" state={{ from: location }} className="btn-primary">
                Sign in
              </Link>
              <Link to={`/designs/${design.id}`} className="btn-ghost">
                Back to design
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="rounded-field border border-line bg-canvas p-4">
              <p className="text-sm font-semibold text-aubergine">Ready to download</p>
              <p className="mt-1 text-sm text-ink-70">
                Signed in as <span className="font-semibold">{user?.name}</span>. Package includes STL, STEP
                and metadata for {design.version}.
              </p>
            </div>

            <button
              type="button"
              className={cn('btn-primary w-full sm:w-auto', confirmed && 'opacity-80')}
              onClick={() => setConfirmed(true)}
              disabled={confirmed}
            >
              {confirmed ? 'Download started' : 'Confirm download'}
            </button>

            {confirmed ? (
              <p className="text-sm text-green">
                ✓ Mock download queued — check your browser downloads folder.
              </p>
            ) : null}
          </div>
        )}
        </div>
      </Reveal>

      <Reveal delay={0.12}>
        <p className="text-center text-xs text-ink-55">
        Questions about licensing?{' '}
        <Link to="/licenses" className="font-semibold text-deep-coral hover:underline">
          Read our licence guide
        </Link>
        </p>
      </Reveal>
    </div>
  );
}
