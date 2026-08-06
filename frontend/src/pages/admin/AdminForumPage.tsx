import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminActionBar, AdminActionButton, AdminSection } from '@/components/admin';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { DataTable } from '@/components/ui/app/DataTable';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { FieldShell, TextInput, TextSelect, TextTextarea } from '@/components/ui/app/FormField';
import { ErrorState, LoadingState } from '@/components/ui/app/LoadingState';
import { Pagination } from '@/components/ui/app/Pagination';
import { useApiResource } from '@/hooks/useApiResource';
import { useToast } from '@/app/providers/ToastProvider';
import { adminApi } from '@/lib/api/admin';
import { describeError } from '@/lib/api/errors';
import type { DescribedError } from '@/lib/api/errors';
import type { AdminCategory, AdminForumPost, AdminTopic, AdminTopicDetail } from '@/lib/api/admin';

const topicStatusTone: Record<AdminTopic['status'], 'green' | 'yellow' | 'ink'> = {
  open: 'green',
  solved: 'yellow',
  locked: 'ink',
};

type CategoryDraft = {
  slug: string;
  name: string;
  description: string;
};

type TopicDraft = {
  slug: string;
  title: string;
  type: AdminTopic['type'];
  category: string;
};

/** SCR-038 — Manage forum (CHIP-039, CHIP-043). */
export default function AdminForumPage() {
  const toast = useToast();
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [topicPage, setTopicPage] = useState(1);

  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft | null>(null);
  const [topicDraft, setTopicDraft] = useState<TopicDraft | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const [threadSlug, setThreadSlug] = useState<string | null>(null);
  const [thread, setThread] = useState<AdminTopicDetail | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState<DescribedError | null>(null);
  const [editingPost, setEditingPost] = useState<{ id: number; body: string } | null>(null);

  const categories = useApiResource(() => adminApi.categories(), []);
  const topics = useApiResource(() => adminApi.topics({ page: topicPage, limit: 15 }), [topicPage]);

  async function addCategory(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsCreating(true);
    try {
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

  function openCategoryEditor(category: AdminCategory) {
    setCategoryDraft({
      slug: category.slug,
      name: category.name,
      description: category.description ?? '',
    });
    setTopicDraft(null);
  }

  async function saveCategory(e: FormEvent) {
    e.preventDefault();
    if (!categoryDraft || !categoryDraft.name.trim()) return;

    setIsSavingDraft(true);
    try {
      await adminApi.updateCategory(categoryDraft.slug, {
        name: categoryDraft.name.trim(),
        description: categoryDraft.description.trim() || null,
      });
      toast.success('Category updated', categoryDraft.name.trim());
      setCategoryDraft(null);
      await categories.reload();
      await topics.reload();
    } catch (err) {
      toast.fromError(err);
    } finally {
      setIsSavingDraft(false);
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
      if (categoryDraft?.slug === category.slug) setCategoryDraft(null);
      await categories.reload();
    } catch (err) {
      toast.fromError(err);
    } finally {
      setBusyKey(null);
    }
  }

  function openTopicEditor(topic: AdminTopic) {
    setTopicDraft({
      slug: topic.slug,
      title: topic.title,
      type: topic.type ?? 'discussion',
      category: topic.category.slug,
    });
    setCategoryDraft(null);
  }

  async function saveTopic(e: FormEvent) {
    e.preventDefault();
    if (!topicDraft || !topicDraft.title.trim()) return;

    const original = topics.data?.items.find((t) => t.slug === topicDraft.slug);
    setIsSavingDraft(true);
    try {
      const titleChanged = !original || original.title !== topicDraft.title.trim();
      const typeChanged = !original || original.type !== topicDraft.type;
      if (titleChanged || typeChanged) {
        await adminApi.updateTopic(topicDraft.slug, {
          title: topicDraft.title.trim(),
          type: topicDraft.type,
        });
      }

      if (original && original.category.slug !== topicDraft.category) {
        await adminApi.moderateTopic(topicDraft.slug, { category: topicDraft.category });
      }

      toast.success('Topic updated', topicDraft.title.trim());
      setTopicDraft(null);
      await topics.reload();
      await categories.reload();
      if (threadSlug === topicDraft.slug) await loadThread(topicDraft.slug);
    } catch (err) {
      toast.fromError(err);
    } finally {
      setIsSavingDraft(false);
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
      if (threadSlug === topic.slug) await loadThread(topic.slug);
    } catch (err) {
      toast.fromError(err);
    } finally {
      setBusyKey(null);
    }
  }

  async function removeTopic(topic: AdminTopic) {
    if (!window.confirm(`Delete "${topic.title}"? Replies will no longer be visible on the public forum.`)) return;
    setBusyKey(topic.slug);
    try {
      await adminApi.deleteTopic(topic.slug);
      toast.success('Topic removed', topic.title);
      if (topicDraft?.slug === topic.slug) setTopicDraft(null);
      if (threadSlug === topic.slug) {
        setThreadSlug(null);
        setThread(null);
        setEditingPost(null);
      }
      await topics.reload();
      await categories.reload();
    } catch (err) {
      toast.fromError(err);
    } finally {
      setBusyKey(null);
    }
  }

  async function loadThread(slug: string) {
    setThreadLoading(true);
    setThreadError(null);
    try {
      const detail = await adminApi.getTopic(slug, { limit: 50 });
      setThread(detail);
    } catch (err) {
      // ErrorState renders a described failure, not a raw throw — same shape
      // useApiResource hands its consumers.
      setThreadError(describeError(err));
      setThread(null);
    } finally {
      setThreadLoading(false);
    }
  }

  async function openThread(topic: AdminTopic) {
    setThreadSlug(topic.slug);
    setEditingPost(null);
    await loadThread(topic.slug);
  }

  async function savePost(e: FormEvent) {
    e.preventDefault();
    if (!editingPost || !editingPost.body.trim()) return;

    setBusyKey(`post-${editingPost.id}`);
    try {
      await adminApi.updatePost(editingPost.id, editingPost.body.trim());
      toast.success('Post updated');
      setEditingPost(null);
      if (threadSlug) await loadThread(threadSlug);
    } catch (err) {
      toast.fromError(err);
    } finally {
      setBusyKey(null);
    }
  }

  async function removePost(post: AdminForumPost) {
    if (post.isFirstPost) {
      toast.error('Delete the topic instead', 'The opening post cannot be removed on its own.');
      return;
    }
    if (!window.confirm('Delete this reply?')) return;

    setBusyKey(`post-${post.id}`);
    try {
      await adminApi.deletePost(post.id);
      toast.success('Reply removed');
      if (threadSlug) await loadThread(threadSlug);
      await topics.reload();
      await categories.reload();
    } catch (err) {
      toast.fromError(err);
    } finally {
      setBusyKey(null);
    }
  }

  const categoryOptions = categories.data ?? [];

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Content"
        title="Forum"
        lede="Manage categories, move or edit threads, and moderate replies."
      />

      <AdminSection
        title="Categories"
        description="Structure the community forum. Locked categories accept no new topics."
        panel={false}
      >
        <form
          onSubmit={addCategory}
          className="mb-4 grid gap-4 rounded-card border border-line bg-surface p-5 shadow-soft sm:grid-cols-[1fr_1.4fr_auto] sm:items-start"
        >
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
          <button type="submit" className="btn-primary sm:mt-[1.875rem]" disabled={isCreating}>
            {isCreating ? 'Adding…' : 'Add category'}
          </button>
        </form>

        {categoryDraft ? (
          <form
            onSubmit={saveCategory}
            className="mb-4 space-y-4 rounded-card border border-line bg-surface p-5 shadow-soft"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-bold text-aubergine">Edit category</h3>
                <p className="text-xs text-muted">/{categoryDraft.slug}</p>
              </div>
              <AdminActionButton onClick={() => setCategoryDraft(null)}>Cancel</AdminActionButton>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldShell label="Name">
                <TextInput
                  value={categoryDraft.name}
                  onChange={(e) => setCategoryDraft({ ...categoryDraft, name: e.target.value })}
                  required
                />
              </FieldShell>
              <FieldShell label="Description">
                <TextInput
                  value={categoryDraft.description}
                  onChange={(e) => setCategoryDraft({ ...categoryDraft, description: e.target.value })}
                />
              </FieldShell>
            </div>
            <button type="submit" className="btn-primary" disabled={isSavingDraft}>
              {isSavingDraft ? 'Saving…' : 'Save category'}
            </button>
          </form>
        ) : null}

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
                    <AdminActionBar>
                      <AdminActionButton disabled={busy} onClick={() => openCategoryEditor(original)}>
                        Edit
                      </AdminActionButton>
                      <AdminActionButton disabled={busy} onClick={() => void toggleCategoryLock(original)}>
                        {row.is_locked ? 'Unlock' : 'Lock'}
                      </AdminActionButton>
                      <AdminActionButton
                        tone="danger"
                        disabled={busy || row.topic_count > 0}
                        title={row.topic_count > 0 ? 'Move or remove its topics first' : undefined}
                        onClick={() => void removeCategory(original)}
                      >
                        Delete
                      </AdminActionButton>
                    </AdminActionBar>
                  );
                },
              },
            ]}
          />
        ) : null}
      </AdminSection>

      <AdminSection
        title="Recent topics"
        description="Edit, move, pin, lock or delete threads. Open a thread to moderate replies."
        panel={false}
      >
        {topicDraft ? (
          <form
            onSubmit={saveTopic}
            className="mb-4 space-y-4 rounded-card border border-line bg-surface p-5 shadow-soft"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-bold text-aubergine">Edit topic</h3>
                <p className="text-xs text-muted">/{topicDraft.slug}</p>
              </div>
              <AdminActionButton onClick={() => setTopicDraft(null)}>Cancel</AdminActionButton>
            </div>
            <FieldShell label="Title">
              <TextInput
                value={topicDraft.title}
                onChange={(e) => setTopicDraft({ ...topicDraft, title: e.target.value })}
                required
                minLength={5}
              />
            </FieldShell>
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldShell label="Type">
                <TextSelect
                  value={topicDraft.type}
                  onChange={(e) =>
                    setTopicDraft({ ...topicDraft, type: e.target.value as AdminTopic['type'] })
                  }
                >
                  <option value="question">Question</option>
                  <option value="discussion">Discussion</option>
                  <option value="announcement">Announcement</option>
                </TextSelect>
              </FieldShell>
              <FieldShell label="Category" hint="Moving a topic updates both category counters">
                <TextSelect
                  value={topicDraft.category}
                  onChange={(e) => setTopicDraft({ ...topicDraft, category: e.target.value })}
                >
                  {categoryOptions.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </TextSelect>
              </FieldShell>
            </div>
            <button type="submit" className="btn-primary" disabled={isSavingDraft}>
              {isSavingDraft ? 'Saving…' : 'Save topic'}
            </button>
          </form>
        ) : null}

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
                        {row.type ? ` · ${row.type}` : ''}
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
                    const open = threadSlug === row.slug;
                    return (
                      <AdminActionBar>
                        <AdminActionButton disabled={busy} onClick={() => openTopicEditor(original)}>
                          Edit
                        </AdminActionButton>
                        <AdminActionButton
                          tone={open ? 'accent' : 'default'}
                          disabled={busy}
                          onClick={() => {
                            if (open) {
                              setThreadSlug(null);
                              setThread(null);
                              setEditingPost(null);
                              return;
                            }
                            void openThread(original);
                          }}
                        >
                          {open ? 'Close posts' : 'Posts'}
                        </AdminActionButton>
                        <AdminActionButton
                          disabled={busy}
                          onClick={() => void moderateTopic(original, { pinned: !row.pinned })}
                        >
                          {row.pinned ? 'Unpin' : 'Pin'}
                        </AdminActionButton>
                        <AdminActionButton
                          disabled={busy}
                          onClick={() =>
                            void moderateTopic(original, {
                              status: row.status === 'locked' ? 'open' : 'locked',
                            })
                          }
                        >
                          {row.status === 'locked' ? 'Unlock' : 'Lock'}
                        </AdminActionButton>
                        <AdminActionButton
                          tone="danger"
                          disabled={busy}
                          onClick={() => void removeTopic(original)}
                        >
                          Delete
                        </AdminActionButton>
                      </AdminActionBar>
                    );
                  },
                },
              ]}
            />

            <Pagination pagination={topics.data.pagination} onPage={setTopicPage} />
          </>
        ) : null}
      </AdminSection>

      {threadSlug ? (
        <AdminSection
          title="Thread posts"
          description={
            thread
              ? `Moderating replies in “${thread.topic.title}”. Opening posts cannot be deleted — remove the topic instead.`
              : 'Loading thread…'
          }
          panel={false}
        >
          {threadLoading ? (
            <LoadingState label="Loading posts…" className="min-h-[16vh]" />
          ) : threadError ? (
            <ErrorState error={threadError} onRetry={() => void loadThread(threadSlug)} />
          ) : thread ? (
            <div className="space-y-3">
              {editingPost ? (
                <form
                  onSubmit={savePost}
                  className="space-y-3 rounded-card border border-line bg-surface p-4 shadow-soft"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-base font-bold text-aubergine">Edit post #{editingPost.id}</h3>
                    <AdminActionButton onClick={() => setEditingPost(null)}>Cancel</AdminActionButton>
                  </div>
                  <FieldShell label="Body">
                    <TextTextarea
                      rows={6}
                      value={editingPost.body}
                      onChange={(e) => setEditingPost({ ...editingPost, body: e.target.value })}
                      required
                      minLength={2}
                    />
                  </FieldShell>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={busyKey === `post-${editingPost.id}`}
                  >
                    {busyKey === `post-${editingPost.id}` ? 'Saving…' : 'Save post'}
                  </button>
                </form>
              ) : null}

              <DataTable
                rows={thread.posts.map((p) => ({ ...p, id: String(p.id) }))}
                columns={[
                  {
                    key: 'author',
                    header: 'Author',
                    render: (row) => (
                      <div>
                        <p className="font-semibold">@{row.author.handle}</p>
                        <p className="text-xs text-muted">
                          {row.isFirstPost ? 'Opening post' : 'Reply'}
                          {row.isAccepted ? ' · accepted' : ''}
                        </p>
                      </div>
                    ),
                  },
                  {
                    key: 'body',
                    header: 'Body',
                    render: (row) => (
                      <p className="max-w-xl whitespace-pre-wrap text-sm text-muted line-clamp-4">{row.body}</p>
                    ),
                  },
                  {
                    key: 'votes',
                    header: 'Votes',
                    className: 'tabular-nums',
                    render: (row) => row.votes,
                  },
                  {
                    key: 'actions',
                    header: 'Actions',
                    render: (row) => {
                      const original = thread.posts.find((p) => p.id === Number(row.id));
                      if (!original) return null;
                      const busy = busyKey === `post-${original.id}`;
                      return (
                        <AdminActionBar>
                          <AdminActionButton
                            disabled={busy}
                            onClick={() => setEditingPost({ id: original.id, body: original.body })}
                          >
                            Edit
                          </AdminActionButton>
                          <AdminActionButton
                            tone="danger"
                            disabled={busy || original.isFirstPost}
                            title={original.isFirstPost ? 'Delete the topic instead' : undefined}
                            onClick={() => void removePost(original)}
                          >
                            Delete
                          </AdminActionButton>
                        </AdminActionBar>
                      );
                    },
                  },
                ]}
              />
            </div>
          ) : null}
        </AdminSection>
      ) : null}
    </div>
  );
}
