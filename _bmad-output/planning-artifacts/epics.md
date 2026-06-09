---
stepsCompleted: [1, 2, 3, 4]
status: 'complete'
completedAt: '2026-06-09'
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-conference-envocc-2026-06-07/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-designs/ux-conference-envocc-2026-06-07/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-conference-envocc-2026-06-07/EXPERIENCE.md
---

# conference-envocc - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for conference-envocc (ENVOCC Conference Room Booking System), decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

**F1 — Room Calendar & Availability**
- FR-001: Display all active rooms in a calendar view showing availability by date and time slot.
- FR-002: Visually distinguish booked, available, and blocked time slots.
- FR-003: Organizers click an available slot to initiate a booking for that room/time.
- FR-004: Enforce conflict detection at submission — no double-booking of overlapping slots.

**F2 — Booking Creation**
- FR-010: Single unified booking form (room, event name, date, start/end time, agenda optional, catering toggle, registration settings; event contact pre-filled read-only).
- FR-011: Validate room availability for the selected date/time before accepting submission.
- FR-012: On success, generate a unique registration link shown on the confirmation screen.
- FR-013: Send a booking confirmation email to the organizer on submission.
- FR-014: Duplicate a past booking to pre-fill a new booking form.
- FR-015: Edit or cancel a booking the organizer created.
- FR-016: On booking cancellation, email all registered attendees.

**F3 — Catering**
- FR-020: Catering toggle (lunch yes/no) on the form; no organizer meal pre-selection.
- FR-021: When catering enabled, each registrant selects their own meal type (see FR-041a).
- FR-022: Aggregate registrant meal-type selections into per-type counts for organizer/admin.
- FR-023: Organizer can toggle catering on/off after booking creation.

**F4 — Registration Management (Organizer)**
- FR-030: Registration toggle (enabled/disabled) set at booking creation.
- FR-031: When enabled, registration link prominently shown on dashboard with one-click copy.
- FR-032: No maximum capacity; registration open until closing date or manual close.
- FR-033: Auto-close registration when the closing date is reached.
- FR-034: Set a registration closing date at creation; closes at end of that date.
- FR-034b: Manually close registration any time before the closing date.
- FR-035: View registrant list with status per registrant: Registered / Attended / Cancelled.
- FR-036: Generate a downloadable sign-in sheet (PDF) per event.
- FR-037: Send a reminder email 1 day before the event to attendees + organizer (single fixed reminder).
- FR-038: Generate a per-event QR code linking to the registration page; downloadable.

**F5 — External Registration**
- FR-040: Branded registration page (logo, event name, date, time, room, agenda if provided, contact name + phone).
- FR-041: Base form fields: title (Mr/Mrs/Ms/Other→text), first name, last name, organization, email.
- FR-041a: When catering enabled, require meal type (Normal/Vegetarian/Muslim/Other→text).
- FR-042: On submit, send confirmation email via org SMTP.
- FR-043: Confirmation email includes a unique self-cancellation link.
- FR-044: External registrants self-cancel via the link — no login.
- FR-045: Registration pages publicly accessible without authentication.
- FR-046: When registration is closed, show a clear message instead of the form.
- FR-047: Resend a lost confirmation/cancel link by entering email (neutral acknowledgement, no disclosure).

**F6 — Organizer Dashboard**
- FR-050: Dashboard lists all upcoming bookings created by the logged-in organizer.
- FR-051: Each entry shows event name, room, date/time, registrant count, catering summary, registration link.
- FR-052: One-click copy of the registration link per booking.
- FR-053: One-click download of the sign-in sheet PDF per booking.

**F7 — Admin: Room Management**
- FR-060: Add, edit, and deactivate rooms.
- FR-061: Room record: name, floor, capacity, photo (optional), features (projector/whiteboard/VC, multi-select).
- FR-062: Block time slots on any room for maintenance/reserved use.
- FR-063: Deactivated rooms unavailable + hidden; deactivating one with future bookings auto-cancels them and notifies owning organizer + attendees, after a confirmation warning listing affected bookings.

**F8 — Admin: Analytics & Reporting**
- FR-070: Utilization heatmap — bookings per room per month across all rooms.
- FR-071: Bulk calendar of all bookings across all rooms.
- FR-072: Export booking and registrant data as CSV.
- FR-073: Audit log of all bookings, cancellations, modifications (timestamp, actor, change).

**F9 — Email & Notifications**
- FR-080: All outbound email via org SMTP only; no third-party delivery service.
- FR-081: Admin configures SMTP settings (host, port, sender name, sender email) in settings.
- FR-082: Send transactional emails per the trigger/recipient table (booking created, cancelled, registration submitted, reminder 1-day, auto-cancel by room deactivation).
- FR-083: Sender display name shows the organization name.

**F10 — Authentication & Access Control**
- FR-090: Internal users authenticate through the org identity provider.
- FR-091: Organizer + attendee capacities are default for every internal user; admin is the only assignable role (via settings).
- FR-092: External access is token-based per-event; no account or login.
- FR-093: Internal sessions time out after a fixed 30-min default (not configurable).
- FR-094: RBAC — organizers manage only own bookings; any internal user may view another's event read-only to register; admins read-all; no booking-approval authority.
- FR-095: Profile holds title, name, phone, email, organization; organizer name+phone = registration contact; profile auto-populates internal registrant record.

