---
baseline_commit: 1aac108
---

# Story 1.5: Jobs & Email Platform

Status: review

## Story

As a developer,
I want a pg-boss worker process and a nodemailer transport (Mailpit in dev),
so that later epics can enqueue durable jobs and send email reliably.

## Acceptance Criteria

1. **Given** PostgreSQL and a Mailpit instance running, **When** the worker process starts (`bun run worker`), **Then** the process connects to pg-boss and begins polling without errors.

2. **Given** the worker is running, **When** a `smoke-email` job is enqueued via `enqueueJob('smoke-email', payload, { key: idempotencyKey })`, **Then** the worker handler picks it up, renders a smoke email via nodemailer, and the email appears in the Mailpit inbox.

3. **Given** an email job is enqueued with an idempotency key, **When** the same key is enqueued again, **Then** pg-boss deduplicates it and only one email is delivered.

4. **Given** nodemailer encounters a transport error on a job, **When** retries are exhausted (or the job is explicitly failed), **Then** the job lands in the pg-boss dead-letter queue with a visible error in the `pgboss.job` table (state = `failed`, output contains the error).

5. **Given** the codebase, **When** ESLint runs, **Then** any file under `src/lib/server/jobs/` or `src/worker.ts` that imports `$app/*` or `$env/dynamic` fails the lint check (custom ESLint rule or no-restricted-imports).

6. **Given** the `.env` file contains the required SMTP and pg-boss env vars, **When** the worker starts, **Then** env vars are validated via the Valibot env schema — missing vars cause an immediate `fail fast` exit before pg-boss connects.

## Tasks / Subtasks

- [x] Task 1: Install dependencies (AC: 1, 2, 3, 4, 6)
  - [x] 1.1 Run `bun add pg-boss nodemailer pino valibot` (runtime — valibot not yet in package.json)
  - [x] 1.2 Run `bun add -d @types/nodemailer @types/pino` (dev types — pg-boss ships its own TS types, do NOT install `@types/pg-boss`)
  - [x] 1.3 Confirm bun.lock updated; no conflicting peer deps

- [x] Task 2: Create `src/lib/server/jobs/` module (AC: 1, 2, 3, 4, 5)
  - [x] 2.1 Create `src/lib/server/jobs/boss.ts` — pg-boss singleton (connect once, export instance); configure `retryLimit`, `retryDelay`, `expireInHours` per queue
  - [x] 2.2 Create `src/lib/server/jobs/queues.ts` — export `QUEUE` constant object with kebab-case, verb-led names (`send-email`, `smoke-email`) + Valibot payload schemas per queue
  - [x] 2.3 Create `src/lib/server/jobs/handlers/send-email.ts` — handler for `send-email` queue; validates payload with Valibot before calling mailer
  - [x] 2.4 Create `src/lib/server/jobs/handlers/smoke-email.ts` — handler for `smoke-email` queue; sends a hardcoded (non-user-facing) smoke test email via mailer
  - [x] 2.5 Create `src/lib/server/jobs/index.ts` — re-exports `boss`, `QUEUE`, `enqueueJob` helper

- [x] Task 3: Create `src/lib/server/email/` module (AC: 2, 6)
  - [x] 3.1 Create `src/lib/server/email/mailer.ts` — nodemailer transporter; in dev uses Mailpit SMTP (`SMTP_HOST`, `SMTP_PORT`); in production uses org SMTP creds from env; exports `sendMail(opts)` helper
  - [x] 3.2 Create `src/lib/server/email/templates/` directory with `smoke.ts` — returns a plain-text/HTML email body for the smoke test (no Thai strings needed here; this is dev-only)

- [x] Task 4: Create `src/lib/server/env.ts` (AC: 6)
  - [x] 4.1 Create `src/lib/server/env.ts` — Valibot schema validating all required env vars (DATABASE_URL, SMTP_HOST, SMTP_PORT, SMTP_FROM, SMTP_DISPLAY_NAME, optionally SMTP_USER/SMTP_PASS); read via `process.env` directly (NOT `$env/dynamic/private`) because this file is imported by the worker process outside SvelteKit's runtime; call `v.safeParse` at module load time; `process.exit(1)` with clear message on failure
  - [x] 4.2 All server modules (including SvelteKit routes) must import env from `src/lib/server/env.ts` — never import `$env/dynamic/private` directly, to maintain a consistent boundary the worker can also use

