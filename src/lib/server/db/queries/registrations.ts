import { sql } from 'drizzle-orm';
import { db } from '../index.js';
import type { DrizzleTransaction } from '../index.js';
import { registrations } from '../schema/registrations.js';
import type { RegistrationInsert, Registration } from '../schema/registrations.js';
import { MEAL_OPTIONS } from '$lib/schemas/registration.js';

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
