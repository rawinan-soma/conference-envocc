---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-06-09'
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-conference-envocc-2026-06-07/prd.md
  - _bmad-output/planning-artifacts/ux-designs/ux-conference-envocc-2026-06-07/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-conference-envocc-2026-06-07/EXPERIENCE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-conference-envocc-2026-06-07/.decision-log.md
workflowType: 'architecture'
project_name: 'conference-envocc'
user_name: 'Rawinan'
date: '2026-06-09'
---

# Architecture Decision Document
## ENVOCC Conference Room Booking System

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
~61 FRs across 11 feature groups. Architecturally they cluster into: (a) a
booking/calendar core with hard conflict-free guarantees; (b) a dual-audience
registration system — authenticated internal "register to attend" (F11) and
anonymous token-based external registration (F5); (c) an organizer workspace
(dashboard, registrant management, sign-in PDF/QR); (d) an admin plane (room
inventory, analytics/heatmap, CSV export, SMTP/role settings, audit log); and
(e) a notification subsystem (transactional + scheduled email over org SMTP).

**Non-Functional Requirements:**
- NFR-001 Security — no critical/high vulns; secure token & credential storage.
- NFR-002 Reliability — 100% double-booking prevention (data-layer guarantee).
- NFR-003 Performance — calendar/dashboard load < 3s under org load.
- NFR-004 Responsiveness — external registration full-responsive (mobile +
  desktop, equal); organizer flow smartphone-usable.
- NFR-005 Data Retention — records retained indefinitely until admin deletes.
- NFR-006 Localization — Thai single-language UI, emails, and PDFs.
- NFR-007 Accessibility — WCAG 2.1 AA, public pages and internal app.

**Scale & Complexity:**
- Primary domain: full-stack responsive web application.
- Complexity level: medium (no multi-tenancy, no real-time; lifted by IdP,
  SMTP-only delivery, scheduling, i18n, accessibility, conflict integrity).
- Estimated architectural components: ~8–9 (web client, backend API,
  relational DB, IdP integration, email/SMTP sender + queue, job scheduler,
  document/QR generation, object/file storage, audit store).

### Technical Constraints & Dependencies

- Greenfield full replacement — legacy stack treated as unknown; security
  vulnerabilities preclude reuse (PRD §6).
- Organization identity provider (IdP) is an external dependency (FR-090).
- Organization-operated SMTP server is a hard dependency; third-party email
  delivery services are prohibited (FR-080 / §6).
- No external calendar integration (Google/Outlook) (§6).
- External-registrant data minimization (§6) constrains what the public form
  may collect and store.

### Cross-Cutting Concerns Identified

1. Identity & profile sourcing — IdP (internal) + signed tokens (external);
   OQ-3 (profile attribute source) still open and gates FR-101.
2. Authorization — capability/role model + ownership scoping + read-to-attend.
3. Transactional booking integrity — conflict-free guarantee (NFR-002).
4. Email/notification subsystem — SMTP-only, transactional + scheduled, trust.
5. Background job scheduling — reminders, auto-close.
6. Localization (Thai) across UI, email, and generated documents.
7. Accessibility (WCAG 2.1 AA).
8. Document & asset generation — sign-in PDF, QR codes, CSV, photo upload.
9. Audit logging — append-only change history.
10. Public-endpoint security — token entropy, rate-limiting, anti-abuse on an
    uncapped registration form.

## Starter Template Evaluation

### Primary Technology Domain

Full-stack responsive web application → SvelteKit (Svelte 5), scaffolded with
the official `sv` CLI, on the **Bun** runtime and package manager.

### Starter Options Considered

- **Official `sv create` + Bun (chosen)** — Svelte team's unified CLI (replaces
  deprecated `create-svelte`), run via Bun. Composable add-ons; nothing to undo.
- **Third-party SvelteKit boilerplates** — rejected: they bake in
  username/password auth (we use the org IdP, FR-090) and drift faster than the
  official CLI.

### Selected Starter: Official SvelteKit `sv` CLI on Bun

**Rationale for Selection:**
- First-party, always-current (`sv` 0.15.x, June 2026); add-on model includes
  exactly what the PRD needs and excludes auth scaffolding that conflicts with
  IdP login.
- Bun as runtime + package manager: fast installs, single toolchain; production
  served by a standalone Bun server via `svelte-adapter-bun`, deployed as an
  on-prem Docker container.
- Drizzle + PostgreSQL (**node-postgres / `pg`** driver) supports the
  conflict-integrity guarantee (NFR-002); node-postgres chosen for its mature,
  battle-tested connection pooling and reliable concurrent transactions under
  Bun (Bun.sql deferred as a future optimization only).
- shadcn-svelte (+ Tailwind v4) is the component/styling system; the locked
  DESIGN.md tokens (Forest & Copper palette, Noto Serif/Sans Thai, 8px spacing,
  radius/shadow scales) are wired into shadcn's CSS-variable theme — resolves
  the deferred component-library question (UXD-011).
