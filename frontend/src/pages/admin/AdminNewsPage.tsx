import { FormEvent, useState } from 'react';
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
  slug: string | null; // null = creating
  title: string;
  excerpt: string;
  body: string;
  category: string;
  status: AdminArticle['status'];
};

const EMPTY_DRAFT: Draft = {
  slug: null,
  title: '',
  excerpt: '',
  body: '',
  category: 'Announcement',
  status: 'draft',
};

/** SCR-037 — Manage news & pages (CHIP-033, CHIP-035). */
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

  function openEditor(article?: AdminArticle) {
    setDraft(
      article
        ? {
            slug: article.slug,
            title: article.title,
            excerpt: article.excerpt ?? '',
            // List rows don't carry the body — fetched lazily would be nicer,
            // but the CMS body is small; the update endpoint merges fields, so
            // an untouched empty body is simply not sent.
            body: article.bodyRaw ?? '',
            category: article.category ?? 'Announcement',
            status: article.status,
          }
        : { ...EMPTY_DRAFT },
    );
  }

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!draft) return;
    setIsSaving(true);

    try {
      const payload = {
        title: draft.title,
        excerpt: draft.excerpt || null,
        // Never blank an existing body that was not loaded into the editor.
        ...(draft.body ? { body: draft.body } : {}),
        category: draft.category,
        status: draft.status,
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
        eyebrow="Administration"
        title="News & pages"
        lede="Publish announcements, guides and event posts for the public site."
        actions={
          <button type="button" className="btn-primary text-sm" onClick={() => openEditor()}>
            New article
          </button>
        }
      />

      {draft ? (
        <Reveal>
          <form onSubmit={handleSave} className="card space-y-4 p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold text-aubergine">
              {draft.slug ? `Editing: ${draft.slug}` : 'New article'}
            </h2>

            <FieldShell label="Title">
              <TextInput value={draft.title} onChange={(e) => update('title', e.target.value)} required />
            </FieldShell>

            <FieldShell label="Excerpt" hint="Shown on news cards and in previews">
              <TextTextarea
                rows={2}
                value={draft.excerpt}
                onChange={(e) => update('excerpt', e.target.value)}
              />
            </FieldShell>

            <FieldShell label="Body" hint="Separate paragraphs with a blank line">
              <TextTextarea rows={8} value={draft.body} onChange={(e) => update('body', e.target.value)} />
            </FieldShell>

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldShell label="Category">
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

            <div className="flex flex-wrap gap-3 border-t border-line pt-4">
              <SubmitButton isLoading={isSaving} loadingLabel="Saving…" className="w-auto">
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
                    <p className="text-xs text-ink-55">
                      /{row.slug} · {row.views.toLocaleString()} views
                    </p>
                  </div>
                ),
              },
              {
                key: 'category',
                header: 'Category',
                render: (row) => <span className="text-ink-70">{row.category ?? '—'}</span>,
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
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        disabled={busy}
                        className="rounded-field border border-line px-2 py-1 text-[0.7rem] font-semibold text-ink-70 hover:bg-periwinkle-tint/50 disabled:opacity-40"
                        onClick={() => openEditor(original)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="rounded-field border border-line px-2 py-1 text-[0.7rem] font-semibold text-ink-70 hover:bg-periwinkle-tint/50 disabled:opacity-40"
                        onClick={() => void togglePublish(original)}
                      >
                        {row.status === 'published' ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="rounded-field border border-deep-coral/40 bg-coral/10 px-2 py-1 text-[0.7rem] font-semibold text-deep-coral hover:bg-coral/20 disabled:opacity-40"
                        onClick={() => void handleDelete(original)}
                      >
                        Delete
                      </button>
                    </div>
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
