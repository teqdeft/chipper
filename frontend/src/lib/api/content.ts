/**
 * Public marketing / editorial content (SCR-004, SCR-005).
 */
import { api, toQuery } from './client';
import type { ApiPagination } from './types';

export type NewsArticle = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  /** Paragraphs — only present on the detail endpoint. */
  body?: string[];
  category: string | null;
  coverImageUrl: string | null;
  author: { name: string; handle: string } | null;
  featured: boolean;
  views: number;
  /** Publish date used on cards and article headers. */
  date: string | null;
  publishedAt: string | null;
};

export type NewsDetail = {
  article: NewsArticle & { body: string[]; bodyRaw?: string | null };
  related: Array<{
    slug: string;
    title: string;
    excerpt: string | null;
    published_at: string | null;
    category: string | null;
  }>;
};

export const contentApi = {
  /** SCR-004 — published news list. */
  listNews(params: { page?: number; limit?: number; category?: string; search?: string } = {}) {
    return api.get<NewsArticle[]>(`/content/news${toQuery(params)}`).then((r) => ({
      items: r.data ?? [],
      pagination: r.meta?.pagination as ApiPagination | undefined,
    }));
  },

  /** SCR-005 — single published article by slug. */
  getNews(slug: string) {
    return api
      .get<NewsDetail>(`/content/news/${encodeURIComponent(slug)}`)
      .then((r) => r.data);
  },
};