- Paraglide 2.0 satisfies Thai localization (NFR-006) with English message
  source + Thai production locale (no Thai hardcoded in code/mocks).

**Initialization Commands:**

```bash
# 1. Scaffold SvelteKit with Bun
bunx sv create conference-envocc
#   • Template:      SvelteKit minimal
#   • Type checking: TypeScript
#   • Add-ons:       prettier, eslint, vitest, playwright,
#                    tailwindcss, drizzle, paraglide
#   • drizzle   →    PostgreSQL → node-postgres (pg) → docker-compose: yes
#   • paraglide →    source locale: en  ·  add locale: th
cd conference-envocc && bun install

# 2. Component/styling system
bunx shadcn-svelte@latest init        # wire DESIGN.md tokens into theme vars

# 3. Production adapter for Bun (on-prem server)
bun add -d svelte-adapter-bun         # set in svelte.config.js
```

**Architectural Decisions Provided by Starter:**

- **Language & Runtime:** TypeScript end-to-end; **Bun** runtime + package
  manager; Vite dev/build.
- **Styling / Components:** Tailwind CSS v4 + **shadcn-svelte**; DESIGN.md
  tokens mapped to shadcn CSS-variable theme; Thai-capable fonts (Noto
  Serif/Sans Thai) loaded per DESIGN.md.
- **Build Tooling:** Vite (SvelteKit), Tailwind v4 plugin, Paraglide Vite
  plugin (tree-shakable compiled messages).
- **Testing:** Vitest (unit/component) + Playwright (e2e) — e2e covers the
  booking-conflict path and registration flows.
- **Data Layer:** Drizzle ORM → PostgreSQL via node-postgres (`pg`);
  docker-compose Postgres for local dev; in-repo schema + migrations.
- **Code Organization:** SvelteKit file routing; `+page.server.ts`/form actions
  for server logic; `src/lib/server/**` for DB, email, auth, domain services
  (server-only); `src/lib/paraglide` for compiled messages.
- **Deployment:** `svelte-adapter-bun` → standalone Bun server (0.0.0.0:3000,
  `PORT`/`HOST` env, unix-socket option for nginx) in an on-prem Docker image.
- **Dev Experience:** HMR (5173), ESLint + Prettier, type-safe routes, queries,
  and i18n messages.

**Deferred to architectural decisions (not set by the starter):**
- Org IdP (OIDC/SAML) auth + session strategy (FR-090) — no password-auth add-on.
- Background job scheduler for reminders & auto-close (FR-037/033).
- SMTP email module (FR-080) and PDF/QR generation libraries.

**Note:** Project initialization using these commands should be the first
implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Booking conflict-integrity mechanism (NFR-002)
- Authentication (Authentik OIDC via Better Auth) + profile sourcing (OQ-3)
- Authorization model enforcement (FR-091/094)
- External token security model (FR-045/092)
- Background job + email subsystem (FR-037/033/080)

**Important Decisions (Shape Architecture):**
- Forms/validation library, API pattern, PDF/QR generation, logging

**Deferred Decisions (Post-MVP / later phase):**
- CI/CD specifics (pipeline tooling) — depends on chosen VCS/runner
- Caching layer — not needed at expected org load (revisit if NFR-003 at risk)
- Bun.sql driver migration — only if profiling demands it

### Data Architecture

- **Database:** PostgreSQL (starter). ORM: Drizzle via the **node-postgres
  (`pg`)** driver (`drizzle-orm/node-postgres` + `pg.Pool`).
- **Conflict-free booking (NFR-002):** enforce at the DB with an exclusion
  constraint — `CREATE EXTENSION btree_gist;` then on the bookings table
  `EXCLUDE USING gist (room_id WITH =, during WITH &&)` where `during` is a
  **half-open `tstzrange` `[start, end)`** (so back-to-back 10:00–11:00 /
  11:00–12:00 do NOT conflict; no turnover buffer required). The constraint is
  **scoped to active bookings** (predicate excludes cancelled rows, so a
  cancelled booking never blocks a new one). Overlapping bookings for the same
  active room are rejected by the database; the app **catches Postgres error
  `23P01`** and maps it to the localized field-level conflict message (UXD-020).
  App-level pre-checks are UX-only, not the guard.
- **Validation:** Valibot schemas shared between client and server; one schema
  per form/command, reused in load/actions and (where useful) DB-adjacent.
- **Migrations:** drizzle-kit (generate + migrate); migrations run on deploy.
- **Audit log (FR-073):** append-only `audit_log` table (timestamp, actor,
  entity, action, diff); written within the same transaction as the change.
- **Caching:** none for MVP; rely on SSR load functions + Postgres. Revisit only
  if NFR-003 (<3s) is threatened.

### Authentication & Security

