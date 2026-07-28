import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { FieldShell, TextInput, TextSelect, TextTextarea } from '@/components/ui/app/FormField';
import { Reveal } from '@/components/ui/Reveal';
import { mockCategories } from '@/lib/mock';

/** SCR-027 — New forum topic form. */
export default function ForumNewTopicPage() {
  const navigate = useNavigate();
  const [type, setType] = useState<'question' | 'discussion'>('question');
  const [category, setCategory] = useState(mockCategories[0]?.slug ?? '');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');

  return (
    <div className="container-content max-w-2xl space-y-8">
      <PageHeader
        eyebrow="Forum"
        title="Ask a question"
        lede="Describe your issue clearly. Include organ, material and what you have already tried."
        actions={
          <Link to="/forum" className="btn-ghost text-sm">
            Cancel
          </Link>
        }
      />

      <Reveal delay={0.08}>
        <form
          className="card space-y-5 p-5 sm:p-6"
          onSubmit={(e) => {
            e.preventDefault();
            navigate('/forum');
          }}
        >
        <FieldShell label="Topic type">
          <div className="flex gap-2">
            {(['question', 'discussion'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={
                  type === t
                    ? 'rounded-field border border-aubergine bg-aubergine px-4 py-2 text-sm font-semibold text-canvas'
                    : 'rounded-field border border-line px-4 py-2 text-sm font-semibold text-ink-70 hover:bg-periwinkle-tint/50'
                }
              >
                {t === 'question' ? 'Question' : 'Discussion'}
              </button>
            ))}
          </div>
        </FieldShell>

        <FieldShell label="Category">
          <TextSelect value={category} onChange={(e) => setCategory(e.target.value)} required>
            {mockCategories.map((cat) => (
              <option key={cat.slug} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </TextSelect>
        </FieldShell>

        <FieldShell label="Title" hint="Be specific — e.g. “PDMS bonding after plasma at 50 W”.">
          <TextInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Summarize your topic in one line"
            required
          />
        </FieldShell>

        <FieldShell label="Body">
          <TextTextarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Describe the context, steps you tried, and what outcome you expect…"
            rows={8}
            required
          />
        </FieldShell>

        <FieldShell label="Tags" hint="Comma-separated — e.g. PDMS, bonding, ISO 22916">
          <TextInput
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="fabrication, metadata, lung"
          />
        </FieldShell>

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <Link to="/forum" className="btn-ghost text-sm">
            Discard
          </Link>
          <button type="submit" className="btn-primary text-sm">
            Publish topic
          </button>
        </div>
        </form>
      </Reveal>
    </div>
  );
}
