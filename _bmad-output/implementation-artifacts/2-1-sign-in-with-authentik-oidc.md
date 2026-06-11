# Story 2.1: Sign in with Authentik (OIDC)

Status: ready-for-dev

## Story

As an internal user,
I want to log in through the organization's Authentik,
so that I can access the booking app with my org identity.

## Acceptance Criteria

1. **Given** a configured Authentik OIDC provider, **When** I navigate to an `(app)` route unauthenticated, **Then** I am redirected to the login page (302 → `/login` or equivalent Better Auth entry point).

2. **Given** the login page, **When** I click "Sign in", **Then** the authorization-code + PKCE flow is initiated via Better Auth's Generic OAuth / SSO plugin (OIDC) pointing at Authentik as the IdP.

3. **Given** I complete authentication at Authentik, **When** the OIDC callback is processed by Better Auth, **Then** a DB-backed session row is created in Postgres and is available on `event.locals.session` (and `event.locals.user`) for downstream `load` functions and actions.

4. **Given** a logged-in user, **When** I click "Sign out", **Then** the session row is destroyed and a subsequent request to any `(app)` route redirects to login.

5. **Given** an unauthenticated request to any `(app)` route, **When** processed by `hooks.server.ts`, **Then** the request is redirected to login — no `(app)` route is reachable without a valid session.

6. **Given** the OIDC callback, **When** the response is returned, **Then** the `code` and `state` OAuth parameters are not echoed in the response body or the redirect URL.

## Tasks / Subtasks

- [ ] Task 1: Install Better Auth and configure the Drizzle adapter (AC: 3)
  - [ ] 1.1 Add Better Auth to dependencies: `bun add better-auth`. Verify it is NOT a devDependency.
  - [ ] 1.2 Run `bunx @better-auth/cli generate` to produce the Better Auth schema (users, sessions, accounts tables). Review the output and create a new migration file `drizzle/0002_better_auth.sql` with the generated SQL. Register it in `drizzle/meta/_journal.json`. Do NOT run `drizzle-kit generate` — hand-register as done in Story 1.6 for `0001_audit_log.sql`.
  - [ ] 1.3 Create `src/lib/server/db/schema/auth.ts` with Drizzle table definitions mirroring the generated SQL (users, sessions, accounts). Export from `src/lib/server/db/schema/index.ts` with `export * from './auth.js'`.
  - [ ] 1.4 Create `src/lib/server/auth/index.ts` with the Better Auth config: Drizzle adapter using `db` from `../../db/index.js` (relative import — `auth/index.ts` must NOT use `$lib` alias as it may be imported outside SvelteKit context), Generic OAuth provider pointing at `env.AUTHENTIK_ISSUER`, `env.AUTHENTIK_CLIENT_ID`, `env.AUTHENTIK_CLIENT_SECRET`, and `sveltekitCookies` plugin as the last plugin. Set `session.expiresIn: 1800` (30 minutes, fixed — FR-093, not configurable).

- [ ] Task 2: Wire Better Auth handler into `hooks.server.ts` (AC: 2, 5)
  - [ ] 2.1 Add `AUTHENTIK_CLIENT_ID`, `AUTHENTIK_CLIENT_SECRET`, `AUTHENTIK_ISSUER`, and `AUTH_SECRET` to the Valibot `EnvSchema` in `src/lib/server/env.ts`. These are required at runtime; fail-fast if missing (match existing pattern). Also add them to `.env.example` — uncomment the TODO block already present.
  - [ ] 2.2 Import `auth` from `$lib/server/auth` in `hooks.server.ts`. Add the Better Auth `svelteKitHandler` handle **before** the existing `handleParaglide`. Compose both handles using SvelteKit `sequence()`. The Better Auth handler must run first so `event.locals.session` and `event.locals.user` are populated before Paraglide's `transformPageChunk`.
  - [ ] 2.3 Add a `handleAuthGuard: Handle` to `hooks.server.ts` that runs **after** the Better Auth handler and **before** `handleParaglide`. It must redirect unauthenticated requests to `(app)` routes to `/login` (302). Public routes (`/r/[token]/**`, `/auth/**`, `/`) must be explicitly allow-listed and must NOT redirect. The guard must be structured as an exported `routeGuards` array or registry so Story 2.5 can extend it without modifying the hook body (R-006 architecture requirement from test-design-epic-2.md).
  - [ ] 2.4 Update `src/app.d.ts` to declare `App.Locals` with `user` and `session` fields matching the Better Auth types (import from `better-auth/svelte-kit` or the auth instance type).

