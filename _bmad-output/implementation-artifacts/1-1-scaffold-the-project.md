# Story 1.1: Scaffold the Project

Status: ready-for-dev

## Story

As a developer,
I want the SvelteKit + Bun project scaffolded with the agreed tooling,
so that all later work starts from the locked stack.

## Acceptance Criteria

1. **Given** an empty repository, **When** the project is initialized via `bunx sv create` with TypeScript and add-ons (prettier, eslint, vitest, playwright, tailwindcss, drizzle→PostgreSQL/node-postgres, paraglide), `shadcn-svelte init`, and `svelte-adapter-bun` installed, **Then** `bun install` succeeds, `bun run dev` serves the app on port 5173, and `bun run build` produces a Bun server bundle via `svelte-adapter-bun`.
2. **Given** the scaffolded project, **When** ESLint is run, **Then** it exits 0 with no errors.
3. **Given** the scaffolded project, **When** Prettier is run as a format check (`bun run format --check` or equivalent), **Then** it exits 0 with no formatting errors.
4. **Given** the scaffolded project, **When** `svelte-check` is run (TypeScript + Svelte types), **Then** it exits 0 with no type errors.
5. **Given** the scaffolded project, **When** Vitest runs, **Then** it exits 0 (scaffolded placeholder tests pass).
6. **Given** the scaffolded project, **When** Playwright runs (smoke/scaffold test), **Then** it exits 0 (scaffolded placeholder e2e tests pass).

## Tasks / Subtasks

- [ ] Task 1: Run `bunx sv create` scaffold with all required add-ons (AC: 1)
  - [ ] 1.1 From the repo root, run `bunx sv create .` (dot = current directory, NOT `bunx sv create conference-envocc` which would create a nested subdirectory). Select: template=SvelteKit minimal, TypeScript=yes, add-ons: prettier, eslint, vitest, playwright, tailwindcss, drizzle, paraglide
  - [ ] 1.2 For drizzle add-on: select PostgreSQL → node-postgres (`pg`) driver → docker-compose: yes
  - [ ] 1.3 For paraglide add-on: source locale=`en`, add locale=`th`
  - [ ] 1.4 Run `bun install` inside the scaffolded directory; confirm exit 0

- [ ] Task 2: Install and initialize shadcn-svelte (AC: 1)
  - [ ] 2.1 Run `bunx shadcn-svelte@latest init` to wire CSS-variable theme (accept defaults; Tailwind v4 config lives in CSS, not `tailwind.config.js`)
  - [ ] 2.2 Confirm `components.json` is created and `src/app.css` contains shadcn CSS-variable theme block

- [ ] Task 3: Install `svelte-adapter-bun` and update `svelte.config.js` (AC: 1)
  - [ ] 3.1 Run `bun add -d svelte-adapter-bun`
  - [ ] 3.2 Replace the default adapter in `svelte.config.js` with `svelte-adapter-bun`:
    ```js
    import adapter from 'svelte-adapter-bun';
    export default { kit: { adapter: adapter() } };
    ```
  - [ ] 3.3 Run `bun run build` and confirm a standalone Bun server bundle is produced under `build/`

- [ ] Task 4: Verify the complete project directory structure is in place (AC: 1–6)
  - [ ] 4.1 Confirm the following paths exist (create stubs if sv CLI omitted them):
    - `src/app.html`, `src/app.css`, `src/app.d.ts`
    - `src/hooks.server.ts` (stub, Paraglide `handle` wired per paraglide-sveltekit docs)
    - `src/routes/+page.svelte`, `src/routes/+layout.svelte`
    - `messages/en.json`, `messages/th.json`
    - `project.inlang/settings.json` (en source, th locale)
    - `drizzle.config.ts` (PostgreSQL, node-postgres driver, migrations → `./drizzle`)
    - `drizzle/` directory (empty or with initial placeholder)
    - `.env.example` (document at least: `DATABASE_URL`)
    - `.gitignore` includes `.env`
  - [ ] 4.2 Confirm `vite.config.ts` includes both the Tailwind v4 plugin and Paraglide Vite plugin

- [ ] Task 5: Run all quality gates (AC: 2–6)
  - [ ] 5.1 `bun run lint` (ESLint) → exit 0
  - [ ] 5.2 `bun run format --check` (Prettier) → exit 0
  - [ ] 5.3 `bun run check` (svelte-check) → exit 0
  - [ ] 5.4 `bun run test` (Vitest) → exit 0
  - [ ] 5.5 `bun run test:e2e` (Playwright) → exit 0