**F11 — Internal Registration (Attend an Event)**
- FR-100: Internal users register to attend any open event in-app (not via the public token link).
- FR-101: Identity (title/name/org/email) auto-filled read-only from profile; meal type the only input when catering enabled; otherwise confirm only.
- FR-102: Internal registrant becomes a registrant identical to external (count/list/catering/sign-in/notifications); confirmed in-app, no "registration submitted" email.
- FR-103: Internal registrants self-cancel attendance in-app (no token link).
- FR-104: Registration close rules (FR-033/034/034b/046) apply to internal registration.
- FR-105: Owning organizer may register to attend their own event and is counted as a registrant.

### NonFunctional Requirements

- NFR-001 Security: no known critical/high vulnerabilities at launch; secure token/credential storage.
- NFR-002 Reliability: conflict detection prevents double-bookings with 100% accuracy.
- NFR-003 Performance: room calendar and organizer dashboard load < 3s under normal org load.
- NFR-004 Responsiveness: external registration full-responsive (mobile + desktop, equal); organizer flow usable on smartphone; no horizontal scroll/zoom.
- NFR-005 Data Retention: booking/registrant records retained indefinitely until admin deletes.
- NFR-006 Localization: production UI, emails, and generated documents in Thai (single language).
- NFR-007 Accessibility: WCAG 2.1 AA across public pages and the internal app.

### Additional Requirements

_(From Architecture — technical/implementation requirements that shape stories.)_

- **AR-01 Project initialization (Epic 1, Story 1):** scaffold via the official SvelteKit `sv` CLI on **Bun** with add-ons (prettier, eslint, vitest, playwright, tailwindcss, drizzle→PostgreSQL/node-postgres, paraglide); `shadcn-svelte init`; add `svelte-adapter-bun`.
- **AR-02 Data layer:** PostgreSQL + Drizzle (node-postgres `pg`); `btree_gist` extension + booking **EXCLUDE** constraint on `(room_id WITH =, during WITH &&)`, half-open `tstzrange [)`, active-only predicate; map Postgres `23P01` → localized conflict error. (Hand-written custom migration.)
- **AR-03 Auth:** Better Auth + Authentik (OIDC) for internal users; **self-service app-owned profile**; env-gated dev auth bypass (no Authentik locally).
- **AR-04 Authorization:** server-side guards (`requireUser`/`requireAdmin`/`assertOwner`) in `hooks.server.ts` + per-route load/actions; two zones — `(app)` authenticated vs `r/[token]` public.
- **AR-05 External tokens:** opaque CSPRNG, stored hashed, IDOR-isolated, single-use cancel, expiring; resend-link path (FR-047).
- **AR-06 Background jobs:** **pg-boss** (Postgres-backed) in a separate worker container; idempotent **reminder sweeper** (single 1-day), auto-close registration, email send queue with **idempotency keys** + dead-letter + operator-visible failure status. Job handlers must not import `$app/*`/`$env/dynamic` (lint boundary).
- **AR-07 Email:** nodemailer over org SMTP; Paraglide-rendered Thai templates; RFC 2047 header encoding.
- **AR-08 Documents:** sign-in sheet PDF via **pdfmake** + embedded Noto Sans Thai; QR via `qrcode`; CSV via server-side streaming.
- **AR-09 i18n:** Paraglide 2.0 (English source, Thai production locale); no hardcoded UI strings (lint rule).
- **AR-10 Deployment:** on-prem Docker — web (`svelte-adapter-bun` behind nginx) + worker + PostgreSQL; `drizzle-kit migrate` pre-start; pino logging; Valibot-validated env/secrets.
- **AR-11 Testing:** Vitest + Playwright; **real-Postgres integration tier** (Testcontainers/CI) incl. a **concurrent** double-booking test and a **constraint-exists** migration test; Mailpit email tests; axe-core a11y; Thai fixtures; k6 on heavy reads.
- **AR-12 CI/Ops:** CI (lint/typecheck/test/build/image) + dependency/vuln scanning; backup/restore runbook; analytics indexes.
- **AR-13 Recommended spike:** a walking-skeleton vertical slice (one route + one table w/ EXCLUDE + one pg-boss job + one Paraglide string + one pdfmake PDF) through the real Docker images + nginx, to retire integration unknowns early.

### UX Design Requirements

_(From DESIGN.md + EXPERIENCE.md — first-class, story-generating work items.)_

