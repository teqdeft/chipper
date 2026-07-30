/**
 * Profile and account endpoints (SCR-014, SCR-015, SCR-016).
 */
import { api, toQuery } from './client';
import type { AuthUser } from './types';

export type UserSettings = {
  emailNotifications: boolean;
  notifyDesignComments: boolean;
  notifyForumReplies: boolean;
  notifyMentions: boolean;
  notifyMessages: boolean;
  notifyNewsletter: boolean;
  profilePublic: boolean;
  showEmail: boolean;
  locale: string;
};

export type ProfileStats = {
  designs: number;
  publishedDesigns: number;
  downloads: number;
  stars: number;
  forumPosts: number;
  acceptedAnswers: number;
};

export type RecentDesign = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  downloads: number;
  stars: number;
  publishedAt: string | null;
};

/** A person listed on an institution's profile. */
export type MemberCard = {
  id: number;
  uuid: string;
  handle: string;
  name: string;
  accountType: string | null;
  affiliation: string | null;
  avatarUrl: string | null;
  uploads: number;
  reputation: number;
};

/** The institution a member named, when it holds an account here. */
export type InstitutionRef = {
  name: string;
  handle: string;
  avatarUrl: string | null;
};

/** Earned badge as shown on a public profile. */
export type ProfileBadge = {
  slug: string;
  name: string;
  description: string | null;
  tone: string;
  awardedAt: string | null;
};

/** SCR-016 — what any visitor sees on a member's page. */
export type PublicProfile = Pick<
  AuthUser,
  | 'id'
  | 'uuid'
  | 'handle'
  | 'name'
  | 'affiliation'
  | 'accountType'
  | 'country'
  | 'website'
  | 'orcid'
  | 'bio'
  | 'avatarUrl'
  | 'role'
  | 'status'
  | 'reputation'
  | 'uploads'
  | 'badges'
  | 'expertise'
  | 'joinedAt'
> & {
  email?: string;
  badgeDetails?: ProfileBadge[];
  stats: ProfileStats;
  recentDesigns: RecentDesign[];
  /** Institution accounts only — null on a person's page. */
  members: { total: number; items: MemberCard[] } | null;
  /** Set on a person's page when their affiliation has an account here. */
  institution: InstitutionRef | null;
  isSelf: boolean;
};

/**
 * A row in the member directory. The endpoint is signed-in only and never
 * returns email addresses, so this is the same shape as a public profile header
 * minus the heavy parts.
 */
export type MemberSummary = Pick<
  AuthUser,
  | 'id'
  | 'uuid'
  | 'handle'
  | 'name'
  | 'affiliation'
  | 'accountType'
  | 'country'
  | 'avatarUrl'
  | 'role'
  | 'reputation'
  | 'uploads'
> & {
  expertise: string[];
  badges: string[];
};

export type UpdateProfilePayload = {
  name?: string;
  handle?: string;
  affiliation?: string | null;
  accountType?: 'student' | 'researcher' | 'institution' | null;
  country?: string | null;
  website?: string | null;
  orcid?: string | null;
  bio?: string | null;
  expertise?: string[];
};

export const userApi = {
  /**
   * Member directory search. Signed-in only, and it never surfaces members who
   * have hidden their profile — both enforced by the API.
   */
  list(
    params: {
      search?: string;
      role?: string;
      accountType?: 'student' | 'researcher' | 'institution';
      page?: number;
      limit?: number;
    } = {},
  ) {
    return api.get<MemberSummary[]>(`/users${toQuery(params)}`).then((r) => ({
      items: r.data ?? [],
      pagination: r.meta?.pagination,
    }));
  },

  /** SCR-014 — own profile, including settings and permissions. */
  me() {
    return api.get<{ user: AuthUser }>('/users/me').then((r) => r.data.user);
  },

  updateMe(payload: UpdateProfilePayload) {
    return api.patch<{ user: AuthUser }>('/users/me', payload).then((r) => r.data.user);
  },

  uploadAvatar(file: File) {
    const form = new FormData();
    form.append('avatar', file);
    return api.upload<{ user: AuthUser }>('/users/me/avatar', form).then((r) => r.data.user);
  },

  removeAvatar() {
    return api.delete<{ user: AuthUser }>('/users/me/avatar').then((r) => r.data.user);
  },

  /** SCR-015 — notification and privacy preferences. */
  settings() {
    return api.get<{ settings: UserSettings }>('/users/me/settings').then((r) => r.data.settings);
  },

  updateSettings(payload: Partial<UserSettings>) {
    return api.patch<{ settings: UserSettings }>('/users/me/settings', payload).then((r) => r.data.settings);
  },

  /** Anonymises the account and revokes every session. */
  deleteAccount(password: string, reason?: string) {
    return api
      .delete<{ deleted: boolean }>('/users/me', { password, reason, confirm: 'DELETE' })
      .then((r) => r.data);
  },

  /** SCR-016 — a member's public page. */
  publicProfile(handle: string) {
    return api.get<{ user: PublicProfile }>(`/users/${handle}`).then((r) => r.data.user);
  },
};