- [x] Task 5: Create `src/worker.ts` worker entrypoint (AC: 1, 2)
  - [x] 5.1 Create `src/worker.ts` — top-level script: imports validated env (from `server/env.ts`), creates pg-boss instance, registers all job handlers, calls `boss.start()`, logs startup with pino
  - [x] 5.2 Register handlers: `boss.work(QUEUE['smoke-email'], smokeEmailHandler)`, `boss.work(QUEUE['send-email'], sendEmailHandler)`
  - [x] 5.3 Wire graceful shutdown: `process.on('SIGTERM', () => boss.stop())`

- [x] Task 6: Add `worker` script to `package.json` (AC: 1)
  - [x] 6.1 Add `"worker": "bun run src/worker.ts"` to `scripts` in `package.json`
  - [x] 6.2 Verify `bun run worker` starts without crashing when Postgres + Mailpit are reachable

- [x] Task 7: Update `.env.example` with new env vars (AC: 6)
  - [x] 7.1 Append SMTP vars to `.env.example`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, `SMTP_DISPLAY_NAME` (org name for From header, FR-083), `SMTP_USER` (optional), `SMTP_PASS` (optional), `SMTP_SECURE` (optional, defaults false for Mailpit)
  - [x] 7.2 Add `MAILPIT_URL` (dev only, for inbox link in logs)

- [x] Task 8: Add ESLint no-restricted-imports rule (AC: 5)
  - [x] 8.1 In `eslint.config.js`, add a config block scoped to `['src/worker.ts', 'src/lib/server/**/*.ts']` with `'no-restricted-imports': ['error', { patterns: [{ group: ['$app/*', '$env/dynamic*'], message: 'Job handlers must not import SvelteKit runtime modules. Import from $env/static/private or src/lib/server/env.ts instead.' }] }]`
  - [x] 8.2 Verify `bun run lint` still exits 0 (rule only fires if a violation exists)

- [x] Task 9: Update `compose.yaml` with Mailpit service (AC: 2)
  - [x] 9.1 Add a `mailpit` service to `compose.yaml` using `axllent/mailpit:latest`; expose SMTP port 1025 and web UI port 8025
  - [x] 9.2 Confirm the compose service name matches `.env.example` `SMTP_HOST=mailpit`

- [x] Task 10: Write unit/integration tests (AC: 1–5)
  - [x] 10.1 `src/lib/server/jobs/queues.test.ts` — Valibot payload schemas parse valid payloads and reject invalid ones (pure unit, no DB)
  - [x] 10.2 `src/lib/server/email/mailer.test.ts` — stub nodemailer transport; assert `sendMail` calls transport with correct `from`/`to`/`subject` fields (pure unit)
  - [x] 10.3 `src/lib/server/jobs/handlers/smoke-email.test.ts` — spy on `mailer.sendMail`; assert smoke handler calls it once with expected args (pure unit)
  - [x] 10.4 (Integration, skip with `test.skip` if no real Postgres in unit tier) `src/worker.integration.test.ts` — enqueue `smoke-email`, wait for handler to be called, assert mailer spy was invoked with correct payload

- [x] Task 11: Quality gates (AC: all)
  - [x] 11.1 `bun run lint` → exit 0
  - [x] 11.2 `bun run check` (svelte-check + tsc) → exit 0
  - [x] 11.3 `bun run test` (vitest --run) → exit 0
  - [x] 11.4 `bun run format` (prettier --check) → exit 0

## Dev Notes

### Stack & Library Choices

