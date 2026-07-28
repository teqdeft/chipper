# Test credentials & dummy OTP

Everything needed to sign in and walk every screen in the Screen Inventory.

> **Development only.** These accounts are created by `npm run seed` and are **skipped when
> `NODE_ENV=production`** — the production seed creates the admin account and nothing else.
> The dummy OTP is likewise refused in production; the API will not boot with it enabled.

---

## Dummy OTP

**`123456`** — works for every code prompt: registration verification (SCR-013) and password reset
(SCR-012).

Controlled by `.env`:

```bash
OTP_ENABLED=true
OTP_STATIC_ENABLED=true    # issue the same code every time
OTP_STATIC_CODE=123456     # the dummy code
OTP_LENGTH=6
OTP_MAX_ATTEMPTS=5         # wrong guesses before the request is burned
```

While `OTP_STATIC_ENABLED=true`, the API also returns the code in the response as `devOtp`, and the
verify / reset screens display it in an info banner — so you never need a mail server to test.

```jsonc
// POST /api/v1/auth/register
{ "data": { "verification": { "method": "otp", "devOtp": "123456", "otpLength": 6 } } }
```

**This is refused in production.** `.env.production` ships with `OTP_STATIC_ENABLED=false`, and
`src/config/index.js` exits with an error if it is ever switched on there — a fixed code would let
anyone verify or reset any account. Production generates a random code per request with
`crypto.randomInt` and never returns it in an API response.

---

## Where to sign in

| Entrance | URL | For |
| --- | --- | --- |
| Community | `/login` | Everyone — members, uploaders |
| **Admin console** | **`/admin/login`** | Moderators and admins |

Both use the same credentials and the same API — `/admin/login` is a separate
*entrance*, not a separate auth system. The two entrances are strictly
separated, in both directions:

- **`/login` refuses staff accounts.** Signing in there with a moderator or
  admin account signs it straight back out with "Staff account" and a link to
  the console (email carried over, pre-filled).
- **`/admin/login` refuses member accounts** the same way, pointing at the
  community sign-in.
- The community account menu never offers an admin route — the console is
  reached only via `/admin/login` (or `/admin` directly, which redirects there
  when signed out).

Once signed in at the console, staff can still browse the community pages
normally — the session is shared; only the entrances differ.

---

## Accounts

**Password for every account below: `Chipper@2026`**

| Role | Email | Password | Handle | Name |
| --- | --- | --- | --- | --- |
| **Admin** | `admin@chipper.org` | `Chipper@2026` | `admin` | Chipper Admin |
| **Moderator** | `moderator@chipper.org` | `Chipper@2026` | `j.moderator` | J. Moderator |
| **Commercial** | `seller@chipper.org` | `Chipper@2026` | `microsystems` | Micro Systems BV |
| **Uploader** | `m.vanderberg@utwente.nl` | `Chipper@2026` | `m.vanderberg` | Dr. M. van der Berg |
| **Uploader** | `a.chen@tno.nl` | `Chipper@2026` | `a.chen` | A. Chen |
| **User** | `user@chipper.org` | `Chipper@2026` | `s.patel` | S. Patel |

All are pre-verified and active, so you can sign in immediately without an OTP step.

Override the admin credentials at seed time when you need to:

```bash
SEED_ADMIN_EMAIL=you@yourlab.org SEED_ADMIN_PASSWORD='YourStrongPass1' npm run seed
SEED_DEMO_PASSWORD='AnotherPass1' npm run seed     # changes the demo accounts' password
```

---

## What each account opens

Screens marked **All** in the inventory are public and need no account.

| Screen | SCR | User | Uploader | Commercial | Moderator | Admin |
| --- | --- | :-: | :-: | :-: | :-: | :-: |
| Browse / detail / 3D viewer | 017–019 | ✅ | ✅ | ✅ | ✅ | ✅ |
| Download gate | 020 | ✅ | ✅ | ✅ | ✅ | ✅ |
| Upload wizard | 021 | — | ✅ | ✅ | ✅ | ✅ |
| My designs · Edit / new version | 022–023 | — | ✅ | ✅ | ✅ | ✅ |
| Forum read | 024–026, 028 | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ask question / new topic | 027 | ✅ | ✅ | ✅ | ✅ | ✅ |
| Inbox · Conversation | 029–030 | ✅ | ✅ | ✅ | ✅ | ✅ |
| Notifications | 031 | ✅ | ✅ | ✅ | ✅ | ✅ |
| My profile · Account settings | 014–015 | ✅ | ✅ | ✅ | ✅ | ✅ |
| Admin dashboard | 032 | — | — | — | ✅ | ✅ |
| Manage users | 033 | — | — | — | — | ✅ |
| Manage designs (review) | 034 | — | — | — | ✅ | ✅ |
| Moderation queue | 035 | — | — | — | ✅ | ✅ |
| Manage comments | 036 | — | — | — | ✅ | ✅ |
| Manage news & pages | 037 | — | — | — | — | ✅ |
| Manage forum | 038 | — | — | — | — | ✅ |
| Seller dashboard | 039 | — | — | ✅¹ | — | ✅¹ |

¹ Requires `FEATURE_COMMERCIAL=true`; the module returns 404 while the client's Q2 decision is open.

**Sign in as `user@chipper.org`** to confirm the Uploader+ guards work: the Upload button disappears
from the navbar and `/upload` shows the "you do not have access" screen naming SCR-021.

---

## Walking the OTP flows

**Registration (SCR-009 → SCR-013)**

1. `/register` — fill the form and submit.
2. You land on `/verify-email` with the address pre-filled and a banner showing `123456`.
3. Type `123456`. Entering the last digit submits automatically.
4. You are redirected to `/login` with an "Email confirmed" toast.

**Password reset (SCR-011 → SCR-012)**

1. `/forgot-password` — enter any seeded email, e.g. `a.chen@tno.nl`.
2. You land on `/reset-password` with a banner showing `123456`.
3. Enter the code and a new password (min 8 chars, one uppercase, one number).
4. You are redirected to `/login` with a "Password updated" toast.

**Things worth testing**

| Try this | Expected |
| --- | --- |
| Enter a wrong code | `Incorrect code` with the attempts remaining |
| Get it wrong 5 times | 429 — the request is burned; use "Send a new code" |
| Reuse a code | Rejected; codes are single-use |
| An unregistered email | The same generic message — the API never reveals who is registered |
| Open `/admin` as `a.chen@tno.nl` | Access screen naming SCR-032 and the role required |
| Open `/upload` signed out | Redirect to `/login`, then back to `/upload` after signing in |
| Open `/admin/users` signed out | Redirect to `/admin/login`, then straight to the users table |
| Sign in at `/admin/login` as `user@chipper.org` | Signed back out with "Not a staff account" |
| Sign in at `/admin/login` as `moderator@chipper.org` | Console opens; Users, News and Forum still refused |
| Sign in at `/login` as `admin@chipper.org` | Signed back out with "Staff account" + a console link |

> **Note on repeated testing.** `/auth/forgot-password` and
> `/auth/resend-verification` are capped at **5 requests per hour per IP**. Hit
> that and you get `429 RATE_LIMIT_EXCEEDED` — restart the API to clear the
> in-memory counter, or wait it out.

---

## Resetting the data

```bash
npm run db:reset     # drop, re-migrate, re-seed
```

Seeds are idempotent — re-running `npm run seed` will not duplicate these accounts.
