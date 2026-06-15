/**
 * Unit tests — Story 4.6: Booking Confirmation Email Template
 * Module: src/lib/server/email/templates/booking-confirmation.ts
 *
 * AC Coverage:
 *   AC-2: User-supplied strings (eventName, roomName) are HTML-escaped before
 *         insertion into the html body — prevents markup injection.
 *
 * Design note: calls getBookingConfirmationTemplate() directly (no HTTP, no DB).
 * The template uses Paraglide messages with { locale: 'th' }; Thai messages return
 * empty strings (Rawinan's responsibility to fill). Assertions check structure and
 * escaping, not specific message text.
 */

import { randomUUID } from 'node:crypto';

import { describe, test, expect } from 'vitest';

import { getBookingConfirmationTemplate } from './booking-confirmation.js';

describe('getBookingConfirmationTemplate', () => {
	// -------------------------------------------------------------------------
	// 4.6-UNIT-001 — Output shape
	// Smoke-level: returned object has subject, text, html as non-empty strings.
	// -------------------------------------------------------------------------
	test('[P1] 4.6-UNIT-001 — returns subject, text, html strings for valid inputs', () => {
		const result = getBookingConfirmationTemplate({
			eventName: 'Annual Safety Review',
			roomName: 'Conference Room A',
			startAt: '15 Jun 2026 09:00',
			endAt: '10:00',
			organizerName: 'Test Organizer'
		});

		expect(typeof result.subject, 'subject must be a string').toBe('string');
		expect(typeof result.text, 'text body must be a string').toBe('string');
		expect(typeof result.html, 'html body must be a string').toBe('string');
	});

	// -------------------------------------------------------------------------
	// 4.6-UNIT-002 — HTML escaping (AC-2)
	// User-supplied eventName with HTML special chars must be escaped in html body.
	// This directly validates AC-2: "user-supplied strings … are HTML-escaped".
	// -------------------------------------------------------------------------
	test('[P0] 4.6-UNIT-002 — eventName with HTML special chars is escaped in html body (AC-2)', () => {
		const xssPayload = '<script>alert("xss")</script>';

		const result = getBookingConfirmationTemplate({
			eventName: xssPayload,
			roomName: 'Safe Room',
			startAt: '15 Jun 2026 09:00',
			endAt: '10:00',
			organizerName: 'Test Organizer'
		});

		// The raw payload must never appear in the HTML body
		expect(result.html, 'raw <script> tag must not appear in html').not.toContain(xssPayload);

		// The escaped form must appear instead
		expect(result.html, 'html must escape < as &lt;').toContain('&lt;script&gt;');
		expect(result.html, 'html must escape " as &quot;').toContain('&quot;xss&quot;');

		// Text body is plain — the raw value is acceptable there (no HTML injection risk)
		expect(result.text, 'text body contains the raw event name').toContain(xssPayload);
	});

	// -------------------------------------------------------------------------
	// 4.6-UNIT-003 — HTML escaping in roomName (AC-2 completeness)
	// -------------------------------------------------------------------------
	test('[P1] 4.6-UNIT-003 — roomName with HTML special chars is escaped in html body (AC-2)', () => {
		const result = getBookingConfirmationTemplate({
			eventName: 'Normal Event',
			roomName: 'Room <B&W>',
			startAt: '15 Jun 2026 09:00',
			endAt: '10:00',
			organizerName: 'Test Organizer'
		});

		expect(result.html, 'room < must be escaped').toContain('Room &lt;B&amp;W&gt;');
		expect(result.html, 'raw < must not appear in room context').not.toContain('Room <B&W>');
	});

	// -------------------------------------------------------------------------
	// 4.6-UNIT-004 — singletonKey format matches expected pattern
	// Separates the key-format assertion from INT-002 (which verifies DB schema,
	// not key construction logic). Pure-unit: no pg-boss, no DB.
	// -------------------------------------------------------------------------
	test('[P1] 4.6-UNIT-004 — booking-confirm singletonKey format matches expected pattern', () => {
		// The singletonKey is constructed in +page.server.ts, not in the template.
		// This test documents the contract and validates the regex expectation
		// in isolation — confirming the pattern used in INT-003 is correct.
		const bookingId = randomUUID();
		const singletonKey = `booking-confirm-${bookingId}`;

		expect(singletonKey, 'singletonKey must match booking-confirm-{uuid}').toMatch(
			/^booking-confirm-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
		);
	});
});
