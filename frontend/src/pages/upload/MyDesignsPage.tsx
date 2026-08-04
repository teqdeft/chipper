import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { DataTable } from '@/components/ui/app/DataTable';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { FieldShell, TextInput, TextSelect } from '@/components/ui/app/FormField';
import { ErrorState, LoadingState } from '@/components/ui/app/LoadingState';
import { Pagination } from '@/components/ui/app/Pagination';
import { Reveal } from '@/components/ui/Reveal';
import { useApiResource } from '@/hooks/useApiResource';
import { useToast } from '@/app/providers/ToastProvider';
import { designApi } from '@/lib/api/designs';
import type { OwnDesignListItem } from '@/lib/api/designs';
import { formatListDate } from '@/lib/utils';

const STATUS_FILTERS = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Drafts' },
  { value: 'pending', label: 'Under review' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

function statusTone(status: OwnDesignListItem['status']) {
  if (status === 'published') return 'green' as const;
  if (status === 'pending') return 'yellow' as const;
  if (status === 'rejected') return 'coral' as const;
  return 'ink' as const;
}

function statusLabel(status: OwnDesignListItem['status']) {
  if (status === 'pending') return 'under review';
  return status;
}

export default function MyDesignsPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [publishing, setPublishing] = useState<string | null>(null);

  const params = useMemo(
    () => ({ page, limit: 20, search: search.trim() || undefined, status: status ? [status] : undefined }),
    [page, search, status],
  );

  const designs = useApiResource(() => designApi.mine(params), [params]);

  /**
   * A draft that already has files can be sent to review straight from here.
   * `versionId` targets a version branched behind a live one — without it the
   * API resubmits whichever version is currently published.
   */
  const submitForReview = useCallback(
    async (design: OwnDesignListItem, versionId?: number) => {
      setPublishing(design.slug);
      try {
        const result = await designApi.publish(design.slug, versionId ? { versionId } : {});
        toast.success(result.requiresReview ? 'Sent for review' : 'Published', result.message);
        designs.reload();
      } catch (error) {
        toast.fromError(error);
      } finally {
        setPublishing(null);
      }
    },
    [designs, toast],
  );

  const rows = designs.data?.items ?? [];
  const hasFilters = Boolean(search.trim() || status);

  return (
    <div className="container-content space-y-8">
      <PageHeader
        eyebrow="SCR-022 · My designs"
        title="Your uploads"
        lede="Manage drafts, published designs and pending reviews. Edit metadata or publish a new version."
        actions={
          <Link to="/upload" className="btn-primary">
            New upload
          </Link>
        }
      />

      <Reveal delay={0.05} className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <FieldShell label="Search" className="flex-1">
          <TextInput
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search your designs…"
          />
        </FieldShell>
        <FieldShell label="Status" className="w-full sm:w-56">
          <TextSelect
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            {STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </TextSelect>
        </FieldShell>
      </Reveal>

      {designs.error ? (
        <ErrorState error={designs.error} onRetry={designs.reload} />
      ) : designs.isLoading && !designs.data ? (
        <LoadingState label="Loading your designs…" />
      ) : rows.length === 0 ? (
        <Reveal delay={0.06}>
          <EmptyState
            title={hasFilters ? 'Nothing matches those filters' : 'No designs yet'}
            body={
              hasFilters
                ? 'Try a different status or search term.'
                : 'Upload your first organ-on-chip design to share it with the community.'
            }
            actionLabel={hasFilters ? undefined : 'Start upload'}
            actionTo={hasFilters ? undefined : '/upload'}
          />
        </Reveal>
      ) : (
        <div className="space-y-4">
          <DataTable
            rows={rows}
            empty={<EmptyState title="No designs" actionLabel="Upload" actionTo="/upload" />}
            columns={[
              {
                key: 'title',
                header: 'Design',
                render: (row) => (
                  <div className="min-w-[200px]">
                    <Link
                      to={`/designs/${encodeURIComponent(row.slug)}`}
                      className="font-semibold text-aubergine hover:text-deep-coral"
                    >
                      {row.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted line-clamp-2">{row.summary}</p>
                  </div>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                render: (row) => (
                  <StatusBadge tone={statusTone(row.status)}>{statusLabel(row.status)}</StatusBadge>
                ),
              },
              {
                key: 'version',
                header: 'Version',
                render: (row) => (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {row.version ? <span className="pill">{row.version}</span> : '—'}
                    {/* A version branched behind the live one is invisible in the
                        status column, which still reads "published". */}
                    {row.pendingVersion ? (
                      <span className="pill whitespace-nowrap text-deep-coral">
                        {row.pendingVersion.version}{' '}
                        {row.pendingVersion.status === 'pending' ? 'in review' : 'draft'}
                      </span>
                    ) : null}
                  </div>
                ),
              },
              {
                key: 'updated',
                header: 'Updated',
                className: 'whitespace-nowrap',
                render: (row) => <span className="text-muted">{formatListDate(row.updatedAt)}</span>,
              },
              {
                key: 'stats',
                header: 'Engagement',
                className: 'whitespace-nowrap',
                render: (row) => (
                  <span className="text-muted">
                    {row.downloads} dl · {row.stars} ★
                  </span>
                ),
              },
              {
                key: 'actions',
                header: '',
                className: 'text-right',
                render: (row) => (
                  <div className="flex flex-wrap justify-end gap-3">
                    <Link
                      to={`/my-designs/${encodeURIComponent(row.slug)}/edit`}
                      className="text-xs font-semibold text-deep-coral hover:underline"
                    >
                      Edit
                    </Link>

                    {/* Only a live design can be versioned — an unpublished one
                        is edited in place instead. */}
                    {row.status === 'published' && !row.pendingVersion ? (
                      <Link
                        to={`/my-designs/${encodeURIComponent(row.slug)}/new-version`}
                        className="text-xs font-semibold text-deep-coral hover:underline"
                      >
                        New version
                      </Link>
                    ) : null}

                    {row.pendingVersion?.status === 'draft' ? (
                      <button
                        type="button"
                        onClick={() => submitForReview(row, row.pendingVersion!.id)}
                        disabled={publishing === row.slug}
                        className="text-xs font-semibold text-muted hover:text-aubergine hover:underline disabled:opacity-50"
                      >
                        {publishing === row.slug
                          ? 'Submitting…'
                          : `Submit ${row.pendingVersion.version}`}
                      </button>
                    ) : row.status === 'draft' ? (
                      <button
                        type="button"
                        onClick={() => submitForReview(row)}
                        disabled={publishing === row.slug}
                        className="text-xs font-semibold text-muted hover:text-aubergine hover:underline disabled:opacity-50"
                      >
                        {publishing === row.slug ? 'Submitting…' : 'Submit for review'}
                      </button>
                    ) : null}
                  </div>
                ),
              },
            ]}
          />

          <Pagination pagination={designs.data?.pagination} onPage={setPage} />
        </div>
      )}
    </div>
  );
}
