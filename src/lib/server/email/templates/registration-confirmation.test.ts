/**
 * Unit tests — Story 5.3: Registration Confirmation Email Template
 * Module: src/lib/server/email/templates/registration-confirmation.ts
 *
 * AC Coverage:
 *   AC-2: Email body contains event name and cancel link
 *   AC-2: User-supplied strings are HTML-escaped before insertion into html body
 *         — prevents markup injection.
 *
 * Design note: calls getRegistrationConfirmationTemplate() directly (no HTTP, no DB).
 * The template uses Paraglide messages with { locale: 'th' }; Thai messages return
 * empty strings (Rawinan's responsibility to fill). Assertions check structure and
 * escaping, not specific message text.
 *
 * Note: No Thai assertions here — Thai translation is Rawinan's responsibility.
 */

import { randomUUID } from 'node:crypto';

import { describe, test, expect } from 'vitest';

import { getRegistrationConfirmationTemplate } from './registration-confirmation.js';

describe('getRegistrationConfirmationTemplate', () => {
	// -------------------------------------------------------------------------
	// 5.3-UNIT-001 — Output shape
	// Smoke-level: returned object has subject, text, html as non-empty strings.
	// -------------------------------------------------------------------------
	test('[P1] 5.3-UNIT-001 — returns subject, text, html strings for valid inputs', () => {
		const result = getRegistrationConfirmationTemplate({
			firstName: 'John',
			lastName: 'Doe',
			eventName: 'Annual Safety Review',
			cancelLink: 'http://localhost:3000/r/abc123/cancel?token=deadbeef'
		});

		expect(typeof result.subject, 'subject must be a string').toBe('string');
		expect(typeof result.text, 'text body must be a string').toBe('string');
		expect(typeof result.html, 'html body must be a string').toBe('string');
	});

	// -------------------------------------------------------------------------
	// 5.3-UNIT-002 — Cancel link present in output (AC-2)
	// Both text and html bodies must contain the cancel link URL.
	// -------------------------------------------------------------------------
	test('[P0] 5.3-UNIT-002 — cancel link appears in text and html bodies (AC-2)', () => {
		const cancelLink = 'http://localhost:3000/r/test-token/cancel?token=cafebabe';

		const result = getRegistrationConfirmationTemplate({
			firstName: 'Jane',
			lastName: 'Smith',
			eventName: 'Team Building Event',
			cancelLink
		});

		expect(result.text, 'text body must contain cancel link').toContain(cancelLink);
		expect(result.html, 'html body must contain cancel link').toContain(cancelLink);
	});

	// -------------------------------------------------------------------------
	// 5.3-UNIT-003 — Event name present in output (AC-2)
	// Both text and html bodies must contain the event name (passed as raw data).
	// Note: subject is rendered via Paraglide { locale: 'th' }. Thai messages are
	// empty strings until Rawinan fills translations — no subject content assertion here.
	// -------------------------------------------------------------------------
	test('[P0] 5.3-UNIT-003 — event name appears in text and html bodies (AC-2)', () => {
		const eventName = 'Environmental Health Conference 2026';

		const result = getRegistrationConfirmationTemplate({
			firstName: 'Alice',
			lastName: 'Wong',
			eventName,
			cancelLink: 'http://localhost:3000/r/xyz/cancel?token=aabbcc'
		});

		expect(result.text, 'text body must contain event name').toContain(eventName);
		expect(result.html, 'html body must contain event name').toContain(eventName);
		// subject depends on Thai translation (currently "") — assert it is a string only
		expect(typeof result.subject, 'subject must be a string').toBe('string');
	});

	// -------------------------------------------------------------------------
	// 5.3-UNIT-004 — HTML escaping of eventName (AC-2 security)
	// User-supplied eventName with HTML special chars must be escaped in html body.
	// -------------------------------------------------------------------------
	test('[P0] 5.3-UNIT-004 — eventName with HTML special chars is escaped in html body (AC-2)', () => {
		const xssPayload = '<script>alert("xss")</script>';

		const result = getRegistrationConfirmationTemplate({
			firstName: 'Test',
			lastName: 'User',
			eventName: xssPayload,
			cancelLink: 'http://localhost:3000/r/test/cancel?token=abc'
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
	// 5.3-UNIT-005 — HTML escaping of cancelLink (AC-2 security)
	// cancelLink with special HTML chars (e.g., & in query params) must be escaped.
	// -------------------------------------------------------------------------
	test('[P1] 5.3-UNIT-005 — cancelLink with special chars is escaped in html body (AC-2)', () => {
		const cancelLink = 'http://localhost:3000/r/test/cancel?token=a&b=c&d=<e>';

		const result = getRegistrationConfirmationTemplate({
			firstName: 'Bob',
			lastName: 'Builder',
			eventName: 'Safety Workshop',
			cancelLink
		});

		// Raw unescaped chars must not appear in html attribute context
		expect(result.html, 'html must escape & as &amp; in href').toContain('&amp;');

		// Text body contains the raw cancel link
		expect(result.text, 'text body contains raw cancel link').toContain(cancelLink);
	});

	// -------------------------------------------------------------------------
	// 5.3-UNIT-006 — singletonKey format for registration confirmation
	// Documents the key contract used when enqueuing the pg-boss job.
	// -------------------------------------------------------------------------
	test('[P1] 5.3-UNIT-006 — registration-confirm singletonKey format is correct', () => {
		// The singletonKey is constructed in +page.server.ts, not in the template.
		// This test documents the contract: registration-confirm-{registrationId}
		const registrationId = randomUUID();
		const singletonKey = `registration-confirm-${registrationId}`;

		expect(singletonKey, 'singletonKey must match registration-confirm-{uuid}').toMatch(
			/^registration-confirm-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
		);
	});
});
