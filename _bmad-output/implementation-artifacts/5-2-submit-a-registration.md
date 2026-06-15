---
baseline_commit: 157943a59d467107455cc7b901d7fe3d176dfbee
---

# Story 5.2: Submit a Registration

**Status:** `review`
**Epic:** 5 — External Registration & Headcount
**GH Issue:** #30
**Previous Story:** 5.1 — Branded Public Registration Page
**Next Story:** 5.3 — Confirmation Email with Self-Cancel Link

## Story

As an external attendee,
I want to fill and submit the registration form,
So that I am registered for the event.

## Acceptance Criteria

1. **Registration form fields rendered (AC-1)**: When `registrationEnabled = true`, the `/r/[token]` page renders a registration form with: salutation title (Mr / Mrs / Ms / Other), free-text field when "Other" is selected, first name, last name, organization, and email address. All fields are required except `titleOtherText` (which becomes required only when title = "Other").

2. **Meal type shown when catering enabled (AC-2)**: When `cateringEnabled = true`, a meal type selector (Normal / Vegetarian / Muslim / Other) and a free-text "Other" field (required when meal = "Other") appear on the form. When `cateringEnabled = false`, the meal selector is not rendered; no meal field is submitted.

3. **Registrant record created on submit (AC-3)**: A valid form submission creates a row in the `registrations` table (`bookingId`, `title`, `titleOtherText`, `firstName`, `lastName`, `organization`, `email`, `mealType`, `mealTypeOtherText`, `cancelTokenHash`, `status='registered'`). An audit log entry is written inside the same transaction (`entity='registration'`, `action='create'`, `actorId=null` — unauthenticated).

4. **On-screen confirmation (AC-4)**: After successful submission the page shows a success confirmation message (no redirect). The form is no longer visible.

5. **Mobile-responsive in ≤ 2 minutes (AC-5 / NFR-004)**: The form is fully usable at 375 × 667px (no horizontal scroll) and 1280 × 800px without any degradation. An external attendee can complete registration in under 2 minutes.

6. **Server-side closed guard (AC-6 / R-005 MITIGATE)**: The `register` form action checks `registrationEnabled` before inserting any record. If `registrationEnabled = false`, the action returns 400 (fail). This guard is enforced even when the UI correctly hides the form, because direct POST bypass is a tested attack vector (`5.2-INT-CLOSED-001`).

7. **All UI strings via Paraglide (AC-7)**: English values in `messages/en.json`; empty `""` in `messages/th.json`. No Thai text in code or mocks.

## Tasks / Subtasks

- [x] Task 1: Create `registrations` Drizzle schema and migration (AC: 3)
  - [x] 1.1: Create `src/lib/server/db/schema/registrations.ts` — see Schema Spec in Dev Notes
  - [x] 1.2: Add `export * from './registrations.js';` to `src/lib/server/db/schema/index.ts` **first**, then run `bunx drizzle-kit generate` — this produces `drizzle/0010_registrations.sql`, the journal entry in `drizzle/meta/_journal.json`, and the snapshot in `drizzle/meta/`. Do NOT hand-write the SQL file. (See Migration Spec in Dev Notes for expected SQL output to verify.)
  - [x] 1.3: Verify the generated `drizzle/0010_registrations.sql` contains the FK constraint `REFERENCES bookings(id) ON DELETE CASCADE` and both indexes. If `drizzle-kit generate` omits the indexes, add them manually inside the generated file before committing.
  - [x] 1.4: Add `'registrations'` to `TRUNCATABLE_TABLES` in `tests/support/fixtures/pg-factory.ts` — **before** `'bookings'` (FK child before parent)
  - [x] 1.5: Add schema assertion to `tests/integration/db-schema.test.ts` — assert all columns exist in `registrations` table

- [x] Task 2: Create Valibot RegistrationSchema (AC: 1, 2)
  - [x] 2.1: Create `src/lib/schemas/registration.ts` — see Schema Spec in Dev Notes
  - [x] 2.2: Conditional meal type: `mealType` required when `cateringEnabled=true`, absent when `false`; uses `v.forward` with `v.literal('')` pattern (see `src/lib/schemas/booking.ts` for established pattern)
  - [x] 2.3: Conditional title other text: `titleOtherText` required when `title='Other'`; uses same cross-field pattern

- [x] Task 3: Create `createRegistrant` query and `createRegistration` service (AC: 3, 6)
  - [x] 3.1: Create `src/lib/server/db/queries/registrations.ts` — `createRegistrant(tx, data)` — inserts into `registrations` table inside a transaction
  - [x] 3.2: Create `src/lib/server/services/registration-service.ts` — `createRegistration(bookingId, input)` — wraps everything in `db.transaction()`: re-query `getBookingByRegistrationToken` (or `getBookingById`) inside the txn and throw `RegistrationClosedError` if `!registrationEnabled`; then generate 32-byte CSPRNG cancel token, compute sha256 hash, call `createRegistrant(tx, ...)`, call `writeAuditLog(tx, ...)`, return plain token (for Story 5.3). See Service Spec in Dev Notes.
  - [x] 3.3: Cancel token: `crypto.randomBytes(32)` → hex plaintext (never stored); `sha256(plaintext)` → stored as `cancelTokenHash` (AR-05)
  - [x] 3.4: `actorId: null` in audit log (unauthenticated external registrant)
  - [x] 3.5: Export `RegistrationClosedError` (custom error class) from `registration-service.ts` — used by the route action to map to `fail(400)`

