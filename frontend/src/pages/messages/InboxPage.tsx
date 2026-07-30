import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { ErrorState, LoadingState } from '@/components/ui/app/LoadingState';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { useApiResource } from '@/hooks/useApiResource';
import { useToast } from '@/app/providers/ToastProvider';
import { messageApi } from '@/lib/api/messages';
import type { ConversationSummary } from '@/lib/api/messages';
import { cn, formatListDate, initialsOf } from '@/lib/utils';

type Tab = 'inbox' | 'archived';

/** SCR-029 — Inbox with conversation list and unread badges. */
export default function InboxPage() {
  const [tab, setTab] = useState<Tab>('inbox');
  const toast = useToast();

  const { data, isLoading, error, reload, setData } = useApiResource(
    () => messageApi.list({ archived: tab === 'archived', limit: 50 }),
    [tab],
  );

  const conversations = data?.items ?? [];
  const totalUnread = data?.totalUnread ?? 0;

  async function restoreConversation(conversationId: string) {
    try {
      await messageApi.setArchived(conversationId, false);
      // Drop it from the archived list immediately — no need to wait on a refetch.
      if (data) {
        setData({
          ...data,
          items: data.items.filter((item) => item.id !== conversationId),
        });
      }
      toast.success('Moved to inbox', 'The conversation is back in your inbox.');
    } catch (err) {
      toast.fromError(err);
    }
  }

  return (
    <div className="container-content max-w-3xl space-y-8">
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

      <Reveal delay={0.04}>
        <div
          className="inline-flex rounded-[12px] border border-line bg-periwinkle-tint/30 p-1"
          role="tablist"
          aria-label="Message folders"
        >
          {(['inbox', 'archived'] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cn(
                'rounded-[10px] px-4 py-2 text-sm font-semibold capitalize transition-colors',
                tab === key
                  ? 'bg-canvas text-aubergine shadow-soft'
                  : 'text-ink-55 hover:text-aubergine',
              )}
            >
              {key}
            </button>
          ))}
        </div>
      </Reveal>

      {isLoading ? (
        <LoadingState label="Loading conversations…" />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : conversations.length === 0 ? (
        <Reveal delay={0.06}>
          {tab === 'archived' ? (
            <EmptyState
              title="Nothing archived"
              body="Conversations you archive from a thread will be kept here."
            />
          ) : (
            <EmptyState
              title="No conversations yet"
              body="Open a maker's profile and use the Message button to start one. Moderation updates arrive here too."
              actionLabel="Browse designs"
              actionTo="/designs"
            />
          )}
        </Reveal>
      ) : (
        <RevealGroup
          className="overflow-hidden rounded-[18px] border border-line bg-canvas shadow-soft sm:rounded-card"
          stagger={0.04}
        >
          {conversations.map((conversation) => (
            <RevealItem key={conversation.id}>
              <ConversationRow
                conversation={conversation}
                showRestore={tab === 'archived'}
                onRestore={() => void restoreConversation(conversation.id)}
              />
            </RevealItem>
          ))}
        </RevealGroup>
      )}
    </div>
  );
}

function ConversationRow({
  conversation,
  showRestore,
  onRestore,
}: {
  conversation: ConversationSummary;
  showRestore?: boolean;
  onRestore?: () => void;
}) {
  const unread = conversation.unread > 0;
  const peer = conversation.participants[0];
  const avatarUrl = peer?.avatarUrl ?? null;
  const preview = conversation.preview
    ? `${conversation.previewFromMe ? 'You: ' : ''}${conversation.preview}`
    : 'No messages yet';

  return (
    <div
      className={cn(
        'group relative flex items-start gap-3.5 border-b border-line px-4 py-4 transition-colors last:border-b-0 sm:gap-4 sm:px-5',
        unread ? 'bg-coral/[0.04] hover:bg-coral/[0.07]' : 'hover:bg-periwinkle-tint/35',
      )}
    >
      {unread ? (
        <span
          className="absolute left-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-deep-coral sm:left-2"
          aria-hidden
        />
      ) : null}

      <Link to={`/messages/${conversation.id}`} className="flex min-w-0 flex-1 items-start gap-3.5 sm:gap-4">
        <span
          className={cn(
            'relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold ring-2 ring-canvas',
            unread ? 'bg-deep-coral text-canvas' : 'bg-periwinkle-tint text-aubergine',
          )}
          aria-hidden
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : conversation.isSystem ? (
            'M'
          ) : (
            initialsOf(conversation.with)
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-3">
            <span
              className={cn(
                'truncate font-display text-[0.95rem]',
                unread ? 'font-bold text-aubergine' : 'font-semibold text-ink-70',
              )}
            >
              {conversation.with}
            </span>
            <span
              className={cn(
                'shrink-0 text-[0.7rem] tabular-nums',
                unread ? 'font-semibold text-deep-coral' : 'text-ink-40',
              )}
            >
              {formatListDate(conversation.updatedAt)}
            </span>
          </span>

          {conversation.subject ? (
            <span className="mt-0.5 block truncate text-xs font-medium text-ink-55">
              {conversation.subject}
            </span>
          ) : peer?.handle ? (
            <span className="mt-0.5 block truncate text-xs text-ink-40">@{peer.handle}</span>
          ) : null}

          <span
            className={cn(
              'mt-1 line-clamp-1 block text-sm leading-snug',
              unread ? 'font-medium text-aubergine' : 'text-ink-55',
            )}
          >
            {preview}
          </span>
        </span>
      </Link>

      <div className="flex shrink-0 flex-col items-end gap-2 self-center">
        {unread ? <StatusBadge tone="coral">{conversation.unread}</StatusBadge> : null}
        {showRestore ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRestore?.();
            }}
            className="rounded-btn px-2.5 py-1.5 text-xs font-semibold text-deep-coral transition-colors hover:bg-coral/10"
          >
            Move to inbox
          </button>
        ) : null}
      </div>
    </div>
  );
}
