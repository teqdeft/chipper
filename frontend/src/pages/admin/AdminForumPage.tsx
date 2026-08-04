import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { DataTable } from '@/components/ui/app/DataTable';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { FieldShell, TextInput } from '@/components/ui/app/FormField';
import { ErrorState, LoadingState } from '@/components/ui/app/LoadingState';
import { Pagination } from '@/components/ui/app/Pagination';
import { Reveal } from '@/components/ui/Reveal';
import { useApiResource } from '@/hooks/useApiResource';
import { useToast } from '@/app/providers/ToastProvider';
import { adminApi } from '@/lib/api/admin';
import type { AdminCategory, AdminTopic } from '@/lib/api/admin';

const topicStatusTone: Record<AdminTopic['status'], 'green' | 'yellow' | 'ink'> = {
  open: 'green',
  solved: 'yellow',
  locked: 'ink',
};

/** SCR-038 — Manage forum (CHIP-039, CHIP-043). */
export default function AdminForumPage() {
  const toast = useToast();
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [topicPage, setTopicPage] = useState(1);

  const categories = useApiResource(() => adminApi.categories(), []);
  const topics = useApiResource(() => adminApi.topics({ page: topicPage, limit: 15 }), [topicPage]);

  async function addCategory(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsCreating(true);
    try {
      // The slug is derived server-side from the name, so the form stays short.
      await adminApi.createCategory({ name: newName.trim(), description: newDescription.trim() || undefined });
      toast.success('Category created', newName.trim());
      setNewName('');
      setNewDescription('');
      await categories.reload();
    } catch (err) {
      toast.fromError(err);
    } finally {
      setIsCreating(false);
    }
  }

  async function toggleCategoryLock(category: AdminCategory) {
    const locked = !category.is_locked;
    setBusyKey(category.slug);
    try {
      await adminApi.updateCategory(category.slug, { locked });
      toast.success(locked ? 'Category locked' : 'Category unlocked', category.name);
      await categories.reload();
    } catch (err) {
      toast.fromError(err);
    } finally {
      setBusyKey(null);
    }
  }

  async function removeCategory(category: AdminCategory) {
    if (!window.confirm(`Delete "${category.name}"? It must have no topics.`)) return;
    setBusyKey(category.slug);
    try {
      await adminApi.deleteCategory(category.slug);
      toast.success('Category removed', category.name);
      await categories.reload();
    } catch (err) {
      // A non-empty category returns 409 with a clear message — surface it.
      toast.fromError(err);
    } finally {
      setBusyKey(null);
    }
  }

  async function moderateTopic(topic: AdminTopic, payload: { pinned?: boolean; status?: AdminTopic['status'] }) {
    setBusyKey(topic.slug);
    try {
      await adminApi.moderateTopic(topic.slug, payload);
      toast.success(
        payload.pinned !== undefined
          ? payload.pinned
            ? 'Topic pinned'
            : 'Topic unpinned'
          : payload.status === 'locked'
            ? 'Topic locked'
            : 'Topic reopened',
        topic.title,
      );
      await topics.reload();
    } catch (err) {
      toast.fromError(err);
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Administration"
        title="Forum"
        lede="Create categories, and pin or lock the threads that need it."
      />

      {/* ── Categories ─────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold text-aubergine">Categories</h2>

        <Reveal>
          <form onSubmit={addCategory} className="card grid gap-4 p-5 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
            <FieldShell label="Name">
              <TextInput
                placeholder="Fabrication"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
            </FieldShell>
            <FieldShell label="Description" hint="Optional one-liner shown on the forum home">
              <TextInput
                placeholder="Bonding, moulding, machining and printing."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </FieldShell>
            <button type="submit" className="btn-primary" disabled={isCreating}>
              {isCreating ? 'Adding…' : 'Add category'}
            </button>
          </form>
        </Reveal>

        {categories.isLoading ? (
          <LoadingState label="Loading categories…" className="min-h-[20vh]" />
        ) : categories.error ? (
          <ErrorState error={categories.error} onRetry={categories.reload} />
        ) : categories.data ? (
          <DataTable
            rows={categories.data.map((c) => ({ ...c, id: c.slug }))}
            columns={[
              {
                key: 'name',
                header: 'Category',
                render: (row) => (
                  <div>
                    <p className="font-semibold">{row.name}</p>
                    <p className="text-xs text-muted">/{row.slug}</p>
                  </div>
                ),
              },
              {
                key: 'description',
                header: 'Description',
                render: (row) => <span className="text-muted">{row.description ?? '—'}</span>,
              },
              {
                key: 'topics',
                header: 'Topics',
                className: 'tabular-nums',
                render: (row) => row.topic_count,
              },
              { key: 'posts', header: 'Posts', className: 'tabular-nums', render: (row) => row.post_count },
              {
                key: 'state',
                header: 'State',
                render: (row) =>
                  row.is_locked ? (
                    <StatusBadge tone="ink">locked</StatusBadge>
                  ) : (
                    <StatusBadge tone="green">open</StatusBadge>
                  ),
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (row) => {
                  const original = categories.data?.find((c) => c.slug === row.slug);
                  if (!original) return null;
                  const busy = busyKey === row.slug;
                  return (
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        disabled={busy}
                        className="rounded-field border border-line px-2 py-1 text-[0.7rem] font-semibold text-muted hover:bg-periwinkle-tint/50 disabled:opacity-40"
                        onClick={() => void toggleCategoryLock(original)}
                      >
                        {row.is_locked ? 'Unlock' : 'Lock'}
                      </button>
                      <button
                        type="button"
                        disabled={busy || row.topic_count > 0}
                        title={row.topic_count > 0 ? 'Move or remove its topics first' : undefined}
                        className="rounded-field border border-deep-coral/40 bg-coral/10 px-2 py-1 text-[0.7rem] font-semibold text-deep-coral hover:bg-coral/20 disabled:opacity-40"
                        onClick={() => void removeCategory(original)}
                      >
                        Delete
                      </button>
                    </div>
                  );
                },
              },
            ]}
          />
        ) : null}
      </section>

      {/* ── Topics ─────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold text-aubergine">Recent topics</h2>

        {topics.isLoading ? (
          <LoadingState label="Loading topics…" className="min-h-[20vh]" />
        ) : topics.error ? (
          <ErrorState error={topics.error} onRetry={topics.reload} />
        ) : topics.data ? (
          <>
            <DataTable
              rows={topics.data.items.map((t) => ({ ...t, id: t.slug }))}
              columns={[
                {
                  key: 'title',
                  header: 'Topic',
                  render: (row) => (
                    <div>
                      <Link to={`/forum/t/${row.slug}`} className="font-semibold hover:text-deep-coral">
                        {row.title}
                      </Link>
                      <p className="text-xs text-muted">
                        {row.category.name} · @{row.author.handle}
                      </p>
                    </div>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (row) => (
                    <div className="flex flex-wrap gap-1.5">
                      <StatusBadge tone={topicStatusTone[row.status]}>{row.status}</StatusBadge>
                      {row.pinned ? <StatusBadge tone="coral">pinned</StatusBadge> : null}
                    </div>
                  ),
                },
                { key: 'replies', header: 'Replies', className: 'tabular-nums', render: (row) => row.replies },
                { key: 'views', header: 'Views', className: 'tabular-nums', render: (row) => row.views },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (row) => {
                    const original = topics.data?.items.find((t) => t.slug === row.slug);
                    if (!original) return null;
                    const busy = busyKey === row.slug;
                    return (
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          disabled={busy}
                          className="rounded-field border border-line px-2 py-1 text-[0.7rem] font-semibold text-muted hover:bg-periwinkle-tint/50 disabled:opacity-40"
                          onClick={() => void moderateTopic(original, { pinned: !row.pinned })}
                        >
                          {row.pinned ? 'Unpin' : 'Pin'}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          className="rounded-field border border-line px-2 py-1 text-[0.7rem] font-semibold text-muted hover:bg-periwinkle-tint/50 disabled:opacity-40"
                          onClick={() =>
                            void moderateTopic(original, {
                              status: row.status === 'locked' ? 'open' : 'locked',
                            })
                          }
                        >
                          {row.status === 'locked' ? 'Unlock' : 'Lock'}
                        </button>
                      </div>
                    );
                  },
                },
              ]}
            />

            <Pagination pagination={topics.data.pagination} onPage={setTopicPage} />
          </>
        ) : null}
      </section>
    </div>
  );
}
