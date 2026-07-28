import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { EmptyState } from '@/components/ui/app/EmptyState';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { mockNotifications, type MockNotification } from '@/lib/mock';
import { cn } from '@/lib/utils';

/** SCR-031 — Notifications with mark-read local state. */
export default function NotificationsPage() {
  const [items, setItems] = useState<MockNotification[]>(() => [...mockNotifications]);

  const unreadCount = items.filter((n) => !n.read).length;

  const markRead = (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="container-content space-y-8">
      <PageHeader
        eyebrow="Alerts"
        title="Notifications"
        lede="Comments, design approvals, forum replies and moderation updates."
        actions={
          unreadCount > 0 ? (
            <button type="button" className="btn-ghost text-sm" onClick={markAllRead}>
              Mark all read
            </button>
          ) : (
            <StatusBadge tone="green">All read</StatusBadge>
          )
        }
      />

      {unreadCount > 0 ? (
        <Reveal delay={0.05}>
          <p className="text-sm text-ink-55">
            <span className="font-semibold text-deep-coral">{unreadCount}</span> unread notification
            {unreadCount !== 1 ? 's' : ''}
          </p>
        </Reveal>
      ) : null}

      {items.length === 0 ? (
        <Reveal delay={0.06}>
          <EmptyState
            title="No notifications"
            body="When something needs your attention, it will show up here."
            actionLabel="Browse designs"
            actionTo="/designs"
          />
        </Reveal>
      ) : (
        <RevealGroup
          className="divide-y divide-line overflow-hidden rounded-[16px] border border-line bg-canvas shadow-soft"
          stagger={0.06}
        >
          {items.map((item) => (
            <RevealItem
              key={item.id}
              className={cn(
                'flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5',
                !item.read && 'bg-coral/5',
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {!item.read ? <StatusBadge tone="coral">New</StatusBadge> : null}
                  <Link to={item.href} className="font-semibold text-aubergine hover:text-deep-coral">
                    {item.title}
                  </Link>
                </div>
                <p className="mt-1 text-sm text-ink-55">{item.body}</p>
                <p className="mt-2 text-xs text-ink-40">{item.at}</p>
              </div>

              <div className="flex shrink-0 gap-2">
                {!item.read ? (
                  <button
                    type="button"
                    className="rounded-field border border-line px-3 py-1.5 text-xs font-semibold text-ink-70 transition-colors hover:border-line-strong hover:bg-periwinkle-tint/50"
                    onClick={() => markRead(item.id)}
                  >
                    Mark read
                  </button>
                ) : null}
                <Link
                  to={item.href}
                  className="rounded-field border border-line px-3 py-1.5 text-xs font-semibold text-aubergine transition-colors hover:border-line-strong hover:bg-periwinkle-tint/50"
                >
                  Open
                </Link>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      )}
    </div>
  );
}