- [ ] Task 3: Create the auth routes (AC: 2, 4)
  - [ ] 3.1 Create `src/routes/auth/[...all]/+server.ts` that delegates all auth requests to the Better Auth handler: `export const { GET, POST } = auth.handler` (or `svelteKitHandler` pattern per Better Auth docs). This is the OIDC callback receiver and session management endpoint.
  - [ ] 3.2 Create `src/routes/(app)/+layout.server.ts` — a SvelteKit layout server file that calls `requireUser(event)` from `src/lib/server/auth/guards.ts` (see Task 4) and loads the user from `event.locals`. All `(app)` child routes inherit this check automatically.
  - [ ] 3.3 Create a minimal login page at `src/routes/login/+page.svelte` with a "Sign in with Authentik" button that posts to Better Auth's OAuth initiation endpoint (`/auth/sign-in/social?provider=authentik` or equivalent). All strings via Paraglide (`m.login_sign_in_button()`, `m.login_title()`). Add the corresponding i18n keys to `messages/en.json` and `messages/th.json` (English placeholder values in both — Rawinan provides Thai).

- [ ] Task 4: Create auth guard helpers (AC: 1, 5)
  - [ ] 4.1 Create `src/lib/server/auth/guards.ts` exporting: `requireUser(event: RequestEvent): User` — throws `redirect(302, '/login')` if `event.locals.session` is null or expired; `requireAdmin(event: RequestEvent): User` — calls `requireUser` then throws `error(403)` if `event.locals.user.isAdmin` is false; `assertOwner(event: RequestEvent, ownerId: string): void` — calls `requireUser` then throws `error(403)` if the user's ID does not equal `ownerId`.

- [ ] Task 5: Add new env vars and update migrations (AC: 3)
  - [ ] 5.1 Create the migration `drizzle/0002_better_auth.sql` with the Better Auth schema (users, sessions, accounts). Add it to `drizzle/meta/_journal.json`. The `users` table must include `id` (UUID), `email` (text, unique), `emailVerified` (boolean, default false), `createdAt`, `updatedAt`. The `sessions` table must include `id`, `token`, `userId` FK, `expiresAt`, `createdAt`, `updatedAt`. The `accounts` table links OIDC providers to users.
  - [ ] 5.2 Add `AUTH_SECRET` (min 32 chars), `AUTHENTIK_CLIENT_ID`, `AUTHENTIK_CLIENT_SECRET`, `AUTHENTIK_ISSUER` to `src/lib/server/env.ts` Valibot schema. These MUST use GH Secrets/Vars in CI and MUST NOT be hardcoded anywhere — see project memory rule: zero credential literals in any committed file.
  - [ ] 5.3 Add `TRUNCATABLE_TABLES` entries for `users`, `sessions`, `accounts` in `tests/support/fixtures/pg-factory.ts` so integration tests start clean.

- [ ] Task 6: Add integration tests (AC: 1, 2, 3, 4, 5, 6)
  - [ ] 6.1 Create `tests/integration/auth.test.ts` with test IDs matching test-design-epic-2.md P0 scenarios for Story 2.1: `2.1-INT-001` (unauthenticated `(app)` request → 302 to login), `2.1-INT-002` (logout destroys session → subsequent request → 302), `2.1-INT-003` (OIDC callback does not echo `code`/`state` params). Use `pgFactory` from `tests/support/fixtures/pg-factory.ts` for real-Postgres setup. Use the dev bypass (Story 2.2 seam) where full OIDC flow is unavailable — add a note if these tests need to be conditional until Story 2.2 is merged.
  - [ ] 6.2 Create `tests/integration/auth-guard.test.ts` with `2.5-INT-001` stub (mark `test.todo` — the guard dispatcher test activates once Story 2.5 lands, but the file must be created now so the pattern is established).

- [ ] Task 7: Quality gates (AC: all)
  - [ ] 7.1 `bun run lint` → exit 0 (no ESLint errors from new files).
  - [ ] 7.2 `bun run check` (svelte-check + tsc) → exit 0.
  - [ ] 7.3 `bun run test` (unit tests) → exit 0, count must not decrease.
  - [ ] 7.4 `bun run test:integration` → exit 0 (new auth integration tests pass; existing E1 tests must continue passing — no regressions).
  - [ ] 7.5 `bun run build` → exit 0.

## Dev Notes

### Critical: Better Auth Installation & Config

**Library:** `better-auth` (production dependency). Current stack uses Bun + SvelteKit + Drizzle + node-postgres (`pg`). Use the **Drizzle adapter** (`better-auth/adapters/drizzle`) with the `pg` pool from `src/lib/server/db/index.ts`.

