---
baseline_commit: 84a9085d077237c55d7fa0e45febeaf601218552
gh_issue: 32
previous_story: 5-3-confirmation-email-with-self-cancel-link
next_story: 5-5-resend-a-lost-link
---

# Story 5.4: Self-Cancel a Registration

Status: done

## Story

As an external registrant,
I want to cancel my own registration by clicking the link in my confirmation email,
so that I can withdraw without needing an organizer account or login.

## Acceptance Criteria

1. **AC-1 (FR-044):** Given a valid, unused cancel link (`/r/<eventToken>/cancel?token=<plaintext>`), visiting it renders a confirmation page (not an immediate cancellation). A POST action cancels the registration and shows a success state. No login is required.
2. **AC-2 (R-002 MITIGATE / AR-05):** The cancel token is single-use. After a successful cancellation the `cancel_token_hash` column is set to `NULL` and `status` is set to `'cancelled'`. A second POST with the same token returns a neutral error/already-cancelled response (no 500, no crash).
3. **AC-3 (R-002 IDOR):** A forged or cross-user token cannot cancel another registrant's record. Token lookup is solely by `sha256(incomingToken) = cancel_token_hash` — no client-supplied `registrationId` is accepted.
4. **AC-4:** An invalid or missing token (`?token=` absent or hash not found) returns a clear error state (e.g. HTTP 400 or rendered error message). The page never crashes.
5. **AC-5:** All UI strings are via Paraglide (`m.*` calls). English values in `messages/en.json`; empty `""` in `messages/th.json`. No Thai text in code.
6. **AC-6 (NFR-007):** Semantic HTML, `role="alert"` on error/success states, WCAG 2.1 AA.

## Tasks / Subtasks

- [x] **Task 1: Add `cancelRegistrantByCancelToken` query** (AC: 2, 3)
  - [x] In `src/lib/server/db/queries/registrations.ts`, add:
    ```ts
    export async function cancelRegistrantByCancelToken(
      tx: DrizzleTransaction,
      cancelTokenPlain: string
    ): Promise<{ cancelled: boolean; registrationId?: string; bookingId?: string }>
    ```
  - [x] Inside the function: compute `sha256(cancelTokenPlain)` via `createHash('sha256').update(cancelTokenPlain).digest('hex')` from `node:crypto`
  - [x] Query: `SELECT id, bookingId, status FOR UPDATE` on `registrations` where `cancel_token_hash = <hash>` (within the passed transaction)
  - [x] If no row found → return `{ cancelled: false }` (token invalid or already used)
  - [x] If row found but `status = 'cancelled'` already → return `{ cancelled: false }` (idempotency guard)
  - [x] If row found and `status = 'registered'` → UPDATE `status = 'cancelled'`, `cancel_token_hash = NULL`, `updatedAt = now()` → return `{ cancelled: true, registrationId: row.id, bookingId: row.bookingId }`

- [x] **Task 2: Add `cancelRegistration` service method** (AC: 2, 3)
  - [x] In `src/lib/server/services/registration-service.ts`, add:
    ```ts
    export async function cancelRegistration(cancelTokenPlain: string): Promise<{ cancelled: boolean }>
    ```
  - [x] Wrap in `db.transaction(async (tx) => { ... })`
  - [x] Call `cancelRegistrantByCancelToken(tx, cancelTokenPlain)` inside the transaction
  - [x] Have `cancelRegistrantByCancelToken` return `{ cancelled: boolean; registrationId?: string; bookingId?: string }` so the service can log which registration was cancelled
  - [x] If `cancelled: true`, call `writeAuditLog(tx, { actorId: null, entity: 'registration', action: 'cancel', diff: { registrationId, bookingId } })` — consistent with the create audit entry in `createRegistration` (lines 75–84)
  - [x] Return `{ cancelled }` from the transaction
  - [x] Export a `RegistrationAlreadyCancelledError` class (extends `Error`) for optional use by the route; service itself can return `{ cancelled: false }` without throwing — route decides presentation

