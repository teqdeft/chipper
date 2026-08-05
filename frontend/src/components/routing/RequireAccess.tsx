/**
 * Route guard.
 *
 * Wraps a route in the access rule its screen declares in `SCREEN_ACCESS`:
 *
 *   <Route element={<RequireAccess screen="upload" />}>
 *     <Route path="upload" element={<UploadWizardPage />} />
 *   </Route>
 *
 * Behaviour by denial reason:
 *   unauthenticated → redirect to /login (or /admin/login for console screens)
 *   unverified      → redirect to /verify-email
 *   forbidden       → "no access" screen for community routes; console screens
 *                     never show that page — non-staff go to /admin/login,
 *                     staff without that capability go to /admin
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { ROLE_LEVEL, checkAccess, ROLE_LABEL, SCREEN_ACCESS } from '@/lib/access';
import type { ScreenKey } from '@/lib/access';
import { EmptyState } from '@/components/ui/app/EmptyState';

type RequireAccessProps = {
  screen: ScreenKey;
  /** Render inline instead of wrapping nested routes. */
  children?: React.ReactNode;
};

function isAdminScreen(screen: ScreenKey) {
  return screen === 'admin' || screen.startsWith('admin/');
}

function AccessPending() {
  return (
    <div className="container-content flex min-h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-coral" />
        <p className="text-sm text-muted">Checking your access…</p>
      </div>
    </div>
  );
}

export default function RequireAccess({ screen, children }: RequireAccessProps) {
  const { viewer, isLoading } = useAuth();
  const location = useLocation();
  const required = SCREEN_ACCESS[screen];
  const consoleScreen = isAdminScreen(screen);

  // Never decide before the session has been restored, or a reload would bounce
  // a signed-in user to /login.
  if (isLoading) return <AccessPending />;

  const result = checkAccess(viewer, required);

  if (result.allowed) return <>{children ?? <Outlet />}</>;

  if (result.reason === 'unauthenticated') {
    return (
      <Navigate
        to={consoleScreen ? '/admin/login' : '/login'}
        replace
        state={{ from: location, screen: required.label }}
      />
    );
  }

  if (result.reason === 'unverified') {
    return <Navigate to="/verify-email" replace state={{ from: location, reason: 'unverified' }} />;
  }

  // Console: never show an "access denied" page — send people to the door, or
  // (if they are already staff) back to the dashboard they can use.
  if (result.reason === 'forbidden' && consoleScreen) {
    const isStaff = Boolean(viewer && ROLE_LEVEL[viewer.role] >= ROLE_LEVEL.moderator);
    if (!isStaff) {
      return (
        <Navigate
          to="/admin/login"
          replace
          state={{ from: location, screen: required.label }}
        />
      );
    }
    return <Navigate to="/admin" replace />;
  }

  const needed = required.minRole
    ? `${ROLE_LABEL[required.minRole]} access or above`
    : required.anyRole?.length
      ? required.anyRole.map((role) => ROLE_LABEL[role]).join(' or ')
      : 'additional permissions';

  return (
    <div className="container-content">
      <EmptyState
        title="You do not have access to this page"
        body={`${required.label} (${required.id}) needs ${needed}. You are signed in as ${
          viewer ? ROLE_LABEL[viewer.role] : 'a guest'
        }. If this looks wrong, ask an administrator to review your role.`}
        actionLabel="Back to designs"
        actionTo="/designs"
      />
    </div>
  );
}

/** Inverse guard: keeps signed-in users out of /login and /register. */
export function RequireGuest() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <AccessPending />;

  if (isAuthenticated) {
    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
    return <Navigate to={from ?? '/designs'} replace />;
  }

  return <Outlet />;
}
