/**
 * Admin console endpoints (SCR-032..038).
 * Shapes mirror the backend serialisers — a contract change surfaces here as a
 * type error, not as an undefined cell in a table.
 */
import { api, toQuery } from './client';
import type { ApiPagination } from './client';
import type { Role, UserStatus } from './types';

// ── Dashboard (SCR-032) ────────────────────────────────────────────────────

export type AdminDashboard = {
  designs: number;
  downloads: number;
  activeUsers: number;
  pendingReview: number;
  flagged: number;
  detail: {
    users: { total: number; active: number; newLast30Days: number };
    designs: { total: number; published: number; pending: number; draft: number; downloads: number; views: number };
    forum: { topics: number; posts: number; unanswered: number };
    moderation: { open: number; reviewing: number; resolved: number; dismissed: number; pendingDesigns: number };
    last7Days: { downloads: number; signups: number };
  };
  recentDesigns: Array<{ id: string; slug: string; title: string; status: string; author: string; createdAt: string }>;
};

// ── Users (SCR-033) ────────────────────────────────────────────────────────

export type AdminUser = {
  id: number;
  uuid: string;
  name: string;
  handle: string;
  email: string;
  role: Role;
  status: UserStatus;
  affiliation: string | null;
  emailVerified: boolean;
  reputation: number;
  uploads: number;
  lastLoginAt: string | null;
  createdAt: string;
  avatarUrl: string | null;
};

export type AdminUserFilters = {
  page?: number;
  limit?: number;
  search?: string;
  role?: Role;
  status?: UserStatus;
};

// ── Designs (SCR-034) ──────────────────────────────────────────────────────

export type AdminDesign = {
  id: string;
  numericId: number;
  slug: string;
  title: string;
  summary: string | null;
  status: 'draft' | 'pending' | 'published' | 'rejected' | 'archived';
  author: string;
  authorHandle: string;
  componentType: string | null;
  license: string | null;
  iso22916: boolean;
  featured: boolean;
  downloads: number;
  stars: number;
  createdAt: string;
  publishedAt: string | null;
};

export type DesignReviewAction = 'approve' | 'reject' | 'archive' | 'restore' | 'unpublish';

// ── Moderation (SCR-035) ───────────────────────────────────────────────────

export type AdminReport = {
  id: number;
  entityType: string;
  entityId: number;
  entity: { id: number; type: string; label: string; link: string | null; ownerId: number; status: string | null } | null;
  reason: string;
  details: string | null;
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
  reporter: { name: string; handle: string } | null;
  handledBy: string | null;
  handledAt: string | null;
  resolution: string | null;
  resolutionNote: string | null;
  createdAt: string;
};

export type ModerationSummary = {
  open: number;
  reviewing: number;
  resolved: number;
  dismissed: number;
  pendingDesigns: number;
};

export type ReportResolution = 'hide' | 'remove' | 'restore' | 'warn' | 'suspend' | 'ban' | 'no-action';

// ── Comments (SCR-036) ─────────────────────────────────────────────────────

export type AdminComment = {
  id: number;
  body: string;
  status: 'visible' | 'hidden' | 'removed';
  author: { name: string; handle: string };
  design: { title: string; slug: string };
  createdAt: string;
};

// ── News & pages (SCR-037) ─────────────────────────────────────────────────

export type AdminArticle = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  body?: string[];
  bodyRaw?: string | null;
  category: string | null;
  status: 'draft' | 'published' | 'archived';
  featured: boolean;
  views: number;
  date?: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ArticlePayload = {
  title: string;
  excerpt?: string | null;
  body?: string | null;
  category?: string | null;
  status?: 'draft' | 'published' | 'archived';
  featured?: boolean;
  publishedAt?: string | null;
};

// ── Forum (SCR-038) ────────────────────────────────────────────────────────

export type AdminCategory = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  is_locked: 0 | 1 | boolean;
  is_active: 0 | 1 | boolean;
  topic_count: number;
  post_count: number;
  sort_order: number;
};

type Paged<T> = { items: T[]; pagination: ApiPagination; meta?: Record<string, unknown> };

async function paged<T>(path: string): Promise<Paged<T>> {
  const res = await api.get<T[]>(path);
  return {
    items: res.data,
    pagination: res.meta?.pagination as ApiPagination,
    meta: res.meta as Record<string, unknown>,
  };
}

