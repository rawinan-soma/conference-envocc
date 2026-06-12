# Deferred Work

## Deferred from: code review of 1-4-internationalization-setup (2026-06-10)

- `no-raw-svelte-text` ESLint rule does not catch hardcoded user-facing text in element attributes (e.g. `title`, `placeholder`, `aria-label`) — only inline text nodes (`SvelteText`). AC-3 scopes the guard to inline text content and TS string literals, so this is acceptable for Story 1.4. Revisit if attribute-level i18n enforcement becomes a requirement; note the high false-positive risk for non-UI attributes (class, href, data-*).

## Deferred from: code review of 1-8-test-harness-ci (2026-06-10)

- Pre-existing Story 1.2 unit-test failures (`1.2-UNIT-008`, `1.2-UNIT-010`, `1.2-UNIT-012` in `tests/unit/design-system.spec.ts`): `src/routes/+page.svelte` does not import/render a Button component nor apply Thai typography classes, so these RED-phase Story 1.2 tests still fail. Present at the Story 1.8 baseline commit `b93a918` and outside Story 1.8 scope (no `+page.svelte` change in this story). Should be resolved when Story 1.2 / Story 1.9 walking-skeleton fills the home page. `1.2-UNIT-012` additionally shells out to `bun run lint` and fails inside the worktree even though standalone lint passes — subprocess/worktree quirk, also pre-existing.

## Deferred from: code review of 1-6-audit-log-write-hook-foundation (2026-06-10)

- `db/index.ts` eagerly constructs a `pg` Pool and imports `env` at module load — importing `db` triggers `env.ts` fail-fast (`process.exit(1)`) when env vars are missing. By design for this foundation story; not exercised by unit tests, and integration tests are skipped until story 1.8 wires Postgres. Revisit if lazy DB initialization is needed.
- No indexes on `audit_log` query columns (`actor_id`, `entity`, `created_at`). Foundation story only defines the table; add indexes when the audit-log query/view is implemented (epic 3+, story 7.5 audit-log view).
- AC-5 `bun run check` and full `bun run test` do not exit 0 due to a pre-existing `validateEnv` export mismatch in `src/hooks.server.ts` and `src/lib/server/env.test.ts` (introduced by story 1.7 red-phase tests; `env.ts` never exported `validateEnv`). Not caused by story 1.6. Resolve when story 1.7's env validation is reconciled — `env.ts` should export `validateEnv`, or the importers updated.

## Deferred from: code review of 1-9-walking-skeleton-vertical-slice (2026-06-11)

- `bun run build` and `bun run test` (via unit test `1.4-UNIT-003`) exit 1 when `DATABASE_URL` is unset, because `env.ts` runs `validateEnv(process.env)` + `v.parse(...)` at module import and calls `process.exit(1)`. During `vite build`, SvelteKit's SSR analysis imports the `/skeleton` route → `db/index.ts` → `env.ts`, triggering the exit; `env.test.ts` fails the same way at import. Root cause is pre-existing (env.ts byte-identical at baseline `b4737bf` and on `main`); failure count did not increase in Story 1.9. The Story 1.9 CI fix adds a `DATABASE_URL` placeholder only to the CI `build` step — it does NOT cover the `test-unit` CI job, which spawns `bun run build` inside `1.4-UNIT-003` without `DATABASE_URL`, so AC-7 stays red there. Proper fix (own story): make the module-level auto-validation in `env.ts` lazy / guard it so it only fires at real worker/server startup (worker.ts and hooks.server.ts already validate explicitly), or stub `DATABASE_URL` for the build/test-unit environments. Touches a foundation module + the 1.7-UNIT validateEnv contract — out of scope for a skeleton story.
- `drizzle/0001_audit_log.sql` was hand-authored and `drizzle/meta/_journal.json` manually edited with a fabricated `when` timestamp (`1749484800001`), bypassing `drizzle-kit generate`. The migration is not machine-verified against the Drizzle schema, so future drift between `audit-log.ts` and the SQL will go undetected. Accepted as tech debt in the story Dev Notes; reconcile when migrations are regenerated (Epic 4 bookings rework).

## Deferred from: code review of 2-1-sign-in-with-authentik-oidc (2026-06-11)

- Route-guard regex in `src/hooks.server.ts` (`/^\/(?!(?:login|auth\/|r\/|$))/`) is not boundary-anchored: hypothetical paths like `/loginabc` or `/authxyz` would slip the negative lookahead and skip the auth guard. No such routes exist today, so this is cosmetic robustness only. Tighten the lookahead (e.g. `(?:login|auth|r)(?:\/|$)`) when the route table grows or when Story 2.5 reworks the guard dispatcher.

## Deferred from: code review of 2-5-authorization-guard-dispatcher (2026-06-12)

- `requireUser` in `src/lib/server/auth/guards.ts` has a defensive expired-session branch (`session.expiresAt < new Date()` → redirect 302) that has no direct test coverage. Pre-existing guard code (Story 2.1). Session-timeout enforcement is owned by Story 2.6 (`session.expiresIn: 1800`), so explicit coverage of this belt-and-suspenders branch is out of scope for 2.5. Add a unit test for the expired-session redirect when revisiting session lifecycle.
