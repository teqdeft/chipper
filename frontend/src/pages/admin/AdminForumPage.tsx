import { useState } from 'react';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { DataTable } from '@/components/ui/app/DataTable';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { FieldShell, TextInput } from '@/components/ui/app/FormField';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { mockCategories, mockThreads } from '@/lib/mock';

type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  topics: number;
};

/** SCR-038 — Admin forum categories and thread controls. */
export default function AdminForumPage() {
  const [categories, setCategories] = useState<CategoryRow[]>(() =>
    mockCategories.map((c) => ({ ...c, id: c.slug })),
  );
  const [threads, setThreads] = useState(() => [...mockThreads]);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');

  const addCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newSlug.trim()) return;
    setCategories((prev) => [
      ...prev,
      { id: newSlug, slug: newSlug, name: newName.trim(), topics: 0 },
    ]);
    setNewName('');
    setNewSlug('');
  };

  const togglePin = (id: string) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === id ? { ...t, pinned: !t.pinned } : t)),
    );
  };

  const toggleLock = (id: string) => {
    setThreads((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: t.status === 'locked' ? 'open' : 'locked' }
          : t,
      ),
    );
  };

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Administration"
        title="Forum"
        lede="Manage categories and moderate threads — pin announcements or lock resolved discussions."
      />

      <Reveal delay={0.06} as="section" className="space-y-4">
        <h2 className="font-display text-base font-bold text-aubergine">Categories</h2>

        <DataTable
          rows={categories}
          columns={[
            {
              key: 'name',
              header: 'Name',
              render: (row) => <span className="font-semibold">{row.name}</span>,
            },
            {
              key: 'slug',
              header: 'Slug',
              render: (row) => <code className="text-xs text-ink-55">{row.slug}</code>,
            },
            {
              key: 'topics',
              header: 'Topics',
              className: 'tabular-nums',
              render: (row) => row.topics,
            },
          ]}
        />

        <Reveal delay={0.08}>
          <form onSubmit={addCategory} className="card grid gap-4 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <FieldShell label="Category name">
            <TextInput
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Cell culture"
            />
          </FieldShell>
          <FieldShell label="Slug">
            <TextInput
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              placeholder="e.g. cell-culture"
            />
          </FieldShell>
          <button type="submit" className="btn-primary text-sm">
            Add category
          </button>
          </form>
        </Reveal>
      </Reveal>

      <Reveal delay={0.1} as="section" className="space-y-4">
        <h2 className="font-display text-base font-bold text-aubergine">Thread controls</h2>

        <DataTable
          rows={threads}
          columns={[
            {
              key: 'title',
              header: 'Topic',
              render: (row) => (
                <div>
                  <p className="font-semibold">{row.title}</p>
                  <p className="text-xs text-ink-55">{row.category}</p>
                </div>
              ),
            },
            {
              key: 'flags',
              header: 'Status',
              render: (row) => (
                <div className="flex flex-wrap gap-1">
                  {row.pinned ? <StatusBadge tone="yellow">Pinned</StatusBadge> : null}
                  {row.status === 'locked' ? <StatusBadge tone="ink">Locked</StatusBadge> : null}
                  {row.status === 'solved' ? <StatusBadge tone="green">Solved</StatusBadge> : null}
                  {!row.pinned && row.status !== 'locked' && row.status !== 'solved' ? (
                    <StatusBadge tone="coral">Open</StatusBadge>
                  ) : null}
                </div>
              ),
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (row) => (
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    className="rounded-field border border-line px-2 py-1 text-[0.7rem] font-semibold text-ink-70 hover:bg-periwinkle-tint/50"
                    onClick={() => togglePin(row.id)}
                  >
                    {row.pinned ? 'Unpin' : 'Pin'}
                  </button>
                  <button
                    type="button"
                    className="rounded-field border border-line px-2 py-1 text-[0.7rem] font-semibold text-ink-70 hover:bg-periwinkle-tint/50"
                    onClick={() => toggleLock(row.id)}
                  >
                    {row.status === 'locked' ? 'Unlock' : 'Lock'}
                  </button>
                </div>
              ),
            },
          ]}
        />
      </Reveal>
    </div>
  );
}