export const adminApi = {
  dashboard: () => api.get<AdminDashboard>('/admin/dashboard').then((r) => r.data),

  // ── Users ────────────────────────────────────────────────────────────────
  users: (filters: AdminUserFilters = {}) => paged<AdminUser>(`/admin/users${toQuery(filters)}`),

  changeRole: (userId: number, role: Role) =>
    api.patch<{ user: AdminUser }>(`/admin/users/${userId}/role`, { role }).then((r) => r.data.user),

  changeStatus: (userId: number, status: UserStatus, reason?: string) =>
    api.patch<{ user: AdminUser }>(`/admin/users/${userId}/status`, { status, reason }).then((r) => r.data.user),

  getUser: (userId: number) =>
    api.get<{ user: AdminUserDetail }>(`/admin/users/${userId}`).then((r) => r.data.user),

  awardBadge: (userId: number, badge: string) =>
    api.post<{ user: AdminUserDetail }>(`/admin/users/${userId}/badges`, { badge }).then((r) => r.data.user),

  // ── Designs ──────────────────────────────────────────────────────────────
  designs: (filters: { page?: number; limit?: number; search?: string; status?: string } = {}) =>
    paged<AdminDesign>(`/admin/designs${toQuery(filters)}`),

  reviewDesign: (identifier: string, action: DesignReviewAction, note?: string) =>
    api
      .patch<{ status: string; action: string }>(`/admin/designs/${identifier}/review`, { action, note })
      .then((r) => r.data),

  featureDesign: (identifier: string, featured: boolean) =>
    api.patch<{ featured: boolean }>(`/admin/designs/${identifier}/feature`, { featured }).then((r) => r.data),

  /**
   * Permanent — versions, files, comments and stored bytes all go. Archiving
   * (`reviewDesign(..., 'archive')`) is the reversible option. Admin-only.
   */
  deleteDesign: (identifier: string, note?: string) =>
    api
      .delete<{ deleted: boolean; slug: string; title: string; files: number }>(
        `/admin/designs/${encodeURIComponent(identifier)}`,
        { note },
      )
      .then((r) => r.data),

  // ── Moderation ───────────────────────────────────────────────────────────
  reports: (filters: { page?: number; limit?: number; status?: string } = {}) =>
    paged<AdminReport>(`/admin/moderation/reports${toQuery(filters)}`) as Promise<
      Paged<AdminReport> & { meta?: { summary?: ModerationSummary } }
    >,

  resolveReport: (reportId: number, action: ReportResolution, note?: string) =>
    api
      .patch<{ resolved: boolean; action: string }>(`/admin/moderation/reports/${reportId}/resolve`, { action, note })
      .then((r) => r.data),

  claimReport: (reportId: number) =>
    api.patch<{ status: string }>(`/admin/moderation/reports/${reportId}/claim`).then((r) => r.data),

  // ── Comments ─────────────────────────────────────────────────────────────
  comments: (filters: { page?: number; limit?: number; status?: string; search?: string } = {}) =>
    paged<AdminComment>(`/admin/comments${toQuery(filters)}`),

  moderateEntity: (entityType: string, entityId: number, action: 'hide' | 'remove' | 'restore', note?: string) =>
    api
      .post<{ moderated: boolean; action: string }>('/admin/moderation/actions', { entityType, entityId, action, note })
      .then((r) => r.data),

  // ── News ─────────────────────────────────────────────────────────────────
  news: (filters: { page?: number; limit?: number; status?: string } = {}) =>
    paged<AdminArticle>(`/admin/news${toQuery(filters)}`),

  getArticle: (slug: string) =>
    api
      .get<{ article: AdminArticle }>(`/admin/news/${encodeURIComponent(slug)}`)
      .then((r) => r.data.article),

  createArticle: (payload: ArticlePayload) =>
    api.post<{ article: AdminArticle }>('/admin/news', payload).then((r) => r.data.article),

  updateArticle: (slug: string, payload: Partial<ArticlePayload>) =>
    api.patch<{ article: AdminArticle }>(`/admin/news/${slug}`, payload).then((r) => r.data.article),

  deleteArticle: (slug: string) => api.delete<{ deleted: boolean }>(`/admin/news/${slug}`).then((r) => r.data),

  // ── Forum ────────────────────────────────────────────────────────────────
  categories: () => api.get<AdminCategory[]>('/admin/forum/categories').then((r) => r.data),

  createCategory: (payload: { name: string; slug?: string; description?: string }) =>
    api.post<{ category: AdminCategory }>('/admin/forum/categories', payload).then((r) => r.data.category),

  updateCategory: (
    slug: string,
    payload: { name?: string; description?: string; locked?: boolean; active?: boolean; sortOrder?: number },
  ) => api.patch<{ category: AdminCategory }>(`/admin/forum/categories/${slug}`, payload).then((r) => r.data.category),

  deleteCategory: (slug: string) =>
    api.delete<{ deleted: boolean }>(`/admin/forum/categories/${slug}`).then((r) => r.data),

  /** Topic list for the pin/lock table — the public forum endpoint, newest first. */
  topics: (filters: { page?: number; limit?: number; search?: string } = {}) =>
    paged<AdminTopic>(`/forum/topics${toQuery({ sort: 'newest', ...filters })}`),

  /** Pin, lock or move a topic (moderator+, /forum/topics/:id/moderate). */
  moderateTopic: (identifier: string, payload: { pinned?: boolean; status?: 'open' | 'solved' | 'locked' }) =>
    api.patch<{ topic: AdminTopic }>(`/forum/topics/${identifier}/moderate`, payload).then((r) => r.data.topic),

  // ── Taxonomies ───────────────────────────────────────────────────────────
  upsertTaxonomy: (table: TaxonomyTable, payload: TaxonomyPayload) =>
    api.put<{ item: unknown }>(`/admin/taxonomies/${table}`, payload).then((r) => r.data),

  deleteTaxonomy: (table: TaxonomyTable, identifier: string) =>
    api
      .delete<{ deactivated: boolean }>(
        `/admin/taxonomies/${table}/${encodeURIComponent(identifier)}`,
      )
      .then((r) => r.data),

  // ── Audit ────────────────────────────────────────────────────────────────
  auditLogs: (filters: { page?: number; limit?: number; action?: string; entityType?: string; userId?: number } = {}) =>
    paged<AdminAuditLog>(`/admin/audit-logs${toQuery(filters)}`),
};

