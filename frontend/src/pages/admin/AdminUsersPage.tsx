import { useState } from 'react';
import {
  AdminActionBar,
  AdminActionButton,
  AdminFilterSelect,
  AdminSearchField,
  AdminToolbar,
  AdminToolbarButton,
} from '@/components/admin';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { DataTable } from '@/components/ui/app/DataTable';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { TextSelect } from '@/components/ui/app/FormField';
import { ErrorState, LoadingState } from '@/components/ui/app/LoadingState';
import { Pagination } from '@/components/ui/app/Pagination';
import { useApiResource } from '@/hooks/useApiResource';
import { useToast } from '@/app/providers/ToastProvider';
import { useAuth } from '@/app/providers/AuthProvider';
import { AWARDABLE_BADGES, adminApi } from '@/lib/api/admin';
import type { AdminUser } from '@/lib/api/admin';
import type { Role, UserStatus } from '@/lib/api/types';

const roleTone: Record<string, 'ink' | 'periwinkle' | 'coral' | 'green' | 'yellow'> = {
  user: 'ink',
  uploader: 'periwinkle',
  commercial: 'yellow',
  moderator: 'coral',
  admin: 'green',
};

const statusTone: Record<UserStatus, 'green' | 'yellow' | 'coral' | 'ink'> = {
  active: 'green',
  pending: 'yellow',
  suspended: 'coral',
  banned: 'ink',
};

const ASSIGNABLE_ROLES: Role[] = ['user', 'uploader', 'commercial', 'moderator', 'admin'];

