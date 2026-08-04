/**
 * Public forum / community (SCR-024..028).
 *
 * Guests can browse; posting, voting and accepting answers require a verified
 * member session (the API enforces the same rules the route guards shape).
 */
import { api, toQuery } from './client';
import type { ApiPagination } from './types';

export type ForumAuthor = {
  id: number;
  name: string;
  handle: string;
  affiliation: string | null;
  avatarUrl: string | null;
  reputation: number;
};

export type ForumCategory = {
  slug: string;
  name: string;
  description: string | null;
  icon?: string | null;
  color?: string | null;
  locked: boolean;
  topics: number;
  posts: number;
};

export type ForumTopic = {
  id: string;
  numericId: number;
  slug: string;
  title: string;
  excerpt: string | null;
  type: 'question' | 'discussion' | 'announcement';
  status: 'open' | 'solved' | 'locked';
  pinned: boolean;
  solved: boolean;
  acceptedPostId: number | null;
  views: number;
  replies: number;
  category: { slug: string; name: string };
  categorySlug: string;
  author: ForumAuthor;
  lastPost: { at: string; authorName: string; authorHandle: string } | null;
  designId: number | null;
  tags: string[];
  subscribed: boolean;
  updatedAt: string | null;
  createdAt: string;
};

export type ForumPost = {
  id: number;
  body: string;
  status: string;
  parentId: number | null;
  isFirstPost: boolean;
  isAccepted: boolean;
  votes: number;
  upvotes: number;
  downvotes: number;
  myVote: number;
  author: ForumAuthor;
  editedAt: string | null;
  at: string;
  createdAt: string;
};

export type ForumHome = {
  categories: ForumCategory[];
  stats: { topics: number; posts: number; unanswered: number };
  recentTopics: ForumTopic[];
};

export type ForumTopicDetail = {
  topic: ForumTopic;
  posts: ForumPost[];
  pagination: ApiPagination;
  viewer: {
    canReply: boolean;
    canModerate: boolean;
    canAcceptAnswer: boolean;
    isAuthor: boolean;
  };
};

export type TopicListParams = {
  page?: number;
  limit?: number;
  category?: string;
  type?: 'question' | 'discussion' | 'announcement';
  status?: 'open' | 'solved' | 'locked';
  search?: string;
  author?: string;
  tag?: string | string[];
  unanswered?: boolean;
  solved?: boolean;
  designId?: number;
  sort?: 'active' | 'newest' | 'views' | 'replies';
};

export type CreateTopicPayload = {
  title: string;
  body: string;
  category: string;
  type?: 'question' | 'discussion' | 'announcement';
  tags?: string[];
  designId?: number | null;
};

type TopicListResult = {
  items: ForumTopic[];
  pagination: ApiPagination | undefined;
  category: { slug: string; name: string; description: string | null } | null;
  viewerCanPost: boolean;
};

function topicList(path: string): Promise<TopicListResult> {
  return api.get<ForumTopic[]>(path).then((r) => ({
    items: r.data ?? [],
    pagination: r.meta?.pagination as ApiPagination | undefined,
    category: (r.meta?.category as TopicListResult['category']) ?? null,
    viewerCanPost: Boolean(r.meta?.viewerCanPost),
  }));
}

/** Canonical public URL for a topic — slug when present, uuid otherwise. */
export function topicPath(topic: Pick<ForumTopic, 'id' | 'slug'>) {
  return `/forum/t/${topic.slug || topic.id}`;
}

export const forumApi = {
  /** SCR-024 — categories, community stats and recent activity. */
  home() {
    return api.get<ForumHome>('/forum').then((r) => r.data);
  },

  /** SCR-025 / SCR-028 — filtered topic list. */
  listTopics(params: TopicListParams = {}) {
    return topicList(`/forum/topics${toQuery(params)}`);
  },

  /** Topics inside one category. */
  categoryTopics(category: string, params: Omit<TopicListParams, 'category'> = {}) {
    return topicList(`/forum/categories/${encodeURIComponent(category)}/topics${toQuery(params)}`);
  },

  /** Full-text search across titles and post bodies. */
  search(params: TopicListParams & { q?: string } = {}) {
    return topicList(`/forum/search${toQuery(params)}`);
  },

  /** SCR-026 — a thread with its posts. */
  getTopic(identifier: string, params: { page?: number; limit?: number } = {}) {
    return api
      .get<ForumTopicDetail>(`/forum/topics/${encodeURIComponent(identifier)}${toQuery(params)}`)
      .then((r) => r.data);
  },

  /** SCR-027 — start a question or discussion. */
  createTopic(payload: CreateTopicPayload) {
    return api.post<{ topic: ForumTopic }>('/forum/topics', payload).then((r) => r.data.topic);
  },

  createPost(identifier: string, body: string, parentId?: number | null) {
    return api
      .post<{ post: ForumPost }>(`/forum/topics/${encodeURIComponent(identifier)}/posts`, {
        body,
        parentId: parentId ?? null,
      })
      .then((r) => r.data.post);
  },

  /** Vote +1 / −1; repeating the same value clears the vote. */
  vote(postId: number, value: 1 | -1) {
    return api
      .post<{ score: number; upvotes: number; downvotes: number; myVote: number }>(
        `/forum/posts/${postId}/vote`,
        { value },
      )
      .then((r) => r.data);
  },

  acceptAnswer(identifier: string, postId: number) {
    return api
      .post<{ accepted: boolean; status: ForumTopic['status'] }>(
        `/forum/topics/${encodeURIComponent(identifier)}/accept/${postId}`,
      )
      .then((r) => r.data);
  },

  toggleSubscription(identifier: string) {
    return api
      .post<{ subscribed: boolean }>(`/forum/topics/${encodeURIComponent(identifier)}/subscribe`)
      .then((r) => r.data);
  },
};
