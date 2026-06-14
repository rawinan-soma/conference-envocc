// src/lib/utils/tstzrange.ts
// Utilities for parsing PostgreSQL tstzrange values.
// Safe for both server (load functions) and client code — no node: imports.

/**
 * Normalize a raw tstzrange bound string so that V8's Date.parse() accepts it.
 *
 * Postgres emits range bounds in the session timezone, so the offset suffix
 * varies (`+07`, `+00`, `Z`, …) depending on the DB session `TimeZone` setting
 * (e.g. UTC in CI / stock images). V8's Date parser rejects a bare ±HH offset
 * such as `+00`, so normalize any bare two-digit offset to `±HH:00`. Values
 * already in `±HH:MM` form or ending in `Z` are left untouched.
 */
export function normalizeTstzBound(raw: string): string {
	return raw
		.trim()
		.replace(' ', 'T')
		.replace(/([+-]\d{2})$/, '$1:00');
}

/**
 * Parse a PostgreSQL tstzrange string into lower/upper Date bounds.
 *
 * Returns `null` if the string is malformed or either bound parses as NaN.
 * Open-ended bounds (`-infinity` / `infinity`) are mapped to Date min/max
 * so an open-ended block correctly overlaps every day.
 *
 * Supports all four bracket combinations (`[)`, `(]`, `[]`, `()`) and quoted
 * bounds emitted by some Postgres driver versions.
 */
export function parseTstzrange(range: string): { lower: Date; upper: Date } | null {
	const match = range.match(/[[(]"?([^",]+)"?,\s*"?([^")\]]+)"?[\])]/);
	if (!match || !match[1] || !match[2]) return null;
	const rawLower = match[1].trim();
	const rawUpper = match[2].trim();
	// Postgres can emit `infinity` / `-infinity` for open-ended ranges.
	// Treat them as ±MAX so an open-ended block correctly overlaps every day.
	const lower =
		rawLower === '-infinity' ? new Date(-8640000000000000) : new Date(normalizeTstzBound(rawLower));
	const upper =
		rawUpper === 'infinity' ? new Date(8640000000000000) : new Date(normalizeTstzBound(rawUpper));
	if (Number.isNaN(lower.getTime()) || Number.isNaN(upper.getTime())) return null;
	return { lower, upper };
}

/**
 * Return true when a pre-parsed tstzrange overlaps the half-open day interval
 * [dayStart, dayEnd) using the same comparison used for both bookings and blocks.
 *
 * Both overlap tests in +page.server.ts call this helper so that any future
 * change to the comparison semantics only needs to be made in one place.
 */
export function overlapsDay(
	parsed: { lower: Date; upper: Date } | null,
	dayStart: Date,
	dayEnd: Date
): boolean {
	return parsed !== null && parsed.lower < dayEnd && parsed.upper > dayStart;
}
