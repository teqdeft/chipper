import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AdminActionBar,
  AdminActionButton,
  AdminFilterSelect,
  AdminStatCard,
  AdminToolbar,
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

  async function claim(report: AdminReport) {
    setBusyId(report.id);
    try {
      await adminApi.claimReport(report.id);
      toast.success('Report claimed', 'You are now reviewing this report.');
      await reload();
    } catch (err) {
      toast.fromError(err);
    } finally {
      setBusyId(null);
    }
  }

  async function resolve(report: AdminReport, action: ReportResolution) {
    const chosen = RESOLUTIONS.find((r) => r.action === action);
    if (chosen?.destructive && !window.confirm(`${chosen.label} for this report? This affects real content.`)) {
      return;
    }

    setBusyId(report.id);
    try {
      await adminApi.resolveReport(report.id, action);
      toast.success('Report resolved', `Outcome: ${chosen?.label ?? action}. The reporter has been notified.`);
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
        eyebrow="Moderation"
        title="Reports"
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

      {summary ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AdminStatCard label="Open" value={String(summary.open)} highlight={summary.open > 0} />
          <AdminStatCard label="Reviewing" value={String(summary.reviewing)} />
          <AdminStatCard label="Resolved" value={String(summary.resolved)} />
          <AdminStatCard
            label="Pending designs"
            value={String(summary.pendingDesigns)}
            highlight={summary.pendingDesigns > 0}
            action={
              summary.pendingDesigns > 0 ? (
                <Link to="/admin/designs" className="text-xs font-semibold text-deep-coral hover:underline">
                  Review designs →
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : null}

      <AdminToolbar>
        <AdminFilterSelect
          className="w-36"
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value);
          }}
          aria-label="Filter reports"
        >
          <option value="">All reports</option>
          {(['open', 'reviewing', 'resolved', 'dismissed'] as const).map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </AdminFilterSelect>
      </AdminToolbar>

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
          <RevealGroup className="space-y-3" stagger={0.04}>
            {data.items.map((report) => {
              const busy = busyId === report.id;
              const isOpen = report.status === 'open' || report.status === 'reviewing';

              return (
                <RevealItem key={report.id}>
                  <div className="rounded-card border border-line bg-surface p-5 shadow-soft">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
                        <p className="mt-2 text-sm text-muted">
                          <span className="font-semibold capitalize">{report.reason}</span>
                          {report.details ? ` — ${report.details}` : ''}
                        </p>
                        <p className="mt-2 text-xs text-muted">
                          Reported by {report.reporter ? `@${report.reporter.handle}` : 'system'} ·{' '}
                          {new Date(report.createdAt).toLocaleDateString()}
                          {report.handledBy ? ` · handled by ${report.handledBy} (${report.resolution})` : ''}
                        </p>
                      </div>

                      <AdminActionBar className="shrink-0">
                        {report.entity?.link ? (
                          <Link
                            to={report.entity.link}
                            className="rounded-field border border-line px-2.5 py-1 text-[0.7rem] font-semibold text-aubergine hover:bg-periwinkle-tint/50"
                          >
                            View
                          </Link>
                        ) : null}

                        {report.status === 'open' ? (
                          <AdminActionButton tone="accent" disabled={busy} onClick={() => void claim(report)}>
                            Claim
                          </AdminActionButton>
                        ) : null}

                        {isOpen
                          ? RESOLUTIONS.map(({ action, label, destructive }) => (
                              <AdminActionButton
                                key={action}
                                tone={destructive ? 'danger' : 'default'}
                                disabled={busy}
                                onClick={() => void resolve(report, action)}
                              >
                                {label}
                              </AdminActionButton>
                            ))
                          : null}
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
