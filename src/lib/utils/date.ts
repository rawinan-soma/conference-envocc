// src/lib/utils/date.ts
// Safe for both server (load functions) and client (Svelte components).
// No node: imports allowed here.

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000; // UTC+7, no DST

/**
 * Parse ?week=YYYY-MM-DD query param → Monday 00:00 Asia/Bangkok as UTC Date.
 * If param is absent or invalid, returns the current week's Monday.
 *
 * Invariant: the returned Date represents exactly Monday 00:00 Asia/Bangkok
 * which is the same instant as Sunday 17:00:00 UTC of the preceding week.
 *
 * Example (trace):
 *   parseWeekParam("2026-06-15")  // June 15 = Monday
 *   → base = new Date("2026-06-15T00:00:00+07:00")
 *          = new Date("2026-06-14T17:00:00.000Z")    ← Monday midnight Bangkok
 *   → bkDay = base + 7h → 2026-06-15T00:00:00Z UTC (Bangkok wall clock)
 *   → getUTCDay() = 1 (Monday) → daysToMonday = 0
 *   → result = "2026-06-14T17:00:00.000Z" ✓
 *
 *   parseWeekParam("2026-06-17")  // June 17 = Wednesday
 *   → base = new Date("2026-06-17T00:00:00+07:00")
 *          = "2026-06-16T17:00:00.000Z"
 *   → bkDay UTC = 2026-06-17T00:00Z → getUTCDay() = 3 (Wed) → daysToMonday = -2
 *   → result = "2026-06-14T17:00:00.000Z" ✓ (same Monday)
 */
export function parseWeekParam(param: string | null): Date {
	// Validate format
	const iso = param?.match(/^\d{4}-\d{2}-\d{2}$/) ? param : null;

	// Parse as Bangkok midnight: "YYYY-MM-DDT00:00:00+07:00"
	// ISO 8601 with explicit +07:00 offset means JS interprets it as UTC-7h correctly.
	// The regex only validates the *shape* of the param — a shape-valid but
	// calendar-invalid value (e.g. "2026-13-45") yields an Invalid Date. Guard
	// against it so a malicious/typo'd ?week= falls back to the current week
	// instead of crashing the load function when weekStart.toISOString() throws.
	const parsed = iso ? new Date(`${iso}T00:00:00+07:00`) : null;
	const base = parsed && !Number.isNaN(parsed.getTime()) ? parsed : bangkokMidnightNow();

	// Read the Bangkok weekday:
	// base is the Bangkok midnight instant. Adding BANGKOK_OFFSET_MS shifts it
	// to Bangkok wall-clock midnight expressed as a UTC timestamp — getUTCDay() then
	// returns the Bangkok weekday (0=Sun, 1=Mon, ..., 6=Sat).
	const bkDay = new Date(base.getTime() + BANGKOK_OFFSET_MS);
	const dayOfWeek = bkDay.getUTCDay();
	const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
	return new Date(base.getTime() + daysToMonday * 24 * 60 * 60 * 1000);
}

/**
 * Current day at midnight Bangkok as a UTC Date (fallback for parseWeekParam).
 */
function bangkokMidnightNow(): Date {
	const now = new Date();
	// Shift to Bangkok wall clock, floor to midnight, shift back to UTC
	const bkMs = now.getTime() + BANGKOK_OFFSET_MS;
	const bkDate = new Date(bkMs);
	// Midnight Bangkok in UTC = Bangkok date at 00:00 Bangkok = (Bangkok date - 1day) at 17:00Z
	return new Date(
		Date.UTC(bkDate.getUTCFullYear(), bkDate.getUTCMonth(), bkDate.getUTCDate()) - BANGKOK_OFFSET_MS
	);
}

/**
 * Add N days to a Date using pure millisecond math (no DST risk for UTC+7).
 */
export function addDays(date: Date, n: number): Date {
	return new Date(date.getTime() + n * 24 * 60 * 60 * 1000);
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
	// Add offset to get Bangkok wall-clock time in UTC fields
	const bk = new Date(date.getTime() + BANGKOK_OFFSET_MS);
	switch (format) {
		case 'time': {
			const hh = String(bk.getUTCHours()).padStart(2, '0');
			const mm = String(bk.getUTCMinutes()).padStart(2, '0');
			return `${hh}:${mm}`;
		}
		case 'date': {
			const yyyy = bk.getUTCFullYear();
			const mo = String(bk.getUTCMonth() + 1).padStart(2, '0');
			const dd = String(bk.getUTCDate()).padStart(2, '0');
			return `${yyyy}-${mo}-${dd}`;
		}
		case 'dayName': {
			const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
			return DAYS[bk.getUTCDay()] ?? 'Monday';
		}
		case 'dayShort': {
			const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
			return DAYS_SHORT[bk.getUTCDay()] ?? 'Mon';
		}
	}
}