- [x] Task 4: Add `register` form action to `src/routes/r/[token]/+page.server.ts` (AC: 3, 4, 6)
  - [x] 4.1: Add `export const actions: Actions = { register: async (event) => { ... } }` — see Action Spec in Dev Notes
  - [x] 4.2: Load `cateringEnabled` in the existing `load` function and return it to the page (it is already available on `RegistrationPageRow` from `getBookingByRegistrationToken`). Do NOT return `bookingId` to the page — it is an internal key.
  - [x] 4.3: In the `register` action: call `superValidate` first (body stream), then `getBookingByRegistrationToken` → 404 if missing; then validate form; then call `createRegistration`. Catch `RegistrationClosedError` → `fail(400, { form })`. See Action Spec.
  - [x] 4.4: Validate with `superValidate(event.request, valibot(RegistrationSchema))`; `if (!form.valid) return fail(422, { form })`
  - [x] 4.5: Call `createRegistration(booking.id, form.data)` → on success, return `{ form, success: true }`
  - [x] 4.6: Also initialize the superform in `load` so the Svelte page has a `form` prop: `const form = await superValidate(valibot(RegistrationSchema))`

- [x] Task 5: Update `src/routes/r/[token]/+page.svelte` — add form fields (AC: 1, 2, 4, 5, 7)
  - [x] 5.1: Import `enhance` from `$app/forms` and `superForm` from `sveltekit-superforms`; wire form to `data.form`
  - [x] 5.2: Replace the `<!-- Registration form placeholder: Story 5.2 will add form fields here -->` comment with the actual form (see UI Spec in Dev Notes)
  - [x] 5.3: Salutation title `<select>` (Mr / Mrs / Ms / Other); show free-text `<input>` for "Other" only when title = "Other" (use `$derived` rune or reactive `$form.title === 'Other'`)
  - [x] 5.4: Required text inputs: firstName, lastName, organization, email
  - [x] 5.5: Conditional meal type selector (rendered only when `data.cateringEnabled`): Normal / Vegetarian / Muslim / Other; show free-text for Other
  - [x] 5.6: On `data.success === true`, hide form and show confirmation message (Paraglide key `reg_form_success_title`, `reg_form_success_message`)
  - [x] 5.7: Svelte 5 runes — use `$derived`, `$state` (via superForm), and `$props()` patterns only; no Svelte 4 reactive declarations

- [x] Task 6: Add Paraglide message keys (AC: 7)
  - [x] 6.1: Add all new `reg_form_*` keys to `messages/en.json` (English values) — see i18n Keys section in Dev Notes
  - [x] 6.2: Add same keys to `messages/th.json` with empty string `""` — no Thai text in code; Rawinan handles translation
  - [x] 6.3: Run `bun run paraglide:build` if `messages.js` needs refresh after adding keys

- [x] Task 7: ATDD — add integration test stubs (AC: 3, 6)
  - [x] 7.1: Append to `tests/integration/registrations.test.ts` — P0 tests must be activated (no `.skip`); P1 tests start as `test.skip`
  - [x] 7.2: Add seed helper `seedRegistrant(client, opts)` to the test file — see Test Spec in Dev Notes
  - [x] 7.3: P0 tests (ACTIVATE — no `.skip`):
    - `5.2-INT-001`: Valid form creates registrant row in DB (assert all columns)
    - `5.2-INT-CLOSED-001`: Direct POST when `registrationEnabled=false` returns 400 — MANDATORY R-005 MITIGATE gate test
  - [x] 7.4: P1 tests (`test.skip`):
    - `5.2-INT-002`: `title='Other'` → `title_other_text` stored and retrieved correctly
    - `5.2-INT-003`: Meal type required when catering enabled; absent when disabled
    - `5.2-INT-004`: `mealType='Other'` → `meal_other_text` stored correctly
    - `5.2-INT-005`: 100th registration succeeds — no capacity cap (R-012)

- [x] Task 8: ATDD — add E2E test stubs (AC: 1, 2, 4, 5)
  - [x] 8.1: Append to `tests/e2e/registrations.spec.ts` — all E2E stubs are `test.skip`
  - [x] 8.2: P1 stubs (all `test.skip`):
    - `5.2-E2E-001`: Full registration form submit (desktop) — confirmation shown [P1]
    - `5.2-E2E-MOBILE-001`: Form fully usable at 375 × 667px — no horizontal scroll [P1] (NFR-004)
    - `5.2-E2E-MOBILE-002`: Form fully usable at 1280 × 800px (desktop parity) [P1] (NFR-004)
  - [x] 8.3: P2 stubs (all `test.skip`):
    - `5.2-E2E-003`: Form validation — missing required fields shows inline error [P2]
    - `5.2-E2E-004`: Loading state — submit button disabled during submission [P2]
  - [x] 8.4: P3 stubs (all `test.skip`):
    - `5.2-E2E-005`: Registration completes in ≤ 2 minutes end-to-end [P3]
    - `5.2-LOAD-001`: k6 50 concurrent registrations complete without error [P3]

## Dev Notes

### Scope Boundaries — Critical

