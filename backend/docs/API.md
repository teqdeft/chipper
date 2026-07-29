# Chipper API — Endpoint Reference

Base URL: `/api/v1` · Auth: `Authorization: Bearer <accessToken>`

**Access column:** `Guest` = no token · `User` = any signed-in member · `Uploader+` = uploader role
or above · `Mod+` = moderator or admin · `Admin` = admin only · `Owner` = the resource owner
(moderators may override).

Screen IDs (`SCR-xxx`) and backlog stories (`CHIP-xxx`) refer to the Screen Inventory.

---

## Auth — `/auth`

Screens: SCR-009 Register · SCR-010 Login · SCR-011/012 Password reset · SCR-013 Email verification

| Method | Path | Access | Purpose | Delivers |
| --- | --- | --- | --- | --- |
| POST | `/auth/register` | Guest | Create an account, send verification email | CHIP-001 |
| POST | `/auth/login` | Guest | Sign in, returns access + refresh tokens | CHIP-002 |
| POST | `/auth/refresh` | Guest | Rotate the refresh token | CHIP-002 |
| POST | `/auth/logout` | Guest | Revoke this session (`allDevices: true` for all) | CHIP-002 |
| POST | `/auth/verify-email` | Guest | Confirm the address, activate the account, sign the user in | CHIP-001 |
| POST | `/auth/resend-verification` | Guest | Re-send the confirmation code | CHIP-001 |
| POST | `/auth/forgot-password` | Guest | Request a reset code | CHIP-003 |
| POST | `/auth/reset-password` | Guest | Set a new password from the code | CHIP-003 |
| GET | `/auth/me` | User | Current user, settings and permissions | CHIP-004 |
| POST | `/auth/change-password` | User | Change password, revoke other sessions | CHIP-004 |
| GET | `/auth/sessions` | User | Active sessions (device, IP, last used) | — |
| DELETE | `/auth/sessions/:sessionId` | User | Revoke one session | — |

**Register body:** `name`, `email`, `password`, `confirmPassword`, `acceptTerms: true`,
optional `handle`, `affiliation`, `accountType` (`academic|industry|student|other`), `country`,
`role` (`user|uploader`), `newsletter`.

### Email OTP

Registration and password reset both issue **two credentials on one request**: a magic-link token
and a numeric code. The user can click the link or type the code — `/auth/verify-email` and
`/auth/reset-password` accept either.

```jsonc
// POST /auth/verify-email  — one of:
{ "email": "you@university.nl", "otp": "123456" }
{ "token": "<64-char token from the emailed link>" }

// POST /auth/reset-password — one of, plus the new password:
{ "email": "you@university.nl", "otp": "123456", "password": "…", "confirmPassword": "…" }
{ "token": "…",                                  "password": "…", "confirmPassword": "…" }
```

Register / forgot-password responses tell the client how to continue:

```jsonc
{
  "requiresVerification": true,
  "verification": {
    "method": "otp",
    "email": "you@university.nl",
    "otpLength": 6,
    "expiresInMinutes": 2880,
    // Development only — see below.
    "devOtp": "123456"
  }
}
```

**Development shortcut.** With `OTP_STATIC_ENABLED=true` the API issues the same fixed code
(`OTP_STATIC_CODE`, default `123456`) every time and echoes it back as `devOtp`, so the flow can be
exercised without an SMTP server. **The app refuses to boot with that flag in production** — a fixed
code would let anyone verify or reset any account.

Codes are stored as SHA-256 hashes, are single-use, expire with their request, and are capped at
`OTP_MAX_ATTEMPTS` (default 5) wrong guesses before the request is burned and a new one is needed —
a six-digit code is one in a million, which is cheap to brute-force without that cap.

| Code | Meaning |
| --- | --- |
| `OTP_INVALID` | Wrong code; `error.details.attemptsRemaining` says how many tries are left |
| `OTP_ATTEMPTS_EXCEEDED` | Too many wrong codes (429); request a new one |
| `TOKEN_INVALID_OR_EXPIRED` | Unknown/expired link or code, or an unknown email address |

---

## Users & profiles — `/users`

Screens: SCR-014 My profile · SCR-015 Account settings · SCR-016 Public profile