- UX-DR1 **Design tokens:** "Forest & Copper" palette as CSS variables wired into the shadcn-svelte theme (greens g100–g900, copper set, cream, border, ink scale, card) — DESIGN.md / UXD-005.
- UX-DR2 **Typography:** Noto Serif Thai (headings/brand) + Noto Sans Thai (body/UI); Thai line-height ≥ 1.6, never < 14px (UXD-007/008).
- UX-DR3 **Visual system:** 8px spacing scale; radius 6/10/16/20; 3-tier green-tinted shadows; component styles (buttons, form fields, badges, toggle, calendar slots, heatmap u0–u5, booking card, modal header, admin sidebar) — UXD-012.
- UX-DR4 **Room Calendar component:** week scheduler, rooms on Y × days on X; booking chips show booked time + event; empty day cell clickable (no pre-set time) — UXD-013/024/025.
- UX-DR5 **Booking form UX:** single unified form; catering on/off toggle only; no headcount/capacity fields; contact pre-filled read-only — UXD-014/016.
- UX-DR6 **External registration form UX:** title selector first (Mr/Mrs/Ms/Other→text) → first/last/org/email → meal type (only when catering) — UXD-015/017.
- UX-DR7 **Event Detail (internal) + "Register to attend":** prefilled read-only identity, meal-only input, available to any internal user incl. the owner — UXD-026 / FR-105.
- UX-DR8 **State patterns:** empty (one line + primary action), loading (skeletons; submit disabled+loading), form errors (inline field-level, focus first error), system errors (page banner + retry), success (toast / full success screen), destructive confirm (modal listing consequences) — UXD-020.
- UX-DR9 **Voice & tone / microcopy:** two registers (public warmer, internal crisper); actionable blame-free errors; all copy via Paraglide (English source, Thai prod) — UXD-021/004.
- UX-DR10 **Responsiveness:** external registration mobile+desktop equal; organizer flow smartphone-usable; admin analytics desktop-first, no tablet breakage — UXD-009.
- UX-DR11 **Accessibility floor:** WCAG 2.1 AA — contrast ≥ 4.5:1, visible focus rings, visible labels (no placeholder-only), no color-alone meaning, tap targets ≥ 44px, Thai line-height — UXD-022.
- UX-DR12 **Room deactivation modal:** destructive-confirm modal listing affected bookings before proceeding — UXD-019.
- UX-DR13 **Admin analytics UX:** utilization heatmap (room × month, u0–u5 intensity), bulk calendar, CSV export; readable ≤ 30s; no hover tooltips in MVP — F8.

### FR Coverage Map

Every FR maps to exactly one **primary** epic (a few cross-cutting items note a secondary epic where the mechanism vs. the surface live in different epics).

| FR | Epic | Note |
|----|------|------|
| FR-001 | E4 | Calendar view of room availability |
| FR-002 | E4 | Distinguish booked/available/blocked |
| FR-003 | E4 | Click slot to book |
| FR-004 | E4 | Conflict detection (EXCLUDE *DDL* established E1; *behavior/23P01* E4) |
| FR-010 | E4 | Unified booking form |
| FR-011 | E4 | Validate availability pre-submit |
| FR-012 | E4 | Generate registration link |
| FR-013 | E4 | Booking confirmation email (consumes E1 jobs/mail platform) |
| FR-014 | E4 | Duplicate booking |
| FR-015 | E4 | Edit/cancel own booking |
| FR-016 | E6 | Cancel notifies attendees (attendees exist from E5) |
| FR-020 | E4 | Catering toggle |
| FR-021 | E5 | Registrant meal selection |
| FR-022 | E5 | Catering aggregation counts |
| FR-023 | E4 | Toggle catering post-creation |
| FR-030 | E4 | Registration toggle at creation |
| FR-031 | E4 | Registration link on dashboard + copy |
| FR-032 | E5 | No max capacity |
| FR-033 | E5 | Auto-close on date (pg-boss) |
| FR-034 | E4 | Set closing date at creation |
| FR-034b | E4 | Manual close |
| FR-035 | E5 | Registrant list/status — **moved up from E6 (headline)** |
| FR-036 | E6 | Sign-in sheet PDF (pdfmake) |
| FR-037 | E6 | 1-day reminder (sweeper) |
| FR-038 | E4 | Per-event QR |
| FR-040 | E5 | Branded registration page |
| FR-041 | E5 | Base form fields incl. title |
| FR-041a | E5 | Meal type when catering |
| FR-042 | E5 | Confirmation email |
| FR-043 | E5 | Self-cancel link in email |
| FR-044 | E5 | Self-cancel, no login |
| FR-045 | E5 | Public, no auth |
| FR-046 | E5 | Closed-state message |
| FR-047 | E5 | Resend lost link |
| FR-050 | E4 | Organizer dashboard list |
| FR-051 | E4 | Dashboard entry detail (headcount lights up in E5) |
| FR-052 | E4 | Copy registration link |
| FR-053 | E6 | Download sign-in PDF |
| FR-060 | E3 | Add/edit/deactivate rooms |
| FR-061 | E3 | Room record fields (photo upload incl.) |
| FR-062 | E3 | Block time slots |
| FR-063 | E7 | Deactivation cascade + modal (needs bookings+email) |
| FR-070 | E7 | Utilization heatmap |
| FR-071 | E7 | Bulk calendar |
| FR-072 | E7 | CSV export |
| FR-073 | E7 | Audit log *view* (write-hook established **E2**) |
| FR-080 | E4 | SMTP-only (platform realized E1, first send E4) |
| FR-081 | E7 | Admin SMTP settings UI |
| FR-082 | E4 | Transactional email matrix (extended by E5/E6/E7 triggers) |
| FR-083 | E4 | Sender = org name |
| FR-090 | E2 | Authentik OIDC login |
| FR-091 | E2 | Organizer default / admin assignable |
| FR-092 | E5 | Token-based external access |
| FR-093 | E2 | Fixed session timeout |
| FR-094 | E2 | RBAC ownership + read-to-attend |
| FR-095 | E2 | Profile fields (schema sized for E6 prefill) |
| FR-100 | E6 | Internal register-to-attend |
| FR-101 | E6 | Prefilled identity, meal-only |
| FR-102 | E6 | Internal registrant counted |
| FR-103 | E6 | In-app self-cancel |
| FR-104 | E6 | Close rules apply |
| FR-105 | E6 | Owner may register own event |

## Epic List

