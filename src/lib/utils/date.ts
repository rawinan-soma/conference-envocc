// src/lib/utils/date.ts
// Safe for both server (load functions) and client (Svelte components).
// No node: imports allowed here.
//
// Uses @internationalized/date for all timezone-aware calendar arithmetic.

import {
	parseDate,
	today,
	startOfWeek,
	getDayOfWeek,
	fromDate,
	type CalendarDate
} from '@internationalized/date';

const TZ = 'Asia/Bangkok';

/**
 * Parse ?week=YYYY-MM-DD query param → Monday 00:00 Asia/Bangkok as UTC Date.
 * If param is absent or invalid, returns the current week's Monday.
 *
 * Uses @internationalized/date:
 *   - parseDate(param) parses a YYYY-MM-DD string as a CalendarDate
 *   - today(TZ) returns today's CalendarDate in Bangkok time (fallback)
 *   - startOfWeek(date, 'en-US', 'mon') finds the preceding Monday
 *   - toDate(calDate, TZ) converts back to a JS Date (midnight Bangkok)
 *
 * Example:
 *   parseWeekParam("2026-06-15")  // June 15 = Monday → Monday 2026-06-15
 *   parseWeekParam("2026-06-17")  // June 17 = Wednesday → Monday 2026-06-16
 *   parseWeekParam(null)          // → Monday of current Bangkok week
 */
export function parseWeekParam(param: string | null): Date {
	let calDate: CalendarDate;
	try {
		// parseDate throws on null/invalid/calendar-invalid strings
		calDate = param ? parseDate(param) : today(TZ);
	} catch {
		calDate = today(TZ);
	}
	const monday = startOfWeek(calDate, 'en-US', 'mon');
	// CalendarDate.toDate(timeZone) converts to a JS Date at midnight in that timezone
	return monday.toDate(TZ);
}

/**
 * Add N days to a Date via @internationalized/date calendar arithmetic.
 * Uses ZonedDateTime.add() so arithmetic is done in Bangkok calendar days,
 * then ZonedDateTime.toDate() converts back to a JS Date (UTC instant).
 */
export function addDays(date: Date, n: number): Date {
	const zdt = fromDate(date, TZ);
	return zdt.add({ days: n }).toDate();
}

/**
 * Format a Date in Asia/Bangkok for display.
 *
 * - 'time'    → "09:00" (HH:MM, 24-hour, Bangkok)
 * - 'date'    → "2026-06-15" (YYYY-MM-DD, Bangkok)
 * - 'dayName' → "Monday" (full English day name, Bangkok; Paraglide wraps locale labels)
 * - 'dayShort'→ "Mon" (3-char abbreviation)
 */
export function formatDateBangkok(
	date: Date,
	format: 'time' | 'date' | 'dayName' | 'dayShort'
): string {
	const zdt = fromDate(date, TZ);
	switch (format) {
		case 'time': {
			const hh = String(zdt.hour).padStart(2, '0');
			const mm = String(zdt.minute).padStart(2, '0');
			return `${hh}:${mm}`;
		}
		case 'date': {
			const yyyy = zdt.year;
			const mo = String(zdt.month).padStart(2, '0');
			const dd = String(zdt.day).padStart(2, '0');
			return `${yyyy}-${mo}-${dd}`;
		}
		case 'dayName': {
			const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
			// getDayOfWeek returns 0-based index relative to locale's first day.
			// Use 'en-US' (Sunday-first) so index 0=Sun, 1=Mon … 6=Sat (standard JS mapping).
			const jsDay = getDayOfWeek(zdt, 'en-US');
			return DAYS[jsDay] ?? 'Monday';
		}
		case 'dayShort': {
			const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
			const jsDay = getDayOfWeek(zdt, 'en-US');
			return DAYS_SHORT[jsDay] ?? 'Mon';
		}
	}
}