**DO implement:**
- `registrations` Drizzle schema (`src/lib/server/db/schema/registrations.ts`) + migration `drizzle/0010_registrations.sql`
- `src/lib/schemas/registration.ts` — Valibot RegistrationSchema
- `src/lib/server/db/queries/registrations.ts` — `createRegistrant(tx, data)` query
- `src/lib/server/services/registration-service.ts` — `createRegistration(bookingId, input)` service
- `register` form action in `src/routes/r/[token]/+page.server.ts`
- Form fields + success state in `src/routes/r/[token]/+page.svelte`
- Paraglide `reg_form_*` i18n keys (English + empty Thai)
- `cancelTokenHash` column (sha256 of 32-byte CSPRNG) — required for Story 5.3 email to include cancel link
- Audit log entry for every registration creation
- ATDD test stubs in `tests/integration/registrations.test.ts` and `tests/e2e/registrations.spec.ts`

**DO NOT implement (scoped to later stories):**
- Confirmation email with cancel link — Story 5.3 (Story 5.2 returns the plaintext cancel token from `createRegistration` but does NOT enqueue email or expose the token on the page)
- Self-cancel flow — Story 5.4
- Resend flow — Story 5.5
- Auto-close date logic (`registrationClosesAt` evaluation) — Story 5.6
- Catering aggregation — Story 5.7
- Registrant list — Story 5.8
- No capacity cap: do NOT add any `COUNT(registrations)` guard (R-012 explicitly forbids this)

**Closed-state check is ONLY `registrationEnabled === false`**: do NOT evaluate `registrationClosesAt` date — that is Story 5.6 scope.

### Schema Spec for `registrations` table

**File:** `src/lib/server/db/schema/registrations.ts`

```ts
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';

export const registrations = pgTable('registrations', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  bookingId: text('booking_id').notNull(),     // FK → bookings.id (enforced in SQL migration)
  title: text('title').notNull(),               // 'Mr' | 'Mrs' | 'Ms' | 'Other'
  titleOtherText: text('title_other_text'),     // nullable; required when title='Other'
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  organization: text('organization').notNull(),
  email: text('email').notNull(),
  mealType: text('meal_type'),                  // nullable when cateringEnabled=false
  mealTypeOtherText: text('meal_type_other_text'), // nullable; required when mealType='Other'
  cancelTokenHash: text('cancel_token_hash'),   // nullable — Story 5.4 sets to NULL after single use (AR-05); populated on insert
  status: text('status').notNull().default('registered'), // 'registered' | 'cancelled'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export type Registration = typeof registrations.$inferSelect;
export type RegistrationInsert = typeof registrations.$inferInsert;
```

**Column naming convention:** snake_case DB column names → camelCase Drizzle field names (same as `bookings.ts`). The `user_profiles` table is the only exception with camelCase column names in the DB.

### Migration Spec for `drizzle/0010_registrations.sql` (generated output reference)

Do NOT hand-write this file. Run `bunx drizzle-kit generate` after completing Task 1.1 and 1.2 (schema file + schema index export). The generator produces the `.sql` file, the journal entry, and the snapshot automatically.

The expected SQL content (for verification after generation) should look like this — confirm your generated output matches:

```sql
-- Migration 0010: registrations table — Story 5.2
-- Creates the registrations table linked to bookings.

CREATE TABLE IF NOT EXISTS "registrations" (
  "id" text PRIMARY KEY NOT NULL,
  "booking_id" text NOT NULL,
  "title" text NOT NULL,
  "title_other_text" text,
  "first_name" text NOT NULL,
  "last_name" text NOT NULL,
  "organization" text NOT NULL,
  "email" text NOT NULL,
  "meal_type" text,
  "meal_type_other_text" text,
  "cancel_token_hash" text,
  "status" text DEFAULT 'registered' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_booking_id_bookings_id_fk"
  FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
```

After verifying, also confirm that `drizzle/meta/_journal.json` now contains an entry with `"idx": 10` and the tag for this migration.

**Note on indexes:** Drizzle-kit does not generate indexes for non-unique columns by default. After generation, manually add the following index DDL to the generated file (before or after the FK constraint):

```sql
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_registrations_booking_id" ON "registrations" ("booking_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_registrations_cancel_token_hash" ON "registrations" ("cancel_token_hash");
```

### RegistrationSchema Spec (`src/lib/schemas/registration.ts`)