### Epic 1: Foundation & Walking Skeleton
Stand up a deployable, themed, Thai-capable SvelteKit shell that proves every hard cross-cutting mechanism end-to-end through one real vertical slice — so later epics consume proven foundations, not assumptions.
**Includes:** scaffold (AR-01); design tokens + Thai typography + shadcn theme (UX-DR1/2/3); Drizzle schema with **bare `btree_gist` EXCLUDE DDL** (AR-02; behavior in E4); **jobs/worker + nodemailer platform** (pg-boss + Mailpit smoke — pulled out of E4); Paraglide i18n (AR-09); **audit-log write-hook** (consumed in E7); Docker (web + worker) + nginx + drizzle migrate (AR-10); **test harness** — real-Postgres integration tier, fixtures, **constraint-exists assertion**, axe-core, Thai-render smoke (AR-11); CI baseline (AR-12).
**Walking-skeleton AC (load-bearing):** the slice exercises DB+EXCLUDE (insert two overlapping rows → `23P01`), one themed page, one Paraglide string, one enqueued job → worker → Mailpit email — and **fails loudly if EXCLUDE is misconfigured**.
**FRs:** FR-004 (mechanism). **NFRs:** 002 (harness), 006/007 (ratchet from page one).

### Epic 2: Identity & Access
Internal staff sign in via Authentik, complete a self-service profile, and the app enforces roles & ownership — with the authorization patterns later epics inherit.
**Includes:** Better Auth + Authentik OIDC (AR-03); self-service profile **schema sized for E6 prefill** (title/name/phone/email/org); roles (organizer default, admin assignable); **guard dispatcher pattern** in `hooks.server.ts` (`requireUser`/`requireAdmin`/`assertOwner`); **IDOR negative-test pattern** seeded here (exercised in E5); audit write-hook consumed on mutations.
**FRs:** FR-090, FR-091, FR-093, FR-094, FR-095, FR-073 (write-hook). **NFR:** 001.

### Epic 3: Room Inventory
Admins maintain the minimal-but-complete set of rooms (and blocked times) that organizers will book.
**Includes:** room CRUD, features multi-select, photo upload (explicit storage/volume), block slots. Scoped to the minimum room model E4 consumes.
**FRs:** FR-060, FR-061, FR-062.

### Epic 4: Room Booking & Organizer Workspace
An organizer finds a free room, books conflict-free, gets a shareable registration link + QR, and manages their bookings — consuming the proven E1 platform (no infra hidden here).
**Includes (ordered):** conflict util (`23P01`→field error) → booking read-model → booking form (EXCLUDE **predicate refined here**, `WHERE status<>'cancelled'`) → edit/cancel/duplicate → catering toggle → **reserve registration-config columns** for E5 → calendar → dashboard → link + **persisted resolvable token** + QR → booking-confirmation email. AC asserts link *generation* only (destination page is E5).
**FRs:** FR-001–004(behavior), FR-010–015, FR-020, FR-023, FR-030, FR-031, FR-034, FR-034b, FR-038, FR-050, FR-051, FR-052, FR-080, FR-082, FR-083. **NFR:** 002 (concurrent double-booking test + clean-error test). **UX-DR:** 4, 5.

### Epic 5: External Registration & Headcount
External attendees self-register via a branded token link (recoverable), pick meals, and registration opens/closes correctly — **and the organizer can see who's coming.** This is the shippable end-to-end headline.
**Includes:** public token registration page + form (UX-DR6); meal selection + aggregation; confirm + self-cancel + **resend**; closed-state; auto-close job; **registrant list/status + dashboard headcount (moved up from E6)**; IDOR negatives exercised here.
**FRs:** FR-040–047, FR-021, FR-022, FR-032, FR-033, FR-092, **FR-035**. **NFR:** 001 (token IDOR), 004 (mobile+desktop).

### Epic 6: Registration Operations & Attendance
Organizers run their registrants end-to-end, and internal staff register to attend.
**Includes:** sign-in sheet PDF (pdfmake + Noto Sans Thai); 1-day reminder sweeper (idempotent); cancel-notify; internal register-to-attend incl. owner (UX-DR7, prefilled from E2 profile).
**FRs:** FR-016, FR-036, FR-037, FR-053, FR-100, FR-101, FR-102, FR-103, FR-104, FR-105.

### Epic 7: Admin: Operations, Analytics & Audit
Admins configure the system, oversee utilization, export data, review the audit trail, and safely retire rooms.
**Includes:** room-deactivation cascade + confirm modal (UX-DR12, single transactional service); utilization heatmap + bulk calendar (UX-DR13); CSV export; **audit-log view** (write-hook already in E2); SMTP + role-assignment settings.
**FRs:** FR-063, FR-070, FR-071, FR-072, FR-073 (view), FR-081. **NFR:** 003 (analytics indexes).

**Cross-cutting (every epic):** UX-DR9 voice/tone, UX-DR10 responsiveness, UX-DR11 accessibility, UX-DR8 state patterns, NFR-006 Thai — applied within each epic, not a separate epic.

**Dependency flow (no forward deps):** E1 → E2 → E3 → E4 → E5 → E6 → E7.

---

## Epic 1: Foundation & Walking Skeleton

Stand up a deployable, themed, Thai-capable SvelteKit shell that proves every hard cross-cutting mechanism end-to-end through one real vertical slice.

### Story 1.1: Scaffold the project