- **Auth library:** Better Auth (replaces deprecated Lucia) with the Drizzle
  adapter (provider `pg`); schema generated via `bunx @better-auth/cli generate`;
  `svelteKitHandler` in hooks; `sveltekitCookies` plugin last. Sessions are
  DB-backed in Postgres; session available on `event.locals`.
- **Internal identity:** Authentik via Better Auth **Generic OAuth / SSO plugin
  (OIDC)** — authorization-code + PKCE. Authentik is the IdP; the app holds the
  session. (Internal users only; external registrants are never Better Auth users.)
- **Profile sourcing (OQ-3 — RESOLVED: self-service):** Authentik is used for
  **authentication only**. On first login the user completes an **app-owned
  profile** (title, name, phone, email, organization); the app does not depend on
  IdP claims for profile data (email may be pre-populated from the OIDC claim as a
  convenience but remains app-owned/editable). FR-101 prefill reads this profile.
- **Authorization (FR-091/094):** role on the user record — `organizer` is the
  default for every internal user, `admin` is assigned (set via settings).
  Enforcement is server-side in hooks + per-route `load`/actions: organizers
  manage only their own bookings; any internal user may *view* another event to
  register (read-to-attend); admins read-all; no booking-approval path.
- **External token model (FR-045/092):** opaque, high-entropy (CSPRNG) random
  tokens, **stored hashed** — one per event (registration link) and one per
  registration (self-cancel link). Not JWTs (revocable, no claims to leak). Each
  token authorizes access **only to its own registration/event** (explicit guard
  against IDOR — verified by negative tests); self-cancel tokens are single-use;
  tokens expire with the event/registration lifecycle. A lost link is
  recoverable via the resend path (FR-047). Public pages are anonymous.
- **Public-endpoint hardening:** rate-limit the registration + self-cancel
  endpoints (IP + token scoped); Valibot input validation; CSRF protection on
  form actions (SvelteKit built-in); secrets via env, never in repo (NFR-001).

### API & Communication Patterns

- **Pattern:** SvelteKit-native — `+page.server.ts` form actions for mutations,
  `+server.ts` endpoints for non-form/public/integration routes (e.g. token
  registration). No separate API service.
- **Forms:** sveltekit-superforms + Valibot (progressive-enhancement, typed,
  client+server validation) — fits the heavy booking & registration forms and
  the inline field-error pattern (UXD-020).
- **Error handling:** typed `fail()` in actions + superforms messages for
  field/form errors; SvelteKit `error()` + page-level banner for system errors
  (mirrors UXD-020 state patterns).

### Background Jobs & Notifications

- **Job queue/scheduler:** **pg-boss** (Postgres-backed; SKIP LOCKED, scheduling,
  automatic retries w/ exponential backoff, dead-letter) — no extra
  infrastructure beyond Postgres. Jobs: a **reminder sweeper** — an *idempotent
  periodic* job that finds events ~1 day out with unsent reminders, sends, and
  marks them sent (survives worker downtime; never double-sends; replaces fragile
  per-event one-off scheduling) for the single **1-day-before** reminder (FR-037);
  **auto-close registration** on closing date (FR-033); and the **email send
  queue** with retry. All email jobs carry an **idempotency key** so at-least-once
  delivery cannot duplicate mail; failed sends land in a **dead-letter queue with
  operator-visible status**.
- **Worker:** a dedicated Bun worker process (separate from the web server) runs
  pg-boss handlers; both share the Postgres connection config. (In-process is
  acceptable for MVP scale but the separate process is the target.)
- **Email:** nodemailer over the organization's SMTP (FR-080, no third-party
  ESP); sender display name = organization (FR-083). Each send is a pg-boss job
  (retryable). Thai content (NFR-006) via Paraglide-rendered templates.

### Document & Asset Generation

- **Sign-in sheet PDF (FR-036):** generated with a **server-side PDF library
  (pdfmake) embedding a Thai font (Noto Sans Thai)** — deterministic layout,
  small dependency, correct Thai rendering (NFR-006), and **no headless browser
  to operate** on-prem (avoids the Chromium font/`/dev/shm`/lifecycle tax).
  Generated on-demand in a server route. (Playwright/Chromium remains for e2e
  testing only — not in the PDF path.)
- **QR codes (FR-038):** `qrcode` library, generated server-side, downloadable.
- **CSV export (FR-072):** server-side streaming CSV from Drizzle queries.
- **Room photos (FR-061):** stored on the on-prem filesystem/object store
  (path/key in DB); served via an app route with access control.

### Frontend Architecture

- **UI:** Svelte 5 runes; shadcn-svelte components themed with DESIGN.md tokens.
- **State:** server state via SvelteKit `load`; minimal client state via runes.
  No external state/data-fetching library (no TanStack Query) — SvelteKit
  load/invalidation covers it.
