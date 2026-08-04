import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { FieldShell, TextInput, TextSelect, TextTextarea } from '@/components/ui/app/FormField';
import { ErrorState, LoadingState } from '@/components/ui/app/LoadingState';
import { Reveal } from '@/components/ui/Reveal';
import { useToast } from '@/app/providers/ToastProvider';
import { useApiResource } from '@/hooks/useApiResource';
import { ApiError } from '@/lib/api/client';
import { forumApi, topicPath } from '@/lib/api/forum';
import { cn } from '@/lib/utils';

/** SCR-027 — New forum topic form. */
export default function ForumNewTopicPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const presetCategory = params.get('category') ?? '';

  const { data: home, isLoading, error, reload } = useApiResource(() => forumApi.home(), []);
  const categories = (home?.categories ?? []).filter((c) => !c.locked);

  const [type, setType] = useState<'question' | 'discussion'>('question');
  const [category, setCategory] = useState(presetCategory);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (category || !categories.length) return;
    const match = categories.find((c) => c.slug === presetCategory);
    setCategory(match?.slug ?? categories[0].slug);
  }, [categories, category, presetCategory]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setFieldErrors({});
    setSubmitting(true);
    try {
      const tagList = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 8);

      const topic = await forumApi.createTopic({
        title: title.trim(),
        body: body.trim(),
        category,
        type,
        tags: tagList.length ? tagList : undefined,
      });

      toast.success(
        type === 'question' ? 'Question published' : 'Discussion started',
        'Your topic is live in the community.',
      );
      navigate(topicPath(topic));
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) {
        setFieldErrors(err.fieldErrors);
      }
      toast.fromError(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container-content max-w-2xl space-y-8">
      <PageHeader
        eyebrow="Community"
        title={type === 'question' ? 'Ask a question' : 'Start a discussion'}
        lede="Share context clearly — organ, material, what you tried, and what outcome you need. The community answers faster that way."
        actions={
          <Link to="/forum" className="btn-ghost text-sm">
            Cancel
          </Link>
        }
      />

      {isLoading ? (
        <LoadingState label="Loading categories…" />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : categories.length === 0 ? (
        <div className="rounded-card border border-line bg-periwinkle-tint/40 px-5 py-4 text-sm text-muted">
          There are no open spaces to post in right now. Check back soon, or browse existing topics.
        </div>
      ) : (
        <Reveal delay={0.08}>
          <form
            className="space-y-5 rounded-card border border-line bg-surface p-5 shadow-soft sm:p-6"
            onSubmit={(e) => void onSubmit(e)}
          >
            <FieldShell label="Topic type">
              <div className="flex gap-2">
                {(['question', 'discussion'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={cn(
                      'rounded-field border px-4 py-2 text-sm font-semibold transition-colors',
                      type === t
                        ? 'border-aubergine bg-aubergine text-canvas'
                        : 'border-line text-muted hover:bg-periwinkle-tint/50',
                    )}
                  >
                    {t === 'question' ? 'Question' : 'Discussion'}
                  </button>
                ))}
              </div>
            </FieldShell>

            <FieldShell label="Space" error={fieldErrors.category}>
              <TextSelect
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                {categories.map((cat) => (
                  <option key={cat.slug} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </TextSelect>
            </FieldShell>

            <FieldShell
              label="Title"
              hint="Be specific — e.g. “PDMS bonding after plasma at 50 W”."
              error={fieldErrors.title}
            >
              <TextInput
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Summarize your topic in one line"
                minLength={5}
                maxLength={250}
                required
              />
            </FieldShell>

            <FieldShell label="Body" error={fieldErrors.body}>
              <TextTextarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Describe the context, steps you tried, and what outcome you expect…"
                rows={8}
                minLength={10}
                required
              />
            </FieldShell>

            <FieldShell label="Tags" hint="Comma-separated — e.g. PDMS, bonding, ISO 22916" error={fieldErrors.tags}>
              <TextInput
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="fabrication, metadata, lung"
              />
            </FieldShell>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <Link to="/forum" className="btn-ghost text-sm">
                Discard
              </Link>
              <button
                type="submit"
                className="btn-primary text-sm"
                disabled={submitting || !title.trim() || !body.trim() || !category}
              >
                {submitting ? 'Publishing…' : 'Publish topic'}
              </button>
            </div>
          </form>
        </Reveal>
      )}
    </div>
  );
}