As a developer,
I want the SvelteKit + Bun project scaffolded with the agreed tooling,
So that all later work starts from the locked stack.

**Acceptance Criteria:**

**Given** an empty repository
**When** the project is initialized via `bunx sv create` with TypeScript and add-ons (prettier, eslint, vitest, playwright, tailwindcss, drizzle→PostgreSQL/node-postgres, paraglide), `shadcn-svelte init`, and `svelte-adapter-bun`
**Then** `bun install` succeeds, `bun run dev` serves the app, and `bun run build` produces a Bun server bundle
**And** ESLint, Prettier, and `svelte-check` run clean in the repo.

### Story 1.2: Design system & Thai typography

As a developer,
I want the DESIGN.md tokens and Thai fonts wired into the shadcn-svelte theme,
So that every component renders in the locked visual identity.

**Acceptance Criteria:**

**Given** the scaffolded app
**When** the "Forest & Copper" palette, spacing (8px), radius (6/10/16/20), and shadow tokens are defined as CSS variables in the shadcn theme and Noto Serif Thai + Noto Sans Thai are loaded
**Then** a sample page renders shadcn components in the correct colors, radii, and fonts
**And** Thai sample text renders with line-height ≥ 1.6 and never below 14px.

### Story 1.3: Database & migration setup with bare EXCLUDE constraint

As a developer,
I want Drizzle + node-postgres configured with per-domain schema modules and the booking EXCLUDE constraint,
So that conflict-free booking is enforced at the data layer.

**Acceptance Criteria:**

**Given** a running PostgreSQL
**When** migrations run via drizzle-kit
**Then** `btree_gist` is enabled and the `bookings` table carries `during tstzrange` with a **bare** `EXCLUDE USING gist (room_id WITH =, during WITH &&)` constraint
**And** the Drizzle schema is split into per-domain modules (not one `schema.ts`)
**And** inserting two overlapping `during` ranges for the same room raises SQLSTATE `23P01`.

### Story 1.4: Internationalization setup

As a developer,
I want Paraglide configured with English source + Thai locale and a no-hardcoded-strings guard,
So that all user-facing text is translatable and Thai-ready.

**Acceptance Criteria:**

**Given** the scaffolded app
**When** Paraglide is configured (source `en`, locale `th`) and a lint rule/CI check for inline UI strings is added
**Then** messages compile and a page renders a message via `m.key()`
**And** committing a hardcoded UI string fails the lint check.

### Story 1.5: Jobs & email platform

As a developer,
I want a pg-boss worker process and a nodemailer transport (Mailpit in dev),
So that later epics can enqueue durable jobs and send email reliably.

**Acceptance Criteria:**

**Given** PostgreSQL and a Mailpit instance
**When** the worker process starts and a smoke job is enqueued
**Then** the worker processes the job and a smoke email is delivered to Mailpit
**And** the job has an idempotency key and a failed send lands in a dead-letter queue with visible status
**And** job handlers do not import `$app/*` or `$env/dynamic` (enforced by lint).

### Story 1.6: Audit-log write-hook foundation

As a developer,
I want an `audit_log` table and a transactional audit-write helper,
So that every later mutation can record actor/entity/action/diff in the same transaction.

**Acceptance Criteria:**

**Given** the schema setup
**When** the audit helper is invoked inside a transaction with a change
**Then** an `audit_log` row (timestamp, actor, entity, action, diff) is written atomically with the change
**And** a rolled-back transaction writes no audit row.

### Story 1.7: Docker & deployment skeleton

As an operator,
I want web + worker images and a compose stack with nginx and Postgres,
So that the app deploys on-prem with migrations applied on start.

**Acceptance Criteria:**

**Given** the repo
**When** `docker compose up` is run
**Then** the web (svelte-adapter-bun behind nginx), worker, and PostgreSQL services start, `drizzle-kit migrate` runs pre-start, and the app is reachable through nginx (X-Forwarded-* propagated)
**And** runtime secrets load from env and are validated at startup (fail-fast if missing).

### Story 1.8: Test harness & CI

As a developer,
I want a real-Postgres integration tier and quality gates in CI,
So that critical invariants are verified from day one.

**Acceptance Criteria:**

**Given** the project
**When** the test harness is configured (real-Postgres via Testcontainers/CI service, fixtures, axe-core, Thai-render smoke) and CI runs
**Then** CI runs lint + typecheck + Vitest + Playwright + build + image, plus dependency/vuln scanning
**And** a **constraint-exists** test asserts the EXCLUDE constraint is present in the migrated schema
**And** an axe-core check runs against a rendered page.

### Story 1.9: Walking-skeleton vertical slice

As a developer,
I want one route that threads every foundation layer end-to-end,
So that the foundations are proven, not assumed.

**Acceptance Criteria:**

**Given** the running stack (web + worker + Postgres + Mailpit, in Docker)
**When** the skeleton route is exercised
**Then** it renders a themed page with a Thai Paraglide string, writes a row guarded by the EXCLUDE constraint, and enqueues a job that the worker turns into a Mailpit email
**And** an integration test inserting two overlapping rows fails loudly with `23P01`
**And** the slice fails the build if the EXCLUDE constraint is misconfigured.

---

## Epic 2: Identity & Access

Internal staff sign in via Authentik, complete a self-service profile, and the app enforces roles & ownership.

### Story 2.1: Sign in with Authentik (OIDC)