## Dev Notes

### Critical Stack Constraints

- **Runtime & package manager:** Bun exclusively — `bun install`, `bun run *`. Do NOT use npm/yarn/pnpm.
- **SvelteKit CLI:** use `bunx sv create` (the official `sv` CLI, NOT the deprecated `create-svelte`). As of June 2026, `sv` is the first-party Svelte CLI.
- **TypeScript end-to-end:** select TypeScript during `sv create`; all source files must be `.ts`/`.svelte` with `lang="ts"`.
- **Tailwind v4:** Tailwind config is CSS-based (in `src/app.css`), NOT `tailwind.config.js`. If any generated file references `tailwind.config.js`, it is outdated — delete it.
- **shadcn-svelte:** use `bunx shadcn-svelte@latest init`. All components are Svelte 5 runes-native and Tailwind v4-compatible. Animations come from `tw-animate-css` (not `tailwindcss-animate`).
- **svelte-adapter-bun:** community adapter by gornostay25 (`bun add -d svelte-adapter-bun`). This is the only supported on-prem deployment adapter for this project. Do NOT use `@sveltejs/adapter-node`.
- **drizzle driver:** `node-postgres` (`pg`) NOT `postgres.js`. Import as `drizzle-orm/node-postgres`. Use `pg.Pool` for the connection.
- **Paraglide version:** Paraglide 2.0 (paraglide-sveltekit). Source locale=`en`, production locale=`th`. Wire the Paraglide `handle` into `src/hooks.server.ts` and add the Vite plugin to `vite.config.ts`.

### Project Structure (must match exactly)

The complete target directory structure is defined in Architecture §"Complete Project Directory Structure". This story creates the root-level skeleton. Key paths this story MUST produce:

```
conference-envocc/
├── package.json              ← Bun; scripts: dev, build, preview, check, lint, format, test, test:e2e
├── bun.lock
├── svelte.config.js          ← svelte-adapter-bun
├── vite.config.ts            ← SvelteKit + Tailwind v4 plugin + Paraglide Vite plugin
├── tsconfig.json
├── drizzle.config.ts         ← node-postgres, migrations → ./drizzle
├── components.json           ← shadcn-svelte config
├── eslint.config.js
├── .prettierrc
├── project.inlang/settings.json   ← en source, th locale
├── messages/en.json
├── messages/th.json
├── .env.example              ← DATABASE_URL at minimum
├── drizzle/                  ← migrations (empty OK for story 1.1)
├── static/                   ← fonts/, logo.svg, favicon.png (stubs OK)
└── src/
    ├── app.html
    ├── app.css               ← Tailwind v4 directives + shadcn CSS-variable theme block
    ├── app.d.ts              ← App.Locals stub (user, session will be typed in E2)
    ├── hooks.server.ts       ← Paraglide handle (Better Auth handle added in E2)
    └── routes/
        ├── +layout.svelte
        └── +page.svelte
```

Deeper `src/lib/server/`, `src/lib/components/`, `src/lib/schemas/`, etc. are established by later stories. Do NOT create those directories in this story — create only what `sv create` produces plus the items listed above.

### Paraglide wiring in hooks.server.ts

```ts
// src/hooks.server.ts  (story 1.1 stub — Better Auth handle added in story 2.1)
import { i18n } from '$lib/paraglide/i18n';
export const handle = i18n.handle();
```

`$lib/paraglide/i18n` is the generated file from the Paraglide Vite plugin — do NOT hand-write it.

### drizzle.config.ts minimal stub

```ts
import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/lib/server/db/schema.ts',   // created in story 1.3
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

Note: `src/lib/server/db/schema.ts` does not exist yet; that's story 1.3. The config file can reference it — `drizzle-kit` only reads it at migration time, not at scaffold time.

### .env.example minimum content

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/conference_envocc
```

Additional env vars (SMTP, auth secrets, etc.) are documented as they are introduced in later stories.

### Tailwind v4 / shadcn-svelte key facts

- Tailwind v4 config is embedded in CSS (no `tailwind.config.js`).
- `shadcn-svelte init` produces a `components.json` and extends `src/app.css` with CSS variable theme block.
- DESIGN.md tokens (Forest & Copper palette) are wired into the shadcn theme in **story 1.2** — this story only runs `shadcn-svelte init` with default colors as a scaffold step.
- The `src/lib/components/ui/` directory is created by `shadcn-svelte init` if it adds any base components; otherwise it is created in story 1.2.

