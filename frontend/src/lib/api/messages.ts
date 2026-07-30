/**
 * Direct messages (SCR-029, SCR-030).
 */
import { api, toQuery } from './client';
import type { ApiPagination } from './types';

export type MessageParticipant = {
  id: number;
  name: string;
  handle: string;
  avatarUrl: string | null;
};

/** A row in the inbox list. */
export type ConversationSummary = {
  id: string;
  numericId: number;
  subject: string | null;
  /** Display label — the other participants, or "Moderation" for system threads. */
  with: string;
  participants: MessageParticipant[];
  preview: string;
  /** True when the preview line is the caller's own last message. */
  previewFromMe?: boolean;
  unread: number;
  muted: boolean;
  isSystem: boolean;
  updatedAt: string | null;
};

export type MessageAttachment = {
  id: number;
  name: string;
  size: string;
  url: string | null;
  mimeType: string;
};

export type ChatMessage = {
  id: number;
  body: string;
  /** Resolved server-side against the caller, so the UI never compares ids. */
  from: 'me' | 'them';
  sender: MessageParticipant | null;
  attachments: MessageAttachment[];
  editedAt: string | null;
  at: string;
  createdAt: string;
};

export type ConversationDetail = {
  conversation: {
    id: string;
    numericId: number;
    subject: string | null;
    isSystem: boolean;
    /** Caller's own archive flag for this thread. */
    isArchived: boolean;
    participants: Array<MessageParticipant & { affiliation: string | null; isMe: boolean }>;
  };
  messages: ChatMessage[];
  pagination: ApiPagination;
};

export type StartConversationPayload = {
  recipientHandle: string;
  subject?: string;
  body: string;
};

export type SentMessage = {
  conversationId: string;
  message: ChatMessage;
};

export const messageApi = {
  /** SCR-029 — the inbox. `archived: true` returns the archived list instead. */
  list(params: { page?: number; limit?: number; archived?: boolean } = {}) {
    return api.get<ConversationSummary[]>(`/messages${toQuery(params)}`).then((r) => ({
      items: r.data ?? [],
      pagination: r.meta?.pagination,
      totalUnread: Number(r.meta?.totalUnread ?? 0),
    }));
  },

  /** SCR-030 — a thread. Reading it clears the caller's unread badge server-side. */
  get(id: string, params: { page?: number; limit?: number } = {}) {
    return api.get<ConversationDetail>(`/messages/${id}${toQuery(params)}`).then((r) => r.data);
  },

  /** Appends to an existing thread. */
  reply(id: string, body: string) {
    return api.post<SentMessage>(`/messages/${id}/messages`, { body }).then((r) => r.data);
  },

  /**
   * Opens a thread with a member — or appends to the existing one-to-one thread
   * if these two have talked before, so a profile never spawns duplicates.
   */
  start(payload: StartConversationPayload) {
    return api.post<SentMessage>('/messages', payload).then((r) => r.data);
  },

  setArchived(id: string, archived: boolean) {
    return api.patch<{ archived: boolean }>(`/messages/${id}/archive`, { archived }).then((r) => r.data);
  },

  unreadCount() {
    return api.get<{ unreadCount: number }>('/messages/unread-count').then((r) => r.data.unreadCount);
  },
};
