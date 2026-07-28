import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { TextInput, TextSelect } from '@/components/ui/app/FormField';
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
        eyebrow="Administration"
        title="Comments"
        lede="Every comment across the design library. Hide spam, restore mistakes."
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
            placeholder="Search comment text…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <TextSelect
          className="w-40"
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value);
          }}
        >
          <option value="">All statuses</option>
          {(['visible', 'hidden', 'removed'] as const).map((status) => (
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
        <LoadingState label="Loading comments…" />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data || data.items.length === 0 ? (
        <Reveal delay={0.06}>
          <EmptyState title="No comments" body="Nothing matches this filter yet." />
        </Reveal>
      ) : (
        <>
          <RevealGroup className="space-y-3" stagger={0.05}>
            {data.items.map((comment) => {
              const busy = busyId === comment.id;
              return (
                <RevealItem key={comment.id}>
                  <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge tone={statusTone[comment.status]}>{comment.status}</StatusBadge>
                        <span className="text-sm font-semibold text-aubergine">
                          {comment.author.name}
                          <span className="font-normal text-ink-55"> on </span>
                          <Link
                            to={`/designs/${comment.design.slug}`}
                            className="hover:text-deep-coral hover:underline"
                          >
                            {comment.design.title}
                          </Link>
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-ink-70">{comment.body}</p>
                      <p className="mt-2 text-xs text-ink-40">
                        @{comment.author.handle} · {new Date(comment.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {comment.status === 'visible' ? (
                        <button
                          type="button"
                          disabled={busy}
                          className="rounded-field border border-line px-3 py-1.5 text-xs font-semibold text-ink-70 hover:bg-periwinkle-tint/50 disabled:opacity-40"
                          onClick={() => void moderate(comment, 'hide')}
                        >
                          Hide
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          className="rounded-field border border-green/40 bg-green/10 px-3 py-1.5 text-xs font-semibold text-[#0f7a52] hover:bg-green/20 disabled:opacity-40"
                          onClick={() => void moderate(comment, 'restore')}
                        >
                          Restore
                        </button>
                      )}
                      {comment.status !== 'removed' ? (
                        <button
                          type="button"
                          disabled={busy}
                          className="rounded-field border border-deep-coral/40 bg-coral/10 px-3 py-1.5 text-xs font-semibold text-deep-coral hover:bg-coral/20 disabled:opacity-40"
                          onClick={() => void moderate(comment, 'remove')}
                        >
                          Remove
                        </button>
                      ) : null}
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
