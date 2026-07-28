/**
 * Types mirroring the API's response envelope and auth payloads.
 * Kept in one file so a backend contract change surfaces as a type error.
 */

export type Role = 'guest' | 'user' | 'uploader' | 'commercial' | 'moderator' | 'admin';

export type UserStatus = 'pending' | 'active' | 'suspended' | 'banned';

/** Capability strings from the backend's permission catalogue. */
export type Permission =
  | 'design.create'
  | 'design.update.own'
  | 'design.delete.own'
  | 'design.publish'
  | 'design.download'
  | 'design.moderate'
  | 'comment.create'
  | 'comment.update.own'
  | 'comment.moderate'
  | 'forum.post'
  | 'forum.vote'
  | 'forum.moderate'
  | 'forum.manage'
  | 'message.send'
  | 'report.create'
  | 'report.handle'
  | 'user.manage'
  | 'role.manage'
  | 'content.manage'
  | 'taxonomy.manage'
  | 'stats.view'
  | 'audit.view'
  | 'listing.manage';

export type AuthUser = {
  id: number;
  uuid: string;
  handle: string;
  name: string;
  email: string;
  affiliation: string | null;
  accountType: string | null;
  country: string | null;
  website: string | null;
  orcid: string | null;
  bio: string | null;
  avatarUrl: string | null;
  role: Role;
  status: UserStatus;
  reputation: number;
  uploads: number;
  badges: string[];
  expertise: string[];
  emailVerified: boolean;
  permissions: Permission[];
  joinedAt: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: string;
};

/** Where to send the user after registering, and how to confirm. */
export type VerificationInstructions = {
  method: 'otp' | 'link';
  email: string;
  otpLength: number;
  expiresInMinutes: number;
  /** Present only while the static development OTP is enabled. */
  devOtp?: string;
  devNote?: string;
};

export type ApiPagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type ApiSuccess<T> = {
  success: true;
  message: string;
  data: T;
  meta?: { pagination?: ApiPagination } & Record<string, unknown>;
  requestId: string;
  timestamp: string;
};

export type ApiFieldError = {
  field: string;
  message: string;
  type?: string;
  in?: 'body' | 'query' | 'params' | 'headers';
};

export type ApiFailure = {
  success: false;
  message: string;
  error: {
    code: string;
    details?: ApiFieldError[] | Record<string, unknown>;
  };
  requestId: string;
  timestamp: string;
};
