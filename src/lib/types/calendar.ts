// src/lib/types/calendar.ts
// Pure type-only file — no server code, no imports from $lib/server/.
// Safe to import in Svelte components.

import type { Room } from '$lib/server/db/schema/rooms.js';

export type CellState = 'available' | 'booked' | 'blocked';

export type CalendarCell = {
	state: CellState;
	/** Pre-formatted bookings for display (time range + event name placeholder). */
	bookings: Array<{
		id: number;
		timeRange: string;
		eventName: string | null;
		/** True when this cell is a continuation day (not the booking's start day). */
		isContinuation: boolean;
	}>;
	/** Block reasons for display. */
	blocks: Array<{ id: string; reason: string | null }>;
	/** Link to /bookings/new?room=...&date=... (even for non-available cells — preserves nav). */
	href: string;
	/** Full aria-label for the cell (state + room + day). */
	ariaLabel: string;
};

export type CalendarGridRow = {
	room: Room;
	cells: CalendarCell[]; // 7 cells: Mon=0 ... Sun=6
};

export type CalendarGrid = CalendarGridRow[];