```ts
import * as v from 'valibot';

// title and mealType option constants (for both schema and form)
export const TITLE_OPTIONS = ['Mr', 'Mrs', 'Ms', 'Other'] as const;
export const MEAL_OPTIONS = ['Normal', 'Vegetarian', 'Muslim', 'Other'] as const;

export const RegistrationSchema = v.pipe(
  v.object({
    title: v.pipe(v.string(), v.minLength(1, 'Title is required.')),
    // titleOtherText: accept '' when title != 'Other'; cross-field check enforces required when title='Other'
    titleOtherText: v.optional(v.string()),
    firstName: v.pipe(v.string(), v.trim(), v.minLength(1, 'First name is required.')),
    lastName: v.pipe(v.string(), v.trim(), v.minLength(1, 'Last name is required.')),
    organization: v.pipe(v.string(), v.trim(), v.minLength(1, 'Organization is required.')),
    email: v.pipe(v.string(), v.email('A valid email address is required.')),
    // cateringEnabled is a hidden field so the server action knows whether to validate mealType.
    // It is re-checked against the DB record inside the action — this is defence-in-depth only.
    cateringEnabled: v.boolean(),
    // mealType: accept '' (empty string from hidden/unfilled select) as absent value,
    // same as BookingSchema's registrationClosesAt pattern.
    mealType: v.optional(
      v.union([v.literal(''), v.pipe(v.string(), v.minLength(1))])
    ),
    mealTypeOtherText: v.optional(v.string()),
  }),
  // Cross-field: titleOtherText required when title = 'Other'
  v.forward(
    v.check(
      (d) => d.title !== 'Other' || (!!d.titleOtherText && d.titleOtherText.trim().length > 0),
      'Please specify your title.'
    ),
    ['titleOtherText']
  ),
  // Cross-field: mealType required when cateringEnabled = true
  v.forward(
    v.check(
      (d) => !d.cateringEnabled || (!!d.mealType && d.mealType !== ''),
      'Meal preference is required.'
    ),
    ['mealType']
  ),
  // Cross-field: mealTypeOtherText required when mealType = 'Other'
  v.forward(
    v.check(
      (d) => d.mealType !== 'Other' || (!!d.mealTypeOtherText && d.mealTypeOtherText.trim().length > 0),
      'Please specify your meal preference.'
    ),
    ['mealTypeOtherText']
  )
);

export type RegistrationInput = v.InferOutput<typeof RegistrationSchema>;
```

**Critical:** The `v.literal('')` pattern for optional selects/inputs is the established codebase convention from `src/lib/schemas/booking.ts:44–49`. Always use it for conditional fields — without it, a hidden field submitting an empty string fails the cross-field check and causes a spurious validation error.

### Cancel Token Security (AR-05)

From ADR 4.5: `registration_token` is plaintext (public). The `cancel_token_hash` column is hashed per AR-05.

```ts
import { createHash, randomBytes } from 'node:crypto';

// Generate 32-byte CSPRNG cancel token (256-bit entropy)
const cancelTokenPlain = randomBytes(32).toString('hex'); // 64-char hex
const cancelTokenHash = createHash('sha256').update(cancelTokenPlain).digest('hex');

// cancelTokenPlain → passed to Story 5.3 email service (NOT stored, NOT returned to page)
// cancelTokenHash → stored in registrations.cancel_token_hash
```

**Rule:** `cancelTokenHash` is stored; `cancelTokenPlain` is returned from `createRegistration()` for Story 5.3 to include in the confirmation email. The plain token is NEVER stored, NEVER returned to the browser. Story 5.4 will handle single-use enforcement.

### `createRegistration` Service Spec

**File:** `src/lib/server/services/registration-service.ts`

The R-005 MITIGATE closed-guard lives in the **service**, not only in the route action. This allows the integration test (`5.2-INT-CLOSED-001`) to call the service directly and assert the guard throws — no running HTTP server needed.

```ts
import { createHash, randomBytes } from 'node:crypto';
import { db } from '$lib/server/db/index.js';
import { getBookingByRegistrationToken } from '$lib/server/db/queries/bookings.js';
import { createRegistrant } from '$lib/server/db/queries/registrations.js';
import { writeAuditLog } from '$lib/server/services/audit.js';
import type { RegistrationInput } from '$lib/schemas/registration.js';

/**
 * Thrown by createRegistration when registrationEnabled = false on the booking.
 * The route action catches this and returns fail(400, { form }).
 * The integration test (5.2-INT-CLOSED-001) asserts this is thrown.
 */
export class RegistrationClosedError extends Error {
  constructor() {
    super('Registration is closed for this event.');
    this.name = 'RegistrationClosedError';
  }
}

/**
 * Result of a successful registration.
 * cancelToken is the PLAINTEXT 64-char hex — pass to confirmation email service (Story 5.3).
 * Never store or return cancelToken to the browser.
 */
export type CreateRegistrationResult = {
  registrationId: string;
  cancelToken: string; // plaintext — for Story 5.3 email only
};

/**
 * Creates a registration record inside a db.transaction().
 * Re-checks registrationEnabled from the booking before inserting (R-005 MITIGATE).
 * Also writes an audit log entry.
 *
 * @param bookingId - The booking's primary key (from getBookingByRegistrationToken in the action)
 * @param input - Validated RegistrationInput from superforms + valibot
 * @returns registrationId and plaintext cancelToken (for Story 5.3 email)
 * @throws RegistrationClosedError if booking.registrationEnabled = false
 */
export async function createRegistration(
  bookingId: string,
  input: RegistrationInput
): Promise<CreateRegistrationResult> {
  const cancelTokenPlain = randomBytes(32).toString('hex');
  const cancelTokenHash = createHash('sha256').update(cancelTokenPlain).digest('hex');

  const result = await db.transaction(async (tx) => {
    // R-005 MITIGATE: re-read registrationEnabled inside the transaction (TOCTOU-safe)
    // Use the existing getBookingByRegistrationToken or a direct query by bookingId.
    // If the booking is closed, throw so no row is inserted.
    // (The action also checks before calling this, but the service guard is the canonical one.)
    //
    // Implementation note: if getBookingByRegistrationToken requires the public token
    // (not bookingId), use a separate getBookingById query, or pass the token as a parameter.
    // Either approach is acceptable — what matters is the guard fires inside the transaction.

    const registration = await createRegistrant(tx, {
      bookingId,
      title: input.title,
      titleOtherText: input.titleOtherText ?? null,
      firstName: input.firstName,
      lastName: input.lastName,
      organization: input.organization,
      email: input.email,
      mealType: input.mealType && input.mealType !== '' ? input.mealType : null,
      mealTypeOtherText: input.mealTypeOtherText ?? null,
      cancelTokenHash,
      status: 'registered'
    });

    await writeAuditLog(tx, {
      actorId: null, // unauthenticated external registrant
      entity: 'registration',
      action: 'create',
      diff: {
        registrationId: registration.id,
        bookingId,
        title: input.title
      }
    });

    return registration;
  });

  return {
    registrationId: result.id,
    cancelToken: cancelTokenPlain
  };
}
```

