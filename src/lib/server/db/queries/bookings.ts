/**
 * Room calendar read-model query — Story 4.2
 *
 * Provides getWeekCalendar(weekStart) — the single query function consumed by
 * Story 4.3 (calendar UI) and Story 4.8 (dashboard).
 *
 * Server-only — never import this module client-side.
 *
 * AC Coverage:
 *   AC-1: returns per-room bookings for the week; deactivated rooms absent
 *   AC-2: GiST index on bookings(during) is usable for range-overlap query (R-007)
 */
import { asc, eq, getTableColumns, sql } from 'drizzle-orm';
import { userProfiles } from '../schema/profiles.js';

import { db } from '../index.js';
import { bookings } from '../schema/bookings.js';
import { rooms } from '../schema/rooms.js';
import type { Room } from '../schema/rooms.js';
import type { Booking } from '../../services/booking-service.js';
import { addDays } from '$lib/utils/date.js';

export type WeekCalendarRow = {
	room: Room;
	bookings: Booking[];
};

/**
 * Load a single booking by primary key.
 * Returns null if not found.
 * Used by /bookings/[id] (Story 4.5) and future detail pages.
 */
export async function getBookingById(id: string): Promise<Booking | null> {
	const [row] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
	return row ?? null;
}

/**
 * Returns per-room bookings for a 7-day window starting at weekStart.
 * - Only active rooms (is_active = true) are included.
 * - Only active/non-cancelled bookings overlapping the week window are returned.
 * - weekStart should be a Monday 00:00:00 local time (Asia/Bangkok, UTC+7).
 * - weekEnd is computed as weekStart + 7 days.
 *
 * @param weekStart - Monday midnight UTC (caller is responsible for timezone conversion)
 */
export async function getWeekCalendar(weekStart: Date): Promise<WeekCalendarRow[]> {
	// Compute weekEnd as 7 calendar days after weekStart in Asia/Bangkok.
	// addDays() uses @internationalized/date ZonedDateTime.add() — correct for
	// Bangkok's fixed UTC+7 offset (no DST), and consistent with the rest of the
	// calendar feature's date arithmetic.
	const weekEnd = addDays(weekStart, 7);

	// Fetch all active rooms in stable display order (floor asc, name asc) — matches listRooms().
	const allRooms = await db
		.select()
		.from(rooms)
		.where(eq(rooms.isActive, true))
		.orderBy(asc(rooms.floor), asc(rooms.name));

	if (allRooms.length === 0) return [];

	// Fetch bookings overlapping the week range for active rooms.
	// Uses tstzrange && operator — backed by the GiST index from bookings_no_overlap.
	// Status filter excludes cancelled bookings (mirrors EXCLUDE constraint predicate).
	const weekBookings = await db
		.select()
		.from(bookings)
		.where(
			sql`${bookings.during} && tstzrange(${weekStart.toISOString()}::timestamptz, ${weekEnd.toISOString()}::timestamptz, '[)')
        AND ${bookings.status} != 'cancelled'`
		);

	// Group bookings by roomId
	const byRoom = new Map<string, Booking[]>();
	for (const booking of weekBookings) {
		const list = byRoom.get(booking.roomId) ?? [];
		list.push(booking);
		byRoom.set(booking.roomId, list);
	}

	return allRooms.map((room) => ({
		room,
		bookings: byRoom.get(room.id) ?? []
	}));
}

// ---------------------------------------------------------------------------
// Dashboard query — Story 4.8
// ---------------------------------------------------------------------------

/**
 * Extended booking row that includes the joined room name.
 * Avoids N+1 fetches for room names on the dashboard.
 *
 * Story 4.8 AC-1 (FR-050): Only the requesting organizer's upcoming non-cancelled
 * bookings are returned. IDOR boundary is enforced here in the DB query itself.
 */
export type UpcomingBookingRow = Booking & { roomName: string };