/** SCR-033 — Manage users (CHIP-036). */
export default function AdminUsersPage() {
  const toast = useToast();
  const { user: me } = useAuth();

  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<number | null>(null);

  const { data, isLoading, error, reload, setData } = useApiResource(
    () =>
      adminApi.users({
        page,
        limit: 20,
        search: submittedSearch || undefined,
        role: (roleFilter || undefined) as Role | undefined,
        status: (statusFilter || undefined) as UserStatus | undefined,
      }),
    [page, submittedSearch, roleFilter, statusFilter],
  );

  function patchRow(updated: AdminUser) {
    if (!data) return;
    setData({ ...data, items: data.items.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)) });
  }

  async function changeRole(row: AdminUser, role: Role) {
    setBusyId(row.id);
    try {
      patchRow(await adminApi.changeRole(row.id, role));
      toast.success('Role updated', `${row.name} is now a ${role}.`);
    } catch (err) {
      toast.fromError(err);
    } finally {
      setBusyId(null);
    }
  }

  async function changeStatus(row: AdminUser, status: UserStatus) {
    if (
      status !== 'active' &&
      !window.confirm(
        `${status === 'banned' ? 'Ban' : 'Suspend'} ${row.name}? Their sessions end immediately.`,
      )
    ) {
      return;
    }
    setBusyId(row.id);
    try {
      patchRow(await adminApi.changeStatus(row.id, status));
      toast.success(
        status === 'active' ? 'Account reactivated' : `Account ${status}`,
        `${row.name} (@${row.handle})`,
      );
    } catch (err) {
      toast.fromError(err);
    } finally {
      setBusyId(null);
    }
  }

  async function awardBadge(row: AdminUser, badge: string) {
    if (!badge) return;
    setBusyId(row.id);
    try {
      await adminApi.awardBadge(row.id, badge);
      const label = AWARDABLE_BADGES.find((b) => b.slug === badge)?.name ?? badge;
      toast.success('Badge awarded', `${label} → ${row.name}`);
    } catch (err) {
      toast.fromError(err);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Community"
        title="Users"
        lede="Manage roles, award badges, and monitor community reputation."
      />

      <AdminToolbar
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSubmittedSearch(search);
        }}
      >
        <AdminSearchField
          placeholder="Search name, handle, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search users"
        />
        <AdminFilterSelect
          value={roleFilter}
          onChange={(e) => {
            setPage(1);
            setRoleFilter(e.target.value);
          }}
          aria-label="Filter by role"
        >
          <option value="">All roles</option>
          {ASSIGNABLE_ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </AdminFilterSelect>
        <AdminFilterSelect
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value);
          }}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {(['active', 'pending', 'suspended', 'banned'] as const).map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </AdminFilterSelect>
        <AdminToolbarButton>Search</AdminToolbarButton>
      </AdminToolbar>

      {isLoading ? (
        <LoadingState label="Loading users…" />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data ? null : (
        <>
          <DataTable
            rows={data.items.map((row) => ({ ...row, id: String(row.id) }))}
            columns={[
              {
                key: 'user',
                header: 'User',
                render: (row) => (
                  <div>
                    <p className="font-semibold">{row.name}</p>
                    <p className="text-xs text-muted">
                      @{row.handle} · {row.email}
                    </p>
                  </div>
                ),
              },
              {
                key: 'affiliation',
                header: 'Affiliation',
                render: (row) => <span className="text-muted">{row.affiliation ?? '—'}</span>,
              },
              {
                key: 'role',
                header: 'Role',
                render: (row) => <StatusBadge tone={roleTone[row.role] ?? 'ink'}>{row.role}</StatusBadge>,
              },
              {
                key: 'status',
                header: 'Status',
                render: (row) => (
                  <div>
                    <StatusBadge tone={statusTone[row.status]}>{row.status}</StatusBadge>
                    {!row.emailVerified ? (
                      <p className="mt-1 text-[0.65rem] text-muted">unverified email</p>
                    ) : null}
                  </div>
                ),
              },
              {
                key: 'reputation',
                header: 'Reputation',
                className: 'tabular-nums',
                render: (row) => row.reputation.toLocaleString(),
              },
              { key: 'uploads', header: 'Uploads', className: 'tabular-nums', render: (row) => row.uploads },
              {
                key: 'actions',
                header: 'Actions',
                render: (row) => {
                  const isSelf = me != null && Number(row.id) === Number(me.id);
                  const busy = busyId === Number(row.id);
                  if (isSelf) return <span className="text-xs text-muted">This is you</span>;

                  const original = data.items.find((u) => u.id === Number(row.id));
                  if (!original) return null;

                  return (
                    <AdminActionBar>
                      <TextSelect
                        className="!w-auto !px-2 !py-1 text-xs"
                        value={row.role}
                        disabled={busy}
                        onChange={(e) => void changeRole(original, e.target.value as Role)}
                        aria-label={`Change role for ${row.name}`}
                      >
                        {ASSIGNABLE_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </TextSelect>

                      <TextSelect
                        className="!w-auto !px-2 !py-1 text-xs"
                        defaultValue=""
                        disabled={busy}
                        onChange={(e) => {
                          const badge = e.target.value;
                          e.target.value = '';
                          void awardBadge(original, badge);
                        }}
                        aria-label={`Award badge to ${row.name}`}
                      >
                        <option value="" disabled>
                          Award badge…
                        </option>
                        {AWARDABLE_BADGES.map((badge) => (
                          <option key={badge.slug} value={badge.slug}>
                            {badge.name}
                          </option>
                        ))}
                      </TextSelect>

                      {row.status === 'active' || row.status === 'pending' ? (
                        <>
                          <AdminActionButton disabled={busy} onClick={() => void changeStatus(original, 'suspended')}>
                            Suspend
                          </AdminActionButton>
                          <AdminActionButton
                            tone="danger"
                            disabled={busy}
                            onClick={() => void changeStatus(original, 'banned')}
                          >
                            Ban
                          </AdminActionButton>
                        </>
                      ) : (
                        <AdminActionButton
                          tone="success"
                          disabled={busy}
                          onClick={() => void changeStatus(original, 'active')}
                        >
                          Reactivate
                        </AdminActionButton>
                      )}
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
