import { useState } from 'react';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { DataTable } from '@/components/ui/app/DataTable';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { mockUsers, type MockUser } from '@/lib/mock';

const roleTone: Record<MockUser['role'], 'ink' | 'periwinkle' | 'coral' | 'green'> = {
  user: 'ink',
  uploader: 'periwinkle',
  moderator: 'coral',
  admin: 'green',
};

/** SCR-033 — Admin users table with role actions. */
export default function AdminUsersPage() {
  const [users, setUsers] = useState<MockUser[]>(() => [...mockUsers, ...extraUsers]);

  const setRole = (id: string, role: MockUser['role']) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Administration"
        title="Users"
        lede="Manage roles, verify uploaders and monitor community reputation."
      />

      <DataTable
        rows={users}
        columns={[
          {
            key: 'user',
            header: 'User',
            render: (row) => (
              <div>
                <p className="font-semibold">{row.name}</p>
                <p className="text-xs text-ink-55">@{row.handle}</p>
              </div>
            ),
          },
          {
            key: 'affiliation',
            header: 'Affiliation',
            render: (row) => <span className="text-ink-70">{row.affiliation}</span>,
          },
          {
            key: 'role',
            header: 'Role',
            render: (row) => <StatusBadge tone={roleTone[row.role]}>{row.role}</StatusBadge>,
          },
          {
            key: 'reputation',
            header: 'Reputation',
            className: 'tabular-nums',
            render: (row) => row.reputation.toLocaleString(),
          },
          {
            key: 'uploads',
            header: 'Uploads',
            className: 'tabular-nums',
            render: (row) => row.uploads,
          },
          {
            key: 'actions',
            header: 'Actions',
            render: (row) => (
              <div className="flex flex-wrap gap-1.5">
                {(['user', 'uploader', 'moderator'] as const).map((role) => (
                  <button
                    key={role}
                    type="button"
                    disabled={row.role === role}
                    className="rounded-field border border-line px-2 py-1 text-[0.7rem] font-semibold capitalize text-ink-70 transition-colors hover:border-line-strong hover:bg-periwinkle-tint/50 disabled:opacity-40"
                    onClick={() => setRole(row.id, role)}
                  >
                    {role}
                  </button>
                ))}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}

const extraUsers: MockUser[] = [
  {
    id: 'u3',
    handle: 'chipper.mod',
    name: 'Chipper Moderation',
    affiliation: 'Chipper',
    role: 'moderator',
    bio: 'Platform moderation account.',
    badges: ['Staff'],
    expertise: ['Policy'],
    uploads: 0,
    reputation: 0,
  },
  {
    id: 'u4',
    handle: 'j.kim',
    name: 'J. Kim',
    affiliation: 'MIT',
    role: 'user',
    bio: 'Kidney-on-chip models.',
    badges: [],
    expertise: ['Kidney'],
    uploads: 1,
    reputation: 95,
  },
];