- **Routing:** SvelteKit file routing; two zones — authenticated internal app
  (hooks-guarded) and public token routes (`/r/[token]`, unauthenticated).
- **i18n:** Paraglide 2.0 (English source messages, Thai production locale).
- **Accessibility (NFR-007):** shadcn-svelte primitives (accessible by default)
  + DESIGN.md focus/contrast/Thai line-height rules → WCAG 2.1 AA.

### Infrastructure & Deployment

- **Packaging:** multi-stage Dockerfile on the `oven/bun` base; build via
  `svelte-adapter-bun` → standalone Bun server image.
- **Topology (on-prem):** nginx reverse proxy (TLS, unix-socket to the Bun
  server) → web container; separate worker container (pg-boss); PostgreSQL
  (org-managed or container with persistent volume).
- **Config:** 12-factor env vars / secrets (DB URL, SMTP creds, Authentik OIDC
  client id/secret/issuer, token secrets); nothing sensitive in the image.
- **Migrations:** drizzle-kit migrate as a deploy step (pre-start).
- **Logging:** pino structured logs (web + worker); audit log is in-DB (FR-073).
- **CI/CD:** deferred specifics — target pipeline runs lint + typecheck + Vitest
  + Playwright + build + image publish (tooling chosen with VCS/runner later).

### Decision Impact Analysis

**Implementation Sequence:**
1. Scaffold (starter commands) + Docker/compose + Drizzle schema incl. the
   `btree_gist` exclusion constraint.
2. Better Auth + Authentik OIDC + self-service profile completion.
3. Authorization (roles, ownership, read-to-attend) in hooks.
4. Booking core (calendar, form, conflict path) → organizer dashboard.
5. Registration: external token flow (public) + internal "register to attend".
6. pg-boss worker + nodemailer (confirmations, reminders, auto-close).
7. Admin plane (rooms, analytics/heatmap, CSV, settings, audit).
8. PDF/QR generation.

**Cross-Component Dependencies:**
- Auth/profile (OQ-3) gates internal-registration prefill (FR-101).
- The exclusion constraint underpins every booking write path.
- pg-boss underpins all transactional + scheduled email (FR-082).
- Paraglide messages feed UI, emails, and PDFs (single Thai source of truth).

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

These rules bind every implementer (human or AI agent) so independently-built
slices stay compatible. They are idiomatic to the locked stack (SvelteKit 5 +
TypeScript + Drizzle/Postgres + Better Auth + Paraglide).

### Naming Patterns

**Database (Drizzle → PostgreSQL):**
- Tables: `snake_case`, **plural** (`bookings`, `registrations`, `rooms`,
  `users`, `audit_log`).
- Columns: `snake_case` (`event_name`, `start_at`, `created_at`).
- Primary key: `id` — **UUID v7** (time-ordered, non-enumerable).
- Foreign keys: `<entity>_id` (`room_id`, `organizer_id`, `booking_id`).
- Timestamps: `created_at`, `updated_at` (`timestamptz`); soft-delete (if any)
  `deleted_at`.
- Booking time range: `during tstzrange` + the `btree_gist` EXCLUDE constraint.
- Indexes: `idx_<table>_<cols>`; constraints `<table>_<cols>_key` / `_excl`.
- Drizzle schema: camelCase TS properties mapped to snake_case columns.

**Code (TypeScript / Svelte):**
- Svelte components: `PascalCase.svelte` (`RoomCalendar.svelte`).
- Other modules: `kebab-case.ts` (`booking-service.ts`, `date.ts`).
- Functions/variables: `camelCase`; types/interfaces: `PascalCase`;
  constants: `UPPER_SNAKE_CASE`.
- SvelteKit reserved files keep framework casing (`+page.server.ts`, `+layout`).

**Routes:**
- File-based routing; params `[id]`, `[token]`.
- Route groups: `(app)/**` = authenticated internal app (hooks-guarded);
  public token pages at `/r/[token]` and `/r/[token]/cancel` (unauthenticated).
- Endpoints: `+server.ts` only for non-form/public/integration needs.

### Structure Patterns

- Server-only code lives under `src/lib/server/**` (never imported client-side):
  `db/` (schema, migrations, queries), `auth/`, `email/`, `jobs/` (pg-boss),
  `services/` (domain logic), `pdf/`.
- DB is accessed **only** through `src/lib/server/db` query modules / services —
  never raw Drizzle calls inside `+page.svelte` or components.
- Shared Valibot schemas in `src/lib/schemas/**` (imported by both client and
  server; superforms consumes them).
- UI: shared components in `src/lib/components/**`; shadcn-svelte primitives in
  `src/lib/components/ui/**`.
- Messages (Paraglide) compiled to `src/lib/paraglide/**`; source messages in
  `messages/{en,th}.json`.
- Tests: unit/component **co-located** as `*.test.ts` (Vitest); e2e in
  `/e2e/*.test.ts` (Playwright).

