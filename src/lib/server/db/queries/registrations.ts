import { sql, eq, asc } from 'drizzle-orm';
import { db } from '../index.js';
import type { DrizzleTransaction } from '../index.js';
import { registrations } from '../schema/registrations.js';
import type { RegistrationInsert, Registration } from '../schema/registrations.js';
import { MEAL_OPTIONS } from '$lib/schemas/registration.js';

// ---------------------------------------------------------------------------
// Resend a Lost Link — Story 5.5 (FR-047, AC-3, AC-4, AC-6)
// ---------------------------------------------------------------------------

/**
 * Minimal registration data needed by the resend service.
 * cancelTokenHash is intentionally excluded — the resend service always generates
 * a fresh CSPRNG token (AR-05 / password-reset semantics) and never reads the old hash.
 */
export type ActiveRegistrationRow = {
	id: string;
	firstName: string;
	lastName: string;
};

/**
 * Look up a single status='registered' row by booking + email.
 * Used inside the resend service to locate a registration without
 * short-circuiting on a miss (R-003 MITIGATE — always execute the query).
 *
 * Returns null when no matching row exists — callers must NOT skip this
 * call even when they intend to no-op, because timing neutrality depends
 * on the DB round-trip always happening.
 *
 * @param tx - Drizzle transaction (called from inside db.transaction())
 * @param bookingId - The booking's primary key
 * @param email - The email address submitted by the attendee
 */
export async function getActiveRegistrationByEmail(
	tx: DrizzleTransaction,
	bookingId: string,
	email: string
): Promise<ActiveRegistrationRow | null> {
	const [row] = await tx
		.select({
			id: registrations.id,
			firstName: registrations.firstName,
			lastName: registrations.lastName
		})
		.from(registrations)
		.where(
			sql`${registrations.bookingId} = ${bookingId}
				AND ${registrations.email} = ${email}
				AND ${registrations.status} = 'registered'`
		)
		.limit(1);

	return row ?? null;
}

/**
 * Inserts a registration record inside a transaction.
 * Returns the newly created registration row.
 *
 * @param tx - Drizzle transaction (from db.transaction())
 * @param data - The registration data to insert
 */
export async function createRegistrant(
	tx: DrizzleTransaction,
	data: RegistrationInsert
): Promise<Registration> {
	const [row] = await tx.insert(registrations).values(data).returning();
	if (!row) {
		throw new Error('Failed to insert registration row');
	}
	return row;
}

// ---------------------------------------------------------------------------
// Catering Aggregation — Story 5.7 (FR-022, FR-051)
// ---------------------------------------------------------------------------

/**
 * Per-meal-type counts for a booking's registered attendees.
 * Matches MEAL_OPTIONS from src/lib/schemas/registration.ts exactly.
 * Case-sensitive: 'Normal' | 'Vegetarian' | 'Muslim' | 'Other'
 */
export type CateringCounts = {
	normal: number;
	vegetarian: number;
	muslim: number;
	other: number;
};

const ZERO_COUNTS: CateringCounts = { normal: 0, vegetarian: 0, muslim: 0, other: 0 };

/**
 * Re-exported so callers (dashboard) can use the zero struct without redefining it.
 * Frozen because it is a shared singleton: the dashboard fallback
 * (`cateringMap.get(id) ?? CATERING_ZERO_COUNTS`) hands the same reference to every
 * zero-count booking. Freezing guarantees no caller can mutate it in place and
 * corrupt the counts of unrelated bookings. Internal accumulation always spreads
 * into a fresh copy (`{ ...ZERO_COUNTS }`), so this never blocks aggregation.
 */
export const CATERING_ZERO_COUNTS: CateringCounts = Object.freeze({ ...ZERO_COUNTS });

/**
 * Aggregates per-meal-type counts for a single booking.
 * Only counts rows where status='registered' AND meal_type IS NOT NULL.
 * Returns the zero struct when no matching rows exist (AC-4).
 *
 * Used by: /bookings/[id]/+page.server.ts (booking detail page)
 */