- **pg-boss**: Postgres-backed job queue. Use version `^10` (latest stable as of June 2026). Install: `bun add pg-boss`. pg-boss ships its own TypeScript types — do NOT install `@types/pg-boss`.
- **nodemailer**: SMTP transport. Use version `^6`. Install: `bun add nodemailer && bun add -d @types/nodemailer`.
- **pino**: Structured logging for the worker process. Architecture-prescribed. Install: `bun add pino && bun add -d @types/pino`.
- **valibot**: Validation library — used for env schema and job payload schemas. Architecture-prescribed. NOT yet in package.json (story 1.1 did not add it). Install: `bun add valibot`. Use `v.object()`, `v.pipe()`, `v.safeParse()`, `v.flatten()` from valibot v1 API.
- **Mailpit**: Dev SMTP sink + inbox UI. Docker image: `axllent/mailpit:latest`. SMTP port: `1025` (no auth in dev). Web UI: `http://localhost:8025`.

### Import Path Rule: Relative Imports in All `src/lib/server/` Modules

All files under `src/lib/server/` **must use relative imports** when importing from each other (e.g., `'../env.js'`, `'./boss.js'`). The `$lib` alias is resolved by Vite/SvelteKit at build time for the web server but is NOT available when the worker process (`src/worker.ts`) runs as a standalone Bun script. Using `$lib/server/...` in any module imported by the worker will cause a module resolution error at runtime.

Rule: `$lib/*` imports are only valid in SvelteKit route files (`+page.svelte`, `+page.server.ts`, `+layout.svelte`, etc.) and components. Server library modules must use relative paths.

### Critical Architecture Rules for This Story

1. **Job handlers MUST NOT import `$app/*` or `$env/dynamic`** — the worker runs as a separate Bun process, not inside SvelteKit's runtime. Accessing `$app/*` at the module level will throw at import time. Env must come from `src/lib/server/env.ts` which reads via `process.env`.

2. **`src/lib/server/env.ts` must use `process.env` directly** (NOT `$env/dynamic/private`) because it is imported by the worker process where SvelteKit's runtime env module is unavailable. The architecture states env validation via Valibot at startup — this file IS that boundary.

3. **Email is ALWAYS enqueued, never sent inline** — see architecture enforcement guidelines. The mailer module (`mailer.ts`) may only be called from inside a pg-boss job handler, never directly from a SvelteKit form action or load function.

4. **Queue names are `kebab-case`, verb-led** (per `architecture.md` §Communication Patterns): `send-email`, `smoke-email`, `send-reminder`, `close-registration`. Define all names as constants in `queues.ts`.

5. **Idempotency keys** — every job that sends email MUST use a stable, deterministic idempotency key passed as `options.key` to `boss.send()`. Format: `<queue-name>:<entity-id>:<event>`. Example: `send-email:booking:abc123:confirmation`.

### File Locations (must match architecture structure)

```
src/
├── worker.ts                          # NEW — pg-boss worker entrypoint (separate process)
└── lib/
    └── server/
        ├── env.ts                     # NEW — Valibot-validated env (reads process.env)
        ├── email/
        │   ├── mailer.ts              # NEW — nodemailer transport (Mailpit dev / org SMTP prod)
        │   └── templates/
        │       └── smoke.ts           # NEW — smoke test email template
        └── jobs/
            ├── boss.ts                # NEW — pg-boss instance singleton
            ├── queues.ts              # NEW — queue name constants + Valibot payload schemas
            ├── index.ts               # NEW — re-exports: boss, QUEUE, enqueueJob
            └── handlers/
                ├── send-email.ts      # NEW — handler for send-email queue
                └── smoke-email.ts     # NEW — handler for smoke-email queue
```

Files modified (not created):
- `package.json` — add `worker` script
- `.env.example` — add SMTP vars
- `compose.yaml` — add mailpit service
- `eslint.config.js` — add no-restricted-imports rule

### pg-boss Configuration Details

```typescript
// src/lib/server/jobs/boss.ts
import PgBoss from 'pg-boss';
import { env } from '../env.js';  // relative import — $lib alias not available in worker process

const boss = new PgBoss({
  connectionString: env.DATABASE_URL,
  // pg-boss schema lives in 'pgboss' by default — do not change
  retryLimit: 3,
  retryDelay: 60,       // seconds between retries
  expireInHours: 24,    // job TTL
  deleteAfterHours: 72, // auto-purge completed jobs after 3 days
  monitorStateIntervalSeconds: 30,
});

export default boss;
```

Note: pg-boss creates its own schema (`pgboss`) in the connected Postgres DB. This schema is NOT managed by Drizzle migrations — it is self-managed by pg-boss on `boss.start()`. Do NOT add pg-boss tables to the Drizzle schema.