| Method | Path | Access | Purpose | Delivers |
| --- | --- | --- | --- | --- |
| GET | `/users` | Guest | Member directory (`?search=&role=`) | — |
| GET | `/users/mentions?q=` | User | @mention autocomplete | CHIP-044 |
| GET | `/users/me` | User | Own profile | CHIP-004 |
| PATCH | `/users/me` | User | Edit name, affiliation, bio, expertise, ORCID | CHIP-004 |
| POST | `/users/me/avatar` | User | Upload avatar (multipart `avatar`, ≤5 MB) | CHIP-004 |
| DELETE | `/users/me/avatar` | User | Remove avatar | CHIP-004 |
| GET | `/users/me/settings` | User | Notification + privacy preferences | CHIP-004 |
| PATCH | `/users/me/settings` | User | Update preferences | CHIP-004 |
| DELETE | `/users/me` | User | Delete account (anonymises, keeps provenance) | CHIP-004 |
| GET | `/users/:handle` | Guest | Public profile: uploads, reputation, badges | CHIP-051, CHIP-052 |

---

## Taxonomies — `/taxonomies`

Powers the browse filters (SCR-017) and the upload wizard's type-specific step (SCR-021).
All public — the client needs them before sign-in.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/taxonomies` | **Everything in one call**: component types (with their field schema and working principles), resource types, organs, materials, fabrication methods, model types, licences, tags, publish-as options |
| GET | `/taxonomies/component-types` | Organ chip, flow/pressure sensor, pump, reservoir, FCB, other |
| GET | `/taxonomies/component-types/:slug/fields` | Field schema for one component type |
| GET | `/taxonomies/resource-types` | SOP, Product, 3D model |
| GET | `/taxonomies/organs` | Lung, liver, gut, skin, lymph, pancreas, kidney, heart, brain |
| GET | `/taxonomies/materials` | PDMS, PMMA, COC, glass, PS, resin |
| GET | `/taxonomies/fabrication-methods` | Soft lithography, micromachining, SLA… |
| GET | `/taxonomies/model-types` | monolayer / organoid / spheroid / organ-on-chip / ALI |
| GET | `/taxonomies/licenses` | CC BY 4.0, CC BY-SA, CC BY-NC, CC0, MIT, GPL-3.0, none, custom (CHIP-012) |
| GET | `/taxonomies/working-principles?componentType=` | Principles scoped to a component type |
| GET | `/taxonomies/tags?limit=` | Popular keywords |

**Field schema shape** — drives the wizard's dynamic step:

```jsonc
{ "key": "accuracy", "label": "Accuracy", "dataType": "number", "unit": "%",
  "required": true, "filterable": false, "min": null, "max": null, "options": null }
