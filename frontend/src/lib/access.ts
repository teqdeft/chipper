/**
 * Role-based screen access — the routing half of the Screen Inventory's
 * "Roles" column (Guest / User / Uploader / Admin / Moderator / Commercial / All).
 *
 * This is a *navigation* guard: it decides what the app renders. The API
 * enforces the same rules server-side on every request, so a user who edits
 * localStorage gains a screen, never data.
 */
import type { Permission, Role } from './api/types';

/** Privilege ordering. Index = level, matching the backend's ROLE_LEVEL. */
export const ROLE_LEVEL: Record<Role, number> = {
  guest: 0,
  user: 10,
  uploader: 20,
  commercial: 30,
  moderator: 40,
  admin: 100,
};

export const ROLE_LABEL: Record<Role, string> = {
  guest: 'Guest',
  user: 'User',
  uploader: 'Uploader',
  commercial: 'Commercial',
  moderator: 'Moderator',
  admin: 'Admin',
};

/**
 * Every role name an account effectively holds, for display.
 *
 * `user` and `uploader` grant an identical permission set on the backend, so a
 * signed-up member genuinely holds both and a profile should say so rather than
 * naming just the one stored in the row. Staff roles are shown on their own.
 */
export function rolesHeldBy(role: Role): Role[] {
  return role === 'uploader' ? ['user', 'uploader'] : [role];
}

/** What a screen requires. `undefined` fields mean "no constraint". */
export type ScreenAccess = {
  /** Screen ID from the inventory — kept so a route traces back to the doc. */
  id: string;
  /** Human label, for the "you need access" screen. */
  label: string;
  /** Must be signed in. */
  auth?: boolean;
  /** Minimum role level (implies `auth`). */
  minRole?: Role;
  /** Any one of these roles (implies `auth`). */
  anyRole?: Role[];
  /** All of these capabilities (implies `auth`). */
  permissions?: Permission[];
  /** Requires a confirmed email address. */
  verified?: boolean;
};

/**
 * Preserves the literal keys (so `ScreenKey` stays a union of route names) while
 * widening each value to `ScreenAccess` — otherwise TypeScript narrows every
 * entry to exactly the fields it declares and the optional ones vanish.
 */
function defineScreens<T extends Record<string, ScreenAccess>>(screens: T): { [K in keyof T]: ScreenAccess } {
  return screens;
}

/**
 * Every screen in the inventory, keyed by route path.
 * "All" in the document means no entry here — the route is simply public.
 */