### Valibot Env Schema Pattern

```typescript
// src/lib/server/env.ts
// IMPORTANT: Use process.env directly — NOT $env/dynamic/private
// This file is imported by src/worker.ts (outside SvelteKit runtime)
import * as v from 'valibot';

const EnvSchema = v.object({
  DATABASE_URL: v.pipe(v.string(), v.minLength(1)),
  SMTP_HOST: v.pipe(v.string(), v.minLength(1)),
  SMTP_PORT: v.pipe(v.string(), v.transform(Number), v.number()),
  SMTP_FROM: v.pipe(v.string(), v.email()),
  SMTP_DISPLAY_NAME: v.pipe(v.string(), v.minLength(1)), // FR-083: sender = org name
  SMTP_USER: v.optional(v.string()),
  SMTP_PASS: v.optional(v.string()),
  SMTP_SECURE: v.optional(v.string(), 'false'),
});

const result = v.safeParse(EnvSchema, process.env);
if (!result.success) {
  console.error('Missing or invalid environment variables:', v.flatten(result.issues));
  process.exit(1);
}

export const env = result.output;
```

### Nodemailer Transport Pattern

```typescript
// src/lib/server/email/mailer.ts
import nodemailer from 'nodemailer';
import { env } from '../env.js';  // relative import — $lib alias not available in worker process

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE === 'true',
  auth: env.SMTP_USER
    ? { user: env.SMTP_USER, pass: env.SMTP_PASS ?? '' }
    : undefined,
});

export async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  return transporter.sendMail({
    from: `"${env.SMTP_DISPLAY_NAME}" <${env.SMTP_FROM}>`,  // FR-083: sender display name = org name
    ...opts,
  });
}
```

### Queue Payload Schema Pattern

```typescript
// src/lib/server/jobs/queues.ts
import * as v from 'valibot';

export const QUEUE = {
  SMOKE_EMAIL: 'smoke-email',
  SEND_EMAIL: 'send-email',
} as const;

export const SmokeEmailPayload = v.object({
  to: v.pipe(v.string(), v.email()),
  requestedAt: v.string(), // ISO-8601
});

export const SendEmailPayload = v.object({
  to: v.pipe(v.string(), v.email()),
  subject: v.pipe(v.string(), v.minLength(1)),
  textBody: v.pipe(v.string(), v.minLength(1)),
  htmlBody: v.optional(v.string()),
});

export type SmokeEmailPayload = v.InferOutput<typeof SmokeEmailPayload>;
export type SendEmailPayload = v.InferOutput<typeof SendEmailPayload>;
```

### Worker Entrypoint Pattern

```typescript
// src/worker.ts
// IMPORTANT: No $app/* or $env/dynamic imports here or in any imported module
// IMPORTANT: Use relative paths (not $lib alias) — Vite alias not available in standalone Bun process
import './lib/server/env.js'; // validate env at startup — will process.exit(1) on missing vars
import boss from './lib/server/jobs/boss.js';
import { QUEUE } from './lib/server/jobs/queues.js';
import { smokeEmailHandler } from './lib/server/jobs/handlers/smoke-email.js';
import { sendEmailHandler } from './lib/server/jobs/handlers/send-email.js';
import pino from 'pino';

const logger = pino({ level: 'info' });

async function main() {
  await boss.start();
  logger.info('pg-boss started');

  boss.work(QUEUE.SMOKE_EMAIL, smokeEmailHandler);
  boss.work(QUEUE.SEND_EMAIL, sendEmailHandler);

  logger.info('Worker ready, handlers registered');

  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, stopping worker');
    await boss.stop();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Worker startup failed:', err);
  process.exit(1);
});
```

### ESLint No-Restricted-Imports Rule

```javascript
// Add to eslint.config.js
{
  files: ['src/worker.ts', 'src/lib/server/**/*.ts'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['$app/*', '$env/dynamic*'],
            message:
              'Job handlers and server modules must not import SvelteKit runtime modules. Use src/lib/server/env.ts for environment variables.',
          },
        ],
      },
    ],
  },
}
```