```

`dataType` ∈ `string | text | number | range | boolean | select | multiselect | reference`.

---

## Designs — `/designs`

Screens: SCR-017 Browse · SCR-018 Detail · SCR-019 3D viewer · SCR-020 Download gate ·
SCR-021 Upload wizard · SCR-022 My designs · SCR-023 Edit / new version

### Read

| Method | Path | Access | Purpose | Delivers |
| --- | --- | --- | --- | --- |
| GET | `/designs` | Guest | Browse / search with filters, sorting, facets | CHIP-019..022 |
| GET | `/designs/mine` | Uploader+ | Own designs, all statuses | CHIP-017 |
| GET | `/designs/:id` | Guest | Full detail (`?version=v1.1` for an older version) | CHIP-023, CHIP-024 |
| GET | `/designs/:id/versions` | Guest | Version list | CHIP-011 |
| GET | `/designs/:id/viewer` | Guest | 3D-viewer payload (STL/3MF/OBJ) | CHIP-026 |
| GET | `/designs/:id/related` | Guest | Similar designs | — |
| GET | `/designs/:id/download-info` | Guest | Licence, citation and file list for the gate screen | CHIP-025 |

`:id` accepts a slug, a UUID or a numeric id.

**Browse filters** — repeatable or comma-separated:
`search`, `componentType`, `resourceType`, `organ`, `material`, `fabricationMethod`, `license`,
`tag`, `status`, `author`, `iso22916`, `featured`, `minRating`, `mine`, `facets`.
**Sort:** `sortBy` ∈ `created_at | updated_at | published_at | title | download_count | star_count |
view_count | average_rating`, `sortOrder` ∈ `asc | desc`.

### Write

| Method | Path | Access | Purpose | Delivers |
| --- | --- | --- | --- | --- |
| POST | `/designs` | Uploader+ | Create a draft (v1.0) | CHIP-008..015 |
| PATCH | `/designs/:id` | Owner | Update metadata — branches a new draft if already published | CHIP-017, CHIP-011 |
| DELETE | `/designs/:id` | Owner | Archive + soft-delete | CHIP-017 |
| POST | `/designs/:id/versions` | Owner | Start a new version (`bump: major\|minor`) | CHIP-011 |
| POST | `/designs/:id/publish` | Owner | Submit for review, or publish | CHIP-016 |
| POST | `/designs/:id/files` | Owner | Upload files (multipart `files[]`, ≤20, ≤500 MB each) | CHIP-009 |
| DELETE | `/designs/:id/files/:fileId` | Owner | Remove a file | CHIP-009 |
| GET | `/designs/:id/download` | User | **Download gate** — records the user, streams the file | CHIP-025 |

**Create/update body** (all optional on update):

```jsonc
{
  "title": "Alveolar barrier · dual channel",
  "summary": "Two-channel alveolar barrier model.",
  "description": "Long-form description…",
  "componentType": "organ-chip",
  "resourceType": "3d-model",
  "publishAs": "person_from_institute",     // person | institute | person_from_institute
  "instituteName": "University of Twente",
  "organs": ["lung"],
  "testedMaterial": "pdms",
  "testedFabricationMethod": "soft-lithography",
  "license": "CC BY 4.0",
  "customLicenseText": null,
  "howToCite": "…",
  "creditsNote": "Who should we thank for the existence of this chip?",

  // "How to use this chip" — ISO 22916
  "clipString": "CLIP-ORG-LUNG-2CH-PDMS",
  "maxHeightMm": 6.5,
  "clampingZoneHeightMm": 4.0,
  "exclusionZones": "Keep 2 mm clear around the inlet ports.",
  "clampingStrategy": "Even torque, 0.4 Nm, diagonal sequence.",
  "operatingParameters": {
    "temperature": { "min": 36.5, "max": 37.5, "unit": "°C" },
    "pressure":    { "min": 0,    "max": 5,    "unit": "kPa" },
    "flowRate":    { "min": 0.5,  "max": 2.0,  "unit": "µL/min" }
  },
  "iso22916": true,
  "iso22916Note": null,

  // Component-type-dependent — validated against component_type_fields
  "typeSpecific": { "model_type": "ali", "channel_count": 2, "membrane": "PET, 3 µm pores" },

  "tags": ["organ-chip", "barrier"],
  "credits":        [{ "name": "Biomicrosystems", "affiliation": "University of Twente", "role": "Design" }],
  "publishedWorks": [{ "title": "…", "authors": "…", "publication": "Lab on a Chip", "year": 2026, "doi": "…" }],
  "relatedDocuments": [{ "title": "Bonding SOP", "documentType": "SOP", "url": "…" }]
}
```

`typeSpecific` is validated leniently on save and **strictly on publish** — a flow sensor must
declare accuracy, stability and working principle before it can go live.

Publishing also requires a title, a licence, a component type and at least one file; otherwise the
response is `422` listing each missing field.

### Engagement

| Method | Path | Access | Purpose | Delivers |
| --- | --- | --- | --- | --- |
| POST | `/designs/:id/star` | User | Toggle star | CHIP-029 |
| POST | `/designs/:id/ownership` | User | "I have one" + optional 1–5 rating | CHIP-029 |
| GET | `/designs/:id/ownership` | Guest | Who has one | CHIP-029 |
| GET | `/designs/:id/comments` | Guest | Comments | CHIP-029 |
| POST | `/designs/:id/comments` | User | Post a comment (`parentId` to reply) | CHIP-029 |
| PATCH | `/designs/comments/:commentId` | Owner | Edit | CHIP-029 |
| DELETE | `/designs/comments/:commentId` | Owner | Remove | CHIP-029 |

---

## Forum — `/forum`

Screens: SCR-024 Home · SCR-025 Category · SCR-026 Thread · SCR-027 New topic · SCR-028 Search

| Method | Path | Access | Purpose | Delivers |
| --- | --- | --- | --- | --- |
| GET | `/forum` | Guest | Categories, stats, recent topics | CHIP-039 |
| GET | `/forum/topics` | Guest | Topic list with filters | CHIP-039, CHIP-047 |
| GET | `/forum/categories/:category/topics` | Guest | Topics in a category | CHIP-039 |
| GET | `/forum/search?q=` | Guest | Search titles and post bodies | CHIP-046 |
| GET | `/forum/topics/:id` | Guest | Thread with posts, votes, accepted answer | CHIP-040..045 |
| POST | `/forum/topics` | User | Start a thread | CHIP-040, CHIP-041 |
| PATCH | `/forum/topics/:id` | Owner | Edit title / type / tags | CHIP-040 |
| DELETE | `/forum/topics/:id` | Owner | Remove a thread | CHIP-040 |
| POST | `/forum/topics/:id/posts` | User | Reply (`parentId` to quote) | CHIP-040 |
| PATCH | `/forum/posts/:postId` | Owner | Edit a reply | CHIP-040 |
| DELETE | `/forum/posts/:postId` | Owner | Remove a reply | CHIP-040 |
| POST | `/forum/posts/:postId/vote` | User | Vote `{ value: 1 \| -1 }`; repeat to clear | CHIP-042 |
| POST | `/forum/topics/:id/accept/:postId` | Topic author | Accept an answer → status `solved` | CHIP-041 |
| POST | `/forum/topics/:id/subscribe` | User | Toggle notifications for the thread | CHIP-045 |
| PATCH | `/forum/topics/:id/moderate` | Mod+ | Pin, lock, change status, move category | CHIP-043 |

**Topic filters:** `category`, `type` (`question|discussion|announcement`),
`status` (`open|solved|locked`), `search`, `author`, `tag`, `unanswered`, `solved`, `designId`,
`sort` (`active|newest|views|replies`).

`@handle` mentions in a topic or reply notify the mentioned member automatically (CHIP-044).

---

## Messaging — `/messages`

Screens: SCR-029 Inbox · SCR-030 Conversation

| Method | Path | Access | Purpose | Delivers |
| --- | --- | --- | --- | --- |
| GET | `/messages` | User | Conversation list with unread badges | CHIP-049 |
| GET | `/messages/unread-count` | User | Badge count | CHIP-049 |
| POST | `/messages` | User | Start a conversation (`recipientHandle`, `body`, attachments) | CHIP-049 |
| GET | `/messages/:id` | Participant | Thread; reading clears the badge | CHIP-049 |
| POST | `/messages/:id/messages` | Participant | Send a message (≤5 attachments, ≤25 MB each) | CHIP-049 |
| PATCH | `/messages/:id/read` | Participant | Mark read | CHIP-049 |
| PATCH | `/messages/:id/archive` | Participant | Archive / restore | CHIP-049 |
| PATCH | `/messages/:id/mute` | Participant | Mute / unmute | CHIP-049 |
| DELETE | `/messages/:id` | Participant | Leave the conversation | CHIP-049 |
| DELETE | `/messages/items/:messageId` | Sender | Delete one message | CHIP-052 |

Non-participants receive `404`, never `403` — a conversation id alone reveals nothing.

---

## Notifications — `/notifications`

Screen: SCR-031

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/notifications` | User | List (`?unreadOnly=true&type=`) |
| GET | `/notifications/unread-count` | User | Badge count |
| PATCH | `/notifications/:id/read` | User | Mark one read |
| PATCH | `/notifications/read-all` | User | Mark all read |
| DELETE | `/notifications/:id` | User | Remove one |
| DELETE | `/notifications/clear` | User | Clear all |