### Quality gate commands (add to package.json scripts if sv CLI omits them)

| Script | Command |
|--------|---------|
| `dev` | `vite dev` |
| `build` | `vite build` |
| `preview` | `vite preview` |
| `check` | `svelte-kit sync && svelte-check --tsconfig ./tsconfig.json` |
| `lint` | `eslint .` |
| `format` | `prettier --check .` (or `prettier --write .` for fix) |
| `test` | `vitest run` |
| `test:e2e` | `playwright test` |

### Testing Standards for This Story

This is a scaffold story — no domain logic to test. The only test requirement is that the scaffolded placeholder tests (generated by `sv create` for vitest and playwright) pass clean. Do NOT write additional tests; that is story 1.8's concern.

### Architecture Compliance Checklist

- [ ] No npm/yarn/pnpm used — Bun only
- [ ] `svelte-adapter-bun` in `svelte.config.js` (not adapter-node)
- [ ] `node-postgres` (`pg`) selected for Drizzle (not postgres.js)
- [ ] Paraglide 2.0 wired: Vite plugin + `i18n.handle()` in hooks
- [ ] `messages/en.json` and `messages/th.json` exist (can be empty `{}` for now)
- [ ] No hardcoded Thai or English UI strings in any `.svelte` file (Paraglide rule)
- [ ] Tailwind v4 CSS-based config (no `tailwind.config.js`)
- [ ] ESLint + Prettier + svelte-check all exit 0

### Project Structure Notes

- Alignment: this story produces exactly the root scaffold; all `src/lib/server/**` subdirectories are created in stories 1.2–1.9 per the architecture structure map.
- Do NOT create `src/lib/server/db/`, `src/lib/server/auth/`, `src/lib/server/jobs/`, etc. in this story.
- The `(app)/` and `r/[token]/` route groups are created in E2 and E5 respectively.
- `docker-compose.yml` stub may be generated by `sv create` for the drizzle add-on — keep it, it will be expanded in story 1.7.
- `.github/workflows/ci.yml` is created in story 1.8.

### CRITICAL: Scaffolding Into an Existing Repo

The repository root (`conference-envocc/`) already exists as a git repo. `bunx sv create conference-envocc` would create a NESTED subdirectory, which is WRONG.

**The correct approach:** scaffold into the CURRENT directory (the repo root):
```bash
# Inside the repo root:
bunx sv create .
# OR equivalently:
bunx sv create --no-install
```
Select all add-ons, then run `bun install`. This scaffolds SvelteKit into the existing repo root without creating a nested folder. If `sv create` refuses to scaffold into a non-empty directory, accept/force it — the only file likely present is `.claude/` and `_bmad-output/`; these are safe to keep.

### No Previous Story

This is story 1.1 — the first story. There are no previous story learnings to incorporate.

### ATDD Artifacts

- **Checklist:** `_bmad-output/test-artifacts/atdd-checklist-1-1-scaffold-the-project.md`
- **Unit tests (RED):** `tests/unit/scaffold.spec.ts` (13 tests, all `test.skip()`)
- **E2E tests (RED):** `tests/e2e/scaffold-smoke.spec.ts` (4 tests, all `test.skip()`)
- **Fixture stubs:** `tests/support/fixtures/scaffold-context.ts`

Activate tests task-by-task: remove `test.skip(` → `test(`, confirm RED, implement, confirm GREEN.

### References

- [Source: architecture.md §"Selected Starter: Official SvelteKit `sv` CLI on Bun"] — initialization commands
- [Source: architecture.md §"Complete Project Directory Structure"] — full target tree
- [Source: architecture.md §"Implementation Patterns & Consistency Rules"] — naming + structure patterns
- [Source: architecture.md §"Naming Patterns → Code (TypeScript / Svelte)"] — kebab-case modules, PascalCase components
- [Source: architecture.md §"Enforcement Guidelines"] — Paraglide-only strings, server isolation, Bun runtime
- [Source: epics.md §"Story 1.1: Scaffold the project"] — acceptance criteria, AR-01
- [Source: epics.md §"AR-01"] — official `sv` CLI on Bun, shadcn-svelte init, svelte-adapter-bun

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
