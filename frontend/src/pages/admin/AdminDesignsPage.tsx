import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AdminActionBar,
  AdminActionButton,
  AdminFilterSelect,
  AdminSearchField,
  AdminToolbar,
} from '@/components/admin';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { DataTable } from '@/components/ui/app/DataTable';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { ErrorState, LoadingState } from '@/components/ui/app/LoadingState';
import { Pagination } from '@/components/ui/app/Pagination';
import { useApiResource } from '@/hooks/useApiResource';
import { useLiveSearch } from '@/hooks/useLiveSearch';
import { useAuth } from '@/app/providers/AuthProvider';
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
  const { hasPermission } = useAuth();
  const canDelete = hasPermission('design.delete.any');

  const search = useLiveSearch();
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, isLoading, error, reload, setData } = useApiResource(
    () =>
      adminApi.designs({
        page,
        limit: 20,
        search: search.query || undefined,
        status: statusFilter || undefined,
      }),
    [page, search.query, statusFilter],
  );

  const pendingCount = data?.items.filter((d) => d.status === 'pending').length ?? 0;

  async function review(row: AdminDesign, action: DesignReviewAction) {
    let note: string | undefined;
    if (action === 'reject') {
      const answer = window.prompt(`Reject "${row.title}" — add a note for the uploader (optional):`);
      if (answer === null) return;
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

  async function destroy(row: AdminDesign) {
    const confirmed = window.confirm(
      `Permanently delete "${row.title}"?\n\n` +
        'Every version, file, comment and star goes with it, and the uploaded files are ' +
        'removed from disk. This cannot be undone — use Archive if you only want it hidden.',
    );
    if (!confirmed) return;

    const answer = window.prompt('Reason for the uploader (optional):');
    if (answer === null) return;

    setBusyId(row.id);
    try {
      const result = await adminApi.deleteDesign(row.slug, answer || undefined);
      toast.success(
        'Design deleted',
        `${result.title} and ${result.files} ${result.files === 1 ? 'file' : 'files'} were removed.`,
      );
      reload();
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
        eyebrow="Moderation"
        title="Designs"
        lede="Review pending uploads, publish approved work, archive outdated versions — or delete one outright."
        actions={
          pendingCount > 0 ? <StatusBadge tone="yellow">{pendingCount} pending on this page</StatusBadge> : null
        }
      />

      <AdminToolbar
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          search.flush();
        }}
      >
        <AdminSearchField
          placeholder="Search title, summary or author…"
          value={search.value}
          onChange={(e) => {
            setPage(1);
            search.setValue(e.target.value);
          }}
          onClear={() => {
            setPage(1);
            search.clear();
          }}
          aria-label="Search designs"
        />
        <AdminFilterSelect
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value);
          }}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {(['pending', 'published', 'draft', 'rejected', 'archived'] as const).map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </AdminFilterSelect>
      </AdminToolbar>

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
                    <p className="text-xs text-muted">
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
                  <Link to={`/u/${row.authorHandle}`} className="text-muted hover:text-deep-coral">
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
                    <AdminActionBar>
                      {row.status === 'pending' ? (
                        <>
                          <AdminActionButton tone="success" disabled={busy} onClick={() => void review(row, 'approve')}>
                            Approve
                          </AdminActionButton>
                          <AdminActionButton tone="danger" disabled={busy} onClick={() => void review(row, 'reject')}>
                            Reject
                          </AdminActionButton>
                        </>
                      ) : null}

                      {row.status === 'published' ? (
                        <>
                          <AdminActionButton disabled={busy} onClick={() => void toggleFeatured(row)}>
                            {row.featured ? 'Unfeature' : 'Feature'}
                          </AdminActionButton>
                          <AdminActionButton disabled={busy} onClick={() => void review(row, 'archive')}>
                            Archive
                          </AdminActionButton>
                        </>
                      ) : null}

                      {row.status === 'archived' || row.status === 'rejected' ? (
                        <AdminActionButton disabled={busy} onClick={() => void review(row, 'restore')}>
                          Restore
                        </AdminActionButton>
                      ) : null}

                      {canDelete ? (
                        <AdminActionButton
                          tone="danger"
                          disabled={busy}
                          title="Permanently deletes the design and its files — archive instead to keep them"
                          onClick={() => void destroy(row)}
                        >
                          Delete
                        </AdminActionButton>
                      ) : null}
                    </AdminActionBar>
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