### Format Patterns

- **Form actions** are the default mutation path (return `fail()` / superforms
  message objects) — no custom JSON envelope.
- **JSON endpoints** (`+server.ts`): return plain JSON, `camelCase` fields,
  booleans `true/false`; errors as `{ message, code }` with the correct HTTP
  status (400 validation, 401/403 auth, 404, 409 conflict, 500).
- **Dates/times:** the application operates in a single timezone, **Asia/Bangkok**
  (UTC+7, no DST). Columns use `timestamptz`; the DB session/connection timezone
  is set to `Asia/Bangkok`, and all input, display, range math (`tstzrange` for
  bookings), and scheduled jobs (reminders / auto-close) are computed in
  Asia/Bangkok. Format via one shared util — never format dates ad hoc in
  components. If timestamps ever cross a boundary (e.g. an ICS export or external
  API), serialize as ISO-8601 with the `+07:00` offset.
- **IDs in URLs:** internal ids are UUIDs; public surfaces use opaque tokens
  (never expose sequential ids).

### Communication Patterns

- **Background work** is dispatched as named pg-boss jobs; queue names are
  `kebab-case` and verb-led (`send-email`, `send-reminder`, `close-registration`).
  Job payloads are typed (Valibot-validated on consume).
- **Email** is always enqueued (never sent inline in a request path); templates
  render through Paraglide for Thai output.
- **State:** server state via SvelteKit `load` + `invalidate`; client state via
  Svelte 5 runes (`$state`/`$derived`). No external state library. Mutations
  re-run loads rather than hand-patching client caches.

### Process Patterns

- **i18n (mandatory):** every user-facing string — UI, emails, PDFs, errors —
  comes from a Paraglide message (`m.some_key()`). **No hardcoded Thai or
  English UI text** anywhere in components/server (enforces the project rule;
  English is the message source, Thai the production locale).
- **Validation:** validate at the boundary with Valibot (form action / endpoint)
  before any DB write; client-side validation is UX only, server is the gate.
- **Authorization:** enforced server-side in `hooks.server.ts` + per-route
  `load`/actions via helpers (`requireUser`, `requireAdmin`, `assertOwner`);
  never trust the client. Public token routes are explicitly allow-listed.
- **Errors:** field/form errors via superforms (inline, UXD-020); system errors
  via SvelteKit `error()` → page-level banner with retry; user copy is
  actionable and blame-free (UXD-021); internals never leaked to users.
- **Loading:** skeleton placeholders for calendar/lists/dashboard; submit
  buttons go disabled+loading (UXD-020).
- **Logging:** pino structured JSON with levels + request id; **no PII / no
  external-registrant personal data in logs** (data minimization).
- **Config/secrets:** runtime secrets via `$env/dynamic/private`, validated once
  at startup with a Valibot env schema; fail fast if missing.

### Enforcement Guidelines

**All implementers MUST:**
- Route every user-facing string through Paraglide (no inline UI text).
- Keep all DB access behind `src/lib/server/db` query/service modules.
- Rely on the DB exclusion constraint as the booking-conflict source of truth
  (app checks are advisory/UX only).
- Validate every mutation server-side with the shared Valibot schema.
- Enqueue all email via pg-boss; never block a request on SMTP.
- Enforce authorization server-side; never expose sequential ids publicly.

**Enforcement:** ESLint + Prettier + `svelte-check`/`tsc` in CI; deviations
recorded against this section; pattern changes are made here first, then code.

### Pattern Examples

**Good:** `m.booking_conflict_error()` rendered in a field error after the DB
rejects an overlapping `during` range; booking write wrapped in a transaction
that also appends to `audit_log`.

**Anti-pattern:** hardcoding `"ห้องไม่ว่าง"` in a component; checking conflicts
only in app code without the EXCLUDE constraint; calling Drizzle directly from a
`+page.svelte`; sending a confirmation email synchronously inside the action.

## Project Structure & Boundaries

### Complete Project Directory Structure