export async function getCateringCountsByBookingId(bookingId: string): Promise<CateringCounts> {
	const rows = await db
		.select({
			mealType: registrations.mealType,
			count: sql<number>`cast(count(*) as integer)`
		})
		.from(registrations)
		.where(
			sql`${registrations.bookingId} = ${bookingId}
				AND ${registrations.status} = 'registered'
				AND ${registrations.mealType} IS NOT NULL`
		)
		.groupBy(registrations.mealType);

	return rowsToCounts(rows);
}

/**
 * Aggregates per-meal-type counts for multiple bookings in a single DB round-trip.
 * Returns a Map from bookingId → CateringCounts.
 * Missing bookingIds (no rows) are absent from the map — callers should use ?? ZERO_COUNTS.
 * Returns empty Map when bookingIds is empty (no DB call).
 *
 * Used by: /dashboard/+page.server.ts (avoids N+1 on the dashboard)
 */
export async function getCateringCountsByBookingIds(
	bookingIds: string[]
): Promise<Map<string, CateringCounts>> {
	if (bookingIds.length === 0) return new Map();

	const rows = await db
		.select({
			bookingId: registrations.bookingId,
			mealType: registrations.mealType,
			count: sql<number>`cast(count(*) as integer)`
		})
		.from(registrations)
		.where(
			sql`${registrations.bookingId} = ANY(ARRAY[${sql.join(
				bookingIds.map((id) => sql`${id}`),
				sql`, `
			)}]::text[])
				AND ${registrations.status} = 'registered'
				AND ${registrations.mealType} IS NOT NULL`
		)
		.groupBy(registrations.bookingId, registrations.mealType);

	const result = new Map<string, CateringCounts>();
	for (const row of rows) {
		const existing = result.get(row.bookingId) ?? { ...ZERO_COUNTS };
		mergeMealRow(existing, row.mealType, row.count);
		result.set(row.bookingId, existing);
	}
	return result;
}

/**
 * Maps each MEAL_OPTIONS value to its CateringCounts key.
 * Derived from MEAL_OPTIONS so a future addition to MEAL_OPTIONS causes a TS error here
 * rather than silently producing zero counts.
 */
const MEAL_TYPE_KEY_MAP: Record<(typeof MEAL_OPTIONS)[number], keyof CateringCounts> = {
	Normal: 'normal',
	Vegetarian: 'vegetarian',
	Muslim: 'muslim',
	Other: 'other'
};

/** Accumulates a single GROUP BY row into a CateringCounts struct. */
function mergeMealRow(counts: CateringCounts, mealType: string | null, count: number): void {
	if (mealType === null) return; // null values are ignored (AC-5)
	const key = MEAL_TYPE_KEY_MAP[mealType as (typeof MEAL_OPTIONS)[number]];
	if (key !== undefined) counts[key] += count;
	// unknown meal type values are ignored (AC-5)
}

function rowsToCounts(rows: Array<{ mealType: string | null; count: number }>): CateringCounts {
	const counts = { ...ZERO_COUNTS };
	for (const row of rows) {
		mergeMealRow(counts, row.mealType, row.count);
	}
	return counts;
}

// ---------------------------------------------------------------------------
// Registrant List — Story 5.8 (AC-1, FR-048)
// ---------------------------------------------------------------------------

/**
 * Returns all registrations for a given booking, ordered by createdAt ASC.
 * Includes both 'registered' and 'cancelled' statuses (all rows).
 *
 * Story 5.8 AC-1: Used by the registrant list route (/bookings/[id]/registrants).
 * No transaction needed — read-only query using db directly.
 *
 * @param bookingId - The booking's primary key
 */
export async function getRegistrantsByBookingId(bookingId: string): Promise<Registration[]> {
	return db
		.select()
		.from(registrations)
		.where(eq(registrations.bookingId, bookingId))
		.orderBy(asc(registrations.createdAt));
}