Types: `design_comment`, `design_approved`, `design_rejected`, `design_starred`, `forum_reply`,
`forum_mention`, `forum_answer_accepted`, `message_received`, `report_resolved`, `role_changed`,
`system`. Delivery respects each member's notification preferences (CHIP-030).

---

## Public content — `/content`

Screens: SCR-001 Home · SCR-002 About · SCR-003 How it works · SCR-004/005 News · SCR-006 Privacy ·
SCR-007 Terms · SCR-008 Licences

| Method | Path | Access | Purpose | Delivers |
| --- | --- | --- | --- | --- |
| GET | `/content/home` | Guest | Featured + latest designs, news teaser, community stats | Kickoff |
| GET | `/content/settings` | Guest | Public settings, feature flags, upload limits | — |
| GET | `/content/stats` | Guest | Designs published, members, reuses, labs | — |
| GET | `/content/news` | Guest | News list (`?category=&search=`) | CHIP-033 |
| GET | `/content/news/:slug` | Guest | Article + related | CHIP-033 |
| GET | `/content/pages` | Guest | All published static pages | CHIP-034 |
| GET | `/content/pages/:slug` | Guest | One page (`about`, `how-it-works`, `privacy`, `terms`, `licenses`) | CHIP-034 |

---

## Reporting — `/reports`