### Mailpit Compose Service

```yaml
# Add to compose.yaml
  mailpit:
    image: axllent/mailpit:latest
    ports:
      - "1025:1025"   # SMTP
      - "8025:8025"   # Web UI
    environment:
      MP_SMTP_AUTH_ACCEPT_ANY: "true"
      MP_SMTP_AUTH_ALLOW_INSECURE: "true"
```

Set `SMTP_HOST=localhost` and `SMTP_PORT=1025` in `.env` for local dev.

### Dead-Letter Behavior

pg-boss dead-letters a job automatically when `retryLimit` is exhausted. To inspect:
```sql
SELECT id, name, state, output, retrylimit, retrycount
FROM pgboss.job
WHERE state = 'failed';
```
The `output` column contains the error thrown by the handler. No additional code needed to implement dead-letter — it is built into pg-boss.

### Idempotency Key Format

Always supply a stable, deterministic `key` when enqueuing email jobs. This prevents duplicate emails if a job is re-enqueued (e.g., after a request retry):

```typescript
// enqueueJob helper (src/lib/server/jobs/index.ts)
export async function enqueueJob<T>(
  queue: string,
  data: T,
  options: { key: string; [k: string]: unknown } = { key: '' }
) {
  return boss.send(queue, data as object, options);
}
```

Usage: `await enqueueJob(QUEUE.SEND_EMAIL, payload, { key: `send-email:booking:${bookingId}:confirmation` })`

### Testing Standards for This Story

- Unit tests live adjacent to their module as `*.test.ts` (Vitest). No co-location in a `__tests__` directory.
- Stub/mock nodemailer transport in unit tests — do NOT call real SMTP.
- Integration test (`*.integration.test.ts`) may be written but wrapped in `test.skip()` until real Postgres CI is wired (Story 1.8).
- Test pg-boss payload Valibot schemas with both valid and intentionally invalid inputs (boundary testing).
- No Playwright (e2e) tests for this story — no UI surface.

### Previous Story Notes (Story 1.1 Scaffold)

From Story 1.1 dev record:
- Runtime and package manager: Bun exclusively — `bun install`, `bun run *`
- `svelte-adapter-bun` wired in `vite.config.ts`
- ESLint configured via `eslint.config.js` using flat config format (ESLint v10+)
- All source files must be `.ts` or `.svelte` with `lang="ts"`
- `$lib` path alias resolves to `src/lib/` — usable in all server modules

### Architecture Compliance Checklist

- [ ] `src/worker.ts` does NOT import `$app/*` or `$env/dynamic`
- [ ] All server modules in `src/lib/server/jobs/` do NOT import `$app/*` or `$env/dynamic`
- [ ] `src/lib/server/env.ts` reads `process.env` directly (NOT `$env/dynamic/private`)
- [ ] All imports between `src/lib/server/**` modules use relative paths (not `$lib` alias)
- [ ] All queue names are `kebab-case`, verb-led constants in `queues.ts`
- [ ] pg-boss schema (`pgboss.*`) is NOT managed by Drizzle — pg-boss self-manages it
- [ ] Email is enqueued via pg-boss; `mailer.ts` is only called from job handlers
- [ ] All job payloads validated with Valibot before processing
- [ ] ESLint no-restricted-imports rule blocks `$app/*` and `$env/dynamic` in worker/server files
- [ ] `bun run lint`, `bun run check`, `bun run test`, `bun run format` all exit 0

### Project Structure Notes

- `src/lib/server/` is server-only (never client-imported). All new files in this story live there.
- The worker entrypoint is `src/worker.ts` at the `src/` root — NOT inside `src/lib/`. This matches the architecture structure map exactly.
- Do NOT create any SvelteKit route files (`+page.*`, `+server.*`) in this story — this is a pure infrastructure story.
- Do NOT create Drizzle schema files for pg-boss tables — pg-boss self-manages its schema.
- Do NOT touch `src/hooks.server.ts` in this story — that is modified in Story 2.1 (Better Auth).

### References

