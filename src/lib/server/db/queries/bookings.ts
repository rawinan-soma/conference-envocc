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
import { eq, sql } from 'drizzle-orm';

import { db } from '../index.js';
import { bookings } from '../schema/bookings.js';
import { rooms } from '../schema/rooms.js';
import type { Room } from '../schema/rooms.js';
import type { Booking } from '../../services/booking-service.js';

export type WeekCalendarRow = {
	room: Room;
	bookings: Booking[];
};

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
	const weekEnd = new Date(weekStart);
	weekEnd.setDate(weekEnd.getDate() + 7);

	// Fetch all active rooms
	const allRooms = await db.select().from(rooms).where(eq(rooms.isActive, true));

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
