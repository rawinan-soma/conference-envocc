# Deferred Work

## Deferred from: code review of 1-4-internationalization-setup (2026-06-10)

- `no-raw-svelte-text` ESLint rule does not catch hardcoded user-facing text in element attributes (e.g. `title`, `placeholder`, `aria-label`) — only inline text nodes (`SvelteText`). AC-3 scopes the guard to inline text content and TS string literals, so this is acceptable for Story 1.4. Revisit if attribute-level i18n enforcement becomes a requirement; note the high false-positive risk for non-UI attributes (class, href, data-*).

## Deferred from: code review of 1-8-test-harness-ci (2026-06-10)

- Pre-existing Story 1.2 unit-test failures (`1.2-UNIT-008`, `1.2-UNIT-010`, `1.2-UNIT-012` in `tests/unit/design-system.spec.ts`): `src/routes/+page.svelte` does not import/render a Button component nor apply Thai typography classes, so these RED-phase Story 1.2 tests still fail. Present at the Story 1.8 baseline commit `b93a918` and outside Story 1.8 scope (no `+page.svelte` change in this story). Should be resolved when Story 1.2 / Story 1.9 walking-skeleton fills the home page. `1.2-UNIT-012` additionally shells out to `bun run lint` and fails inside the worktree even though standalone lint passes — subprocess/worktree quirk, also pre-existing.
