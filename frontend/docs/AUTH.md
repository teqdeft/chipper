# Frontend — authentication & role-based access

How the Chipper frontend talks to the API, holds a session, and decides which of the 41 screens a
person may open.

---

## Configuration

```bash
# .env — local
VITE_API_URL=http://localhost:5000/api/v1

# .env.production
VITE_API_URL=https://api.chipper.org/api/v1
```

Run the backend (`npm run local` in `chipper-backend`) and the frontend (`npm run dev`) together.

**Seeded accounts for testing** — password `Chipper@2026` for all of them:

| Role | Email | Opens |
| --- | --- | --- |
| Admin | `admin@chipper.org` | everything, including SCR-032..038 |
| Moderator | `moderator@chipper.org` | dashboard, design review, moderation queue, comments |
| Commercial | `seller@chipper.org` | seller dashboard (SCR-039, needs `FEATURE_COMMERCIAL=true`) |
| Uploader | `m.vanderberg@utwente.nl` | upload, my designs, forum, messaging |
| Uploader | `a.chen@tno.nl` | same |
| User | `user@chipper.org` | browse, download, comment, forum, messaging — **no upload** |

**Dummy OTP: `123456`** — accepted by the verify-email and reset-password screens while the backend
runs with `OTP_STATIC_ENABLED=true`. Those screens also display it in an info banner, so no mail
server is needed. See `chipper-backend/docs/TEST-CREDENTIALS.md` for the full walkthrough.

Sign in as `user@chipper.org` to see the guards work: the Upload button disappears from the navbar
and `/upload` renders the access screen naming SCR-021.

---

## The pieces

```
src/lib/api/client.ts        fetch wrapper: tokens, envelope unwrapping, refresh-on-401
src/lib/api/auth.ts          typed auth endpoints
src/lib/api/types.ts         AuthUser, Role, Permission, envelope types
src/lib/api/errors.ts        API error -> friendly title / tone / action
src/lib/access.ts            SCREEN_ACCESS map + checkAccess() / canAccess()
src/app/providers/AuthProvider.tsx   session context
src/app/providers/ToastProvider.tsx  transient feedback
src/components/routing/RequireAccess.tsx  route guard
src/components/ErrorBoundary.tsx     render-crash fallback
```

---

## Session handling

`AuthProvider` restores the session once on mount by calling `/auth/me` with the stored access
token, then keeps the current user in context. Guards wait for `isLoading` to settle, so a page
refresh never bounces a signed-in user to `/login`.

```tsx
const { user, viewer, isAuthenticated, isLoading, login, logout, hasPermission } = useAuth();
```

**Token refresh.** Refresh tokens rotate server-side: using one revokes it. If two requests each
triggered a refresh, the second would present an already-rotated token and the backend would treat
it as theft and kill the whole session. The client therefore funnels every concurrent 401 into a
single in-flight refresh and replays the original requests once it resolves. If the refresh itself
fails, the client clears storage and notifies `AuthProvider`, which drops back to guest.

---

## Role-based screen access

`src/lib/access.ts` encodes the "Roles" column of the Screen Inventory. Screens marked **All** have
no entry — they are simply public. Everything narrower declares what it needs:

```ts
upload: {
  id: 'SCR-021',
  label: 'Upload a design',
  minRole: 'uploader',
  permissions: ['design.create'],
  verified: true,
},
```

Roles are ordered `guest → user → uploader → commercial → moderator → admin`, matching the backend's
`ROLE_LEVEL`. Capabilities (`design.create`, `report.handle`, …) come from `/auth/me` and are the
same strings the API enforces with, so the two cannot drift apart on a rename.

Routes wrap in the guard:

```tsx
<Route element={<RequireAccess screen="admin/users" />}>
  <Route path="users" element={<AdminUsersPage />} />
</Route>
```

Denials are handled by cause, not uniformly:

| Cause | Result |
| --- | --- |
| Not signed in | Redirect to `/login`, remembering the destination and naming the screen |
| Email unverified | Redirect to `/verify-email` |
| Wrong role / missing capability | Render an explanatory screen naming the screen, its SCR id and the role required |

The same rule drives navigation: the Navbar calls `canAccess(viewer, 'upload')` and hides the Upload
button rather than showing a link that leads to a wall.

> These guards shape **navigation, not security**. Every rule is enforced again server-side, so a
> user who edits `localStorage` gains a screen, never data. The integration tests assert both halves.

---

## Errors and feedback

`describeError()` maps an API failure to a title, tone, recovery action and per-field errors.
Unmapped codes fall through to the server's own message, so a new backend error is never swallowed.

```tsx
try {
  await login(email, password);
} catch (err) {
  const described = describeError(err);
  setFieldErrors(described.fieldErrors);   // { email: 'must be a valid email' }
  setAlert({ title: described.title, message: described.message, tone: described.tone });
  if (described.retryable) toast.fromError(err);
}
```

Two surfaces, used for different things:

- **`<FormAlert>`** — inline, above the fields it explains. For anything the user must fix in place.
- **`useToast()`** — transient, bottom-right. For confirmations and for failures that are not tied
  to one field (network drop, session expiry). Errors persist until dismissed; the rest auto-dismiss
  with a progress bar that pauses on hover.

Both announce themselves to assistive tech — `role="alert"` for errors, `role="status"` otherwise —
and respect `prefers-reduced-motion`.

`<ErrorBoundary>` catches render-time crashes so a thrown component keeps the shell intact and
offers a retry instead of a blank page (SCR-040 · CHIP-059).

---

## Auth screens

| Screen | Route | Behaviour |
| --- | --- | --- |
| SCR-009 Register | `/register` | Creates the account, then routes to verification with the address in hand |
| SCR-010 Login | `/login` | Returns the user to the screen that sent them; offers a verification link if the email is unconfirmed |
| SCR-011 Forgot password | `/forgot-password` | Always reports success — the API does not reveal whether an address is registered |
| SCR-012 Reset password | `/reset-password` | Accepts the emailed code, or a `?token=` magic link |
| SCR-013 Verify email | `/verify-email` | Segmented OTP field; a `?token=` link verifies on arrival with no typing |

`/login` and `/register` are guest-only. Recovery and verification stay open to everyone — those
links arrive by email and must work whatever the browser's session state is.

The OTP field (`<OtpInput>`) is one logical value rendered as one box per digit: paste, arrow keys,
backspace and browser autofill (`autocomplete="one-time-code"`) all behave as expected, and entering
the last digit submits.

**In development** the API returns the static code as `devOtp`; the verify and reset screens surface
it in an info alert so the flow can be walked without a mail server. It is absent in production.