As an internal user,
I want to log in through the organization's Authentik,
So that I can access the booking app with my org identity.

**Acceptance Criteria:**

**Given** a configured Authentik OIDC provider
**When** I complete the authorization-code (PKCE) flow via Better Auth
**Then** a DB-backed session is created and available on `event.locals`, and I can log out
**And** an unauthenticated request to an `(app)` route redirects to login.

### Story 2.2: Local dev auth bypass

As a developer,
I want an env-gated dev login bypass,
So that I can work locally without an Authentik instance.

**Acceptance Criteria:**

**Given** `AUTH_DEV_BYPASS` enabled in a non-production env
**When** I use the dev login
**Then** a session is created for a seeded test user
**And** the bypass is unavailable when the flag is off or in production.

### Story 2.3: Self-service profile

As an internal user,
I want to complete my profile on first login,
So that my details are available for booking contact and registration prefill.

**Acceptance Criteria:**

**Given** a first-time authenticated user with an incomplete profile
**When** I am routed to the profile form and submit title, name, phone, email, organization
**Then** the app-owned profile is saved (schema sized for FR-101 prefill) and I can edit it later
**And** I cannot reach the main app until required profile fields are complete.

### Story 2.4: Roles & assignment model

As the system,
I want every internal user to default to organizer with admin as the only assignable role,
So that access matches the agreed model.

**Acceptance Criteria:**

**Given** an authenticated internal user
**When** their role is evaluated
**Then** they hold organizer + attendee capability by default with no assignment
**And** an admin flag can be set on a user record (assignment UI delivered in E7).

### Story 2.5: Authorization guard dispatcher

As the system,
I want server-side guards with a reusable dispatcher pattern,
So that later epics append rules instead of rewriting the hook.

**Acceptance Criteria:**

**Given** the session in `hooks.server.ts`
**When** a route is accessed
**Then** `requireUser` / `requireAdmin` / `assertOwner` helpers enforce access via a matcher table, and public `r/[token]` routes are explicitly allow-listed
**And** an organizer can view another organizer's event read-only (read-to-attend) but cannot edit it.

### Story 2.6: Fixed session timeout

As the system,
I want internal sessions to expire after 30 minutes of inactivity,
So that unattended sessions are protected.

**Acceptance Criteria:**

**Given** an authenticated session idle for the fixed 30-minute default
**When** the next request is made
**Then** the session is expired and re-authentication is required
**And** the timeout is not exposed as a configurable setting.

### Story 2.7: Authorization negative-test pattern & audit on mutations

As a developer,
I want an IDOR/authorization negative-test template and audit wired to mutations,
So that the highest-risk surfaces inherit a proven pattern.

**Acceptance Criteria:**

**Given** an owner-scoped resource
**When** a non-owner (or forged identity) attempts access
**Then** the request is denied (403/404) and a reusable negative-test asserts it
**And** every mutation writes an audit_log entry via the E1 hook.

---

## Epic 3: Room Inventory

Admins maintain the rooms (and blocked times) organizers will book.

### Story 3.1: Create and edit rooms

As an admin,
I want to add and edit rooms,
So that organizers have an accurate room catalog to book.

**Acceptance Criteria:**

**Given** I am an admin
**When** I create or edit a room with name, floor, capacity, and features (projector/whiteboard/VC, multi-select)
**Then** the room is saved and appears in the room list
**And** validation rejects an empty name.

### Story 3.2: Room photo upload

As an admin,
I want to attach an optional photo to a room,
So that organizers can recognize the space.

**Acceptance Criteria:**

**Given** an existing room
**When** I upload a photo
**Then** the file is stored on the on-prem volume and the path is saved on the room
**And** the photo is served only through an access-controlled app route.

### Story 3.3: Deactivate a room

As an admin,
I want to deactivate a room,
So that it can no longer be booked.

**Acceptance Criteria:**

**Given** a room with no future bookings
**When** I deactivate it
**Then** it disappears from the bookable calendar and cannot be selected for new bookings
**And** it is retained in records (not deleted). *(Cascade behavior for rooms with future bookings is delivered in E7.)*

### Story 3.4: Block time slots

As an admin,
I want to block time on a room,
So that maintenance/reserved periods are unavailable.

**Acceptance Criteria:**

**Given** a room
**When** I create a block for a time range
**Then** that range shows as blocked and cannot be booked
**And** an attempt to block an already-booked range is reported as a conflict.

---

## Epic 4: Room Booking & Organizer Workspace

An organizer finds a free room, books conflict-free, gets a shareable registration link + QR, and manages their bookings.

### Story 4.1: Conflict translation & EXCLUDE predicate

As a developer,
I want booking writes to refine the EXCLUDE predicate and translate violations,
So that conflicts surface as clean localized errors, not 500s.

**Acceptance Criteria:**

**Given** the bare EXCLUDE constraint from E1
**When** the booking domain is implemented
**Then** the constraint predicate is refined to active bookings (`WHERE status <> 'cancelled'`) and a `23P01` violation is caught and mapped to a typed conflict error
**And** a concurrent test (N parallel inserts on one slot) asserts exactly one commit and the rest rejected
**And** the conflict renders as a localized field-level message.

### Story 4.2: Room calendar read-model

As a developer,
I want a single booking read-model for the week view,
So that calendar and dashboard share one query.

**Acceptance Criteria:**

