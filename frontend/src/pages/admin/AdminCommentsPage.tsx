import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AdminActionBar,
  AdminActionButton,
  AdminFilterSelect,
  AdminSearchField,
  AdminToolbar,
  AdminToolbarButton,
} from '@/components/admin';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { ErrorState, LoadingState } from '@/components/ui/app/LoadingState';
import { Pagination } from '@/components/ui/app/Pagination';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { useApiResource } from '@/hooks/useApiResource';
import { useToast } from '@/app/providers/ToastProvider';
import { adminApi } from '@/lib/api/admin';
import type { AdminComment } from '@/lib/api/admin';

const statusTone: Record<AdminComment['status'], 'green' | 'yellow' | 'coral'> = {
  visible: 'green',
  hidden: 'yellow',
  removed: 'coral',
};

/** SCR-036 — Manage comments (CHIP-031). */
export default function AdminCommentsPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<number | null>(null);

  const { data, isLoading, error, reload, setData } = useApiResource(
    () =>
      adminApi.comments({
        page,
        limit: 20,
        status: statusFilter || undefined,
        search: submittedSearch || undefined,
      }),
    [page, statusFilter, submittedSearch],
  );

  async function moderate(comment: AdminComment, action: 'hide' | 'restore' | 'remove') {
    if (action === 'remove' && !window.confirm('Remove this comment permanently from the design page?')) {
      return;
    }

    setBusyId(comment.id);
    try {
      await adminApi.moderateEntity('design_comment', comment.id, action);
      const nextStatus = action === 'hide' ? 'hidden' : action === 'remove' ? 'removed' : 'visible';
      if (data) {
        setData({
          ...data,
          items: data.items.map((c) => (c.id === comment.id ? { ...c, status: nextStatus } : c)),
        });
      }
      toast.success(
        action === 'hide' ? 'Comment hidden' : action === 'remove' ? 'Comment removed' : 'Comment restored',
        `On "${comment.design.title}" — the author has been notified.`,
      );
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
        title="Comments"
        lede="Every comment across the design library. Hide spam, restore mistakes."
      />

      <AdminToolbar
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSubmittedSearch(search);
        }}
      >
        <AdminSearchField
          placeholder="Search comment text…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search comments"
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
          {(['visible', 'hidden', 'removed'] as const).map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </AdminFilterSelect>
        <AdminToolbarButton>Search</AdminToolbarButton>
      </AdminToolbar>

      {isLoading ? (
        <LoadingState label="Loading comments…" />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data || data.items.length === 0 ? (
        <Reveal delay={0.06}>
          <EmptyState title="No comments" body="Nothing matches this filter yet." />
        </Reveal>
      ) : (
        <>
          <RevealGroup className="space-y-3" stagger={0.04}>
            {data.items.map((comment) => {
              const busy = busyId === comment.id;
              return (
                <RevealItem key={comment.id}>
                  <div className="rounded-card border border-line bg-surface p-5 shadow-soft">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge tone={statusTone[comment.status]}>{comment.status}</StatusBadge>
                          <span className="text-sm font-semibold text-aubergine">
                            {comment.author.name}
                            <span className="font-normal text-muted"> on </span>
                            <Link
                              to={`/designs/${comment.design.slug}`}
                              className="hover:text-deep-coral hover:underline"
                            >
                              {comment.design.title}
                            </Link>
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-muted">{comment.body}</p>
                        <p className="mt-2 text-xs text-muted">
                          @{comment.author.handle} · {new Date(comment.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      <AdminActionBar className="shrink-0">
                        {comment.status === 'visible' ? (
                          <AdminActionButton disabled={busy} onClick={() => void moderate(comment, 'hide')}>
                            Hide
                          </AdminActionButton>
                        ) : (
                          <AdminActionButton
                            tone="success"
                            disabled={busy}
                            onClick={() => void moderate(comment, 'restore')}
                          >
                            Restore
                          </AdminActionButton>
                        )}
                        {comment.status !== 'removed' ? (
                          <AdminActionButton
                            tone="danger"
                            disabled={busy}
                            onClick={() => void moderate(comment, 'remove')}
                          >
                            Remove
                          </AdminActionButton>
                        ) : null}
                      </AdminActionBar>
                    </div>
                  </div>
                </RevealItem>
              );
            })}
          </RevealGroup>

          <Pagination pagination={data.pagination} onPage={setPage} />
        </>
      )}
    </div>
  );
}