**OIDC Provider:** Authentik via Better Auth's **Generic OAuth plugin** (or `socialProviders.authentik` if Better Auth supports it directly). Authorization-code + PKCE flow. Config shape (approximate — verify against actual installed Better Auth version):

```ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { svelteKitCookies } from 'better-auth/svelte-kit';
import { db } from '../db/index.js'; // relative — safe for server-only

export const auth = betterAuth({
  secret: env.AUTH_SECRET,
  database: drizzleAdapter(db, { provider: 'pg' }),
  session: {
    expiresIn: 1800, // 30 minutes FIXED — FR-093, never make configurable
    updateAge: 900,  // refresh session window every 15 min of activity
  },
  socialProviders: {
    // Use Better Auth's built-in Authentik provider or Generic OAuth
    // Verify the provider key from Better Auth docs for the installed version
  },
  plugins: [svelteKitCookies()], // MUST be last plugin
});
```

**Schema generation:** Run `bunx @better-auth/cli generate` to see what tables Better Auth needs. Manually create the migration SQL file (do NOT use `drizzle-kit generate` which would conflict with existing migrations).

### Critical: No `$lib` Alias in Non-SvelteKit Modules

`src/lib/server/auth/index.ts` may eventually be imported by the worker (`src/worker.ts`) for session-related background jobs. Use relative imports (`../../db/index.js`) rather than `$lib` aliases in this file, consistent with the pattern established in `src/lib/server/db/index.ts` and `src/lib/server/env.ts`. SvelteKit routes and layout files CAN use `$lib`.

### Critical: `routeGuards` Registry Pattern (R-006)

The auth guard in `hooks.server.ts` MUST be implemented as an appendable registry, not inline conditional logic. This is an architecture requirement validated by the Epic 2 test design (test-design-epic-2.md, R-006). Pattern:

```ts
// hooks.server.ts
export const routeGuards: Array<{ pattern: RegExp; guard: (event) => void }> = [
  { pattern: /^\/(app)\//, guard: (event) => requireUser(event) },
];
// Later epics push to this array without modifying the hook body
```

The `routeGuards` export must be importable from tests for the `2.5-UNIT-001` assertion.

### Critical: Session Available on `event.locals`

After the Better Auth `svelteKitHandler` runs in `hooks.server.ts`, downstream code accesses the session via `event.locals.session` and `event.locals.user`. The `src/app.d.ts` must declare these fields with the correct types from Better Auth. The `(app)/+layout.server.ts` `load` function re-exports the user data to the `$page.data` tree so Svelte components can display the logged-in user's name.

### Critical: Zero Credential Literals in Committed Files

Per project memory (MEMORY.md → `feedback_test_credentials.md`): **NEVER** write actual values for `AUTH_SECRET`, `AUTHENTIK_CLIENT_ID`, `AUTHENTIK_CLIENT_SECRET`, `AUTHENTIK_ISSUER` in any committed file. `.env.example` must only contain placeholder comments (the TODO block is already there). CI uses GH Secrets/Vars. Integration tests use runtime-generated values or dev bypass (Story 2.2).

### Critical: Pre-existing Build Issue (Carry-Forward from Story 1.9)

`bun run build` and `bun run test` (unit) require `DATABASE_URL` at module-load time because `src/lib/server/env.ts` calls `process.exit(1)` on import. The CI build step already has a `DATABASE_URL` placeholder (added in Story 1.9). Do NOT change `env.ts` behavior — just ensure the new auth env vars (`AUTH_SECRET`, `AUTHENTIK_*`) are also handled gracefully (mark them optional for build-time, required for runtime, or add them to the CI placeholder list).

### Existing File Inventory (Do NOT recreate)

| File | Story | Relevant to 2.1 |
|------|-------|-----------------|
| `src/lib/server/db/index.ts` | 1.6 | Yes — import `db` and `pool` for Better Auth adapter |
| `src/lib/server/db/schema/index.ts` | 1.9 | Yes — add `export * from './auth.js'` |
| `src/lib/server/services/audit.ts` | 1.6 | Yes — `writeAuditLog(tx, entry)` for future profile mutations (Story 2.3) |
| `src/lib/server/env.ts` | 1.8 | Yes — ADD new auth env vars to Valibot schema |
| `src/hooks.server.ts` | 1.1/1.4 | Yes — EXTEND with Better Auth handler + guard; do not break Paraglide handle |
| `src/app.d.ts` | 1.1 | Yes — UPDATE `App.Locals` with user/session types |
| `tests/support/fixtures/pg-factory.ts` | 1.8 | Yes — ADD Better Auth tables to `TRUNCATABLE_TABLES` |
| `tests/support/integration-setup.ts` | 1.8 | Yes — existing global setup runs migrations; new migration `0002_better_auth.sql` will be applied automatically |
| `drizzle/meta/_journal.json` | 1.6/1.9 | Yes — hand-register `0002_better_auth.sql` entry |
| `.env.example` | 1.1 | Yes — uncomment the TODO auth block |

