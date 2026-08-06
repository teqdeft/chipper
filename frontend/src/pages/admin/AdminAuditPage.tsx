import { useState } from 'react';
import { AdminSearchField, AdminToolbar, AdminToolbarButton } from '@/components/admin';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { DataTable } from '@/components/ui/app/DataTable';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { ErrorState, LoadingState } from '@/components/ui/app/LoadingState';
import { Pagination } from '@/components/ui/app/Pagination';
import { useApiResource } from '@/hooks/useApiResource';
import { adminApi } from '@/lib/api/admin';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function formatScalar(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    if (!value.length) return '—';
    if (value.every((v) => typeof v === 'string' || typeof v === 'number')) {
      return value.join(', ');
    }
    return `${value.length} items`;
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value);
    if (!keys.length) return '—';
    if (keys.length <= 3) {
      return keys.map((k) => `${k}: ${formatScalar(value[k])}`).join(', ');
    }
    return `${keys.length} fields`;
  }
  return String(value);
}

/**
 * Turn audit `changes` payloads into a short human summary.
 * Common shapes: `{ before, after }`, `{ featured }`, `{ note }`, nested profile diffs.
 */
function formatAuditChanges(changes: unknown): string {
  if (changes == null || changes === '') return '—';

  let parsed: unknown = changes;
  if (typeof changes === 'string') {
    try {
      parsed = JSON.parse(changes);
    } catch {
      return changes;
    }
  }

  if (!isPlainObject(parsed)) return formatScalar(parsed);

  const { before, after, reason, note, featured, ...rest } = parsed;

  const parts: string[] = [];

  if (before !== undefined || after !== undefined) {
    // Nested before/after objects (e.g. profile edits) — summarise field names.
    if (isPlainObject(before) || isPlainObject(after)) {
      const beforeObj = isPlainObject(before) ? before : {};
      const afterObj = isPlainObject(after) ? after : {};
      const keys = Array.from(new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]));
      if (keys.length === 1) {
        const key = keys[0];
        parts.push(`${key}: ${formatScalar(beforeObj[key])} → ${formatScalar(afterObj[key])}`);
      } else if (keys.length > 1) {
        parts.push(`Updated ${keys.slice(0, 4).join(', ')}${keys.length > 4 ? '…' : ''}`);
      } else {
        parts.push(`${formatScalar(before)} → ${formatScalar(after)}`);
      }
    } else {
      parts.push(`${formatScalar(before)} → ${formatScalar(after)}`);
    }
  }

  if (typeof featured === 'boolean') {
    parts.push(featured ? 'Marked featured' : 'Removed from featured');
  }

  if (typeof reason === 'string' && reason.trim()) {
    parts.push(`Reason: ${reason.trim()}`);
  }

  if (typeof note === 'string' && note.trim()) {
    parts.push(`Note: ${note.trim()}`);
  }

  // Leftover simple keys (version, count, file, reportId, …)
  const leftover = Object.entries(rest).filter(([, v]) => v !== undefined && v !== null && v !== '');
  for (const [key, value] of leftover.slice(0, 3)) {
    if (isPlainObject(value) && (key === 'after' || key === 'before')) continue;
    if (isPlainObject(value)) {
      const nestedKeys = Object.keys(value);
      parts.push(
        nestedKeys.length
          ? `${key}: ${nestedKeys.slice(0, 3).join(', ')}${nestedKeys.length > 3 ? '…' : ''}`
          : `${key}: updated`,
      );
    } else {
      parts.push(`${key}: ${formatScalar(value)}`);
    }
  }
  if (leftover.length > 3) parts.push('…');

  return parts.length ? parts.join(' · ') : '—';
}

