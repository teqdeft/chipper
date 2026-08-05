import { FormEvent, useState } from 'react';
import { AdminActionBar, AdminActionButton } from '@/components/admin';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { DataTable } from '@/components/ui/app/DataTable';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { FieldShell, TextInput, TextSelect, TextTextarea } from '@/components/ui/app/FormField';
import { SubmitButton } from '@/components/ui/app/FormAlert';
import { ErrorState, LoadingState } from '@/components/ui/app/LoadingState';
import { Pagination } from '@/components/ui/app/Pagination';
import { Reveal } from '@/components/ui/Reveal';
import { useApiResource } from '@/hooks/useApiResource';
import { useToast } from '@/app/providers/ToastProvider';
import { adminApi } from '@/lib/api/admin';
import type { AdminArticle } from '@/lib/api/admin';

const statusTone: Record<AdminArticle['status'], 'green' | 'yellow' | 'ink'> = {
  published: 'green',
  draft: 'yellow',
  archived: 'ink',
};

const CATEGORIES = ['Announcement', 'Guide', 'Event'];

type Draft = {
  slug: string | null;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  status: AdminArticle['status'];
  featured: boolean;
  publishedAt: string;
  bodyReady: boolean;
};

const EMPTY_DRAFT: Draft = {
  slug: null,
  title: '',
  excerpt: '',
  body: '',
  category: 'Announcement',
  status: 'draft',
  featured: false,
  publishedAt: '',
  bodyReady: true,
};

