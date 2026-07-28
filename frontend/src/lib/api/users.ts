/**
 * Profile and account endpoints (SCR-014, SCR-015, SCR-016).
 */
import { api } from './client';
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
  stats: ProfileStats;
  recentDesigns: RecentDesign[];
  isSelf: boolean;
};

export type UpdateProfilePayload = {
  name?: string;
  handle?: string;
  affiliation?: string | null;
  accountType?: 'academic' | 'industry' | 'student' | 'other' | null;
  country?: string | null;
  website?: string | null;
  orcid?: string | null;
  bio?: string | null;
  expertise?: string[];
};

export const userApi = {
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