### Files to Create

| File | Purpose |
|------|---------|
| `drizzle/0002_better_auth.sql` | Better Auth schema migration (users, sessions, accounts) |
| `src/lib/server/db/schema/auth.ts` | Drizzle table definitions for Better Auth tables |
| `src/lib/server/auth/index.ts` | Better Auth config (Drizzle adapter + Authentik OIDC + session) |
| `src/lib/server/auth/guards.ts` | `requireUser`, `requireAdmin`, `assertOwner` helpers |
| `src/routes/auth/[...all]/+server.ts` | Better Auth request handler (OIDC callback receiver) |
| `src/routes/(app)/+layout.server.ts` | `requireUser` gate + user load for all app routes |
| `src/routes/login/+page.svelte` | Login page with "Sign in" button |
| `src/routes/login/+page.server.ts` | Optional: load function that redirects already-authenticated users |
| `tests/integration/auth.test.ts` | 2.1-INT-001, 2.1-INT-002, 2.1-INT-003 |
| `tests/integration/auth-guard.test.ts` | 2.5-INT-001 stub (test.todo) |

### Files to Modify

| File | Change |
|------|--------|
| `src/lib/server/env.ts` | Add `AUTH_SECRET`, `AUTHENTIK_CLIENT_ID`, `AUTHENTIK_CLIENT_SECRET`, `AUTHENTIK_ISSUER` to Valibot schema |
| `src/lib/server/db/schema/index.ts` | Add `export * from './auth.js'` |
| `src/hooks.server.ts` | Add Better Auth handler + auth guard (composed with `sequence()`) |
| `src/app.d.ts` | Declare `App.Locals.user` and `App.Locals.session` types |
| `tests/support/fixtures/pg-factory.ts` | Add `users`, `sessions`, `accounts` to `TRUNCATABLE_TABLES` |
| `drizzle/meta/_journal.json` | Register `0002_better_auth.sql` |
| `messages/en.json` | Add `login_title`, `login_sign_in_button` keys |
| `messages/th.json` | Add same keys with English placeholder values |
| `.env.example` | Uncomment auth TODO block |

### Architecture References

- **Better Auth + Authentik OIDC:** `_bmad-output/planning-artifacts/architecture.md` → §Authentication & Security. Auth library: Better Auth; `svelteKitHandler` in hooks; `sveltekitCookies` plugin last; sessions DB-backed; `event.locals.session`.
- **Session timeout 30 min (FR-093):** Architecture §Authentication & Security: "fixed 30-min default (not configurable)". Hard-code `expiresIn: 1800` — never expose as env/setting.
- **Guard dispatcher pattern:** Architecture §Authorization + test-design-epic-2.md R-006. `routeGuards` must be exported for extensibility.
- **Env secrets:** Architecture §Infrastructure & Deployment: 12-factor env vars. `src/lib/server/env.ts` — Valibot-validated. NEVER in repo.
- **`(app)` vs public route zones:** Architecture §Frontend Architecture and §Project Structure. `(app)/**` = authenticated; `/r/[token]/**`, `/auth/**`, `/` = public.
- **Drizzle migration pattern:** Stories 1.6 and 1.9 established hand-writing migrations and registering in `_journal.json` without running `drizzle-kit generate`.
- **Test scenarios:** `_bmad-output/test-artifacts/test-design/test-design-epic-2.md` — 2.1-E2E-001, 2.1-INT-001, 2.1-INT-002, 2.1-INT-003 are P0 for this story; 2.1-E2E-002, 2.1-E2E-003, 2.1-INT-003 are P1.

### Anti-Patterns to Avoid

- **Do NOT add username/password auth** — the app uses Authentik IdP exclusively (FR-090). No `emailAndPassword` plugin.
- **Do NOT hardcode Thai text** — all login page copy via Paraglide (`m.login_*()` keys); English placeholder in `th.json`.
- **Do NOT make session timeout configurable** — FR-093 requires a fixed 30-minute default. Hard-code `1800` seconds.
- **Do NOT put credential values in `.env.example`** — placeholder comments only (see project memory).
- **Do NOT skip the `sequence()` order** — Better Auth handler must run BEFORE the Paraglide handle so `event.locals` is populated. Wrong order = `undefined` locals in `transformPageChunk`.
- **Do NOT import `$lib` in `auth/index.ts`** — use relative imports; this file may be imported outside SvelteKit's module resolution context.
- **Do NOT run `drizzle-kit generate`** — hand-write and register `0002_better_auth.sql` per the established pattern.
- **Do NOT expose `event.locals.user.isAdmin` or session data to the client** — server-only data stays in `+page.server.ts` / `load`; use `$page.data` for what components need.