```
conference-envocc/
├── README.md
├── package.json
├── bun.lock
├── svelte.config.js              # svelte-adapter-bun
├── vite.config.ts                # SvelteKit + Tailwind v4 + Paraglide plugins
├── tsconfig.json
├── drizzle.config.ts             # node-postgres, migrations → ./drizzle
├── components.json               # shadcn-svelte config
├── eslint.config.js
├── .prettierrc
├── project.inlang/               # Paraglide/inlang settings (en source, th)
│   └── settings.json
├── messages/
│   ├── en.json                   # message SOURCE (authored in English)
│   └── th.json                   # production locale (Rawinan translates)
├── .env.example                  # documents every required env var
├── .env                          # (gitignored)
├── .gitignore
├── .dockerignore
├── Dockerfile                    # web (oven/bun, multi-stage)
├── Dockerfile.worker             # pg-boss worker
├── docker-compose.yml            # postgres + web + worker (+ nginx)
├── nginx/
│   └── conf.d/app.conf           # TLS, unix-socket upstream
├── .github/
│   └── workflows/
│       └── ci.yml                # lint, check, vitest, playwright, build (deferred specifics)
├── drizzle/                      # generated SQL migrations (incl. btree_gist + EXCLUDE)
│   └── 0000_init.sql
├── static/
│   ├── fonts/                    # Noto Serif Thai, Noto Sans Thai
│   ├── logo.svg                  # org logo (registration page, FR-040)
│   └── favicon.png
├── e2e/                          # Playwright
│   ├── booking-conflict.test.ts
│   ├── external-registration.test.ts
│   └── internal-register-to-attend.test.ts
└── src/
    ├── app.html
    ├── app.css                   # Tailwind v4 + DESIGN.md tokens as CSS vars (shadcn theme)
    ├── app.d.ts                  # App.Locals (user, session), etc.
    ├── hooks.server.ts           # Better Auth handler + auth guard + Paraglide handle
    ├── worker.ts                 # pg-boss worker entrypoint (separate process)
    ├── lib/
    │   ├── components/
    │   │   ├── ui/               # shadcn-svelte primitives
    │   │   ├── calendar/         # RoomCalendar.svelte, BookingChip.svelte
    │   │   ├── booking/          # BookingForm.svelte, CateringToggle.svelte
    │   │   ├── registration/     # RegistrationForm.svelte, MealPicker.svelte, TitleSelect.svelte
    │   │   ├── admin/            # UtilizationHeatmap.svelte, RoomEditor.svelte
    │   │   └── common/           # Skeleton.svelte, ErrorBanner.svelte, Toast.svelte, ConfirmDialog.svelte
    │   ├── schemas/              # Valibot — shared client/server
    │   │   ├── booking.ts
    │   │   ├── registration.ts
    │   │   ├── room.ts
    │   │   ├── profile.ts
    │   │   ├── settings.ts
    │   │   └── env.ts
    │   ├── paraglide/            # generated messages (do not edit)
    │   ├── utils/
    │   │   ├── date.ts           # Asia/Bangkok formatting/parsing (single source)
    │   │   └── format.ts
    │   └── server/               # SERVER-ONLY (never imported client-side)
    │       ├── db/
    │       │   ├── index.ts      # pg.Pool + drizzle()
    │       │   ├── schema.ts     # tables incl. bookings.during tstzrange + EXCLUDE
    │       │   └── queries/      # rooms.ts, bookings.ts, registrations.ts, analytics.ts
    │       ├── auth/
    │       │   ├── index.ts      # Better Auth config (Drizzle adapter, Authentik OIDC)
    │       │   └── guards.ts     # requireUser / requireAdmin / assertOwner
    │       ├── services/
    │       │   ├── booking-service.ts
    │       │   ├── registration-service.ts
    │       │   ├── room-service.ts
    │       │   ├── analytics-service.ts
    │       │   └── audit.ts      # append-only audit_log writes (in-tx)
    │       ├── email/
    │       │   ├── mailer.ts     # nodemailer (org SMTP)
    │       │   └── templates/    # Paraglide-rendered email bodies
    │       ├── jobs/
    │       │   ├── boss.ts       # pg-boss instance + queue registration
    │       │   ├── queues.ts     # queue name constants + payload schemas
    │       │   └── handlers/     # send-email.ts, reminder-sweep.ts, close-registration.ts
    │       ├── pdf/
    │       │   └── sign-in-sheet.ts   # pdfmake + embedded Noto Sans Thai
    │       ├── qr/
    │       │   └── qr.ts
    │       └── env.ts            # validated runtime env ($env/dynamic/private)
    └── routes/
        ├── +layout.svelte                       # root (fonts, locale, theme)
        ├── +error.svelte                        # system error page
        │
        ├── (app)/                               # AUTHENTICATED internal app
        │   ├── +layout.server.ts                # requireUser + load profile
        │   ├── +layout.svelte                   # shell + nav (admin sidebar / organizer top-nav)
        │   ├── calendar/                        # F1 Room Calendar
        │   │   ├── +page.server.ts
        │   │   └── +page.svelte
        │   ├── bookings/
        │   │   ├── new/                         # F2 Booking Form
        │   │   │   ├── +page.server.ts
        │   │   │   └── +page.svelte
        │   │   └── [id]/                        # Event Detail (manage owner / F11 register-to-attend)
        │   │       ├── +page.server.ts
        │   │       ├── +page.svelte
        │   │       └── edit/+page.server.ts +page.svelte
        │   ├── dashboard/                       # F6 Organizer Dashboard
        │   │   ├── +page.server.ts
        │   │   └── +page.svelte
        │   ├── profile/                         # OQ-3 self-service profile completion
        │   │   ├── +page.server.ts
        │   │   └── +page.svelte
        │   └── admin/
        │       ├── +layout.server.ts            # requireAdmin
        │       ├── rooms/+page.server.ts +page.svelte        # F7
        │       ├── analytics/+page.server.ts +page.svelte    # F8 (heatmap, bulk calendar)
        │       └── settings/+page.server.ts +page.svelte     # F9 SMTP + F10 role assignment
        │
        ├── r/                                    # PUBLIC token routes (unauthenticated)
        │   └── [token]/                          # F5 External Registration
        │       ├── +page.server.ts               # load event by token, submit registration
        │       ├── +page.svelte
        │       ├── confirmed/+page.svelte        # success state
        │       ├── cancel/+page.server.ts +page.svelte    # self-cancel (FR-044)
        │       └── resend/+page.server.ts +page.svelte    # resend lost link (FR-047)
        │
        ├── auth/                                 # Better Auth login / OIDC callback
        │   └── [...all]/+server.ts               # delegated to Better Auth handler
        │
        └── (downloads)/                          # generated assets (auth-checked)
            └── bookings/[id]/
                ├── sign-in-sheet/+server.ts      # FR-036 PDF
                ├── qr/+server.ts                 # FR-038 QR
                └── ../../admin/export/+server.ts # FR-072 CSV
```

