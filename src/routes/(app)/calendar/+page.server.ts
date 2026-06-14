// src/routes/(app)/calendar/+page.server.ts
import { sql } from 'drizzle-orm';

import { db } from '$lib/server/db/index.js';
import { roomBlocks } from '$lib/server/db/schema/room-blocks.js';
import type { RoomBlock } from '$lib/server/db/schema/room-blocks.js';
import { getWeekCalendar } from '$lib/server/db/queries/bookings.js';
import { parseWeekParam, addDays, formatDateBangkok } from '$lib/utils/date.js';
import { parseTstzrange, overlapsDay } from '$lib/utils/tstzrange.js';
import type { CalendarGrid, CellState } from '$lib/types/calendar.js';
import * as m from '$lib/paraglide/messages.js';

export async function load({ url }) {
	const weekStart = parseWeekParam(url.searchParams.get('week'));
	const weekEnd = addDays(weekStart, 7);

	// Fetch bookings and blocks in parallel
	const [rows, weekBlocks] = await Promise.all([
		getWeekCalendar(weekStart),
		db
			.select()
			.from(roomBlocks)
			.where(
				sql`${roomBlocks.during} && tstzrange(${weekStart.toISOString()}::timestamptz, ${weekEnd.toISOString()}::timestamptz, '[)')`
			)
	]);

	// Group blocks by roomId
	const blocksByRoom = new Map<string, RoomBlock[]>();
	for (const block of weekBlocks) {
		const list = blocksByRoom.get(block.roomId) ?? [];
		list.push(block);
		blocksByRoom.set(block.roomId, list);
	}

	// Build weekDates (7 Date objects, Mon–Sun)
	const weekDateObjects = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
	const weekDates = weekDateObjects.map((d) => d.toISOString());

	// Pre-compute the CalendarGrid
	const grid: CalendarGrid = rows.map((row) => {
		// Pre-parse each booking's and block's `during` range once per room row so
		// the regex runs once per range instead of once per range per day (up to 7×).
		const parsedBookings = row.bookings.map((b) => ({
			booking: b,
			parsed: parseTstzrange(b.during)
		}));
		const parsedBlocks = (blocksByRoom.get(row.room.id) ?? []).map((bl) => ({
			block: bl,
			parsed: parseTstzrange(bl.during)
		}));

		return {
			room: row.room,
			cells: weekDateObjects.map((dayStart) => {
				const dayDateStr = formatDateBangkok(dayStart, 'date');
				const dayName = formatDateBangkok(dayStart, 'dayName');
				const dayEnd = addDays(dayStart, 1);

				// Both bookings and blocks use the same overlapsDay() helper so that any
				// future change to the comparison semantics only needs to be made once.
				const dayBookings = parsedBookings.filter(({ parsed }) =>
					overlapsDay(parsed, dayStart, dayEnd)
				);
				const dayBlocks = parsedBlocks.filter(({ parsed }) =>
					overlapsDay(parsed, dayStart, dayEnd)
				);

				const state: CellState =
					dayBlocks.length > 0 ? 'blocked' : dayBookings.length > 0 ? 'booked' : 'available';

				const ariaLabel =
					state === 'available'
						? `${row.room.name} ${dayName} ${m.calendar_available_label()}`
						: state === 'blocked'
							? `${row.room.name} ${dayName} ${m.calendar_blocked_label()}`
							: `${row.room.name} ${dayName} ${m.calendar_booked_label()}`;

				return {
					state,
					bookings: dayBookings.map(({ booking: b, parsed }) => {
						const timeRange = parsed
							? `${formatDateBangkok(parsed.lower, 'time')}–${formatDateBangkok(parsed.upper, 'time')}`
							: '';
						// Continuation: this cell is not the booking's start day.
						// Also true when a multi-day booking started before the visible week.
						const isContinuation = parsed
							? formatDateBangkok(parsed.lower, 'date') !== dayDateStr
							: false;
						return { id: b.id, timeRange, eventName: b.eventName, isContinuation };
					}),
					blocks: dayBlocks.map(({ block: bl }) => ({ id: bl.id, reason: bl.reason })),
					href: `/bookings/new?room=${row.room.id}&date=${dayDateStr}`,
					ariaLabel
				};
			})
		};
	});

	const prevWeek = formatDateBangkok(addDays(weekStart, -7), 'date');
	const nextWeek = formatDateBangkok(addDays(weekStart, 7), 'date');

	return {
		grid,
		weekStart: weekStart.toISOString(),
		weekDates,
		prevWeek,
		nextWeek
	};
}
