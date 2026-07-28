/**
 * Auth endpoints (SCR-009..013, SCR-015).
 * Thin, typed wrappers — no state lives here; that is the AuthProvider's job.
 */
import { api, tokenStore } from './client';
import type { AuthTokens, AuthUser, VerificationInstructions } from './types';

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
  affiliation?: string;
  accountType?: 'academic' | 'industry' | 'student' | 'other';
  country?: string;
  role?: 'user' | 'uploader';
  newsletter?: boolean;
  acceptTerms: true;
};

type AuthPayload = {
  user: AuthUser;
  tokens: AuthTokens | null;
  requiresVerification?: boolean;
  verification?: VerificationInstructions | null;
};

export const authApi = {
  /** SCR-009 — create an account; the response says how to verify it. */
  async register(payload: RegisterPayload) {
    const { data } = await api.post<AuthPayload>('/auth/register', payload, { skipAuth: true });
    if (data.tokens) tokenStore.set(data.tokens);
    return data;
  },

  /** SCR-010 */
  async login(email: string, password: string, remember = true) {
    const { data } = await api.post<AuthPayload>('/auth/login', { email, password, remember }, { skipAuth: true });
    if (data.tokens) tokenStore.set(data.tokens);
    return data;
  },

  /** SCR-013 — confirm with the emailed code, or the magic-link token. */
  async verifyEmail(input: { email: string; otp: string } | { token: string }) {
    const { data } = await api.post<{ user: AuthUser; verified: boolean }>('/auth/verify-email', input, {
      skipAuth: true,
    });
    return data;
  },

  resendVerification(email: string) {
    return api
      .post<{ sent: boolean; otpLength: number; devOtp?: string }>(
        '/auth/resend-verification',
        { email },
        { skipAuth: true },
      )
      .then((r) => r.data);
  },

  /** SCR-011 */
  forgotPassword(email: string) {
    return api
      .post<{ sent: boolean; otpLength: number; expiresInMinutes: number; devOtp?: string }>(
        '/auth/forgot-password',
        { email },
        { skipAuth: true },
      )
      .then((r) => r.data);
  },

  /** SCR-012 — reset with the emailed code, or the magic-link token. */
  resetPassword(
    input: ({ email: string; otp: string } | { token: string }) & { password: string; confirmPassword?: string },
  ) {
    return api.post<{ reset: boolean }>('/auth/reset-password', input, { skipAuth: true }).then((r) => r.data);
  },

  /** SCR-015 — changing the password rotates this device's tokens. */
  async changePassword(currentPassword: string, newPassword: string, confirmPassword?: string) {
    const { data } = await api.post<{ tokens: AuthTokens }>('/auth/change-password', {
      currentPassword,
      newPassword,
      confirmPassword: confirmPassword ?? newPassword,
    });
    if (data.tokens) tokenStore.set(data.tokens);
    return data;
  },

  /** Hydrates the app shell on load. */
  me() {
    return api.get<{ user: AuthUser }>('/auth/me').then((r) => r.data.user);
  },

  async logout(allDevices = false) {
    try {
      await api.post('/auth/logout', { refreshToken: tokenStore.refresh, allDevices });
    } finally {
      // Local state is cleared even if the network call fails.
      tokenStore.clear();
    }
  },

  sessions() {
    return api
      .get<Array<{ session_id: string; user_agent: string; ip_address: string; created_at: string }>>(
        '/auth/sessions',
      )
      .then((r) => r.data);
  },

  revokeSession(sessionId: string) {
    return api.delete(`/auth/sessions/${sessionId}`);
  },
};