### Architectural Boundaries

**API boundaries:**
- Internal mutations → SvelteKit **form actions** in `(app)/**/+page.server.ts`.
- Public registration/cancel → `r/[token]/**` server logic (token-scoped, anon).
- File/asset downloads → `+server.ts` endpoints under `(downloads)` (auth-checked).
- Auth/OIDC → Better Auth handler at `auth/[...all]`.

**Component boundaries:** components are presentational; they receive data from
`load` and submit via form actions/superforms. No component imports `lib/server/*`.

**Service boundaries:** all domain logic + DB access live in `lib/server/services`
and `lib/server/db/queries`. Routes call services; services own transactions
(booking write + audit_log in one tx). The pg-boss worker imports the same
`lib/server` modules but runs as its own process (`src/worker.ts`).

**Data boundaries:** Drizzle schema is the single DB definition; the `EXCLUDE`
constraint is the conflict authority; external-registrant data is minimized and
never logged.

### Requirements → Structure Mapping

| PRD group | Lives in |
|---|---|
| F1 Room Calendar | `(app)/calendar/`, `components/calendar/`, `db/queries/bookings.ts` |
| F2 Booking Creation | `(app)/bookings/new/`, `booking-service.ts`, `schemas/booking.ts` |
| F3 Catering | booking + registration schemas; aggregation in `analytics/registration` queries |
| F4 Registration Mgmt | `(app)/bookings/[id]/`, `(app)/dashboard/`, `registration-service.ts` |
| F5 External Registration | `r/[token]/**`, `components/registration/`, `schemas/registration.ts` |
| F6 Organizer Dashboard | `(app)/dashboard/` |
| F7 Admin Rooms | `(app)/admin/rooms/`, `room-service.ts` |
| F8 Admin Analytics | `(app)/admin/analytics/`, `analytics-service.ts`, CSV endpoint |
| F9 Email & Notifications | `lib/server/email/`, `lib/server/jobs/`, `(app)/admin/settings/` |
| F10 Auth & Access | `lib/server/auth/`, `hooks.server.ts`, `(app)/profile/`, `(app)/admin/settings/` |
| F11 Internal Registration | `(app)/bookings/[id]/` (register-to-attend), `registration-service.ts` |

**Cross-cutting:** auth/guards (`hooks.server.ts` + `auth/guards.ts`); i18n
(`messages/`, `lib/paraglide`); audit (`services/audit.ts`); jobs/email
(`lib/server/jobs` + `email`); dates (`utils/date.ts`).

### Integration Points

- **Internal:** routes → services → `db/queries`; mutations re-run `load`.
- **External dependencies:** Authentik (OIDC) via Better Auth; org SMTP via
  nodemailer; PostgreSQL (data + pg-boss queue); on-prem filesystem (room photos).
- **Data flow (booking):** form action → Valibot → `booking-service` (tx:
  insert booking guarded by EXCLUDE + audit_log) → enqueue confirmation email →
  return superform result → `load` refresh.

### Development Workflow Integration

- **Dev:** `bun run dev` (Vite/SvelteKit @5173) + `docker compose up db` +
  `bun run worker` (pg-boss). `drizzle-kit generate/migrate` for schema.
- **Build:** `bun run build` → `svelte-adapter-bun` server bundle; Paraglide
  compiles messages; Tailwind v4 emits CSS.
- **Deploy:** two images (web, worker) from one repo; `drizzle-kit migrate`
  pre-start; nginx fronts the Bun web server (unix socket); env via secrets.

## Architecture Validation Results

