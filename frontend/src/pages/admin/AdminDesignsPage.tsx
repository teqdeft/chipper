import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { DataTable } from '@/components/ui/app/DataTable';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { TextInput, TextSelect } from '@/components/ui/app/FormField';
import { ErrorState, LoadingState } from '@/components/ui/app/LoadingState';
import { Pagination } from '@/components/ui/app/Pagination';
import { useApiResource } from '@/hooks/useApiResource';
import { useToast } from '@/app/providers/ToastProvider';
import { adminApi } from '@/lib/api/admin';
import type { AdminDesign, DesignReviewAction } from '@/lib/api/admin';

const statusTone: Record<AdminDesign['status'], 'green' | 'yellow' | 'coral' | 'ink'> = {
  published: 'green',
  pending: 'yellow',
  rejected: 'coral',
  draft: 'ink',
  archived: 'ink',
};

const STATUS_AFTER: Record<DesignReviewAction, AdminDesign['status']> = {
  approve: 'published',
  reject: 'rejected',
  archive: 'archived',
  restore: 'published',
  unpublish: 'draft',
};

/** SCR-034 — Manage designs (CHIP-037). */
export default function AdminDesignsPage() {
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, isLoading, error, reload, setData } = useApiResource(
    () =>
      adminApi.designs({
        page,
        limit: 20,
        search: submittedSearch || undefined,
        status: statusFilter || undefined,
      }),
    [page, submittedSearch, statusFilter],
  );

  const pendingCount = data?.items.filter((d) => d.status === 'pending').length ?? 0;

  async function review(row: AdminDesign, action: DesignReviewAction) {
    // Rejection deserves a reason — the uploader is notified with it.
    let note: string | undefined;
    if (action === 'reject') {
      const answer = window.prompt(`Reject "${row.title}" — add a note for the uploader (optional):`);
      if (answer === null) return; // cancelled
      note = answer || undefined;
    }

    setBusyId(row.id);
    try {
      await adminApi.reviewDesign(row.slug, action, note);
      if (data) {
        setData({
          ...data,
          items: data.items.map((d) => (d.id === row.id ? { ...d, status: STATUS_AFTER[action] } : d)),
        });
      }
      toast.success(
        action === 'approve'
          ? 'Design published'
          : action === 'reject'
            ? 'Design rejected'
            : `Design ${STATUS_AFTER[action]}`,
        `${row.title} — the uploader has been notified.`,
      );
    } catch (err) {
      toast.fromError(err);
    } finally {
      setBusyId(null);
    }
  }

  async function toggleFeatured(row: AdminDesign) {
    setBusyId(row.id);
    try {
      const result = await adminApi.featureDesign(row.slug, !row.featured);
      if (data) {
        setData({
          ...data,
          items: data.items.map((d) => (d.id === row.id ? { ...d, featured: result.featured } : d)),
        });
      }
      toast.success(result.featured ? 'Featured on the home page' : 'Removed from featured', row.title);
    } catch (err) {
      toast.fromError(err);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Administration"
        title="Designs"
        lede="Review pending uploads, publish approved work and archive outdated versions."
        actions={
          pendingCount > 0 ? <StatusBadge tone="yellow">{pendingCount} pending on this page</StatusBadge> : null
        }
      />

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSubmittedSearch(search);
        }}
      >
        <div className="min-w-[220px] flex-1">
          <TextInput
            placeholder="Search title, summary or author…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <TextSelect
          className="w-44"
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value);
          }}
        >
          <option value="">All statuses</option>
          {(['pending', 'published', 'draft', 'rejected', 'archived'] as const).map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </TextSelect>
        <button type="submit" className="btn-ghost text-sm">
          Search
        </button>
      </form>

      {isLoading ? (
        <LoadingState label="Loading designs…" />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data ? null : (
        <>
          <DataTable
            rows={data.items}
            columns={[
              {
                key: 'title',
                header: 'Design',
                render: (row) => (
                  <div>
                    <Link to={`/designs/${row.slug}`} className="font-semibold hover:text-deep-coral">
                      {row.title}
                    </Link>
                    <p className="text-xs text-ink-55">
                      {[row.componentType, row.license].filter(Boolean).join(' · ') || '—'}
                      {row.featured ? ' · ★ featured' : ''}
                    </p>
                  </div>
                ),
              },
              {
                key: 'author',
                header: 'Author',
                render: (row) => (
                  <Link to={`/u/${row.authorHandle}`} className="text-ink-70 hover:text-deep-coral">
                    {row.author}
                  </Link>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                render: (row) => <StatusBadge tone={statusTone[row.status]}>{row.status}</StatusBadge>,
              },
              {
                key: 'iso',
                header: 'ISO 22916',
                render: (row) =>
                  row.iso22916 ? (
                    <StatusBadge tone="green">Compliant</StatusBadge>
                  ) : (
                    <StatusBadge tone="ink">—</StatusBadge>
                  ),
              },
              {
                key: 'downloads',
                header: 'Downloads',
                className: 'tabular-nums',
                render: (row) => row.downloads.toLocaleString(),
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (row) => {
                  const busy = busyId === row.id;
                  return (
                    <div className="flex flex-wrap gap-1.5">
                      {row.status === 'pending' ? (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            className="rounded-field border border-green/40 bg-green/10 px-2 py-1 text-[0.7rem] font-semibold text-[#0f7a52] hover:bg-green/20 disabled:opacity-40"
                            onClick={() => void review(row, 'approve')}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            className="rounded-field border border-deep-coral/40 bg-coral/10 px-2 py-1 text-[0.7rem] font-semibold text-deep-coral hover:bg-coral/20 disabled:opacity-40"
                            onClick={() => void review(row, 'reject')}
                          >
                            Reject
                          </button>
                        </>
                      ) : null}

                      {row.status === 'published' ? (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            className="rounded-field border border-line px-2 py-1 text-[0.7rem] font-semibold text-ink-70 hover:bg-periwinkle-tint/50 disabled:opacity-40"
                            onClick={() => void toggleFeatured(row)}
                          >
                            {row.featured ? 'Unfeature' : 'Feature'}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            className="rounded-field border border-line px-2 py-1 text-[0.7rem] font-semibold text-ink-70 hover:bg-periwinkle-tint/50 disabled:opacity-40"
                            onClick={() => void review(row, 'archive')}
                          >
                            Archive
                          </button>
                        </>
                      ) : null}

                      {row.status === 'archived' || row.status === 'rejected' ? (
                        <button
                          type="button"
                          disabled={busy}
                          className="rounded-field border border-line px-2 py-1 text-[0.7rem] font-semibold text-ink-70 hover:bg-periwinkle-tint/50 disabled:opacity-40"
                          onClick={() => void review(row, 'restore')}
                        >
                          Restore
                        </button>
                      ) : null}
                    </div>
                  );
                },
              },
            ]}
          />

          <Pagination pagination={data.pagination} onPage={setPage} />
        </>
      )}
    </div>
  );
}
