import { useState } from 'react';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { DataTable } from '@/components/ui/app/DataTable';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { FieldShell, TextInput, TextTextarea } from '@/components/ui/app/FormField';
import { Reveal } from '@/components/ui/Reveal';
import { mockNews, type MockNews } from '@/lib/mock';

/** SCR-037 — Admin news list and editor stub. */
export default function AdminNewsPage() {
  const [articles] = useState<MockNews[]>(() => [...mockNews]);
  const [editing, setEditing] = useState<MockNews | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftExcerpt, setDraftExcerpt] = useState('');

  const openEditor = (article: MockNews) => {
    setEditing(article);
    setDraftTitle(article.title);
    setDraftExcerpt(article.excerpt);
  };

  const closeEditor = () => {
    setEditing(null);
    setDraftTitle('');
    setDraftExcerpt('');
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Administration"
        title="News & pages"
        lede="Publish announcements, guides and event posts for the public site."
        actions={
          <button
            type="button"
            className="btn-primary text-sm"
            onClick={() => {
              setEditing({
                slug: 'new-draft',
                title: '',
                excerpt: '',
                body: [],
                date: new Date().toISOString().slice(0, 10),
                category: 'Announcement',
              });
              setDraftTitle('');
              setDraftExcerpt('');
            }}
          >
            New article
          </button>
        }
      />

      <DataTable
        rows={articles.map((a) => ({ ...a, id: a.slug }))}
        columns={[
          {
            key: 'title',
            header: 'Title',
            render: (row) => (
              <div>
                <p className="font-semibold">{row.title}</p>
                <p className="text-xs text-ink-55">{row.excerpt}</p>
              </div>
            ),
          },
          {
            key: 'category',
            header: 'Category',
            render: (row) => <StatusBadge tone="periwinkle">{row.category}</StatusBadge>,
          },
          {
            key: 'date',
            header: 'Date',
            render: (row) => row.date,
          },
          {
            key: 'actions',
            header: 'Actions',
            render: (row) => (
              <button
                type="button"
                className="rounded-field border border-line px-3 py-1.5 text-xs font-semibold text-aubergine hover:bg-periwinkle-tint/50"
                onClick={() => openEditor(row)}
              >
                Edit
              </button>
            ),
          },
        ]}
      />

      {editing ? (
        <Reveal delay={0.08}>
          <div className="card space-y-4 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-base font-bold text-aubergine">
              {editing.slug === 'new-draft' ? 'New article' : 'Edit article'}
            </h2>
            <StatusBadge tone="yellow">Draft stub</StatusBadge>
          </div>

          <FieldShell label="Title">
            <TextInput value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} />
          </FieldShell>

          <FieldShell label="Excerpt">
            <TextTextarea
              value={draftExcerpt}
              onChange={(e) => setDraftExcerpt(e.target.value)}
              rows={3}
              className="min-h-[80px]"
            />
          </FieldShell>

          <FieldShell label="Body" hint="Full editor not wired in this preview.">
            <TextTextarea
              defaultValue={editing.body.join('\n\n')}
              rows={6}
              readOnly
              className="min-h-[120px] opacity-70"
            />
          </FieldShell>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost text-sm" onClick={closeEditor}>
              Cancel
            </button>
            <button type="button" className="btn-primary text-sm" onClick={closeEditor}>
              Save draft
            </button>
          </div>
          </div>
        </Reveal>
      ) : null}
    </div>
  );
}