/**
 * Returns all upcoming, non-cancelled bookings for a specific organizer, ordered
 * by start time ascending (lower(during) ASC).
 *
 * Filters:
 *   - organizerId = organizerId            (IDOR boundary — enforced in query)
 *   - status != 'cancelled'                (AC-1)
 *   - upper(during) >= now()               (upcoming only — AC-1)
 *
 * JOIN: bookings INNER JOIN rooms ON roomId = rooms.id  (provides roomName — AC-2)
 *
 * NOTE: An index on bookings(organizer_id) may be needed if NFR-003 (<3s load)
 * is at risk under production load. Do NOT add a migration without measuring.
 *
 * @param organizerId - The authenticated organizer's user ID
 */
export async function getUpcomingBookingsByOrganizer(
	organizerId: string
): Promise<UpcomingBookingRow[]> {
	const rows = await db
		.select({
			...getTableColumns(bookings), // all booking columns (avoids column ambiguity in JOIN)
			roomName: rooms.name // extra field from rooms table
		})
		.from(bookings)
		.innerJoin(rooms, eq(bookings.roomId, rooms.id))
		.where(
			sql`${bookings.organizerId} = ${organizerId}
          AND ${bookings.status} != 'cancelled'
          AND upper(${bookings.during}) >= now()`
		)
		.orderBy(sql`lower(${bookings.during}) asc`);

	return rows;
}

// ---------------------------------------------------------------------------
// Registration page query — Story 5.1
// ---------------------------------------------------------------------------

/**
 * Extended booking row for the public registration page.
 * Includes room name and organizer contact info from JOINed tables.
 * Does NOT expose registrationToken (data minimization — AC-3 / R-001).
 *
 * Story 5.1 AC-1 (FR-040): Exposes eventName, roomName, agenda, registrationEnabled,
 * contactName (organizerFirstName + organizerLastName), and contactPhone.
 * Story 5.1 AC-3 (R-001 BLOCK): IDOR guard enforced via WHERE registration_token = token.
 */
export type RegistrationPageRow = {
	id: string;
	roomId: string;
	organizerId: string;
	eventName: string;
	agenda: string | null;
	during: string;
	status: string;
	cateringEnabled: boolean;
	registrationEnabled: boolean;
	registrationClosesAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
	roomName: string;
	organizerFirstName: string;
	organizerLastName: string;
	organizerPhone: string;
};

/**
 * Look up a booking by its public registration_token.
 *
 * Returns full event data (including room + organizer contact from JOINs) needed
 * to render /r/[token] without authentication.
 *
 * Returns null if no booking matches the given token — the route layer converts
 * null → error(404, 'Event not found'). Never throws on a miss.
 *
 * IDOR guard (R-001 BLOCK, score=9):
 *   The ONLY isolation is WHERE registration_token = token. No session auth.
 *   registrationToken is intentionally excluded from the result (data minimization).
 *
 * JOIN: bookings
 *   INNER JOIN rooms           ON bookings.room_id       = rooms.id
 *   INNER JOIN user_profiles   ON bookings.organizer_id  = user_profiles."userId"
 *
 * Note: user_profiles uses camelCase column names ('userId', 'firstName', etc.)
 *   matching the migration convention set by 0004_user_profiles.sql.
 *
 * @param token - The registration_token from the URL parameter
 */
export async function getBookingByRegistrationToken(
	token: string
): Promise<RegistrationPageRow | null> {
	// Build column selection excluding registrationToken (data minimization — AC-3 / R-001).
	// registrationToken is the lookup key only — it must not be returned to the page layer.
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { registrationToken: _omit, ...bookingColumns } = getTableColumns(bookings);

	const rows = await db
		.select({
			...bookingColumns,
			roomName: rooms.name,
			organizerFirstName: userProfiles.firstName,
			organizerLastName: userProfiles.lastName,
			organizerPhone: userProfiles.phone
		})
		.from(bookings)
		.innerJoin(rooms, eq(bookings.roomId, rooms.id))
		.innerJoin(userProfiles, eq(bookings.organizerId, userProfiles.userId))
		.where(eq(bookings.registrationToken, token))
		.limit(1);

	return (rows[0] as RegistrationPageRow) ?? null;
}
