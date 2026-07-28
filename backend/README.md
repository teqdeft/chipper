# Chipper — Backend API

REST API for **Chipper**, an open community platform for microphysiological systems (organ-on-chip).
Researchers publish designs with their metadata, licence and 3D model so others can inspect, cite and reuse them.

Built with **Node.js + Express + MySQL + Knex.js**.

---

## Quick start

```bash
# 1. Install
npm install

# 2. Configure — .env is already provided for local development.
#    Set DB_USER / DB_PASSWORD to match your MySQL instance.

# 3. Create the database
mysql -u root -e "CREATE DATABASE chipper_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 4. Build the schema and load the seed data
npm run migrate
npm run seed

# 5. Run
npm run local
```

The API is then on `http://localhost:5000/api/v1`, health check on `http://localhost:5000/health`.

### Seeded accounts (development only)

One account per role, so every screen in the inventory can be walked.
**Password for all of them: `Chipper@2026`**

| Role | Email | Handle |
| --- | --- | --- |
| Admin | `admin@chipper.org` | `admin` |
| Moderator | `moderator@chipper.org` | `j.moderator` |
| Commercial | `seller@chipper.org` | `microsystems` |
| Uploader | `m.vanderberg@utwente.nl` | `m.vanderberg` |
| Uploader | `a.chen@tno.nl` | `a.chen` |
| User | `user@chipper.org` | `s.patel` |

**Dummy OTP: `123456`** — works for registration verification and password reset while
`OTP_STATIC_ENABLED=true`. Refused in production.

Override the admin credentials with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.
Demo members are **not** created when `NODE_ENV=production`.

Full details, the role→screen matrix and the OTP walkthrough:
[`docs/TEST-CREDENTIALS.md`](docs/TEST-CREDENTIALS.md).

---

## Environments

Two environment files, selected by the npm script — the app never guesses.

| Script | `NODE_ENV` | Loads |
| --- | --- | --- |
| `npm run local` | `development` | `.env` |
| `npm run production` | `production` | `.env.production` |

`src/config/env.js` resolves the file from `NODE_ENV` before anything reads `process.env`.
`src/config/index.js` then validates every variable with Joi and exits with a readable error if
something is missing or malformed — **no module reads `process.env` directly**.

`ENV_FILE=/path/to/file` overrides the mapping (useful for Docker/CI).

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run local` | Start with nodemon against `.env` |
| `npm run production` | Start against `.env.production` |
| `npm run migrate` / `migrate:prod` | Run migrations |
| `npm run migrate:rollback` | Roll back the last batch |
| `npm run migrate:fresh` | Roll back everything and re-migrate |
| `npm run seed` / `seed:prod` | Run seeds (idempotent) |
| `npm run db:reset` | `migrate:fresh` + `seed` |
| `npm run lint` / `lint:fix` | ESLint |

---

## Architecture

Layered, one directory per domain module. Dependencies point **inwards only**:
`routes → controller → service → repository → database`.

```
src/
├── config/                 Centralised configuration
│   ├── env.js              Picks .env or .env.production from NODE_ENV
│   ├── index.js            Joi-validated config object (single source of truth)
│   ├── constants.js        Roles, statuses, entity + notification types
│   ├── permissions.js      Capability catalogue + role → permission matrix
│   └── logger.js           Winston (JSON + daily rotation in production)
│
├── database/
│   ├── connection.js       The one shared Knex instance
│   ├── migrations/         7 migrations covering the whole schema
│   └── seeds/              Roles, taxonomies, admin, content, demo data
│
├── middlewares/
│   ├── authenticate.js     JWT verify + live user re-check
│   ├── authorize.js        authorize() / can() / minRole() / ownerOr()
│   ├── validate.js         Joi validation of body/query/params
│   ├── upload.js           Multer: storage, type + size validation
│   ├── rateLimiter.js      Global, auth, email, upload, write, search tiers
│   ├── security.js         Helmet, CORS, HPP
│   ├── sanitize.js         HTML stripping / rich-text whitelisting
│   ├── requestContext.js   Correlation id + request-scoped logger
│   ├── errorHandler.js     Global error handler
│   └── notFound.js
│
├── modules/                One folder per domain
│   ├── auth/               routes · controller · service · validator
│   ├── users/              + repository · serializer
│   ├── taxonomy/           Controlled vocabularies + dynamic field schema
│   ├── designs/            The core: browse, versions, files, engagement
│   ├── forum/
│   ├── messages/
│   ├── notifications/
│   ├── content/            News + CMS pages + public settings
│   ├── moderation/         Reports + moderation queue
│   ├── admin/
│   └── commercial/         Behind FEATURE_COMMERCIAL
│
├── repositories/BaseRepository.js
├── services/               Cross-cutting: mail, audit
├── templates/email/        Branded email layouts
├── utils/                  ApiError, ApiResponse, jwt, password, pagination…
├── validators/common.validator.js
├── routes/index.js         Mounts every module
├── app.js                  Express assembly (middleware order documented)
└── server.js               Boot, pre-flight checks, graceful shutdown
```

**Why the layers:** controllers only shape HTTP, services hold business rules and own transaction
boundaries, repositories own SQL. A rule such as "editing a published design branches a new draft
version" lives in exactly one place and is reachable from HTTP, a CLI or a job alike.

---

## API conventions

Base URL: `/api/v1`

Every response uses the same envelope, so the client branches on `success` alone:

```jsonc
// Success
{
  "requestId": "0e4b…",
  "timestamp": "2026-07-28T07:47:02.032Z",
  "success": true,
  "message": "Designs",
  "data": [ /* … */ ],
  "meta": { "pagination": { "page": 1, "limit": 20, "totalItems": 42,
                            "totalPages": 3, "hasNextPage": true, "hasPreviousPage": false } }
}

