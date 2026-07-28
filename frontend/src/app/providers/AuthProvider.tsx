/**
 * Session state for the whole app.
 *
 * Hydrates once on mount from the stored access token, keeps the current user in
 * context, and resets when the API client reports the session has ended (a
 * refresh that could not be recovered).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '@/lib/api/auth';
import type { RegisterPayload } from '@/lib/api/auth';
import { onSessionEnded, tokenStore } from '@/lib/api/client';
import type { AuthUser, Permission, Role } from '@/lib/api/types';
import { ROLE_LEVEL } from '@/lib/access';
import type { Viewer } from '@/lib/access';

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hydrated = useRef(false);

  // Restore the session on first paint.
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    let cancelled = false;

    (async () => {
      if (!tokenStore.access && !tokenStore.refresh) {
        setIsLoading(false);
        return;
      }
      try {
        const current = await authApi.me();
        if (!cancelled) setUser(current);
      } catch {
        // An unrecoverable token is not an error the user needs to see —
        // they simply continue as a guest.
        if (!cancelled) {
          tokenStore.clear();
          setUser(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // The client ends the session when a refresh fails; mirror that into state.
  useEffect(() => {
    const unsubscribe = onSessionEnded(() => setUser(null));
    return () => {
      unsubscribe();
    };
  }, []);

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