### Project Structure Notes

- `src/lib/server/auth/` is a new subdirectory under `src/lib/server/` (consistent with `db/`, `email/`, `jobs/`, `services/`).
- `src/routes/(app)/+layout.server.ts` is the single gate for all internal-app routes — no per-route auth check needed in this story (that's Story 2.5's dispatcher).
- `src/routes/auth/[...all]/+server.ts` handles ALL Better Auth routes under `/auth/` including the OIDC callback.
- `src/routes/login/` is a public route (no `(app)` group) — the login page must be accessible without auth.

### Previous Story Intelligence

**From Story 1.9:**
- `drizzle/meta/_journal.json` hand-registration pattern: add an entry with `{ "idx": 2, "version": "7", "when": <timestamp>, "tag": "0002_better_auth", "breakpoints": true }`. The `when` timestamp does not need to be exact — use current epoch milliseconds.
- `tests/support/fixtures/pg-factory.ts` `TRUNCATABLE_TABLES` array: add the new table names to keep tests clean. Ordering matters if there are FK constraints — truncate child tables before parent tables (sessions → accounts → users).
- `tests/support/integration-setup.ts` global setup calls `drizzle-kit migrate` automatically at test start — new migrations will be applied without code changes.

**From Story 1.6:**
- `writeAuditLog(tx, { actorId, entity, action, diff })` is the audit pattern. Story 2.1 itself does not write audit rows (that starts in 2.3 for profile mutations per test-design-epic-2.md R-011), but the infrastructure is ready.

**From Stories 1.1/1.4:**
- Paraglide keys are added to `messages/en.json` and `messages/th.json`, then compiled with `bunx @inlang/paraglide-js compile --project ./project.inlang --outdir ./src/lib/paraglide`. Compiled outputs are in `src/lib/paraglide/messages/` (auto-generated, do not edit).
- `hooks.server.ts` currently exports only `handleParaglide` as `handle`. This story extends it to `sequence(handleBetterAuth, handleAuthGuard, handleParaglide)` — the `sequence()` SvelteKit utility is imported from `@sveltejs/kit/hooks`.

### i18n Keys to Add

Add to `messages/en.json` (English source) and `messages/th.json` (same English values as placeholders — Rawinan translates):
```json
"login_title": "Sign in",
"login_sign_in_button": "Sign in with organization account",
"login_error_provider_unavailable": "Sign in is temporarily unavailable. Please try again.",
"logout_button": "Sign out"
```

### References

- Better Auth docs: https://www.better-auth.com/docs (verify API for installed version)
- Better Auth SvelteKit integration: https://www.better-auth.com/docs/integrations/svelte-kit
- Better Auth CLI schema generation: `bunx @better-auth/cli generate`
- Epic 2 story in epics.md: lines 414–428 (GH Issue #10)
- Test scenarios for 2.1: `_bmad-output/test-artifacts/test-design/test-design-epic-2.md` → P0 scenarios 2.1-E2E-001, 2.1-INT-001, 2.1-INT-002, 2.1-INT-003
- Architecture auth section: `_bmad-output/planning-artifacts/architecture.md` → §Authentication & Security (lines 206–234)
- Architecture project structure: `_bmad-output/planning-artifacts/architecture.md` → §Project Structure (lines 449–589)
- `hooks.server.ts` current state: `src/hooks.server.ts` (Paraglide handle only — EXTEND, do not replace)
- `env.ts` current schema: `src/lib/server/env.ts` (add new auth vars to Valibot schema)
- Sprint change proposal: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-10.md` (context for sprint-2 scope adjustments)

### ATDD Artifacts

- **Checklist:** `_bmad-output/test-artifacts/atdd-checklist-2-1-sign-in-with-authentik-oidc.md`
- **Integration tests:** `tests/integration/auth.test.ts` (2.1-INT-001 through 2.1-UNIT-001)
- **Guard stubs:** `tests/integration/auth-guard.test.ts` (2.5-INT-001 through 2.5-UNIT-001 stubs)
- **E2E tests:** `tests/e2e/auth.spec.ts` (2.1-E2E-001 through 2.1-E2E-A11Y)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