// Failure
{
  "requestId": "0e4b…",
  "timestamp": "2026-07-28T07:47:02.032Z",
  "success": false,
  "message": "The submitted data is not valid",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [ { "field": "email", "message": "must be a valid email", "in": "body" } ]
  }
}
```

`requestId` is echoed in the `X-Request-Id` header and in every log line for that request.

### Dates and times

- MySQL stores **UTC**. Every pooled connection is pinned to `SET time_zone = '+00:00'`, so
  `NOW()`, `CURRENT_TIMESTAMP` and application-supplied dates share one clock.
- The API emits **ISO-8601 UTC** (`2026-07-28T07:47:02.032Z`).
- The **client** renders local time (`new Date(iso).toLocaleString()`), which is correct for every
  user regardless of country. The backend never formats to a fixed regional timezone.

### Pagination, filtering, sorting

List endpoints accept `?page=1&limit=20&sortBy=…&sortOrder=asc|desc`. Filters accept repeated
params or comma-separated values: `?organ=lung,liver&material=pdms`.
`?facets=true` on `/designs` returns counts per filter value for the browse sidebar.

---

## Authentication & authorization

**JWT**, with the secret in `JWT_SECRET` (never hardcoded).

- **Access token** — short-lived, stateless, sent as `Authorization: Bearer <token>`.
- **Refresh token** — long-lived and *stateful*. Only a SHA-256 hash is stored in `refresh_tokens`,
  and tokens **rotate**: using one revokes it and issues a new pair. Presenting an already-rotated
  token is treated as theft and revokes the user's whole session family.
- Also set as an httpOnly cookie, so browser clients need not touch storage.

The token payload is never trusted alone — the user row is re-read on every request, so a
suspended, banned or deleted account loses access immediately.

### Roles and capabilities

`guest → user → uploader → commercial → moderator → admin`

Routes guard on a capability rather than a role name, so intent is obvious and roles can be
renamed safely:

```js
router.post('/', authenticate, requireVerifiedEmail, can(PERMISSIONS.DESIGN_CREATE), …)
router.patch('/:id', authenticate, can(PERMISSIONS.DESIGN_UPDATE_OWN), …)   // owner-or-moderator
router.use('/admin', authenticate, minRole(ROLES.MODERATOR))
```

---

## Data model

Full schema in `src/database/migrations/`. The two decisions worth knowing:

**1. Everything about a design is version-tracked.** The metadata specification requires it.

```
designs           identity, ownership, counters, current_version_id
design_versions   a full metadata snapshot per version (v1.0, v1.1, v2.0…)
  ├── design_files                geometry, documents, gallery images
  ├── design_version_organs       tested organs
  ├── design_credits              "who should we thank…"
  ├── design_published_works      where this design is cited
  └── design_related_documents    SOPs, CNC programs
