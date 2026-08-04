import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { ErrorState, LoadingState } from '@/components/ui/app/LoadingState';
import { Pagination } from '@/components/ui/app/Pagination';
import { Avatar } from '@/components/ui/app/Avatar';
import { Reveal } from '@/components/ui/Reveal';
import { useToast } from '@/app/providers/ToastProvider';
import { useApiResource } from '@/hooks/useApiResource';
import { notificationApi, type AppNotification } from '@/lib/api/notifications';
import { cn, formatListDate } from '@/lib/utils';

type Filter = 'all' | 'unread';

const TYPE_LABEL: Record<string, string> = {
  design_comment: 'Design comment',
  design_approved: 'Design approved',
  design_rejected: 'Design update',
  design_starred: 'Star',
  design_downloaded: 'Download',
  forum_reply: 'Forum reply',
  forum_mention: 'Mention',
  forum_answer_accepted: 'Answer accepted',
  message_received: 'Message',
  report_resolved: 'Moderation',
  role_changed: 'Account',
  badge_earned: 'Badge',
  welcome: 'Welcome',
  news_published: 'News',
  system: 'System',
};

const TYPE_TONE: Record<string, 'coral' | 'green' | 'periwinkle' | 'yellow' | 'ink'> = {
  design_comment: 'periwinkle',
  design_approved: 'green',
  design_rejected: 'coral',
  design_starred: 'yellow',
  design_downloaded: 'periwinkle',
  forum_reply: 'coral',
  forum_mention: 'yellow',
  forum_answer_accepted: 'green',
  message_received: 'periwinkle',
  report_resolved: 'ink',
  role_changed: 'ink',
  badge_earned: 'yellow',
  welcome: 'green',
  news_published: 'periwinkle',
  system: 'ink',
};

