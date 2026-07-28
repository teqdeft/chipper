import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { StatusBadge } from '@/components/ui/app/StatusBadge';

type FlaggedItem = {
  id: string;
  type: 'design' | 'comment' | 'forum';
  title: string;
  reason: string;
  reporter: string;
  at: string;
  href: string;
};

const initialQueue: FlaggedItem[] = [
  {
    id: 'f1',
    type: 'comment',
    title: 'Comment on Hepatic perfusion cassette',
    reason: 'Possible off-topic promotion',
    reporter: 'a.chen',
    at: '2026-06-11',
    href: '/designs/d-liver-perfusion',
  },
  {
    id: 'f2',
    type: 'design',
    title: 'Unverified metadata on gut scaffold',
    reason: 'ISO 22916 fields incomplete',
    reporter: 'system',
    at: '2026-06-10',
    href: '/designs/d-gut-villi',
  },
  {
    id: 'f3',
    type: 'forum',
    title: 'Thread: licence confusion',
    reason: 'Reported as misleading advice',
    reporter: 'j.kim',
    at: '2026-06-09',
    href: '/forum/t/t1',
  },
];

/** SCR-035 — Moderation flagged queue. */
export default function AdminModerationPage() {
  const [queue, setQueue] = useState<FlaggedItem[]>(initialQueue);

  const dismiss = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const typeTone: Record<FlaggedItem['type'], 'coral' | 'periwinkle' | 'yellow'> = {
    design: 'periwinkle',
    comment: 'coral',
    forum: 'yellow',
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Administration"
        title="Moderation queue"
        lede="Review flagged designs, comments and forum posts reported by the community."
        actions={
          queue.length > 0 ? (
            <StatusBadge tone="coral">{queue.length} open</StatusBadge>
          ) : (
            <StatusBadge tone="green">Queue clear</StatusBadge>
          )
        }
      />

      {queue.length === 0 ? (
        <Reveal delay={0.06}>
          <EmptyState
            title="Nothing flagged"
            body="When users report content, it will appear here for review."
          />
        </Reveal>
      ) : (
        <RevealGroup className="space-y-3" stagger={0.06}>
          {queue.map((item) => (
            <RevealItem key={item.id}>
              <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={typeTone[item.type]}>{item.type}</StatusBadge>
                  <span className="font-semibold text-aubergine">{item.title}</span>
                </div>
                <p className="mt-2 text-sm text-ink-55">{item.reason}</p>
                <p className="mt-2 text-xs text-ink-40">
                  Reported by {item.reporter} · {item.at}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <Link
                  to={item.href}
                  className="rounded-field border border-line px-3 py-1.5 text-xs font-semibold text-aubergine hover:bg-periwinkle-tint/50"
                >
                  View
                </Link>
                <button
                  type="button"
                  className="rounded-field border border-line px-3 py-1.5 text-xs font-semibold text-ink-70 hover:bg-periwinkle-tint/50"
                  onClick={() => dismiss(item.id)}
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  className="rounded-field border border-deep-coral/40 bg-coral/10 px-3 py-1.5 text-xs font-semibold text-deep-coral hover:bg-coral/20"
                  onClick={() => dismiss(item.id)}
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
