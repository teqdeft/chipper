/**
 * In-app notifications (SCR-031).
 */
import { api, toQuery } from './client';
import type { ApiPagination } from './types';

export type NotificationType =
  | 'design_comment'
  | 'design_approved'
  | 'design_rejected'
  | 'design_starred'
  | 'design_downloaded'
  | 'forum_reply'
  | 'forum_mention'
  | 'forum_answer_accepted'
  | 'message_received'
  | 'report_resolved'
  | 'role_changed'
  | 'badge_earned'
  | 'welcome'
  | 'news_published'
  | 'system'
  | string;

export type NotificationActor = {
  id: number;
  name: string;
  handle: string;
};

export type AppNotification = {
  id: number;
  type: NotificationType;
  title: string;
  body: string | null;
  href: string | null;
  entityType: string | null;
  entityId: number | null;
  data: Record<string, unknown> | null;
  actor: NotificationActor | null;
  read: boolean;
  at: string;
  createdAt: string;
};

export type NotificationListParams = {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  type?: string;
};

export const notificationApi = {
  list(params: NotificationListParams = {}) {
    return api.get<AppNotification[]>(`/notifications${toQuery(params)}`).then((r) => ({
      items: r.data ?? [],
      pagination: r.meta?.pagination as ApiPagination | undefined,
      unreadCount: Number(r.meta?.unreadCount ?? 0),
    }));
  },

  unreadCount() {
    return api
      .get<{ unreadCount: number }>('/notifications/unread-count')
      .then((r) => r.data.unreadCount);
  },

  markRead(id: number) {
    return api
      .patch<{ read: boolean; unreadCount: number }>(`/notifications/${id}/read`)
      .then((r) => r.data);
  },

  markAllRead() {
    return api
      .patch<{ read: boolean; unreadCount: number }>('/notifications/read-all')
      .then((r) => r.data);
  },

  remove(id: number) {
    return api
      .delete<{ deleted: boolean; unreadCount: number }>(`/notifications/${id}`)
      .then((r) => r.data);
  },

  clear() {
    return api
      .delete<{ cleared: boolean; unreadCount: number }>('/notifications/clear')
      .then((r) => r.data);
  },
};
