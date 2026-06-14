// src/routes/(app)/calendar/+page.server.ts
import { sql } from 'drizzle-orm';

import { db } from '$lib/server/db/index.js';
import { roomBlocks } from '$lib/server/db/schema/room-blocks.js';
import type { RoomBlock } from '$lib/server/db/schema/room-blocks.js';
import { getWeekCalendar } from '$lib/server/db/queries/bookings.js';
import { parseWeekParam, addDays, formatDateBangkok } from '$lib/utils/date.js';
import type { CalendarGrid, CellState } from '$lib/types/calendar.js';
import * as m from '$lib/paraglide/messages.js';

// Parse lower and upper bounds from tstzrange string
// (format: ["2026-06-15 09:00:00+07","..."))
//
// Postgres emits range bounds in the session timezone, so the offset suffix
// varies (`+07`, `+00`, `Z`, …) depending on the DB session `TimeZone` setting
// (e.g. UTC in CI / stock images). V8's Date parser rejects a bare ±HH offset
// such as `+00`, so normalize any bare two-digit offset to `±HH:00`. Values
// already in `±HH:MM` form or ending in `Z` are left untouched.
function normalizeTstzBound(raw: string): string {
	return raw
		.trim()
		.replace(' ', 'T')
		.replace(/([+-]\d{2})$/, '$1:00');
}

function parseTstzrange(range: string): { lower: Date; upper: Date } | null {
	const match = range.match(/[[(]"?([^",]+)"?,\s*"?([^")\]]+)"?[\])]/);
	if (!match || !match[1] || !match[2]) return null;
	const lower = new Date(normalizeTstzBound(match[1]));
	const upper = new Date(normalizeTstzBound(match[2]));
	if (Number.isNaN(lower.getTime()) || Number.isNaN(upper.getTime())) return null;
	return { lower, upper };
}

function rangeOverlapsDay(range: string, dayStart: Date): boolean {
	const parsed = parseTstzrange(range);
	if (!parsed) return false;
	const dayEnd = addDays(dayStart, 1);
	return parsed.lower < dayEnd && parsed.upper > dayStart;
}

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
	const grid: CalendarGrid = rows.map((row) => ({
		room: row.room,
		cells: weekDateObjects.map((dayStart) => {
			const dayDateStr = formatDateBangkok(dayStart, 'date');
			const dayName = formatDateBangkok(dayStart, 'dayName');

			const dayBookings = row.bookings.filter((b) => rangeOverlapsDay(b.during, dayStart));
			const dayBlocks = (blocksByRoom.get(row.room.id) ?? []).filter((bl) =>
				rangeOverlapsDay(bl.during, dayStart)
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
				bookings: dayBookings.map((b) => {
					const parsed = parseTstzrange(b.during);
					const timeRange = parsed
						? `${formatDateBangkok(parsed.lower, 'time')}–${formatDateBangkok(parsed.upper, 'time')}`
						: '';
					return { id: b.id, timeRange, eventName: null }; // eventName: Story 4.4
				}),
				blocks: dayBlocks.map((bl) => ({ id: bl.id, reason: bl.reason })),
				href: `/bookings/new?room=${row.room.id}&date=${dayDateStr}`,
				ariaLabel
			};
		})
	}));

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
