import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { mockMessages } from '@/lib/mock';
import { cn } from '@/lib/utils';

/** SCR-029 — Inbox with conversation list and unread badges. */
export default function InboxPage() {
  const totalUnread = mockMessages.reduce((sum, m) => sum + m.unread, 0);

  return (
    <div className="container-content space-y-8">
      <PageHeader
        eyebrow="Messages"
        title="Inbox"
        lede="Direct messages with makers, collaborators and the moderation team."
        actions={
          totalUnread > 0 ? (
            <StatusBadge tone="coral">{totalUnread} unread</StatusBadge>
          ) : (
            <StatusBadge tone="green">All caught up</StatusBadge>
          )
        }
      />

      {mockMessages.length === 0 ? (
        <Reveal delay={0.06}>
          <EmptyState
            title="No conversations yet"
            body="When you message another maker or receive moderation updates, they will appear here."
            actionLabel="Browse designs"
            actionTo="/designs"
          />
        </Reveal>
      ) : (
        <RevealGroup
          className="divide-y divide-line overflow-hidden rounded-[16px] border border-line bg-canvas shadow-soft"
          stagger={0.06}
        >
          {mockMessages.map((msg) => (
            <RevealItem key={msg.id}>
              <Link
                to={`/messages/${msg.id}`}
                className={cn(
                  'flex items-start gap-4 px-4 py-4 transition-colors hover:bg-periwinkle-tint/30 sm:px-5',
                  msg.unread > 0 && 'bg-coral/5',
                )}
              >
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    msg.unread > 0 ? 'bg-deep-coral text-canvas' : 'bg-periwinkle-tint text-aubergine',
                  )}
                  aria-hidden
                >
                  {msg.with
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn('font-semibold', msg.unread > 0 ? 'text-aubergine' : 'text-ink-70')}>
                      {msg.with}
                    </span>
                    <span className="shrink-0 text-xs text-ink-40">{msg.updatedAt}</span>
                  </div>
                  <p
                    className={cn(
                      'mt-1 line-clamp-2 text-sm',
                      msg.unread > 0 ? 'font-medium text-aubergine' : 'text-ink-55',
                    )}
                  >
                    {msg.preview}
                  </p>
                </div>

                {msg.unread > 0 ? (
                  <StatusBadge tone="coral" className="shrink-0 self-center">
                    {msg.unread} new
                  </StatusBadge>
                ) : null}
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      )}
    </div>
  );
}