function toDateInput(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

/** SCR-037 — Manage news. */
export default function AdminNewsPage() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [busySlug, setBusySlug] = useState<string | null>(null);

  const { data, isLoading, error, reload } = useApiResource(
    () => adminApi.news({ page, limit: 15 }),
    [page],
  );

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  }

  async function openEditor(article?: AdminArticle) {
    if (!article) {
      setDraft({ ...EMPTY_DRAFT });
      return;
    }

    setDraft({
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt ?? '',
      body: article.bodyRaw ?? '',
      category: article.category ?? 'Announcement',
      status: article.status,
      featured: article.featured,
      publishedAt: toDateInput(article.publishedAt ?? article.date),
      bodyReady: Boolean(article.bodyRaw),
    });

    if (!article.bodyRaw) {
      try {
        const full = await adminApi.getArticle(article.slug);
        setDraft((d) =>
          d && d.slug === article.slug
            ? {
                ...d,
                body: full.bodyRaw ?? '',
                excerpt: full.excerpt ?? d.excerpt,
                featured: full.featured,
                publishedAt: toDateInput(full.publishedAt ?? full.date) || d.publishedAt,
                bodyReady: true,
              }
            : d,
        );
      } catch (err) {
        toast.fromError(err);
        setDraft((d) => (d && d.slug === article.slug ? { ...d, bodyReady: true } : d));
      }
    }
  }

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!draft || !draft.bodyReady) return;
    setIsSaving(true);

    try {
      const publishedAt = draft.publishedAt
        ? new Date(`${draft.publishedAt}T00:00:00.000Z`).toISOString()
        : undefined;

      const payload = {
        title: draft.title,
        excerpt: draft.excerpt || null,
        body: draft.body || null,
        category: draft.category,
        status: draft.status,
        featured: draft.featured,
        ...(publishedAt !== undefined
          ? { publishedAt }
          : draft.status !== 'published'
            ? { publishedAt: null }
            : {}),
      };

      if (draft.slug) {
        await adminApi.updateArticle(draft.slug, payload);
        toast.success('Article saved', draft.title);
      } else {
        await adminApi.createArticle(payload);
        toast.success(
          draft.status === 'published' ? 'Article published' : 'Draft created',
          draft.title,
        );
      }
      setDraft(null);
      await reload();
    } catch (err) {
      toast.fromError(err);
    } finally {
      setIsSaving(false);
    }
  }

  async function togglePublish(article: AdminArticle) {
    const next = article.status === 'published' ? 'draft' : 'published';
    setBusySlug(article.slug);
    try {
      await adminApi.updateArticle(article.slug, { status: next });
      toast.success(next === 'published' ? 'Article published' : 'Article unpublished', article.title);
      await reload();
    } catch (err) {
      toast.fromError(err);
    } finally {
      setBusySlug(null);
    }
  }

  async function handleDelete(article: AdminArticle) {
    if (!window.confirm(`Delete "${article.title}"? This cannot be undone.`)) return;
    setBusySlug(article.slug);
    try {
      await adminApi.deleteArticle(article.slug);
      toast.success('Article removed', article.title);
      await reload();
    } catch (err) {
      toast.fromError(err);
    } finally {
      setBusySlug(null);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Content"
        title="News"
        lede="Publish announcements, guides and event posts for the public site."
        actions={
          <button type="button" className="btn-primary text-sm" onClick={() => void openEditor()}>
            New article
          </button>
        }
      />

      {draft ? (
        <Reveal>
          <form onSubmit={handleSave} className="rounded-card border border-line bg-surface p-5 shadow-soft sm:p-6">
            <h2 className="font-display text-lg font-bold text-aubergine">
              {draft.slug ? `Editing: ${draft.slug}` : 'New article'}
            </h2>

            <div className="mt-4 space-y-4">
              <FieldShell label="Title" hint="Shown as the headline on the news page">
                <TextInput value={draft.title} onChange={(e) => update('title', e.target.value)} required />
              </FieldShell>

              <FieldShell label="Excerpt" hint="Shown on news cards and under the title on the article page">
                <TextTextarea
                  rows={2}
                  value={draft.excerpt}
                  onChange={(e) => update('excerpt', e.target.value)}
                />
              </FieldShell>

              <FieldShell
                label="Body"
                hint={
                  draft.bodyReady
                    ? 'Separate paragraphs with a blank line — each becomes a paragraph on the article page'
                    : 'Loading article body…'
                }
              >
                <TextTextarea
                  rows={8}
                  value={draft.body}
                  onChange={(e) => update('body', e.target.value)}
                  disabled={!draft.bodyReady}
                />
              </FieldShell>

              <div className="grid gap-4 sm:grid-cols-2">
                <FieldShell label="Category" hint="Badge on the public news list and article">
                  <TextSelect value={draft.category} onChange={(e) => update('category', e.target.value)}>
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </TextSelect>
                </FieldShell>

                <FieldShell label="Status">
                  <TextSelect
                    value={draft.status}
                    onChange={(e) => update('status', e.target.value as AdminArticle['status'])}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </TextSelect>
                </FieldShell>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FieldShell
                  label="Publish date"
                  hint="Date shown on the public news page (leave blank to use publish time)"
                >
                  <TextInput
                    type="date"
                    value={draft.publishedAt}
                    onChange={(e) => update('publishedAt', e.target.value)}
                  />
                </FieldShell>

                <FieldShell label="Featured" hint="Mark this post as featured in content feeds">
                  <label className="mt-2 flex cursor-pointer items-center gap-2.5 text-sm text-muted">
                    <input
                      type="checkbox"
                      checked={draft.featured}
                      onChange={(e) => update('featured', e.target.checked)}
                      className="h-4 w-4 rounded-field border-line accent-coral"
                    />
                    Show as featured
                  </label>
                </FieldShell>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3 border-t border-line pt-4">
              <SubmitButton
                isLoading={isSaving}
                loadingLabel="Saving…"
                className="w-auto"
                disabled={!draft.bodyReady}
              >
                {draft.slug ? 'Save changes' : draft.status === 'published' ? 'Publish' : 'Create draft'}
              </SubmitButton>
              <button type="button" className="btn-ghost" onClick={() => setDraft(null)}>
                Cancel
              </button>
            </div>
          </form>
        </Reveal>
      ) : null}

      {isLoading ? (
        <LoadingState label="Loading articles…" />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data ? null : (
        <>
          <DataTable
            rows={data.items.map((a) => ({ ...a, id: a.slug }))}
            columns={[
              {
                key: 'title',
                header: 'Article',
                render: (row) => (
                  <div>
                    <p className="font-semibold">{row.title}</p>
                    <p className="text-xs text-muted">
                      /{row.slug} · {row.views.toLocaleString()} views
                      {row.featured ? ' · featured' : ''}
                    </p>
                  </div>
                ),
              },
              {
                key: 'category',
                header: 'Category',
                render: (row) => <span className="text-muted">{row.category ?? '—'}</span>,
              },
              {
                key: 'status',
                header: 'Status',
                render: (row) => <StatusBadge tone={statusTone[row.status]}>{row.status}</StatusBadge>,
              },
              {
                key: 'date',
                header: 'Published',
                render: (row) =>
                  row.publishedAt ? new Date(row.publishedAt).toLocaleDateString() : '—',
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (row) => {
                  const original = data.items.find((a) => a.slug === row.slug);
                  if (!original) return null;
                  const busy = busySlug === row.slug;
                  return (
                    <AdminActionBar>
                      <AdminActionButton disabled={busy} onClick={() => void openEditor(original)}>
                        Edit
                      </AdminActionButton>
                      <AdminActionButton disabled={busy} onClick={() => void togglePublish(original)}>
                        {row.status === 'published' ? 'Unpublish' : 'Publish'}
                      </AdminActionButton>
                      <AdminActionButton tone="danger" disabled={busy} onClick={() => void handleDelete(original)}>
                        Delete
                      </AdminActionButton>
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