const ACTION_LABELS: Record<string, string> = {
  'admin.role_change': 'Role changed',
  'admin.user_active': 'Account reactivated',
  'admin.user_suspended': 'Account suspended',
  'admin.user_banned': 'Account banned',
  'admin.user_pending': 'Account set to pending',
  'admin.design_approve': 'Design approved',
  'admin.design_reject': 'Design rejected',
  'admin.design_archive': 'Design archived',
  'admin.design_restore': 'Design restored',
  'admin.design_unpublish': 'Design unpublished',
  'admin.design_delete': 'Design deleted',
  'admin.design_feature': 'Design featured',
  'auth.login': 'Signed in',
  'auth.register': 'Account registered',
  'auth.register_requested': 'Registration requested',
  'auth.password_reset': 'Password reset',
  'auth.password_change': 'Password changed',
  'user.profile_update': 'Profile updated',
  'user.delete_account': 'Account deleted',
  'design.create': 'Design created',
  'design.update': 'Design updated',
  'design.delete': 'Design deleted',
  'design.version_create': 'Design version created',
  'design.files_add': 'Design files added',
  'design.file_remove': 'Design file removed',
  'forum.topic_create': 'Forum topic created',
  'forum.topic_delete': 'Forum topic deleted',
  'forum.topic_moderate': 'Forum topic moderated',
  'moderation.hide': 'Content hidden',
  'moderation.remove': 'Content removed',
  'moderation.restore': 'Content restored',
  'moderation.warn': 'User warned',
  'moderation.suspend': 'User suspended',
  'moderation.ban': 'User banned',
  'moderation.no-action': 'Report dismissed',
};

function formatActionLabel(action: string): string {
  if (!action) return '—';
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];

  // Dynamic admin status / design review actions not in the map.
  if (action.startsWith('admin.user_')) {
    const status = action.replace('admin.user_', '');
    return `Account ${status}`;
  }
  if (action.startsWith('admin.design_')) {
    const verb = action.replace('admin.design_', '').replace(/_/g, ' ');
    return `Design ${verb}`;
  }
  if (action.startsWith('moderation.')) {
    const verb = action.replace('moderation.', '').replace(/-/g, ' ');
    return `Moderation: ${verb}`;
  }

  return action
    .replace(/^(admin|auth|user|design|forum|moderation)\./, '')
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Staff action audit trail. */
export default function AdminAuditPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [submittedAction, setSubmittedAction] = useState('');
  const [submittedEntity, setSubmittedEntity] = useState('');

  const { data, isLoading, error, reload } = useApiResource(
    () =>
      adminApi.auditLogs({
        page,
        limit: 25,
        action: submittedAction || undefined,
        entityType: submittedEntity || undefined,
      }),
    [page, submittedAction, submittedEntity],
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="System"
        title="Audit log"
        lede="Who changed what — roles, moderation outcomes, content edits and more."
      />

      <AdminToolbar
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSubmittedAction(action.trim());
          setSubmittedEntity(entityType.trim());
        }}
      >
        <AdminSearchField
          placeholder="Filter by action (e.g. admin.role_change)"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          aria-label="Filter by action"
        />
        <AdminSearchField
          className="sm:max-w-[14rem]"
          placeholder="Entity type (e.g. user)"
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          aria-label="Filter by entity type"
        />
        <AdminToolbarButton>Filter</AdminToolbarButton>
      </AdminToolbar>

      {isLoading ? (
        <LoadingState label="Loading audit log…" />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No audit events" body="Staff actions will appear here as they happen." />
      ) : (
        <>
          <DataTable
            rows={data.items.map((row) => ({ ...row, id: String(row.id) }))}
            columns={[
              {
                key: 'when',
                header: 'When',
                render: (row) => (
                  <span className="whitespace-nowrap text-xs tabular-nums text-muted">
                    {new Date(row.at).toLocaleString()}
                  </span>
                ),
              },
              {
                key: 'actor',
                header: 'Actor',
                render: (row) =>
                  row.actor ? (
                    <div>
                      <p className="font-semibold">{row.actor.name}</p>
                      <p className="text-xs text-muted">@{row.actor.handle}</p>
                    </div>
                  ) : (
                    <span className="text-muted">system</span>
                  ),
              },
              {
                key: 'action',
                header: 'Action',
                render: (row) => (
                  <span className="text-sm font-semibold text-aubergine" title={row.action}>
                    {formatActionLabel(row.action)}
                  </span>
                ),
              },
              {
                key: 'entity',
                header: 'Entity',
                render: (row) => (
                  <span className="text-sm text-muted">
                    {row.entityType ?? '—'}
                    {row.entityId != null ? ` #${row.entityId}` : ''}
                  </span>
                ),
              },
              {
                key: 'changes',
                header: 'Changes',
                render: (row) => (
                  <p className="max-w-sm text-sm leading-snug text-aubergine" title={formatAuditChanges(row.changes)}>
                    {formatAuditChanges(row.changes)}
                  </p>
                ),
              },
              {
                key: 'ip',
                header: 'IP',
                render: (row) => <span className="font-mono text-xs text-muted">{row.ip ?? '—'}</span>,
              },
            ]}
          />
          <Pagination pagination={data.pagination} onPage={setPage} />
        </>
      )}
    </div>
  );
}