- [x] **Task 3: Create cancel route** (AC: 1, 4, 5, 6)
  - [x] Create directory `src/routes/r/[token]/cancel/`
  - [x] Create `src/routes/r/[token]/cancel/+page.server.ts`:
    - `load` function: reads `url.searchParams.get('token')`. If missing → throw `error(400, 'Invalid cancel link')`. Passes `cancelTokenPlain` and event `params.token` to the page as page data (for display only). Does **NOT** cancel — just validates token presence.
    - `actions.default` POST: reads `cancelTokenPlain` from a hidden `<input type="hidden" name="token">` in the form. Calls `cancelRegistration(cancelTokenPlain)`. Returns `{ success: boolean, alreadyCancelled?: boolean }` via SvelteKit `return { ... }`. Do **not** enqueue any email job — that is Story 6.3.
  - [x] Create `src/routes/r/[token]/cancel/+page.svelte`:
    - Default state: Renders a confirmation prompt "Are you sure you want to cancel your registration?" with a single POST form containing `<input type="hidden" name="token" value={data.cancelTokenPlain}>` and a submit button
    - `form?.success === true`: Show success message (use `m.reg_cancel_success_title()` and `m.reg_cancel_success_message()`)
    - `form?.success === false`: Show neutral error (use `m.reg_cancel_error_title()` and `m.reg_cancel_error_message()`) — covers both invalid token and already-cancelled cases
    - No `superForm` needed — plain SvelteKit form action is sufficient
    - Use `role="alert"` on success/error message containers (AC-6)
    - Match the page shell of `src/routes/r/[token]/+page.svelte` (public layout, no auth sidebar)

- [x] **Task 4: Add i18n keys** (AC: 5)
  - [x] Add to `messages/en.json`:
    ```json
    "reg_cancel_page_title": "Cancel Registration",
    "reg_cancel_confirm_heading": "Cancel your registration?",
    "reg_cancel_confirm_body": "This will remove you from the attendee list. This action cannot be undone.",
    "reg_cancel_confirm_button": "Yes, cancel my registration",
    "reg_cancel_success_title": "Registration Cancelled",
    "reg_cancel_success_message": "Your registration has been successfully cancelled.",
    "reg_cancel_error_title": "Link Expired or Already Used",
    "reg_cancel_error_message": "This cancel link is no longer valid. Your registration may already be cancelled."
    ```
  - [x] Add corresponding keys to `messages/th.json` with value `""` for each (Rawinan handles Thai translation)

- [x] **Task 5: ATDD — activate P0 integration tests** (AC: 2, 3)
  - [x] Append a new `describe` block for Story 5.4 to `tests/integration/registrations.test.ts` (after the last Story 5.3 block at line ~2514)
  - [x] `5.4-INT-001` [P0] ACTIVE (no `.skip`): single-use token — first POST cancels successfully, second POST returns already-used (no 500). See test stub below.
  - [x] `5.4-INT-002` [P0] ACTIVE (no `.skip`): IDOR — forged token hash cannot cancel another registrant's record. See test stub below.
  - [x] `5.4-INT-003` [P2] `test.skip`: `cancel_token_hash IS NULL` post-cancel. See stub below.

- [x] **Task 6: ATDD — add E2E test stubs** (AC: 1)
  - [x] Append a new `test.describe` block for Story 5.4 to `tests/e2e/registrations.spec.ts`
  - [x] `5.4-E2E-001` [P1] `test.skip`: Browser visits cancel link → sees confirm page → clicks confirm → sees success message. See stub below.

### Review Findings

Code review (2026-06-16) — three adversarial layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor. Result: clean. 0 decision-needed, 0 patch, 0 deferred, 2 dismissed.

