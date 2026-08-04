import { useCallback, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { ErrorState, LoadingState } from '@/components/ui/app/LoadingState';
import { Reveal } from '@/components/ui/Reveal';
import { useApiResource } from '@/hooks/useApiResource';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { designApi } from '@/lib/api/designs';
import type { DownloadInfo } from '@/lib/api/designs';
import { api, saveBlob } from '@/lib/api/client';
import { cn } from '@/lib/utils';

/**
 * SCR-020 — Download gate. The route is wrapped in RequireAccess("designs/download"),
 * so normally only signed-in accounts holding `design.download` land here; the
 * sign-in block below is a fallback for direct navigation edge cases.
 *
 * The file is fetched as a blob rather than linked to directly: the endpoint
 * needs the bearer token and records who took what before it streams anything.
 */
export default function DownloadGatePage() {
  const { id = '' } = useParams<{ id: string }>();
  const { user, isAuthenticated, hasPermission } = useAuth();
  const location = useLocation();
  const toast = useToast();

  const [downloading, setDownloading] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const info = useApiResource<DownloadInfo>(() => designApi.downloadInfo(id), [id], {
    enabled: Boolean(id),
  });

  const canDownload = isAuthenticated && hasPermission('design.download');

  const download = useCallback(
    async (fileId?: string, fileName?: string) => {
      setDownloading(fileId ?? 'primary');
      try {
        const { blob, fileName: served } = await api.blob(
          designApi.downloadUrl(id, { fileId }),
          fileName,
        );
        // The server's Content-Disposition carries the uploader's original
        // filename, so the saved file matches what they published.
        saveBlob(blob, served || fileName || 'design');
        setDone(true);
      } catch (error) {
        toast.fromError(error);
      } finally {
        setDownloading(null);
      }
    },
    [id, toast],
  );

  if (info.isLoading) return <LoadingState label="Preparing download…" />;

  if (info.error) {
    return (
      <div className="container-content">
        {info.error.retryable ? (
          <ErrorState error={info.error} onRetry={info.reload} />
        ) : (
          <Reveal>
            <EmptyState
              title="Design not found"
              body="This download link may be outdated."
              actionLabel="Browse designs"
              actionTo="/designs"
            />
          </Reveal>
        )}
      </div>
    );
  }

  const data = info.data;
  if (!data) {
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

  const licence = data.license?.code ?? 'the declared licence';

  return (
    <div className="container-content max-w-2xl space-y-8">
      <PageHeader
        eyebrow="SCR-020 · Download"
        title="Download design"
        lede={`You're about to download "${data.design.title}" under ${licence}.`}
      />

      <Reveal delay={0.08}>
        <div className="card p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            {data.version ? <StatusBadge tone="periwinkle">{data.version.version}</StatusBadge> : null}
            {data.license ? <span className="pill">{data.license.code}</span> : null}
          </div>

          <p className="mt-4 text-sm leading-relaxed text-muted">
            Downloads are tracked for citation and community metrics. By confirming, you agree to the
            licence terms and will cite the author when reusing this design in publications.
          </p>

          {data.howToCite ? (
            <p className="mt-4 rounded-field border border-line bg-periwinkle-tint/30 p-3 text-sm leading-relaxed text-muted">
              <span className="font-semibold text-aubergine">How to cite: </span>
              {data.howToCite}
            </p>
          ) : null}

          {!canDownload ? (
            <div className="mt-6 rounded-field border border-dashed border-line-strong bg-surface px-5 py-8 text-center">
              <h2 className="font-display text-lg font-bold text-aubergine">Sign in required</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
                You need a Chipper account to download designs. Sign in to accept the licence and start
                your download.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link to="/login" state={{ from: location }} className="btn-primary">
                  Sign in
                </Link>
                <Link to={`/designs/${encodeURIComponent(data.design.slug)}`} className="btn-ghost">
                  Back to design
                </Link>
              </div>
            </div>
          ) : data.files.length === 0 ? (
            <div className="mt-6 rounded-field border border-dashed border-line-strong px-5 py-8 text-center">
              <p className="text-sm text-muted">
                This version has no files attached yet. Check back once the uploader adds them.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="rounded-field border border-line bg-surface p-4">
                <p className="text-sm font-semibold text-aubergine">Ready to download</p>
                <p className="mt-1 text-sm text-muted">
                  Signed in as <span className="font-semibold">{user?.name}</span>
                  {data.version ? ` · ${data.version.version}` : ''}
                </p>
              </div>

              <ul className="divide-y divide-line rounded-field border border-line">
                {data.files.map((file) => (
                  <li key={file.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-aubergine">{file.name}</p>
                      <p className="text-xs text-muted">
                        {file.type} · {file.size}
                        {file.isPrimary ? ' · primary' : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => download(file.id, file.name)}
                      disabled={downloading !== null}
                      className={cn(
                        'btn-ghost shrink-0 !px-3 !py-1.5 text-xs',
                        downloading === file.id && 'opacity-70',
                      )}
                    >
                      {downloading === file.id ? 'Downloading…' : 'Download'}
                    </button>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className="btn-primary w-full sm:w-auto"
                onClick={() => download()}
                disabled={downloading !== null}
              >
                {downloading === 'primary' ? 'Downloading…' : 'Confirm download'}
              </button>

              {done ? (
                <p className="text-sm text-green">✓ Download started — check your downloads folder.</p>
              ) : null}
            </div>
          )}
        </div>
      </Reveal>

      <Reveal delay={0.12}>
        <p className="text-center text-xs text-muted">
          Questions about licensing?{' '}
          <Link to="/licenses" className="font-semibold text-deep-coral hover:underline">
            Read our licence guide
          </Link>
        </p>
      </Reveal>
    </div>
  );
}