**Given** rooms and bookings
**When** the week calendar data is requested (rooms × days)
**Then** one read-model returns per-room bookings with times and open cells for the week
**And** the query is index-backed and returns within the performance budget.

### Story 4.3: Room Calendar view

As an organizer,
I want a weekly room calendar,
So that I can scan availability and start a booking.

**Acceptance Criteria:**

**Given** active rooms
**When** I open the calendar
**Then** I see rooms on the Y axis × days on the X axis, booking chips showing booked time + event, and clickable empty day cells (no pre-set time)
**And** booked/available/blocked states are distinguishable without relying on color alone.

### Story 4.4: Create a booking (conflict-free)

As an organizer,
I want to book a room via a single unified form,
So that I can reserve a room and set up registration in one pass.

**Acceptance Criteria:**

**Given** an open day cell
**When** I submit the booking form (room, event name, date, start/end, agenda optional, catering toggle, registration toggle + closing date) with my contact pre-filled read-only
**Then** the booking is created only if the slot is free (else a localized conflict error), and registration-config columns are persisted for E5 to consume
**And** there is no headcount/capacity field; catering is on/off only.

### Story 4.5: Booking confirmation, link, token & QR

As an organizer,
I want a confirmation with a registration link and QR,
So that I can share the event for registration.

**Acceptance Criteria:**

**Given** a successfully created booking
**When** the confirmation screen renders
**Then** a unique **persisted, resolvable** registration token + link and a downloadable QR are shown
**And** the AC asserts link/token generation only (the public destination page is delivered in E5).

### Story 4.6: Booking confirmation email

As an organizer,
I want an email confirming my booking,
So that I have a record off-app.

**Acceptance Criteria:**

**Given** a created booking
**When** the confirmation is enqueued
**Then** the worker sends a Thai email via org SMTP with the organization as sender display name
**And** the email is asserted via Mailpit in tests and is never sent synchronously in the request.

### Story 4.7: Edit, cancel, and duplicate a booking

As an organizer,
I want to edit, cancel, or duplicate my bookings,
So that I can manage changes efficiently.

**Acceptance Criteria:**

**Given** a booking I own
**When** I edit its details, cancel it, or duplicate it to pre-fill a new form
**Then** edits re-check conflicts, cancel sets status to cancelled (freeing the slot), and duplicate opens a pre-filled form
**And** I cannot edit a booking I do not own.

### Story 4.8: Organizer dashboard

As an organizer,
I want a dashboard of my upcoming bookings,
So that I can manage them at a glance.

**Acceptance Criteria:**

**Given** bookings I created
**When** I open the dashboard
**Then** I see each with event name, room, date/time, registration link (one-click copy), and a registrant-count placeholder
**And** I see only my own bookings (the count populates once E5 registration exists).

---

## Epic 5: External Registration & Headcount

External attendees self-register via a branded token link, and the organizer can see who's coming.

### Story 5.1: Branded public registration page

As an external attendee,
I want to open the event's registration page,
So that I can see the event and register.

**Acceptance Criteria:**

**Given** a valid event token
**When** I open `/r/[token]` (no login)
**Then** I see the org logo, event name, date, time, room, agenda (if any), and contact name + phone
**And** if registration is closed, I see a clear closed message instead of the form
**And** an invalid/forged token cannot reveal another event's data (IDOR negative test).

### Story 5.2: Submit a registration

As an external attendee,
I want to fill and submit the registration form,
So that I am registered for the event.

**Acceptance Criteria:**

**Given** an open registration page
**When** I submit title (Mr/Mrs/Ms/Other→text), first name, last name, organization, email — plus meal type when catering is enabled
**Then** a registrant record is created and I see an on-screen confirmation
**And** the form is fully usable on both mobile and desktop, completing in ≤ 2 minutes.

### Story 5.3: Confirmation email with self-cancel link

As an external attendee,
I want a confirmation email,
So that I have proof and a way to cancel.

**Acceptance Criteria:**

**Given** a submitted registration
**When** the confirmation is enqueued
**Then** a Thai email is sent via org SMTP containing a unique single-use self-cancel link
**And** Thai subject/body encode correctly (asserted via Mailpit).

### Story 5.4: Self-cancel a registration

As an external attendee,
I want to cancel via my link,
So that I can withdraw without an account.

**Acceptance Criteria:**

**Given** a valid self-cancel link
**When** I click it
**Then** my registration is cancelled in one step with no login
**And** the token is single-use and a forged token cannot cancel another's registration.

### Story 5.5: Resend a lost link

As an external attendee,
I want to re-request my confirmation link by email,
So that I can recover access if I lost the email.

**Acceptance Criteria:**

**Given** an event registration page
**When** I enter my email to resend
**Then** if a registration exists for that email, the confirmation (with self-cancel link) is resent
**And** the page shows the same neutral acknowledgement whether or not a match exists.

### Story 5.6: Registration open/close rules

As the system,
I want registration to honor closing rules,
So that it opens and closes correctly.

**Acceptance Criteria:**

**Given** an event with a closing date and/or manual close
**When** the closing date is reached or an organizer closes it
**Then** a pg-boss job auto-closes registration and the page shows the closed message
**And** registration is uncapped — never blocked by capacity.

### Story 5.7: Catering aggregation

As an organizer,
I want meal-type counts aggregated,
So that I can plan catering.

**Acceptance Criteria:**

**Given** registrants with meal selections
**When** I view the event's catering summary
**Then** counts per meal type (Normal/Vegetarian/Muslim/Other) are shown
**And** counts update as registrations and cancellations change.