| Method | Path | Access | Purpose | Delivers |
| --- | --- | --- | --- | --- |
| POST | `/reports` | User | Flag content | CHIP-052 |

Body: `entityType` (`design | design_comment | forum_topic | forum_post | message | user`),
`entityId`, `reason` (`spam | abuse | licence | off-topic | inaccurate | other`), optional `details`.

---

## Admin — `/admin`

Screens: SCR-032 Dashboard · SCR-033 Users · SCR-034 Designs · SCR-035 Moderation queue ·
SCR-036 Comments · SCR-037 News & pages · SCR-038 Forum

All routes require `moderator` or above; the capability column shows the finer requirement.

### Dashboard & users

| Method | Path | Access | Purpose | Delivers |
| --- | --- | --- | --- | --- |
| GET | `/admin/dashboard` | Mod+ | Designs, downloads, active users, pending review, flagged | CHIP-036, CHIP-038 |
| GET | `/admin/users` | Admin | Find users (`?search=&role=&status=&verified=`) | CHIP-036 |
| GET | `/admin/users/:id` | Admin | User detail | CHIP-036 |
| PATCH | `/admin/users/:id/role` | Admin | Change role | CHIP-036 |
| PATCH | `/admin/users/:id/status` | Admin | Suspend / ban / reactivate | CHIP-036 |
| POST | `/admin/users/:id/badges` | Admin | Award a badge | CHIP-051 |

### Designs & moderation

| Method | Path | Access | Purpose | Delivers |
| --- | --- | --- | --- | --- |
| GET | `/admin/designs` | Mod+ | All designs incl. drafts and pending | CHIP-037 |
| PATCH | `/admin/designs/:id/review` | Mod+ | `approve \| reject \| archive \| restore \| unpublish` | CHIP-037 |
| PATCH | `/admin/designs/:id/feature` | Admin | Feature on the home page | CHIP-035 |
| GET | `/admin/moderation/reports` | Mod+ | Queue, flagged first, with the reported entity | CHIP-031, CHIP-037 |
| PATCH | `/admin/moderation/reports/:id/claim` | Mod+ | Take a report | CHIP-031 |
| PATCH | `/admin/moderation/reports/:id/resolve` | Mod+ | `hide \| remove \| restore \| warn \| suspend \| ban \| no-action` | CHIP-031 |
| POST | `/admin/moderation/actions` | Mod+ | Moderate directly, without a report | CHIP-031 |
| GET | `/admin/comments` | Mod+ | Every comment, with moderation actions | CHIP-031 |

Approving or rejecting a design notifies the uploader in-platform and by email.

### CMS, forum structure, taxonomies