**Implementation note on the guard query inside the transaction:** The service receives `bookingId` (PK), not the public token. Add a `getBookingById(tx, id)` helper in `src/lib/server/db/queries/bookings.ts` that accepts a Drizzle transaction (same pattern as `createRegistrant` accepts `tx`), returns the booking row (or null), and is called inside the transaction body. If `!booking || !booking.registrationEnabled`, throw `RegistrationClosedError`.
```

### `register` Action Spec (`+page.server.ts`)

The existing `load` function must be extended to also return `cateringEnabled` and a superform `form` prop. Do NOT return `bookingId` to the page (internal key, not needed by the UI).

The action does NOT implement the closed-guard itself — that guard lives in `createRegistration` (service layer, throws `RegistrationClosedError`). The action catches `RegistrationClosedError` and maps it to `fail(400, { form })`.

Body-stream ordering: always call `superValidate(event.request, ...)` first to consume the body, then query the DB. This avoids an unconsumed-body error if an early check exits.

```ts
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { RegistrationSchema } from '$lib/schemas/registration.js';
import { createRegistration, RegistrationClosedError } from '$lib/server/services/registration-service.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ params }) => {
  const booking = await getBookingByRegistrationToken(params.token);
  if (!booking) { error(404, 'Event not found'); }

  const form = await superValidate(valibot(RegistrationSchema));

  // ... existing date/time parsing ...

  return {
    // ... existing fields ...
    cateringEnabled: booking.cateringEnabled, // NEW — needed for conditional meal type field
    form                                       // NEW — superform initial state
  };
};

export const actions: Actions = {
  register: async (event) => {
    // Parse form first (consumes body stream)
    const form = await superValidate(event.request, valibot(RegistrationSchema));

    // Fetch booking — 404 if token invalid
    const booking = await getBookingByRegistrationToken(event.params.token);
    if (!booking) { error(404, 'Event not found'); }

    if (!form.valid) {
      return fail(422, { form });
    }

    try {
      await createRegistration(booking.id, form.data);
    } catch (err) {
      if (err instanceof RegistrationClosedError) {
        // R-005 MITIGATE: registration closed — guard enforced in service layer
        return fail(400, { form });
      }
      throw err;
    }

    // Story 5.3 will receive cancelToken from the service and enqueue confirmation email.
    // For Story 5.2 scope: return success flag only.
    return { form, success: true };
  }
};
```

### Svelte Page Spec (`+page.svelte`)

The file currently (Story 5.1) ends with:
```svelte
<!-- Registration form placeholder: Story 5.2 will add form fields here -->
<!-- DO NOT add form fields in Story 5.1 scope -->
```

Replace that comment block with the registration form. Use Svelte 5 runes and superForm:

```svelte
<script lang="ts">
  import { superForm } from 'sveltekit-superforms';
  import * as m from '$lib/paraglide/messages.js';
  import type { PageData } from './$types.js';

  const { data }: { data: PageData } = $props();

  const { form, errors, enhance, submitting } = superForm(data.form, {
    dataType: 'form', // standard form submission (not JSON)
  });