export const SCREEN_ACCESS = defineScreens({
  // ── Auth & account (SCR-014, SCR-015 · User+) ─────────────────────────
  'settings/profile': { id: 'SCR-014', label: 'My profile', auth: true },
  'settings/account': { id: 'SCR-015', label: 'Account settings', auth: true },

  // ── Design library ────────────────────────────────────────────────────
  // SCR-020 is marked "User+" and security-critical: the download identifies
  // the user, so the gate is the one library screen that requires an account.
  'designs/download': { id: 'SCR-020', label: 'Download', auth: true },

  // ── Upload & manage (SCR-021..023 · Uploader+) ────────────────────────
  upload: {
    id: 'SCR-021',
    label: 'Upload a design',
    minRole: 'uploader',
    permissions: ['design.create'],
    verified: true,
  },
  'my-designs': { id: 'SCR-022', label: 'My designs', minRole: 'uploader' },
  'my-designs/edit': {
    id: 'SCR-023',
    label: 'Edit design',
    minRole: 'uploader',
    permissions: ['design.update.own'],
  },

  // ── Forum — reading is public, posting is User+ (SCR-027) ─────────────
  'forum/new': { id: 'SCR-027', label: 'Ask a question', auth: true, permissions: ['forum.post'], verified: true },

  // ── Member directory ──────────────────────────────────────────────────
  // Not in the original screen inventory: individual profiles (SCR-016) are
  // public, but searching the whole membership is a members-only benefit —
  // otherwise it is a scrapeable list of every researcher and their employer.
  members: { id: 'SCR-016a', label: 'Find members', auth: true },

  // ── Messaging & notifications (SCR-029..031 · User+) ──────────────────
  messages: { id: 'SCR-029', label: 'Inbox', auth: true, permissions: ['message.send'] },
  'messages/conversation': { id: 'SCR-030', label: 'Conversation', auth: true },
  notifications: { id: 'SCR-031', label: 'Notifications', auth: true },

  // ── Admin (SCR-032..038) ─────────────────────────────────────────────
  // SCR-035 is Admin/Moderator; the rest of the module is Admin in the
  // inventory, expressed here as the capability each screen actually needs.
  admin: { id: 'SCR-032', label: 'Admin dashboard', minRole: 'moderator', permissions: ['stats.view'] },
  'admin/users': { id: 'SCR-033', label: 'Manage users', minRole: 'admin', permissions: ['user.manage'] },
  'admin/designs': { id: 'SCR-034', label: 'Manage designs', minRole: 'moderator', permissions: ['design.moderate'] },
  'admin/moderation': {
    id: 'SCR-035',
    label: 'Moderation queue',
    minRole: 'moderator',
    permissions: ['report.handle'],
  },
  'admin/comments': {
    id: 'SCR-036',
    label: 'Manage comments',
    minRole: 'moderator',
    permissions: ['comment.moderate'],
  },
  'admin/news': { id: 'SCR-037', label: 'Manage news & pages', minRole: 'admin', permissions: ['content.manage'] },
  'admin/forum': { id: 'SCR-038', label: 'Manage forum', minRole: 'admin', permissions: ['forum.manage'] },

  // ── Commercial (SCR-039 · gated on the client's Q2 answer) ───────────
  'seller/dashboard': {
    id: 'SCR-039',
    label: 'Seller dashboard',
    anyRole: ['commercial', 'admin'],
    permissions: ['listing.manage'],
  },
});

export type ScreenKey = keyof typeof SCREEN_ACCESS;

/** The signed-in identity the guards reason about. */
export type Viewer = {
  role: Role;
  permissions: Permission[];
  emailVerified: boolean;
} | null;

export type AccessDenial =
  | { allowed: true }
  | { allowed: false; reason: 'unauthenticated' | 'unverified' | 'forbidden'; required: ScreenAccess };

/**
 * Decides whether a viewer may open a screen.
 * Separated from the component so it can be unit-tested and reused for nav
 * visibility (hiding a link the user cannot open).
 */
export function checkAccess(viewer: Viewer, required: ScreenAccess): AccessDenial {
  const needsAuth = Boolean(
    required.auth || required.minRole || required.anyRole?.length || required.permissions?.length,
  );

  if (needsAuth && !viewer) return { allowed: false, reason: 'unauthenticated', required };
  if (!viewer) return { allowed: true };

  if (required.verified && !viewer.emailVerified) {
    return { allowed: false, reason: 'unverified', required };
  }

  if (required.minRole && ROLE_LEVEL[viewer.role] < ROLE_LEVEL[required.minRole]) {
    return { allowed: false, reason: 'forbidden', required };
  }

  if (required.anyRole?.length && !required.anyRole.includes(viewer.role)) {
    return { allowed: false, reason: 'forbidden', required };
  }

  // Admins hold every capability, so a missing permission here is a real denial.
  if (required.permissions?.length) {
    const missing = required.permissions.filter((p) => !viewer.permissions.includes(p));
    if (missing.length) return { allowed: false, reason: 'forbidden', required };
  }

  return { allowed: true };
}

/** Convenience for nav rendering: `canAccess(viewer, 'admin')`. */
export function canAccess(viewer: Viewer, key: ScreenKey): boolean {
  return checkAccess(viewer, SCREEN_ACCESS[key]).allowed;
}
