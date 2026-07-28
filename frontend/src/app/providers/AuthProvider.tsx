/**
 * Session state for the whole app.
 *
 * Hydrates once on mount from the stored access token, keeps the current user in
 * context, and resets when the API client reports the session has ended (a
 * refresh that could not be recovered).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '@/lib/api/auth';
import type { RegisterPayload } from '@/lib/api/auth';
import { onSessionEnded, tokenStore } from '@/lib/api/client';
import type { AuthUser, Permission, Role } from '@/lib/api/types';
import { ROLE_LEVEL } from '@/lib/access';
import type { Viewer } from '@/lib/access';
import { useToast } from '@/app/providers/ToastProvider';

type AuthContextValue = {
  user: AuthUser | null;
  viewer: Viewer;
  /** True until the initial `/auth/me` has settled — guards must wait for this. */
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<Awaited<ReturnType<typeof authApi.register>>>;
  logout: (allDevices?: boolean) => Promise<void>;
  /** Re-reads the current user (after verifying an email or editing a profile). */
  refresh: () => Promise<AuthUser | null>;
  setUser: (user: AuthUser | null) => void;
  hasRole: (role: Role) => boolean;
  hasPermission: (permission: Permission) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Shares one in-flight `/auth/me` between concurrent callers, so StrictMode's
 * double mount (and any other overlapping hydration) costs a single request.
 * Cleared once settled, so a later call re-reads the user.
 */
let hydration: Promise<AuthUser> | null = null;

function hydrateSession(): Promise<AuthUser> {
  if (!hydration) {
    hydration = authApi.me().finally(() => {
      hydration = null;
    });
  }
  return hydration;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // AuthProvider is mounted inside ToastProvider, so this is always available.
  const toast = useToast();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(tokenStore.access || tokenStore.refresh));

  /**
   * Restore the session on first paint.
   *
   * StrictMode mounts effects twice in development (mount → cleanup → mount).
   * The effect must therefore be safe to run more than once: `hydrateSession`
   * shares one in-flight request between both runs, and `cancelled` only
   * suppresses the *stale* run's state writes. Guarding the effect body with a
   * ref instead would strand `isLoading` at true forever — the first run's
   * cleanup marks it cancelled, and the second returns before doing any work.
   */
  useEffect(() => {
    if (!tokenStore.access && !tokenStore.refresh) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    hydrateSession()
      .then((current) => {
        if (!cancelled) setUser(current);
      })
      .catch(() => {
        // An unrecoverable token is not an error the user needs to see —
        // they simply continue as a guest.
        if (!cancelled) {
          tokenStore.clear();
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * The client ends the session when a refresh cannot be recovered. Mirror that
   * into state, and tell the user — being silently logged out mid-task is
   * disorienting.
   *
   * Only announced if they were actually signed in: a stale token left in
   * storage fails the same way at boot, and "your session expired" would be
   * noise for someone who was already a guest.
   */
  useEffect(() => {
    const unsubscribe = onSessionEnded(() => {
      setUser((current) => {
        if (current) {
          toast.warning('Session expired', 'Please sign in again to pick up where you left off.');
        }
        return null;
      });
    });
    return () => {
      unsubscribe();
    };
  }, [toast]);

  const login = useCallback(async (email: string, password: string, remember = true) => {
    const result = await authApi.login(email, password, remember);
    setUser(result.user);
    return result.user;
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const result = await authApi.register(payload);
    // Only a flow that skips verification returns tokens; otherwise the user
    // stays a guest until they enter the code.
    if (result.tokens) setUser(result.user);
    return result;
  }, []);

  const logout = useCallback(async (allDevices = false) => {
    await authApi.logout(allDevices);
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!tokenStore.access && !tokenStore.refresh) return null;
    try {
      const current = await authApi.me();
      setUser(current);
      return current;
    } catch {
      return null;
    }
  }, []);

  const viewer = useMemo<Viewer>(
    () =>
      user
        ? { role: user.role, permissions: user.permissions ?? [], emailVerified: user.emailVerified }
        : null,
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      viewer,
      isLoading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      refresh,
      setUser,
      hasRole: (role) => Boolean(user) && ROLE_LEVEL[user!.role] >= ROLE_LEVEL[role],
      hasPermission: (permission) => Boolean(user?.permissions?.includes(permission)),
    }),
    [user, viewer, isLoading, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