- [x] [Review][Dismiss] Cancel token (bearer secret) transmitted in URL query string [src/routes/r/[token]/cancel/+page.server.ts:28] — dismissed, accepted by-design tradeoff (won't-fix, not future work). The `?token=<plaintext>` shape is the frozen URL contract from Story 5.3 (Dev Notes line 110). Secrets in GET URLs land in access logs/browser history, but the POST action moves the token to the form body and the only subresource is same-origin `/logo.svg` (no cross-origin Referer leak). Rate-limiting of this endpoint is explicitly out of scope (Dev Notes line 189). No in-scope fix exists.
- [x] [Review][Dismiss] `params.token` (decorative eventToken) not passed to the page — dismissed, non-issue. Spec states eventToken is decorative and not used for security or display (Dev Notes line 111); page does not display it. Nothing broken.

Acceptance Auditor verified all six ACs and Tasks 1–6 satisfied, cross-checked against schema, `writeAuditLog` signature, and the `/r/**` hooks exemption. Edge Case Hunter returned no unhandled edge cases (empty/missing/malformed token, concurrent double-POST, already-cancelled row, audit-write failure all handled).

## Dev Notes

### CRITICAL: GET must NOT cancel — confirm-page pattern required

The cancel link in the confirmation email is a GET URL. Email clients, link prefetchers, and browsers may fire GET requests before the user clicks. **Never perform the cancellation in the `load` function (GET).** The `load` function must only:
1. Validate `?token=` is present (throw `error(400)` if not)
2. Pass the plain token to the page via `data.cancelTokenPlain`

Cancellation happens exclusively in the `actions.default` POST handler.

### URL Contract (frozen by Story 5.3, PR #130)

```
/r/${eventToken}/cancel?token=${cancelTokenPlain}
```

- `eventToken` = `params.token` from the SvelteKit route (the booking's public registration token)
- `cancelTokenPlain` = 64-char hex string (32 random bytes via `randomBytes(32).toString('hex')`)
- Query param is `?token=` (not a path segment) — **do not change this shape**
- The `eventToken` in the route param is NOT used for security — it is decorative (for readability in the URL). Security comes entirely from the CSPRNG `?token=`.

### Token Lookup — hash-only, no client-supplied ID

The cancel action must NEVER accept a client-supplied `registrationId`. Resolution flow:
1. Read `cancelTokenPlain` from the form hidden input
2. Compute `sha256(cancelTokenPlain)` server-side
3. Look up `registrations` WHERE `cancel_token_hash = <hash>` (FOR UPDATE inside tx)
4. If not found → already cancelled or forged → `{ cancelled: false }`

This is why 5.4-INT-002 passes naturally: a forged or cross-user token hash won't match any row.

### Single-Use Token (R-002 MITIGATE, AR-05)

Inside the DB transaction, atomically:
- Set `cancel_token_hash = NULL`
- Set `status = 'cancelled'`
- Set `updatedAt = NOW()`

Use `.for('update')` on the SELECT inside the transaction (mirrors `closeRegistrationHandler` in `src/lib/server/jobs/handlers/close-registration.ts` lines 36–45). This prevents concurrent double-cancellation.

### Auth Guard — No Changes Needed

`src/hooks.server.ts` line 47 already exempts `/r/**`:
```
pattern: /^\/(?!(?:login|auth|r|skeleton|profile\/complete)(?:\/|$)|$)/
```
The `r` exemption covers `r/[token]/cancel`. No changes to hooks.server.ts.

### Drizzle Transaction Pattern

Model from `registration-service.ts` lines 48–87:
```ts
const result = await db.transaction(async (tx) => {
  const [row] = await tx
    .select(...)
    .from(registrations)
    .where(eq(registrations.cancelTokenHash, hash))
    .limit(1)
    .for('update');
  // ... mutate + audit
  return row;
});
```

The `FOR UPDATE` lock serializes concurrent cancellation attempts for the same token.

### Audit Log

Call `writeAuditLog(tx, { actorId: null, entity: 'registration', action: 'cancel', diff: { ... } })` inside the transaction. `actorId: null` because unauthenticated external registrant (mirrors Story 5.2 pattern in `registration-service.ts` line 75–84).

Import `writeAuditLog` from `$lib/server/services/audit.js` (this is a SvelteKit route file, not a worker — `$lib` alias is valid here).

### i18n Pattern

- All UI strings via `import * as m from '$lib/paraglide/messages.js'` then `m.reg_cancel_page_title()` etc.
- English values in `messages/en.json`; `""` in `messages/th.json`
- No Thai text anywhere in code — Rawinan handles translation

### seedRegistrant Helper — Known Token for Tests

The existing `seedRegistrant` (line 554 of `tests/integration/registrations.test.ts`) generates a **random** cancel token hash. For Story 5.4 tests you need to seed with a **known** plaintext so you can compute the hash and drive the cancel service. Pattern:

```ts
const cancelTokenPlain = randomBytes(32).toString('hex');
const cancelTokenHash = createHash('sha256').update(cancelTokenPlain).digest('hex');
// INSERT directly with known hash:
await client.query(
  `INSERT INTO registrations (..., cancel_token_hash, status, ...) VALUES (..., $1, 'registered', ...)`,
  [cancelTokenHash]
);
// Then call cancelRegistration(cancelTokenPlain) and assert
```

Do not extend `seedRegistrant` to accept a known token — just do the direct INSERT in the test.

### Rate Limiting

Architecture mentions rate-limiting public endpoints (IP + token scoped). This is aspirational and **not required for Story 5.4** — no test gates it. Defer to a future story.

### File List (New / Modified)

| File | Status |
|------|--------|
| `src/lib/server/db/queries/registrations.ts` | MODIFY — add `cancelRegistrantByCancelToken` |
| `src/lib/server/services/registration-service.ts` | MODIFY — add `cancelRegistration` |
| `src/routes/r/[token]/cancel/+page.server.ts` | NEW |
| `src/routes/r/[token]/cancel/+page.svelte` | NEW |
| `messages/en.json` | MODIFY — add 8 `reg_cancel_*` keys |
| `messages/th.json` | MODIFY — add 8 `reg_cancel_*` keys with `""` values |
| `tests/integration/registrations.test.ts` | MODIFY — append Story 5.4 describe block |
| `tests/e2e/registrations.spec.ts` | MODIFY — append Story 5.4 test.describe block |

### Project Structure Notes

- Route is under `src/routes/r/[token]/cancel/` — consistent with architecture's public route tree (`r/[token]/**`)
- Query file uses `DrizzleTransaction` type from `../index.js` (already imported in registrations.ts line 3)
- Service file imports: `createHash` from `node:crypto`, `db` from `$lib/server/db/index.js`, new query from `$lib/server/db/queries/registrations.js`
- Page uses `import * as m from '$lib/paraglide/messages.js'` (standard pattern, see all other pages)

### References

- Cancel URL contract: `_bmad-output/implementation-artifacts/5-3-confirmation-email-with-self-cancel-link.md`
- Schema (cancel_token_hash, status columns): `src/lib/server/db/schema/registrations.ts` lines 20–21
- `createRegistration` (token generation pattern): `src/lib/server/services/registration-service.ts` lines 45–46
- `FOR UPDATE` lock pattern: `src/lib/server/jobs/handlers/close-registration.ts` lines 36–45
- Auth guard exemption: `src/hooks.server.ts` line 47
- Test design IDs: `_bmad-output/test-artifacts/test-design/test-design-epic-5.md` (5.4-INT-001, 5.4-INT-002, 5.4-INT-003, 5.4-E2E-001)
- AR-05 (opaque CSPRNG, stored hashed, single-use): architecture.md security section
- R-002 risk (cancel token replay, score=6): architecture.md risks section — Story 5.4 MITIGATES this

## ATDD Test Stubs

### Integration Tests — append to `tests/integration/registrations.test.ts`

```ts
// ---------------------------------------------------------------------------
// Story 5.4 — Self-Cancel a Registration
// ---------------------------------------------------------------------------

describe('Story 5.4 — Single-Use Cancel Token (AC-2, R-002 MITIGATE)', () => {
	test('[P0] 5.4-INT-001 — valid token cancels registration; second use returns already-used', async () => {
		// THIS TEST WILL FAIL until cancelRegistration is implemented (Tasks 1 + 2).
		//
		// AC-2 (R-002 MITIGATE): The cancel token is single-use. After a successful cancel,
		//   cancel_token_hash is NULL and status = 'cancelled'.
		//   A second call with the same token returns { cancelled: false } — no crash.
		//
		// Strategy:
		//   1. Seed booking + registration with a KNOWN cancelTokenPlain
		//   2. Call cancelRegistration(cancelTokenPlain) — assert { cancelled: true }
		//   3. Assert DB: status='cancelled', cancel_token_hash IS NULL
		//   4. Call cancelRegistration(cancelTokenPlain) again — assert { cancelled: false }

		const { cancelRegistration } =
			await import('../../src/lib/server/services/registration-service.js');

		const cancelTokenPlain = randomBytes(32).toString('hex');
		const cancelTokenHash = createHash('sha256').update(cancelTokenPlain).digest('hex');
		const regSlug = `5-4-int-001-${randomUUID().replace(/-/g, '')}`;

		const client = await pool.connect();
		let registrationId: string;
		try {
			const organizerId = await seedUser(client, 'int-5-4-001');
			await seedUserProfile(client, organizerId, { firstName: 'Cancel', lastName: 'Test' });
			const roomId = await seedRoom(client, 'int-5-4-001');
			const bookingId = await seedBookingWithToken(client, {
				organizerId,
				roomId,
				eventName: 'ATDD Cancel Test 5.4-INT-001',
				token: regSlug,
				registrationEnabled: true
			});
			// Seed registration with KNOWN cancel token hash
			registrationId = uuidv7();
			await client.query(
				`INSERT INTO registrations (id, booking_id, title, first_name, last_name, organization, email, cancel_token_hash, status, created_at, updated_at)
         VALUES ($1, $2, 'Mr', 'Test', 'Cancel', 'Test Org', $3, $4, 'registered', NOW(), NOW())`,
				[registrationId, bookingId, `cancel-5-4-001-${registrationId}@example.com`, cancelTokenHash]
			);
		} finally {
			client.release();
		}

		// First cancel — must succeed
		const result1 = await cancelRegistration(cancelTokenPlain);
		expect(result1.cancelled, '5.4-INT-001: first cancel must return { cancelled: true }').toBe(true);

		// Verify DB state
		const client2 = await pool.connect();
		try {
			const row = await client2.query<{ status: string; cancel_token_hash: string | null }>(
				`SELECT status, cancel_token_hash FROM registrations WHERE id = $1`,
				[registrationId]
			);
			expect(row.rows[0]?.status, '5.4-INT-001: status must be cancelled').toBe('cancelled');
			expect(
				row.rows[0]?.cancel_token_hash,
				'5.4-INT-001: cancel_token_hash must be NULL after single use'
			).toBeNull();
		} finally {
			client2.release();
		}

		// Second cancel with same token — must NOT crash, must return cancelled: false
		const result2 = await cancelRegistration(cancelTokenPlain);
		expect(
			result2.cancelled,
			'5.4-INT-001: second use of same token must return { cancelled: false }'
		).toBe(false);
	});
});

describe('Story 5.4 — IDOR: Forged Token Cannot Cancel Another Registration (AC-3, R-002)', () => {
	test('[P0] 5.4-INT-002 — forged/random token cannot cancel a valid registration', async () => {
		// THIS TEST WILL FAIL until cancelRegistration is implemented (Tasks 1 + 2).
		//
		// AC-3 (R-002 IDOR): A random/forged token must not be able to cancel
		//   any existing registration. Token lookup is by hash only.
		//
		// Strategy:
		//   1. Seed a booking + registration with a known token
		//   2. Generate a DIFFERENT random forgedToken
		//   3. Call cancelRegistration(forgedToken) — assert { cancelled: false }
		//   4. Assert DB: original registration still has status='registered'

		const { cancelRegistration } =
			await import('../../src/lib/server/services/registration-service.js');

		const realTokenPlain = randomBytes(32).toString('hex');
		const realTokenHash = createHash('sha256').update(realTokenPlain).digest('hex');
		const forgedTokenPlain = randomBytes(32).toString('hex'); // different token
		const regSlug = `5-4-int-002-${randomUUID().replace(/-/g, '')}`;

		const client = await pool.connect();
		let registrationId: string;
		try {
			const organizerId = await seedUser(client, 'int-5-4-002');
			await seedUserProfile(client, organizerId, { firstName: 'IDOR', lastName: 'Test' });
			const roomId = await seedRoom(client, 'int-5-4-002');
			const bookingId = await seedBookingWithToken(client, {
				organizerId,
				roomId,
				eventName: 'ATDD IDOR Test 5.4-INT-002',
				token: regSlug,
				registrationEnabled: true
			});
			registrationId = uuidv7();
			await client.query(
				`INSERT INTO registrations (id, booking_id, title, first_name, last_name, organization, email, cancel_token_hash, status, created_at, updated_at)
         VALUES ($1, $2, 'Ms', 'IDOR', 'Victim', 'Test Org', $3, $4, 'registered', NOW(), NOW())`,
				[registrationId, bookingId, `idor-5-4-002-${registrationId}@example.com`, realTokenHash]
			);
		} finally {
			client.release();
		}

		// Forged token must not cancel the real registration
		const result = await cancelRegistration(forgedTokenPlain);
		expect(result.cancelled, '5.4-INT-002: forged token must return { cancelled: false }').toBe(false);

		// Original registration must remain registered
		const client2 = await pool.connect();
		try {
			const row = await client2.query<{ status: string }>(
				`SELECT status FROM registrations WHERE id = $1`,
				[registrationId]
			);
			expect(
				row.rows[0]?.status,
				'5.4-INT-002: original registration must remain registered after forged token attempt'
			).toBe('registered');
		} finally {
			client2.release();
		}
	});
});

describe('Story 5.4 — cancel_token_hash IS NULL Post-Cancel (AC-2, AR-05)', () => {
	test.skip('[P2] 5.4-INT-003 — cancel_token_hash IS NULL and status=cancelled after successful cancel', async () => {
		// Activation condition: Tasks 1 + 2 complete (cancelRegistration implemented).
		//
		// AR-05: After a successful cancellation, cancel_token_hash must be NULL
		//   (prevents token reuse even if the service layer is bypassed).
		//   This test is redundant with the DB assertion in 5.4-INT-001 but
		//   explicitly documents the AR-05 contract.
		//
		// Strategy: mirrors 5.4-INT-001 DB assertion steps only.
		// Implement once 5.4-INT-001 is green and promote to P1 if needed.
		throw new Error('5.4-INT-003: not yet implemented — activate after 5.4-INT-001 is green');
	});
});
```

### E2E Test Stub — append to `tests/e2e/registrations.spec.ts`

```ts
// ---------------------------------------------------------------------------
// Story 5.4 — Self-Cancel a Registration (E2E)
// ---------------------------------------------------------------------------

test.describe('Story 5.4 — Self-Cancel Registration via Browser (AC-1, FR-044)', () => {
	test.skip('[P1] 5.4-E2E-001 — visiting cancel link shows confirm page; clicking confirm cancels and shows success', async ({
		page
	}) => {
		// Activation condition: Tasks 1–4 complete (route + service + i18n all done).
		//
		// AC-1 (FR-044): External registrant visits the cancel link from their email.
		//   They see a confirmation prompt (not an immediate cancel on GET).
		//   Clicking "Yes, cancel my registration" POSTs and shows a success message.
		//   No login required.
		//
		// Strategy:
		//   1. Seed a booking + registration with a known cancelTokenPlain via SQL
		//   2. Navigate to /r/{eventToken}/cancel?token={cancelTokenPlain}
		//   3. Assert: confirm prompt is visible (NOT already-cancelled message)
		//   4. Click the "Yes, cancel my registration" submit button
		//   5. Assert: success message visible (reg_cancel_success_title)
		//   6. Assert: no redirect to /login (unauthenticated flow)
		//
		// Note: Use the page's PUBLIC cancel route — no authentication needed.
		// Seed data: Insert directly via pg client or use a test fixture.

		// Placeholder — implement when Tasks 1–4 are complete.
		throw new Error('5.4-E2E-001: not yet implemented — activate after Tasks 1–4 complete');
	});
});
```

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (Step 1 story creator — context window: 2026-06-16)

### Debug Log References

### Completion Notes List

- Task 1: Added `cancelRegistrantByCancelToken(tx, cancelTokenPlain)` to `src/lib/server/db/queries/registrations.ts`. Uses sha256 hash lookup with `.for('update')` lock (AR-05). Returns discriminated union `CancelRegistrantResult`. Handles both "not found" (no row) and "already cancelled" (idempotency guard) cases.
- Task 2: Added `cancelRegistration(cancelTokenPlain)` to `src/lib/server/services/registration-service.ts`. Wraps in `db.transaction()`, calls the query function, writes audit log with `actorId: null` on success. Also exported `RegistrationAlreadyCancelledError` for optional route use.
- Task 3: Created `src/routes/r/[token]/cancel/+page.server.ts` (load validates token presence → error(400) if missing; actions.default POSTs to service) and `+page.svelte` (confirm → success/error states, `role="alert"`, plain form action, no superForm). Auth exemption via existing `/r/**` pattern in hooks.server.ts — no changes needed.
- Task 4: Added 8 `reg_cancel_*` keys to `messages/en.json` and `messages/th.json` (empty strings for Thai — Rawinan handles translation).
- Tasks 5 & 6: ATDD stubs were pre-existing from the ATDD phase. P0 tests `5.4-INT-001` and `5.4-INT-002` both PASS with the new implementation. P2 `5.4-INT-003` remains `.skip` as designed. E2E `5.4-E2E-001` remains `.skip` (activation condition: route complete — done).
- All unit tests: 138 passing (same as baseline, 1 pre-existing env.test.ts failure due to missing DATABASE_URL in worktree, unrelated to story).
- Lint: clean (0 errors).
- Prettier: all files formatted, no changes.

### File List

| File | Status |
|------|--------|
| `src/lib/server/db/queries/registrations.ts` | MODIFIED — added `cancelRegistrantByCancelToken`, `CancelRegistrantResult` type, `node:crypto` import |
| `src/lib/server/services/registration-service.ts` | MODIFIED — added `cancelRegistration`, `RegistrationAlreadyCancelledError`, import of `cancelRegistrantByCancelToken` |
| `src/routes/r/[token]/cancel/+page.server.ts` | NEW — load validates token; actions.default cancels via service |
| `src/routes/r/[token]/cancel/+page.svelte` | NEW — confirm/success/error states; `role="alert"`; plain form action |
| `messages/en.json` | MODIFIED — added 8 `reg_cancel_*` keys |
| `messages/th.json` | MODIFIED — added 8 `reg_cancel_*` keys with `""` values |

## Change Log

- 2026-06-16: Story 5.4 implementation complete — `cancelRegistrantByCancelToken` query, `cancelRegistration` service, cancel route (GET confirm + POST action), 8 i18n keys. P0 tests 5.4-INT-001 and 5.4-INT-002 pass. Status → review.
