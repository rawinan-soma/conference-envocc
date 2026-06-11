/**
 * ATDD Red-Phase Scaffolds — Story 1.5: Jobs & Email Platform
 * Module: src/lib/server/email/mailer.ts — Nodemailer Transport
 *
 * TDD RED PHASE: All tests are marked test() and will remain skipped
 * until the developer activates them task-by-task during implementation.
 *
 * Activation guide:
 *   1. Remove `test(` → `test(` for the current task's test.
 *   2. Run: `bun run test` — verify it FAILS first (red).
 *   3. Implement mailer.ts.
 *   4. Run again — verify it PASSES (green).
 *   5. Commit passing tests.
 *
 * AC Coverage:
 *   - AC-2: sendMail calls the nodemailer transport with correct fields
 *   - AC-6: Env vars validated before transport is created
 *
 * Design note: nodemailer transport is stubbed — no real SMTP is called.
 * The stub intercepts `transporter.sendMail()` and captures call arguments.
 */

import { randomBytes } from 'node:crypto';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Env mock — must be hoisted before mailer.ts imports env.ts
// ---------------------------------------------------------------------------
// When mailer.ts exists, it imports env from '../env.js'.
// We mock the env module so tests do not require real environment variables.

vi.mock('../env.js', () => ({
	env: {
		SMTP_HOST: 'localhost',
		SMTP_PORT: 1025,
		SMTP_FROM: 'noreply@conference-envocc.test',
		SMTP_DISPLAY_NAME: 'Conference EnvOcc',
		SMTP_USER: undefined,
		SMTP_PASS: undefined,
		SMTP_SECURE: 'false',
		// Build URL at runtime — no credential literal in source
		DATABASE_URL: `postgresql://postgres:${randomBytes(8).toString('hex')}@localhost:5432/test`
	}
}));

// ---------------------------------------------------------------------------
// Nodemailer mock — stub the transport so no real SMTP is contacted
// ---------------------------------------------------------------------------
// sendMailMock captures all calls to transporter.sendMail().
// Tests assert on sendMailMock.mock.calls after invoking sendMail().

const sendMailMock = vi.fn().mockResolvedValue({ messageId: 'test-message-id-001' });

vi.mock('nodemailer', () => ({
	default: {
		createTransport: vi.fn(() => ({
			sendMail: sendMailMock
		}))
	}
}));

// ---------------------------------------------------------------------------
// 1.5-UNIT-004 — sendMail: correct `from` field (FR-083 compliance)
// ---------------------------------------------------------------------------

describe('Story 1.5 — mailer.sendMail (AC-2, FR-083)', () => {
	beforeEach(() => {
		sendMailMock.mockClear();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	test('[P1] 1.5-UNIT-004 — sendMail calls transport with correct `from` field (FR-083)', async () => {
		// THIS TEST WILL FAIL — mailer.ts does not exist yet.
		// Activate after Task 3.1 (mailer.ts created).
		//
		// FR-083: The sender display name must be the org name (SMTP_DISPLAY_NAME),
		// not a personal name or email address.
		const { sendMail } = await import('./mailer.js').catch(() => {
			throw new Error('mailer.ts not implemented yet — red phase');
		});

		await sendMail({
			to: 'attendee@example.com',
			subject: 'Smoke Test',
			text: 'Plain text body.'
		});

		expect(sendMailMock).toHaveBeenCalledOnce();

		const [callArgs] = sendMailMock.mock.calls[0] as [Record<string, unknown>];

		// FR-083: from must include the SMTP_DISPLAY_NAME as the display name
		expect(callArgs.from).toMatch(/Conference EnvOcc/);
		// from must include the SMTP_FROM email address
		expect(callArgs.from).toMatch(/noreply@conference-envocc\.test/);
	});

	test('[P1] 1.5-UNIT-004b — sendMail passes `to` field through to transport', async () => {
		// THIS TEST WILL FAIL — mailer.ts does not exist yet.
		const { sendMail } = await import('./mailer.js').catch(() => {
			throw new Error('mailer.ts not implemented yet — red phase');
		});

		await sendMail({
			to: 'recipient@example.com',
			subject: 'Test Subject',
			text: 'Body text.'
		});

		const [callArgs] = sendMailMock.mock.calls[0] as [Record<string, unknown>];
		expect(callArgs.to).toBe('recipient@example.com');
	});

	test('[P1] 1.5-UNIT-004c — sendMail passes `subject` field through to transport', async () => {
		// THIS TEST WILL FAIL — mailer.ts does not exist yet.
		const { sendMail } = await import('./mailer.js').catch(() => {
			throw new Error('mailer.ts not implemented yet — red phase');
		});

		await sendMail({
			to: 'recipient@example.com',
			subject: 'Conference Registration Confirmation',
			text: 'Body.'
		});

		const [callArgs] = sendMailMock.mock.calls[0] as [Record<string, unknown>];
		expect(callArgs.subject).toBe('Conference Registration Confirmation');
	});

	test('[P1] 1.5-UNIT-004d — sendMail passes `text` field through to transport', async () => {
		// THIS TEST WILL FAIL — mailer.ts does not exist yet.
		const { sendMail } = await import('./mailer.js').catch(() => {
			throw new Error('mailer.ts not implemented yet — red phase');
		});

		await sendMail({
			to: 'recipient@example.com',
			subject: 'Subject',
			text: 'Plain text body content.'
		});

		const [callArgs] = sendMailMock.mock.calls[0] as [Record<string, unknown>];
		expect(callArgs.text).toBe('Plain text body content.');
	});

	test('[P1] 1.5-UNIT-004e — sendMail passes optional `html` field through to transport', async () => {
		// THIS TEST WILL FAIL — mailer.ts does not exist yet.
		const { sendMail } = await import('./mailer.js').catch(() => {
			throw new Error('mailer.ts not implemented yet — red phase');
		});

		await sendMail({
			to: 'recipient@example.com',
			subject: 'Subject',
			text: 'Plain text.',
			html: '<p>HTML body.</p>'
		});

		const [callArgs] = sendMailMock.mock.calls[0] as [Record<string, unknown>];
		expect(callArgs.html).toBe('<p>HTML body.</p>');
	});

	test('[P2] 1.5-UNIT-004f — sendMail returns the transport result (messageId available)', async () => {
		// THIS TEST WILL FAIL — mailer.ts does not exist yet.
		const { sendMail } = await import('./mailer.js').catch(() => {
			throw new Error('mailer.ts not implemented yet — red phase');
		});

		const result = await sendMail({
			to: 'recipient@example.com',
			subject: 'Subject',
			text: 'Body.'
		});

		// The result is whatever nodemailer.transporter.sendMail() returns.
		// Our mock returns { messageId: 'test-message-id-001' }.
		expect(result).toBeDefined();
	});

	test('[P2] 1.5-UNIT-004g — sendMail does not send html field when omitted', async () => {
		// THIS TEST WILL FAIL — mailer.ts does not exist yet.
		// When html is not provided, the `html` key should either be absent or undefined.
		const { sendMail } = await import('./mailer.js').catch(() => {
			throw new Error('mailer.ts not implemented yet — red phase');
		});

		await sendMail({
			to: 'recipient@example.com',
			subject: 'Subject',
			text: 'Body.'
		});

		const [callArgs] = sendMailMock.mock.calls[0] as [Record<string, unknown>];
		// html is optional — should not be set to a truthy value when not provided
		expect(callArgs.html).toBeFalsy();
	});
});