/** SCR-031 — Live notifications inbox. */
export default function NotificationsPage() {
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<number | null>(null);

  const { data, isLoading, error, reload, setData } = useApiResource(
    () =>
      notificationApi.list({
        page,
        limit: 30,
        unreadOnly: filter === 'unread',
      }),
    [filter, page],
  );

  const items = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  async function markRead(item: AppNotification) {
    if (item.read || busyId === item.id) return;
    setBusyId(item.id);
    try {
      const result = await notificationApi.markRead(item.id);
      if (!data) return;
      setData({
        ...data,
        unreadCount: result.unreadCount,
        items:
          filter === 'unread'
            ? data.items.filter((n) => n.id !== item.id)
            : data.items.map((n) => (n.id === item.id ? { ...n, read: true } : n)),
      });
    } catch (err) {
      toast.fromError(err);
    } finally {
      setBusyId(null);
    }
  }

  async function markAllRead() {
    try {
      await notificationApi.markAllRead();
      if (!data) return;
      if (filter === 'unread') {
        setData({ ...data, items: [], unreadCount: 0 });
      } else {
        setData({
          ...data,
          unreadCount: 0,
          items: data.items.map((n) => ({ ...n, read: true })),
        });
      }
      toast.success('All caught up', 'Every notification is marked as read.');
    } catch (err) {
      toast.fromError(err);
    }
  }

  async function removeOne(item: AppNotification) {
    if (busyId === item.id) return;
    setBusyId(item.id);
    try {
      const result = await notificationApi.remove(item.id);
      if (!data) return;
      setData({
        ...data,
        unreadCount: result.unreadCount,
        items: data.items.filter((n) => n.id !== item.id),
      });
    } catch (err) {
      toast.fromError(err);
    } finally {
      setBusyId(null);
    }
  }

  async function clearAll() {
    if (!items.length) return;
    try {
      await notificationApi.clear();
      setData({ items: [], pagination: data?.pagination, unreadCount: 0 });
      toast.success('Inbox cleared', 'All notifications have been removed.');
    } catch (err) {
      toast.fromError(err);
    }
  }

  async function openNotification(item: AppNotification) {
    if (!item.read) await markRead(item);
  }

  return (
    <div className="container-content max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Alerts"
        title="Notifications"
        lede="Design reviews, forum replies, messages, badges and platform updates — in one place."
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            {unreadCount > 0 ? (
              <button type="button" className="btn-ghost text-sm" onClick={() => void markAllRead()}>
                Mark all read
              </button>
            ) : (
              <StatusBadge tone="green" className="self-start sm:self-auto">All caught up</StatusBadge>
            )}
            {items.length > 0 ? (
              <button type="button" className="btn-ghost text-sm" onClick={() => void clearAll()}>
                Clear all
              </button>
            ) : null}
          </div>
        }
      />

      <Reveal delay={0.04}>
        <div
          className="inline-flex rounded-btn border border-line bg-periwinkle-tint/30 p-1"
          role="tablist"
          aria-label="Notification filters"
        >
          {([
            { key: 'all', label: 'All' },
            { key: 'unread', label: unreadCount > 0 ? `Unread (${unreadCount})` : 'Unread' },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={filter === tab.key}
              onClick={() => {
                setFilter(tab.key);
                setPage(1);
              }}
              className={cn(
                'rounded-btn px-4 py-2 text-sm font-semibold transition-colors',
                filter === tab.key
                  ? 'bg-canvas text-aubergine shadow-soft'
                  : 'text-muted hover:text-aubergine',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Reveal>

      {isLoading ? (
        <LoadingState label="Loading notifications…" />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <Reveal delay={0.06}>
          <EmptyState
            title={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            body={
              filter === 'unread'
                ? 'You are fully caught up. New activity from designs, the forum and messages will land here.'
                : 'When someone comments on your design, replies in a thread you follow, or moderation acts on a report, it shows up here.'
            }
            actionLabel="Browse designs"
            actionTo="/designs"
          />
        </Reveal>
      ) : (
        <div className="overflow-hidden rounded-card border border-line bg-surface shadow-soft">
          {items.map((item) => (
            <NotificationRow
              key={item.id}
              item={item}
              busy={busyId === item.id}
              onOpen={() => void openNotification(item)}
              onMarkRead={() => void markRead(item)}
              onRemove={() => void removeOne(item)}
            />
          ))}
        </div>
      )}

      <Pagination
        pagination={data?.pagination}
        onPage={(next) => {
          setPage(next);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </div>
  );
}

function NotificationRow({
  item,
  busy,
  onOpen,
  onMarkRead,
  onRemove,
}: {
  item: AppNotification;
  busy: boolean;
  onOpen: () => void;
  onMarkRead: () => void;
  onRemove: () => void;
}) {
  const label = TYPE_LABEL[item.type] ?? 'Update';
  const tone = TYPE_TONE[item.type] ?? 'ink';
  const href = item.href || '/notifications';
  const actorName = item.actor?.name ?? 'Chipper';

  return (
    <div
      className={cn(
        'group relative flex items-start gap-3.5 border-b border-line px-4 py-4 last:border-b-0 sm:gap-4 sm:px-5',
        item.read ? 'hover:bg-periwinkle-tint/30' : 'bg-coral/[0.04] hover:bg-coral/[0.07]',
      )}
    >
      {!item.read ? (
        <span
          className="absolute left-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-deep-coral sm:left-2"
          aria-hidden
        />
      ) : null}

      <Avatar name={actorName} className="mt-0.5 h-10 w-10 text-xs" />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={tone}>{label}</StatusBadge>
          {!item.read ? <StatusBadge tone="coral">New</StatusBadge> : null}
          <span className="text-xs text-muted">{formatListDate(item.at)}</span>
        </div>

        <Link
          to={href}
          onClick={onOpen}
          className={cn(
            'mt-1.5 block font-semibold hover:text-deep-coral',
            item.read ? 'text-muted' : 'text-aubergine',
          )}
        >
          {item.title}
        </Link>

        {item.body ? <p className="mt-1 line-clamp-2 text-sm text-muted">{item.body}</p> : null}

        {item.actor?.handle ? (
          <p className="mt-1.5 text-xs text-muted">
            from{' '}
            <Link to={`/u/${item.actor.handle}`} className="font-medium text-muted hover:text-deep-coral">
              @{item.actor.handle}
            </Link>
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            to={href}
            onClick={onOpen}
            className="rounded-field border border-line px-3 py-1.5 text-xs font-semibold text-aubergine transition-colors hover:border-line-strong hover:bg-periwinkle-tint/50"
          >
            Open
          </Link>
          {!item.read ? (
            <button
              type="button"
              disabled={busy}
              onClick={onMarkRead}
              className="rounded-field border border-line px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-line-strong hover:bg-periwinkle-tint/50 disabled:opacity-50"
            >
              Mark read
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={onRemove}
            className="rounded-field border border-line px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-line-strong hover:bg-periwinkle-tint/50 disabled:opacity-50"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
