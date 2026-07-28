import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { TextSelect } from '@/components/ui/app/FormField';
import { ErrorState, LoadingState } from '@/components/ui/app/LoadingState';
import { Pagination } from '@/components/ui/app/Pagination';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { useApiResource } from '@/hooks/useApiResource';
import { useToast } from '@/app/providers/ToastProvider';
import { adminApi } from '@/lib/api/admin';
import type { AdminReport, ModerationSummary, ReportResolution } from '@/lib/api/admin';

const entityTone: Record<string, 'coral' | 'periwinkle' | 'yellow' | 'ink'> = {
  design: 'periwinkle',
  design_comment: 'coral',
  forum_topic: 'yellow',
  forum_post: 'yellow',
  message: 'coral',
  user: 'ink',
};

const statusTone: Record<AdminReport['status'], 'coral' | 'yellow' | 'green' | 'ink'> = {
  open: 'coral',
  reviewing: 'yellow',
  resolved: 'green',
  dismissed: 'ink',
};

/** The actions a moderator can take on a report, in escalation order. */
const RESOLUTIONS: Array<{ action: ReportResolution; label: string; destructive?: boolean }> = [
  { action: 'no-action', label: 'Dismiss' },
  { action: 'hide', label: 'Hide content' },
  { action: 'remove', label: 'Remove content', destructive: true },
  { action: 'warn', label: 'Warn owner' },
  { action: 'suspend', label: 'Suspend owner', destructive: true },
  { action: 'ban', label: 'Ban owner', destructive: true },
];

/** SCR-035 — Moderation queue (CHIP-031, CHIP-037, CHIP-052). */
export default function AdminModerationPage() {
  const toast = useToast();
  const [statusFilter, setStatusFilter] = useState('open');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<number | null>(null);

  const { data, isLoading, error, reload } = useApiResource(
    () => adminApi.reports({ page, limit: 15, status: statusFilter || undefined }),
    [page, statusFilter],
  );

  const summary = (data?.meta as { summary?: ModerationSummary } | undefined)?.summary;

  async function resolve(report: AdminReport, action: ReportResolution) {
    const chosen = RESOLUTIONS.find((r) => r.action === action);
    if (chosen?.destructive && !window.confirm(`${chosen.label} for this report? This affects real content.`)) {
      return;
    }

    setBusyId(report.id);
    try {
      await adminApi.resolveReport(report.id, action);
      toast.success('Report resolved', `Outcome: ${chosen?.label ?? action}. The reporter has been notified.`);
      // Refetch rather than patch: resolving changes counts and often removes
      // the row from the active filter.
      await reload();
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
        title="Moderation queue"
        lede="Review flagged designs, comments and forum posts reported by the community."
        actions={
          summary ? (
            summary.open > 0 ? (
              <StatusBadge tone="coral">{summary.open} open</StatusBadge>
            ) : (
              <StatusBadge tone="green">Queue clear</StatusBadge>
            )
          ) : null
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <TextSelect
          className="w-44"
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value);
          }}
        >
          <option value="">All reports</option>
          {(['open', 'reviewing', 'resolved', 'dismissed'] as const).map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </TextSelect>
        {summary ? (
          <p className="text-xs text-ink-55">
            {summary.open} open · {summary.reviewing} reviewing · {summary.resolved} resolved ·{' '}
            {summary.dismissed} dismissed
            {summary.pendingDesigns > 0 ? (
              <>
                {' · '}
                <Link to="/admin/designs" className="font-semibold text-deep-coral hover:underline">
                  {summary.pendingDesigns} designs awaiting review →
                </Link>
              </>
            ) : null}
          </p>
        ) : null}
      </div>

      {isLoading ? (
        <LoadingState label="Loading the queue…" />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data || data.items.length === 0 ? (
        <Reveal delay={0.06}>
          <EmptyState
            title={statusFilter === 'open' ? 'Nothing flagged' : 'No reports match this filter'}
            body="When members report content, it will appear here for review."
          />
        </Reveal>
      ) : (
        <>
          <RevealGroup className="space-y-3" stagger={0.05}>
            {data.items.map((report) => {
              const busy = busyId === report.id;
              const isOpen = report.status === 'open' || report.status === 'reviewing';

              return (
                <RevealItem key={report.id}>
                  <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge tone={entityTone[report.entityType] ?? 'ink'}>
                          {report.entityType.replace('_', ' ')}
                        </StatusBadge>
                        <StatusBadge tone={statusTone[report.status]}>{report.status}</StatusBadge>
                        <span className="font-semibold text-aubergine">
                          {report.entity?.label ?? '[content removed]'}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-ink-55">
                        <span className="font-semibold capitalize">{report.reason}</span>
                        {report.details ? ` — ${report.details}` : ''}
                      </p>
                      <p className="mt-2 text-xs text-ink-40">
                        Reported by {report.reporter ? `@${report.reporter.handle}` : 'system'} ·{' '}
                        {new Date(report.createdAt).toLocaleDateString()}
                        {report.handledBy ? ` · handled by ${report.handledBy} (${report.resolution})` : ''}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {report.entity?.link ? (
                        <Link
                          to={report.entity.link}
                          className="rounded-field border border-line px-3 py-1.5 text-xs font-semibold text-aubergine hover:bg-periwinkle-tint/50"
                        >
                          View
                        </Link>
                      ) : null}

                      {isOpen
                        ? RESOLUTIONS.map(({ action, label, destructive }) => (
                            <button
                              key={action}
                              type="button"
                              disabled={busy}
                              className={
                                destructive
                                  ? 'rounded-field border border-deep-coral/40 bg-coral/10 px-3 py-1.5 text-xs font-semibold text-deep-coral hover:bg-coral/20 disabled:opacity-40'
                                  : 'rounded-field border border-line px-3 py-1.5 text-xs font-semibold text-ink-70 hover:bg-periwinkle-tint/50 disabled:opacity-40'
                              }
                              onClick={() => void resolve(report, action)}
                            >
                              {label}
                            </button>
                          ))
                        : null}
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