export type AdminTopic = {
  id: string;
  numericId: number;
  slug: string;
  title: string;
  status: 'open' | 'solved' | 'locked';
  pinned: boolean;
  views: number;
  replies: number;
  category: { slug: string; name: string };
  author: { name: string; handle: string };
  createdAt: string;
};

export type AdminUserDetail = AdminUser & {
  bio?: string | null;
  badges?: Array<{ slug: string; name: string; description?: string; tone?: string; awarded_at?: string }>;
  expertise?: string[];
  designCount?: number;
  activeSessions?: number;
  suspensionReason?: string | null;
  suspendedUntil?: string | null;
};

export type TaxonomyTable =
  | 'component_types'
  | 'resource_types'
  | 'organs'
  | 'materials'
  | 'fabrication_methods'
  | 'model_types'
  | 'licenses';

export type TaxonomyPayload = {
  name: string;
  slug?: string;
  code?: string;
  note?: string | null;
  description?: string | null;
  family?: string | null;
  url?: string | null;
  summary?: string | null;
  requiresAttribution?: boolean;
  allowsCommercial?: boolean;
  shareAlike?: boolean;
  sortOrder?: number;
  active?: boolean;
};

export type AdminAuditLog = {
  id: number;
  action: string;
  entityType: string | null;
  entityId: number | null;
  actor: { name: string; handle: string } | null;
  changes: unknown;
  ip: string | null;
  at: string;
};

/** Known badge slugs from the seed set — used by the award UI. */
export const AWARDABLE_BADGES = [
  { slug: 'verified-maker', name: 'Verified maker' },
  { slug: 'iso-contributor', name: 'ISO contributor' },
  { slug: 'early-adopter', name: 'Early adopter' },
  { slug: 'first-upload', name: 'First upload' },
  { slug: 'top-contributor', name: 'Top contributor' },
  { slug: 'helpful-answer', name: 'Helpful answer' },
] as const;