- [Source: architecture.md §"Background Jobs & Notifications"] — pg-boss, nodemailer, worker process, idempotency, dead-letter
- [Source: architecture.md §"Complete Project Directory Structure"] — `src/worker.ts`, `src/lib/server/jobs/`, `src/lib/server/email/`, `src/lib/server/env.ts`
- [Source: architecture.md §"Communication Patterns"] — queue naming, email-always-enqueued rule
- [Source: architecture.md §"Process Patterns"] — env validation fail-fast, pino logging, no PII in logs
- [Source: architecture.md §"Enforcement Guidelines"] — enqueue-all-email rule, no-restricted-imports
- [Source: epics.md §"AR-06 Background jobs"] — pg-boss, idempotency keys, dead-letter, lint boundary
- [Source: epics.md §"AR-07 Email"] — nodemailer, org SMTP, Paraglide Thai templates
- [Source: epics.md §"Story 1.5: Jobs & email platform"] — acceptance criteria, GH #5

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- pg-boss v12 uses named export `{ PgBoss }` (not default export). Dev Notes example was based on pg-boss v10 API — adapted for v12.
- pg-boss v12 `ConstructorOptions` does not include `retryLimit`/`retryDelay`/`expireInHours` — these are queue-level options. Constructor only needs `connectionString`.
- pg-boss v12 `WorkHandler` signature is `(jobs: Job<T>[]) => Promise<R>` (array), not `(job: Job<T>) => Promise<R>`. Handlers adapted to accept `JobLike | JobLike[]` union for test compatibility.
- pg-boss v12 idempotency key is `singletonKey` in `SendOptions` (not `key`). `enqueueJob` helper supports both `singletonKey` and legacy `key` prop.
- valibot v1 `SafeParseResult` union includes an `output: unknown` variant (untyped failure case), causing TypeScript to infer `T = unknown` in generic helpers with `strict: true`. Fixed by using `eslint-disable` + `as` cast in the pre-created test helper.
- `env.ts` comment initially contained `$env/dynamic/private` string which triggered a test that checked env.ts does NOT contain that import pattern. Removed the string from the comment.

### Completion Notes List

- Installed pg-boss@12.18.2, nodemailer@8.0.10, pino@10.3.1, valibot@1.4.1 (runtime) and @types/nodemailer, @types/pino (dev). @types/pg-boss NOT installed.
- Created all 9 new source files per architecture structure: env.ts, boss.ts, queues.ts, handlers/send-email.ts, handlers/smoke-email.ts, index.ts, mailer.ts, templates/smoke.ts, worker.ts.
- Updated 4 existing files: package.json (worker script), .env.example (SMTP vars + MAILPIT_URL), compose.yaml (mailpit service), eslint.config.js (no-restricted-imports rule).
- Activated all ATDD tests from red-phase to green. 58 tests pass; 20 remain skipped (4 integration tests pending Story 1.8 real Postgres CI, 16 Story 1.1 scaffold tests from prior story).
- All quality gates pass: lint exit 0, svelte-check/tsc 0 errors, prettier --check clean, vitest exit 0.
- Architecture compliance: no $app/* or $env/dynamic imports in any worker/server file; all relative imports in src/lib/server/; queue names kebab-case verb-led; email always enqueued via pg-boss.

### File List

**New files:**
- src/lib/server/env.ts
- src/lib/server/email/mailer.ts
- src/lib/server/email/templates/smoke.ts
- src/lib/server/jobs/boss.ts
- src/lib/server/jobs/queues.ts
- src/lib/server/jobs/handlers/send-email.ts
- src/lib/server/jobs/handlers/smoke-email.ts
- src/lib/server/jobs/index.ts
- src/worker.ts

**Modified files:**
- package.json (added worker script, pg-boss/nodemailer/pino/valibot dependencies)
- .env.example (added SMTP vars + MAILPIT_URL)
- compose.yaml (added mailpit service)
- eslint.config.js (added no-restricted-imports rule for worker/server files)
- bun.lock (updated by bun install)
- src/lib/server/jobs/queues.test.ts (activated tests; fixed expectValid helper type for valibot v1 strict TS)

## Change Log

- 2026-06-10: Implemented Story 1.5 Jobs & Email Platform — pg-boss worker, nodemailer Mailpit transport, Valibot env validation, ESLint boundary rule. 58 unit tests passing. Status: review.