### Coherence Validation ✅
Stack is internally consistent (Bun · SvelteKit · one PostgreSQL for data + Better
Auth sessions + pg-boss; node-postgres driver; svelte-adapter-bun on-prem). Patterns,
structure (auth `(app)` vs public `r/[token]`), and the separate worker all align.
The architecture was stress-tested via a party-mode roundtable (Architect, Engineer,
PM, Test Architect); resulting changes are folded in below.

### Requirements Coverage Validation ✅
All 11 FR groups mapped; conflict-critical paths backed by the DB `EXCLUDE`
constraint. NFRs addressed: Security (Better Auth, hashed CSPRNG tokens with IDOR
isolation, rate-limited public endpoints, Valibot, CSRF); Reliability (btree_gist
EXCLUDE, half-open `[)`, active-only predicate, `23P01`→localized error); Performance
(SSR + indexed Postgres incl. analytics indexes); Responsiveness; Data Retention;
Localization (Paraglide en→th + Thai fonts); Accessibility (shadcn + AA).

### Implementation Readiness Validation ✅
Critical decisions documented with verified tooling; auth + OQ-3 resolved; full
file-level structure + boundaries; patterns with examples.

### Roundtable Outcomes Folded In
- **PDF:** dropped headless Chromium → **pdfmake with embedded Noto Sans Thai**
  (no browser to operate on-prem; deterministic Thai rendering).
- **Reminders:** **idempotent sweeper** for a **single 1-day-before** reminder
  (survives downtime, no double-send, no per-event job tracking).
- **Email jobs:** **idempotency keys** + **dead-letter queue with operator-visible
  failure status** (org SMTP has no third-party fallback).
- **Tokens:** opaque/hashed/CSPRNG, **IDOR-isolated**, single-use cancel, expiring;
  **resend-lost-link** path (FR-047).
- **EXCLUDE constraint:** half-open ranges, active-only predicate, `23P01` mapping.

### Product changes routed to PRD/UX (applied)
FR-037 → single 1-day reminder · FR-105 reversed (owner may register for own event,
counted) · new FR-047 (resend link) · rooms uncapped (capacity informational) · no
separate catering cutoff. (PRD DEC-030; UX Event Detail updated.)

### Gap Analysis Results

**Critical Gaps:** None.

**Important — test strategy & ops (address during implementation):**
1. **Real-Postgres integration test tier** (Testcontainers/CI Postgres) — required
   to honestly test NFR-002: a **concurrent** double-booking test (N parallel
   inserts at one slot → exactly one commits, rest `23P01`) and a **constraint-exists**
   migration test (so a future migration can't silently drop the EXCLUDE).
2. **Bun + node-postgres smoke test** on the actual container image before feature
   work (verify driver path; fallback documented).
3. **Worker import boundary** — lint rule: `lib/server/jobs/**` must not import
   `$app/*`/`$env/dynamic` so the worker builds standalone.
4. **Dev auth bypass** (env-gated) — local dev has no Authentik.
5. **Email tests via Mailpit** (Thai subject/body, RFC 2047 header encoding,
   working link, no duplicate send); **token IDOR negative tests**; **rate-limit**
   on public endpoints.
6. **a11y:** axe-core in Playwright + keyboard/focus-trap tests (NFR-007, gov).
7. **Thai fixtures + Paraglide key-coverage** test (corpus is English by rule).
8. **PDF-in-container** test: assert Thai font present + rendered (no tofu).
9. **Backup/restore runbook** (NFR-005, on-prem Postgres) + **dependency/vuln
   scanning** in CI (NFR-001) + **analytics indexes** (NFR-003).

**Recommended first move:** a **walking-skeleton spike** — one route + one table with
the EXCLUDE constraint (custom migration) + one pg-boss job + one Paraglide string +
one pdfmake PDF, running in the real Docker images behind nginx — to retire the
integration unknowns in one pass.

### Architecture Completeness Checklist
**Requirements Analysis** — [x][x][x][x]
**Architectural Decisions** — [x][x][x][x]
**Implementation Patterns** — [x][x][x][x]
**Project Structure** — [x][x][x][x]

### Architecture Readiness Assessment
**Overall Status:** READY FOR IMPLEMENTATION (16/16; no critical gaps)
**Confidence Level:** High (raised by the roundtable stress-test)
**Key Strengths:** DB-level conflict impossibility; single-Postgres footprint;
clean dual-audience separation; Thai-first i18n + a11y; idempotent durable jobs;
no headless-browser operational tax; no open questions.
**Future Enhancement:** CI/CD specifics incl. vuln scan; caching only if NFR-003 at
risk; optional Bun.sql driver after profiling.

### Implementation Handoff
Follow decisions/patterns exactly; respect `lib/server` isolation and Paraglide-only
strings; treat the EXCLUDE constraint as the conflict authority; start with the
walking-skeleton spike, then the Step-3 starter init + Drizzle schema with btree_gist.