### Story 5.8: Registrant list & dashboard headcount

As an organizer,
I want to see who registered,
So that I can manage attendance — completing the core loop.

**Acceptance Criteria:**

**Given** an event with registrations
**When** I open the registrant list
**Then** I see each registrant with status (Registered/Attended/Cancelled) and the dashboard shows the live registrant count
**And** I can only see registrants for events I own (admins see all).

---

## Epic 6: Registration Operations & Attendance

Organizers run their registrants end-to-end; internal staff register to attend.

### Story 6.1: Sign-in sheet PDF

As an organizer,
I want a downloadable sign-in sheet,
So that I can take attendance on-site.

**Acceptance Criteria:**

**Given** an event with registrants
**When** I download the sign-in sheet
**Then** a pdfmake PDF with embedded Noto Sans Thai lists all registered attendees, paginating cleanly for large rosters
**And** Thai names render correctly (no tofu) — asserted in the production container image.

### Story 6.2: One-day reminder sweeper

As an attendee/organizer,
I want a reminder one day before the event,
So that I don't forget to attend.

**Acceptance Criteria:**

**Given** events ~1 day out with unsent reminders
**When** the idempotent reminder sweeper runs
**Then** it sends a Thai reminder to registered attendees + the organizer and marks them sent
**And** it never double-sends after a worker restart and self-heals after downtime.

### Story 6.3: Cancellation notifies attendees

As an attendee,
I want to be told if an event I registered for is cancelled,
So that I don't show up to nothing.

**Acceptance Criteria:**

**Given** an event with registered attendees
**When** the organizer cancels the booking
**Then** all registered attendees receive a cancellation email
**And** the sends are enqueued (retryable), not synchronous.

### Story 6.4: Event Detail & Register to attend (internal)

As an internal user,
I want to register to attend an event from inside the app,
So that I don't re-type details the app already has.

**Acceptance Criteria:**

**Given** an internal user viewing an event's detail (incl. the owning organizer)
**When** they choose "Register to attend"
**Then** identity (title/name/org/email) is prefilled read-only from their profile and meal type is the only input when catering is enabled (otherwise confirm-only)
**And** the action is available on their own event too (owner may register).

### Story 6.5: Internal registrant counted & confirmed in-app

As the system,
I want an internal registration to behave like any registration,
So that counts and lists are consistent.

**Acceptance Criteria:**

**Given** a completed internal registration
**When** it is saved
**Then** the user is counted in the total, registrant list, catering aggregation, and sign-in sheet, and is confirmed via an in-app toast (no "registration submitted" email)
**And** they still receive cancellation/reminder emails as a registered attendee.

### Story 6.6: Internal self-cancel & close rules

As an internal user,
I want to cancel my attendance in-app,
So that I can withdraw easily.

**Acceptance Criteria:**

**Given** an internal registration I made
**When** I cancel from the Event Detail
**Then** my attendance is cancelled in-app (no token link)
**And** internal registration respects the same open/close rules as external (closed events accept none).

---

## Epic 7: Admin: Operations, Analytics & Audit

Admins configure the system, oversee utilization, export data, review the audit trail, and safely retire rooms.

### Story 7.1: Room deactivation cascade

As an admin,
I want deactivating a room with future bookings to cascade safely,
So that affected people are notified.

**Acceptance Criteria:**

**Given** a room with future bookings
**When** I deactivate it
**Then** a confirmation modal lists the affected bookings before I proceed, and on confirm a single transactional service auto-cancels them and notifies each owning organizer + their registered attendees
**And** rooms with no future bookings deactivate without the warning.

### Story 7.2: Utilization heatmap

As an admin,
I want a room × month utilization heatmap,
So that I can read utilization at a glance.

**Acceptance Criteria:**

**Given** booking data
**When** I open analytics
**Then** a heatmap shows bookings per room per month (u0–u5 intensity), readable in ≤ 30 seconds, with no color-alone meaning
**And** the underlying queries are index-backed (no MVP hover tooltips).

### Story 7.3: Bulk calendar

As an admin,
I want a calendar of all bookings across rooms,
So that I have org-wide visibility.

**Acceptance Criteria:**

**Given** bookings across rooms
**When** I open the bulk calendar
**Then** I see all bookings across all rooms (read-only)
**And** I cannot create/approve/edit bookings from here.

### Story 7.4: CSV export

As an admin,
I want to export booking and registrant data,
So that I can report and analyze offline.

**Acceptance Criteria:**

**Given** booking and registrant data
**When** I request an export
**Then** a CSV streams server-side with the relevant fields
**And** the export respects data-minimization (no fields beyond what's collected).

### Story 7.5: Audit log view

As an admin,
I want to review the audit trail,
So that I can see who changed what.

**Acceptance Criteria:**

**Given** changes recorded by the E2 write-hook
**When** I open the audit log
**Then** I see entries with timestamp, actor, entity, action, and change
**And** the view is read-only and filterable by entity/actor/date.

### Story 7.6: Admin settings — SMTP & role assignment

As an admin,
I want to configure SMTP and assign the admin role,
So that I can operate the system.

**Acceptance Criteria:**

**Given** I am an admin
**When** I open settings
**Then** I can configure SMTP (host, port, sender name, sender email) and grant/revoke the admin role for internal users
**And** session timeout is not shown (fixed default).