| Method | Path | Access | Purpose | Delivers |
| --- | --- | --- | --- | --- |
| GET/POST | `/admin/news` | Admin | List / create (multipart `coverImage`) | CHIP-033 |
| PATCH/DELETE | `/admin/news/:slug` | Admin | Edit / remove | CHIP-033 |
| GET | `/admin/pages` | Admin | All pages incl. drafts | CHIP-034 |
| PUT | `/admin/pages/:slug` | Admin | Create or update a page | CHIP-034 |
| DELETE | `/admin/pages/:slug` | Admin | Remove (system pages are protected) | CHIP-034 |
| GET/POST | `/admin/forum/categories` | Admin | List / create | CHIP-039 |
| PATCH/DELETE | `/admin/forum/categories/:category` | Admin | Edit / remove (must be empty) | CHIP-043 |
| PUT | `/admin/taxonomies/:table` | Admin | Add or edit a vocabulary item | CHIP-008..015 |
| DELETE | `/admin/taxonomies/:table/:identifier` | Admin | Deactivate an item | CHIP-008..015 |
| GET | `/admin/settings` | Admin | All site settings | CHIP-035 |
| PUT | `/admin/settings/:key` | Admin | Update a setting | CHIP-035 |
| GET | `/admin/audit-logs` | Admin | Audit trail | CHIP-038 |

`:table` ∈ `component_types | resource_types | organs | materials | fabrication_methods |
model_types | licenses`.

---

## Commercial — `/commercial` *(SCR-039, gated)*

Marked **Open / Later** in the screen inventory — gated on the client's answer to Q2.
Returns `404 FEATURE_DISABLED` until `FEATURE_COMMERCIAL=true`.

| Method | Path | Access | Purpose | Delivers |
| --- | --- | --- | --- | --- |
| GET | `/commercial/listings` | Guest | Public listings | CHIP-007 |
| POST | `/commercial/listings/:uuid/events` | Guest | Track view / click / contact | CHIP-028 |
| POST | `/commercial/profile` | User | Create or update a seller profile | CHIP-027 |
| GET | `/commercial/dashboard` | Commercial | Listings + view/click stats | CHIP-027, CHIP-028 |
| POST | `/commercial/listings` | Commercial | Create a listing | CHIP-007 |
| PATCH/DELETE | `/commercial/listings/:uuid` | Commercial | Edit / remove | CHIP-007 |

---

## System

| Method | Path | Purpose | Delivers |
| --- | --- | --- | --- |
| GET | `/health`, `/healthz` | 200 healthy, 503 when the database is unreachable | CHIP-059 |
| GET | `/api/v1` | Service descriptor and endpoint list | — |
| GET | `/static/uploads/...` | Public assets (avatars, gallery images, news covers) | — |

Design files are **not** served from `/static/uploads` — they go through the download gate so every
download identifies a user (CHIP-025).

Email templates (SCR-041): verification, password reset, welcome, password changed, notification
digest, design status. See `src/templates/email/index.js`.

---

## Error codes

| HTTP | Code | Meaning |
| --- | --- | --- |
| 400 | `BAD_REQUEST`, `INVALID_JSON`, `FILE_TYPE_BLOCKED`, `FILE_TYPE_NOT_ALLOWED`, `SELF_VOTE`, `SELF_MESSAGE` | Malformed or disallowed request |
| 401 | `TOKEN_MISSING`, `TOKEN_EXPIRED`, `TOKEN_INVALID`, `INVALID_CREDENTIALS`, `SESSION_REVOKED`, `SESSION_EXPIRED` | Authentication failed |
| 403 | `PERMISSION_DENIED`, `ROLE_NOT_ALLOWED`, `NOT_OWNER`, `EMAIL_NOT_VERIFIED`, `ACCOUNT_SUSPENDED`, `ACCOUNT_BANNED`, `ACCOUNT_LOCKED`, `TOPIC_LOCKED`, `CORS_BLOCKED` | Authenticated but not allowed |
| 404 | `NOT_FOUND`, `ROUTE_NOT_FOUND`, `FEATURE_DISABLED` | Absent, or hidden by design |
| 409 | `CONFLICT`, `EMAIL_TAKEN`, `HANDLE_TAKEN`, `VERSION_EXISTS`, `ALREADY_REPORTED`, `CATEGORY_NOT_EMPTY` | Conflicts with existing state |
| 413 | `PAYLOAD_TOO_LARGE`, `LIMIT_FILE_SIZE` | Body or file over the limit |
| 422 | `VALIDATION_ERROR` | Field-level validation failed — see `error.details[]` |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests; `details.retryAfterSeconds` |
| 500 | `INTERNAL_SERVER_ERROR` | Masked in production |
| 503 | `DB_UNAVAILABLE` | Database unreachable |
