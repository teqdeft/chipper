import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { StatusBadge } from '@/components/ui/app/StatusBadge';

type AdminComment = {
  id: string;
  designId: string;
  designTitle: string;
  author: string;
  body: string;
  at: string;
  hidden: boolean;
};

const initialComments: AdminComment[] = [
  {
    id: 'cm1',
    designId: 'd-alveolar-01',
    designTitle: 'Alveolar barrier · dual channel',
    author: 'A. Chen',
    body: 'What pressure range does the apical channel tolerate during co-culture?',
    at: '2026-06-11',
    hidden: false,
  },
  {
    id: 'cm2',
    designId: 'd-liver-perfusion',
    designTitle: 'Hepatic perfusion cassette',
    author: 'anonymous',
    body: 'Check out my unrelated product at example.com',
    at: '2026-06-10',
    hidden: false,
  },
  {
    id: 'cm3',
    designId: 'd-kidney-prox',
    designTitle: 'Proximal tubule chip',
    author: 'J. Kim',
    body: 'We reproduced TEER values within 10% using your port layout.',
    at: '2026-06-08',
    hidden: false,
  },
];

/** SCR-036 — Admin comments hide/remove. */
export default function AdminCommentsPage() {
  const [comments, setComments] = useState<AdminComment[]>(initialComments);
  const visible = comments.filter((c) => !c.hidden);

  const hide = (id: string) => {
    setComments((prev) => prev.map((c) => (c.id === id ? { ...c, hidden: true } : c)));
  };

  const remove = (id: string) => {
    setComments((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Administration"
        title="Comments"
        lede="Moderate discussion on design pages. Hidden comments remain visible to staff."
        actions={
          <StatusBadge tone="ink">{visible.length} visible</StatusBadge>
        }
      />

      {visible.length === 0 ? (
        <Reveal delay={0.06}>
          <EmptyState title="No comments to review" body="All comments are hidden or removed." />
        </Reveal>
      ) : (
        <RevealGroup className="space-y-3" stagger={0.06}>
          {visible.map((comment) => (
            <RevealItem key={comment.id}>
              <div className="card p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to={`/designs/${comment.designId}`}
                  className="text-sm font-semibold text-deep-coral hover:underline"
                >
                  {comment.designTitle}
                </Link>
                <span className="text-xs text-ink-40">· {comment.at}</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-aubergine">{comment.author}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-70">{comment.body}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-field border border-line px-3 py-1.5 text-xs font-semibold text-ink-70 hover:bg-periwinkle-tint/50"
                  onClick={() => hide(comment.id)}
                >
                  Hide
                </button>
                <button
                  type="button"
                  className="rounded-field border border-deep-coral/40 bg-coral/10 px-3 py-1.5 text-xs font-semibold text-deep-coral hover:bg-coral/20"
                  onClick={() => remove(comment.id)}
                >
                  Remove
                </button>
              </div>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      )}
    </div>
  );
}