</script>
```

Success state (replace form on success — `data.success` is set by the action):
```svelte
{#if data.success}
  <div role="status" aria-live="polite">
    <h3>{m.reg_form_success_title()}</h3>
    <p>{m.reg_form_success_message()}</p>
  </div>
{:else}
  <form method="POST" action="?/register" use:enhance>
    <!-- hidden field for cateringEnabled (server schema validation cross-check) -->
    <input type="hidden" name="cateringEnabled" value={data.cateringEnabled ? 'true' : 'false'} />

    <!-- Title selector -->
    <label for="title">{m.reg_form_title_label()}</label>
    <select id="title" name="title" bind:value={$form.title} required>
      <option value="">{m.reg_form_title_placeholder()}</option>
      <option value="Mr">{m.reg_form_title_mr()}</option>
      <option value="Mrs">{m.reg_form_title_mrs()}</option>
      <option value="Ms">{m.reg_form_title_ms()}</option>
      <option value="Other">{m.reg_form_title_other()}</option>
    </select>
    {#if $errors.title}<span class="text-destructive">{$errors.title}</span>{/if}

    <!-- Title Other free text (conditional) -->
    {#if $form.title === 'Other'}
      <label for="titleOtherText">{m.reg_form_title_other_label()}</label>
      <input id="titleOtherText" name="titleOtherText" type="text" bind:value={$form.titleOtherText} />
      {#if $errors.titleOtherText}<span class="text-destructive">{$errors.titleOtherText}</span>{/if}
    {/if}

    <!-- First name / Last name / Organization / Email -->
    <!-- ... standard text inputs ... -->

    <!-- Conditional meal type (only when cateringEnabled) -->
    {#if data.cateringEnabled}
      <label for="mealType">{m.reg_form_meal_label()}</label>
      <select id="mealType" name="mealType" bind:value={$form.mealType}>
        <option value="">{m.reg_form_meal_placeholder()}</option>
        <option value="Normal">{m.reg_form_meal_normal()}</option>
        <option value="Vegetarian">{m.reg_form_meal_vegetarian()}</option>
        <option value="Muslim">{m.reg_form_meal_muslim()}</option>
        <option value="Other">{m.reg_form_meal_other()}</option>
      </select>
      {#if $form.mealType === 'Other'}
        <input name="mealTypeOtherText" type="text" bind:value={$form.mealTypeOtherText} />
      {/if}
    {/if}

    <button type="submit" disabled={$submitting}>
      {$submitting ? m.reg_form_submitting_button() : m.reg_form_submit_button()}
    </button>
  </form>
{/if}
```

**Important:** `data.success` is in the action response — for it to be reactive after submission, superform's `enhance` must handle it. Since the action returns `{ form, success: true }` (not a redirect), superForm keeps the form data and you can check the page's `data` or use a `$page.status` check. Pattern: use `onResult` callback in `superForm(...)`:
```ts
const { form, errors, enhance, submitting } = superForm(data.form, {
  onResult({ result }) {
    if (result.type === 'success') {
      successState = true;
    }
  }
});
let successState = $state(false);
```
Then render `{#if successState}` success block instead of the form.

### i18n Keys for Story 5.2

Add to `messages/en.json` (English values) and `messages/th.json` (empty strings `""`):

```json
"reg_form_title_label": "Salutation",
"reg_form_title_placeholder": "Select title",
"reg_form_title_mr": "Mr",
"reg_form_title_mrs": "Mrs",
"reg_form_title_ms": "Ms",
"reg_form_title_other": "Other",
"reg_form_title_other_label": "Please specify",
"reg_form_first_name_label": "First name",
"reg_form_last_name_label": "Last name",
"reg_form_organization_label": "Organization",
"reg_form_email_label": "Email address",
"reg_form_meal_label": "Meal preference",
"reg_form_meal_placeholder": "Select meal preference",
"reg_form_meal_normal": "Normal",
"reg_form_meal_vegetarian": "Vegetarian",
"reg_form_meal_muslim": "Muslim",
"reg_form_meal_other": "Other",
"reg_form_meal_other_label": "Please specify",
"reg_form_submit_button": "Register",
"reg_form_submitting_button": "Registering...",
"reg_form_success_title": "Registration Complete",
"reg_form_success_message": "You have been registered for this event. A confirmation email will be sent shortly."
```

**Total new keys: 22.** Existing `reg_page_*` keys (8 from Story 5.1) remain unchanged.

### Integration Test Spec (`tests/integration/registrations.test.ts`)

**ADD to existing file** — do not replace existing Story 5.1 tests. Append after the last existing test block.

New seed helper:
```ts
/**
 * Seeds a registration record linked to bookingId.
 * Generates a dummy cancel_token_hash for the test row.
 */
async function seedRegistrant(
  client: pg.PoolClient,
  opts: {
    bookingId: string;
    email?: string;
    title?: string;
    mealType?: string | null;
    status?: string;
  }
): Promise<string> {
  const registrationId = uuidv7(); // or randomUUID()
  const cancelTokenHash = createHash('sha256').update(randomBytes(32)).digest('hex');
  await client.query(
    `INSERT INTO registrations (id, booking_id, title, first_name, last_name, organization, email, meal_type, cancel_token_hash, status, created_at, updated_at)
     VALUES ($1, $2, $3, 'Test', 'Registrant', 'Test Org', $4, $5, $6, $7, NOW(), NOW())
     ON CONFLICT (id) DO NOTHING`,
    [
      registrationId,
      opts.bookingId,
      opts.title ?? 'Mr',
      opts.email ?? `registrant-${registrationId}@example.com`,
      opts.mealType ?? null,
      cancelTokenHash,
      opts.status ?? 'registered'
    ]
  );
  return registrationId;
}
```

**5.2-INT-001 (P0 — ACTIVATE):** Valid form creates registrant DB row
```ts
// Strategy:
// 1. Seed user + profile + room + booking (registrationEnabled=true)
// 2. Dynamic import createRegistration
// 3. Call createRegistration(booking.id, validInput)
// 4. Assert registrations row exists with all expected columns
// 5. Assert audit_log row exists with entity='registration', action='create'
```

**5.2-INT-CLOSED-001 (P0 — ACTIVATE):** `createRegistration` throws `RegistrationClosedError` when booking is closed

```ts
// Strategy (service-layer test — no running HTTP server needed):
// 1. Seed user + profile + room + booking with registrationEnabled=false
// 2. Dynamic import createRegistration and RegistrationClosedError from registration-service
// 3. Build a validInput object matching RegistrationInput
// 4. Call createRegistration(booking.id, validInput)
// 5. Assert: throws RegistrationClosedError (instanceof check)
// 6. Assert: no row inserted — query registrations table, expect count=0 for that bookingId
//
// This test exercises the real guard (service layer) that the route action catches.
// The action's catch-and-return-fail(400) is covered by the E2E test (5.2-E2E-001 closed state).
```

### E2E Test Spec (`tests/e2e/registrations.spec.ts`)

**ADD to existing file** — do not replace Story 5.1 E2E tests. Append after the last existing `test.describe` block.

All 5.2 E2E tests use `test.skip`. Include mobile viewport tests per NFR-004:
```ts
// 5.2-E2E-MOBILE-001 viewport setup:
await page.setViewportSize({ width: 375, height: 667 });
// Assert no horizontal scrollbar: page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)

// 5.2-E2E-MOBILE-002 viewport setup:
await page.setViewportSize({ width: 1280, height: 800 });
```

### `pg-factory.ts` TRUNCATABLE_TABLES Update

In `tests/support/fixtures/pg-factory.ts`, add `'registrations'` before `'bookings'`:

```ts
const TRUNCATABLE_TABLES = [
  'sessions',
  'accounts',
  'verifications',
  'user_profiles',
  'users',
  'registrations', // NEW — child of bookings (FK: booking_id → bookings.id)
  'bookings',
  'audit_log'
] as const;
```

**Order matters:** `registrations` must come before `bookings` because `registrations.booking_id` FK references `bookings.id`. Truncating `bookings` first would violate the FK constraint (even with CASCADE, the order ensures correctness if CASCADE is not set on TRUNCATE).

### `db-schema.test.ts` Assertion

Append to `tests/integration/db-schema.test.ts`:

```ts
describe('Story 5.2 — registrations table schema', () => {
  test('[P0] 5.2-SCHEMA-001 — registrations table has all required columns', async () => {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'registrations'
      ORDER BY ordinal_position
    `);
    const columns = result.rows.map((r: { column_name: string }) => r.column_name);
    expect(columns).toContain('id');
    expect(columns).toContain('booking_id');
    expect(columns).toContain('title');
    expect(columns).toContain('title_other_text');
    expect(columns).toContain('first_name');
    expect(columns).toContain('last_name');
    expect(columns).toContain('organization');
    expect(columns).toContain('email');
    expect(columns).toContain('meal_type');
    expect(columns).toContain('meal_type_other_text');
    expect(columns).toContain('cancel_token_hash');
    expect(columns).toContain('status');
    expect(columns).toContain('created_at');
    expect(columns).toContain('updated_at');
  });
});
```

### Existing Patterns to Follow

**Drizzle schema:** `src/lib/server/db/schema/bookings.ts` — `pgTable`, `text`, `timestamp`, `uuidv7()`, `.notNull()`, `.default()`
**Valibot schema:** `src/lib/schemas/booking.ts` — `v.pipe`, `v.object`, `v.check`, `v.forward`, `v.literal('')`, cross-field validation
**Superforms action:** `src/routes/(app)/bookings/new/+page.server.ts` — `superValidate`, `fail(422, { form })`, `setError(form, '', key)`, `redirect(303, url)`
**Audit log:** `src/lib/server/services/audit.ts` — `writeAuditLog(tx, { actorId: null, entity, action, diff })` — called INSIDE `db.transaction()`
**Query pattern:** `src/lib/server/db/queries/bookings.ts` — `getUpcomingBookingsByOrganizer` for `db.select()` pattern; `getBookingByRegistrationToken` for null-on-miss pattern
**uuidv7:** `import { uuidv7 } from 'uuidv7';` in schema; `$defaultFn(() => uuidv7())` for PK
**Superform in page.svelte:** `import { superForm } from 'sveltekit-superforms';` — `const { form, errors, enhance, submitting } = superForm(data.form);`

### Auth Guard — No Changes Needed

The `/r/[token]` route is public and already allow-listed. Do NOT add `requireUser` to the `register` action. The route handles unauthenticated external registrants.

`cancelToken` / `actorId: null` in audit log is the correct pattern for unauthenticated mutations.

### Pre-commit Gate

Before every commit:

```bash
bunx prettier --write . && bun run lint
```

### TRUNCATABLE_TABLES Position Note

The `rooms` table is NOT in `TRUNCATABLE_TABLES` currently (rooms are seeded as test data and not truncated between tests). Registrations FK → bookings (not rooms). No change needed for rooms.

### Security Notes

- `cancelTokenHash` column uses sha256. Bcrypt is NOT used here (sha256 is acceptable for 256-bit random tokens per AR-05 analysis). Story 5.4 will implement single-use enforcement.
- `cateringEnabled` submitted in hidden form field is re-checked against the DB record inside `createRegistration`. The DB value (`booking.cateringEnabled`) takes precedence over the hidden field value for actual meal validation.
- The `register` action must NOT trust the `cateringEnabled` hidden field for the closed-guard check. Always re-query `getBookingByRegistrationToken` in the action.

### References

- Story 5.1 file: `_bmad-output/implementation-artifacts/5-1-branded-public-registration-page.md` — baseline, existing patterns
- Epics file: `_bmad-output/planning-artifacts/epics.md` — Story 5.2 ACs (lines 734–747)
- Test design: `_bmad-output/test-artifacts/test-design/test-design-epic-5.md` — P0/P1/P2/P3 scenarios for 5.2
- ADR 4.5: `_bmad-output/implementation-artifacts/adr-4-5-registration-token-storage.md` — token storage decision
- Bookings schema: `src/lib/server/db/schema/bookings.ts`
- Profiles schema: `src/lib/server/db/schema/profiles.ts`
- Schema index: `src/lib/server/db/schema/index.ts`
- Registration page load: `src/routes/r/[token]/+page.server.ts`
- Registration page Svelte: `src/routes/r/[token]/+page.svelte`
- Booking Valibot schema (pattern): `src/lib/schemas/booking.ts`
- Booking action (pattern): `src/routes/(app)/bookings/new/+page.server.ts`
- Audit service: `src/lib/server/services/audit.ts`
- pg-factory: `tests/support/fixtures/pg-factory.ts`
- Integration tests (existing): `tests/integration/registrations.test.ts`
- E2E tests (existing): `tests/e2e/registrations.spec.ts`
- Architecture: `_bmad-output/planning-artifacts/architecture.md`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- drizzle-kit generate produced a full-schema dump (no intermediate snapshots 0001–0009 in meta/); generated file was replaced with a hand-crafted incremental migration matching the story Migration Spec pattern. Journal tag updated from `0010_gray_luke_cage` to `0010_registrations`.
- `bun run build` fails in unit test environment (DATABASE_URL not set); confirmed pre-existing issue — identical failure on baseline before any story changes.
- `superForm(data.form, ...)` Svelte 5 warning resolved by adding `// svelte-ignore state_referenced_locally` (same pattern as existing booking pages).

### Completion Notes List

- ✅ Task 1: `registrations` table schema + migration `drizzle/0010_registrations.sql` created with FK constraint and two indexes. Schema index updated. TRUNCATABLE_TABLES updated (registrations before bookings). DB schema assertion added.
- ✅ Task 2: Valibot `RegistrationSchema` created in `src/lib/schemas/registration.ts` with all cross-field validation using `v.forward` pattern from booking.ts.
- ✅ Task 3: `createRegistrant(tx, data)` query + `createRegistration(bookingId, input)` service with real R-005 MITIGATE guard (queries booking inside transaction, throws `RegistrationClosedError` if !registrationEnabled). Cancel token: 32-byte CSPRNG plaintext returned, sha256 hash stored. Audit log written inside transaction with actorId=null.
- ✅ Task 4: `+page.server.ts` extended — load returns `cateringEnabled` + initialized superform. `register` action added: consumes body first, fetches booking, validates form, calls createRegistration, catches RegistrationClosedError → fail(400). Returns `{ form, success: true }` on success.
- ✅ Task 5: `+page.svelte` updated — full registration form with title selector, conditional title other, required fields (firstName/lastName/org/email), conditional meal type with other free-text. Success state uses `onResult` + `$state(false)` pattern (not data.success) for reactivity. All UI strings via Paraglide.
- ✅ Task 6: 22 `reg_form_*` keys added to en.json (English) and th.json (empty strings). Paraglide compiled successfully — 22 message module files generated.
- ✅ Task 7: ATDD integration test stubs were pre-existing from atdd-done phase. Confirmed P0 tests (5.2-INT-001, 5.2-INT-CLOSED-001) are activated (no .skip). seedRegistrant helper is present.
- ✅ Task 8: ATDD E2E test stubs were pre-existing from atdd-done phase. All 5.2 E2E tests are test.skip as required.

### File List

**New files:**
- `drizzle/0010_registrations.sql`
- `drizzle/meta/0010_snapshot.json`
- `src/lib/server/db/schema/registrations.ts`
- `src/lib/schemas/registration.ts`
- `src/lib/server/db/queries/registrations.ts`
- `src/lib/server/services/registration-service.ts`
- `src/paraglide/messages/reg_form_*.js` (22 generated message files)

**Updated files:**
- `src/lib/server/db/schema/index.ts` — add `export * from './registrations.js'`
- `drizzle/meta/_journal.json` — add idx:10 entry for 0010_registrations
- `src/routes/r/[token]/+page.server.ts` — extend load (cateringEnabled, form) + add `register` action
- `src/routes/r/[token]/+page.svelte` — replace form placeholder with real form + success state
- `messages/en.json` — add 22 new `reg_form_*` keys
- `messages/th.json` — add 22 new `reg_form_*` keys (empty strings)
- `src/paraglide/messages/_index.js` — regenerated (includes new message keys)
- `src/paraglide/messages.js` — regenerated
- `tests/support/fixtures/pg-factory.ts` — add `'registrations'` to TRUNCATABLE_TABLES (before bookings)
- `tests/integration/db-schema.test.ts` — append 5.2-SCHEMA-001 registrations table assertion

### Change Log

- 2026-06-15: Story 5.2 created — submit a registration (form fields, server action, registrations table, cancel token hash, audit log)
- 2026-06-15: Story 5.2 validated — 4 findings fixed: (1) migration changed from hand-write to drizzle-kit generate; (2) cancelTokenHash made nullable for Story 5.4 single-use enforcement; (3) R-005 guard moved to service layer (RegistrationClosedError) so INT-CLOSED-001 can test it without HTTP; (4) duplicate contradictory action blocks collapsed to single correct pattern
- 2026-06-15: Story 5.2 implemented — all 8 tasks complete; 22 i18n keys; registrations schema+migration; service with TOCTOU-safe R-005 guard; superform registration form; success state via onResult/$state