```

Publishing v3 leaves v1 downloadable with its own numbers intact. Editing a *published* design
branches a new draft version; editing a draft edits it in place.

**2. Component-type-dependent metadata is data, not code.** `component_type_fields` declares which
extra fields each component type carries — accuracy/stability/working principle/LoD for sensors,
model type for organ chips, flow-rate range for pumps, volume and compartments for reservoirs.
Values live in `design_versions.type_specific` (JSON) and are validated against those declarations.
**A new component type is a few INSERTs — no migration, no code change.**

`GET /api/v1/taxonomies` returns the vocabularies *and* the field schema, so the upload wizard can
render its "Type fields" step dynamically.

---

## File uploads

Multer, with a configurable root (`UPLOAD_DIR`) partitioned per purpose and then by `YYYY/MM`:

```
uploads/{designs,images,avatars,attachments,documents}/2026/07/…
```

Security posture:

- **Filenames are generated server-side** (`timestamp-uuid.ext`). The client's name is stored as a
  database column only and never used to build a path — `../../etc/passwd` and null-byte tricks
  cannot escape the upload root.
- **Extension and MIME whitelists must both pass**; executables (`.exe`, `.sh`, `.php`, `.js`…) are
  rejected outright even if a whitelist were misconfigured.
- **Per-purpose size caps**: 500 MB design files, 10 MB images, 5 MB avatars, 25 MB attachments.
- Files written during a request that later fails are **removed automatically** by the error handler.
- Static serving sends `X-Content-Type-Options: nosniff` and a sandbox CSP, so a stored file can
  never be interpreted as markup.

Downloads of design files do **not** go through static serving — they pass the download gate
(`GET /designs/:id/download`), which requires a signed-in user and records who downloaded what
before a single byte is streamed.

---

## Security

| Concern | Measure |
| --- | --- |
| Transport/headers | Helmet, CSP, HSTS in production |
| CORS | Origin whitelist from `CORS_ORIGINS`, credentials enabled |
| Passwords | bcrypt (12 rounds in production), strength policy, lockout after 8 failures |
| Sessions | Rotating refresh tokens, reuse detection, revoke-on-password-change |
| Rate limiting | Global / auth / email / upload / write / search tiers, keyed by user when signed in |
| Injection | Knex parameter binding throughout; `LIKE` inputs escaped |
| XSS | `sanitize-html` on input, HTML stripped except in whitelisted rich-text fields |
| Parameter pollution | HPP with an explicit whitelist for repeatable filters |
| Prototype pollution | `__proto__` / `constructor` / `$`-prefixed keys dropped from bodies |
| Enumeration | Forgot-password and resend-verification always return the same response |
| Auditing | `audit_logs` records every privileged action with actor, IP and request id |
| Error leakage | Non-operational errors are masked in production; stack traces only in development |

---

## Verification

The build was exercised end-to-end against a live MySQL instance — **121 checks, all passing**:

- Auth: register, verify, login, refresh rotation, reuse detection, forgot/reset, change password
- Designs: browse, filters, facets, search, sorting, detail, versioning, create → upload → publish
- Uploads: real multipart upload, executable rejection, download streaming with recorded downloads
- Forum: categories, topics, replies, votes, accepted answers, mentions, search
- Messaging, notifications, moderation queue, admin dashboard, CMS, RBAC and error envelopes

Two real defects were found and fixed during that pass:

1. **Ownership check always failed** — `owner_id` was not selected in the design list projection,
   so creating a design returned 404.
2. **Password reset was born expired** — MySQL's session ran on server-local time while the driver
   wrote UTC, so a 30-minute token was already past `NOW()`. Sessions are now pinned to UTC, and
   the token-expiry columns use `datetime` to avoid MySQL's legacy auto-`ON UPDATE` rule on the
   first `TIMESTAMP NOT NULL` column of a table.

---

## Deploying

1. Copy `.env.production` and replace every `REPLACE_ME`. At minimum: database credentials and
   `JWT_REFRESH_SECRET` (use a long random string).
2. `npm ci --omit=dev`
3. `npm run migrate:prod`
4. `npm run seed:prod` — creates the admin account only; change its password immediately.
5. Run `npm run production` under a supervisor (pm2, systemd, Docker).
6. Put nginx in front for TLS and set `TRUST_PROXY=1` so client IPs and rate limits stay correct.
7. Point `UPLOAD_DIR` at a persistent volume, and back it up alongside the database.

`GET /health` returns 200 when the database is reachable and 503 when it is not — wire it to your
load balancer and uptime monitor.

Feature flags let scope land without a deployment: `FEATURE_COMMERCIAL` (SCR-039 is still gated on
a client decision), `FEATURE_REGISTRATION_OPEN`, `FEATURE_REQUIRE_EMAIL_VERIFICATION`,
`FEATURE_DESIGN_REVIEW_REQUIRED`.

---

## Endpoint reference

See [`docs/API.md`](docs/API.md) for every route, its role requirement and the screen it serves.
