/**
 * ATDD Red-Phase Scaffolds — Story 1.5: Jobs & Email Platform
 * Module: src/lib/server/jobs/handlers/smoke-email.ts — Smoke Email Handler
 *
 * TDD RED PHASE: All tests are marked test() and will remain skipped
 * until the developer activates them task-by-task during implementation.
 *
 * Activation guide:
 *   1. Remove `test(` → `test(` for the current task's test.
 *   2. Run: `bun run test` — verify it FAILS first (red).
 *   3. Implement smoke-email.ts handler.
 *   4. Run again — verify it PASSES (green).
 *   5. Commit passing tests.
 *
 * AC Coverage:
 *   - AC-2: smoke-email handler calls mailer.sendMail once with expected args
 *   - AC-4: handler propagates errors (allowing pg-boss dead-letter on retries)
 *
 * Design note: mailer is spied on — no real SMTP is contacted.
 * The handler receives a pg-boss job object; we construct a minimal stub.
 */

import { randomBytes } from 'node:crypto';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Env mock — must be hoisted before handler imports env.ts
// ---------------------------------------------------------------------------
vi.mock('../../env.js', () => ({
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
// Mailer spy — captures calls to sendMail without hitting SMTP
// ---------------------------------------------------------------------------
const sendMailSpy = vi.fn().mockResolvedValue({ messageId: 'smoke-msg-id-001' });

vi.mock('../../email/mailer.js', () => ({
	sendMail: sendMailSpy
}));

// ---------------------------------------------------------------------------
// Minimal pg-boss job stub for unit tests
// ---------------------------------------------------------------------------

interface MinimalJob<T> {
	id: string;
	name: string;
	data: T;
	retrycount: number;
	expirein: string;
	createdon: Date;
	startedon: Date;
}

function makeSmokeEmailJob(data: { to: string; requestedAt: string }): MinimalJob<typeof data> {
	return {
		id: 'test-job-id-001',
		name: 'smoke-email',
		data,
		retrycount: 0,
		expirein: '24 hours',
		createdon: new Date('2026-06-10T00:00:00Z'),
		startedon: new Date('2026-06-10T00:00:01Z')
	};
}

// ---------------------------------------------------------------------------
// 1.5-UNIT-005 — smokeEmailHandler: calls sendMail once
// ---------------------------------------------------------------------------

describe('Story 1.5 — smokeEmailHandler (AC-2)', () => {
	beforeEach(() => {
		sendMailSpy.mockClear();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	test('[P1] 1.5-UNIT-005 — smokeEmailHandler calls sendMail exactly once', async () => {
		// THIS TEST WILL FAIL — smoke-email.ts handler does not exist yet.
		// Activate after Task 2.4 (smoke-email handler created).
		const { smokeEmailHandler } = await import('./smoke-email.js').catch(() => {
			throw new Error('smoke-email.ts not implemented yet — red phase');
		});

		const job = makeSmokeEmailJob({
			to: 'smoke-recipient@example.com',
			requestedAt: '2026-06-10T00:00:00.000Z'
		});

		await smokeEmailHandler(job);

		expect(sendMailSpy).toHaveBeenCalledOnce();
	});

	test('[P1] 1.5-UNIT-005b — smokeEmailHandler passes `to` address to sendMail', async () => {
		// THIS TEST WILL FAIL — smoke-email.ts handler does not exist yet.
		// The handler must pass the job payload `to` to the mailer.
		const { smokeEmailHandler } = await import('./smoke-email.js').catch(() => {
			throw new Error('smoke-email.ts not implemented yet — red phase');
		});

		const job = makeSmokeEmailJob({
			to: 'smoke-recipient@example.com',
			requestedAt: '2026-06-10T00:00:00.000Z'
		});

		await smokeEmailHandler(job);

		const [callArgs] = sendMailSpy.mock.calls[0] as [Record<string, unknown>];
		expect(callArgs.to).toBe('smoke-recipient@example.com');
	});

	test('[P1] 1.5-UNIT-005c — smokeEmailHandler sends a non-empty subject', async () => {
		// THIS TEST WILL FAIL — smoke-email.ts handler does not exist yet.
		// Subject is defined by the smoke template — must be a non-empty string.
		const { smokeEmailHandler } = await import('./smoke-email.js').catch(() => {
			throw new Error('smoke-email.ts not implemented yet — red phase');
		});

		const job = makeSmokeEmailJob({
			to: 'smoke-recipient@example.com',
			requestedAt: '2026-06-10T00:00:00.000Z'
		});

		await smokeEmailHandler(job);

		const [callArgs] = sendMailSpy.mock.calls[0] as [Record<string, unknown>];
		expect(typeof callArgs.subject).toBe('string');
		expect((callArgs.subject as string).length).toBeGreaterThan(0);
	});

	test('[P1] 1.5-UNIT-005d — smokeEmailHandler sends a non-empty text body', async () => {
		// THIS TEST WILL FAIL — smoke-email.ts handler does not exist yet.
		const { smokeEmailHandler } = await import('./smoke-email.js').catch(() => {
			throw new Error('smoke-email.ts not implemented yet — red phase');
		});

		const job = makeSmokeEmailJob({
			to: 'smoke-recipient@example.com',
			requestedAt: '2026-06-10T00:00:00.000Z'
		});

		await smokeEmailHandler(job);

		const [callArgs] = sendMailSpy.mock.calls[0] as [Record<string, unknown>];
		expect(typeof callArgs.text).toBe('string');
		expect((callArgs.text as string).length).toBeGreaterThan(0);
	});

	test('[P2] 1.5-UNIT-005e — smokeEmailHandler does not call sendMail more than once per job', async () => {
		// THIS TEST WILL FAIL — smoke-email.ts handler does not exist yet.
		// Ensures the handler does not accidentally call sendMail twice (e.g., duplicate template rendering).
		const { smokeEmailHandler } = await import('./smoke-email.js').catch(() => {
			throw new Error('smoke-email.ts not implemented yet — red phase');
		});

		const job = makeSmokeEmailJob({
			to: 'smoke-recipient@example.com',
			requestedAt: '2026-06-10T00:00:00.000Z'
		});

		await smokeEmailHandler(job);

		expect(sendMailSpy).toHaveBeenCalledTimes(1);
	});
});

// ---------------------------------------------------------------------------
// 1.5-UNIT-006 — smokeEmailHandler: error propagation (AC-4 dead-letter)
// ---------------------------------------------------------------------------

describe('Story 1.5 — smokeEmailHandler error propagation (AC-4)', () => {
	beforeEach(() => {
		sendMailSpy.mockClear();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	test('[P1] 1.5-UNIT-006 — smokeEmailHandler propagates sendMail errors (enables pg-boss dead-letter)', async () => {
		// THIS TEST WILL FAIL — smoke-email.ts handler does not exist yet.
		//
		// AC-4: When nodemailer encounters a transport error and retries are exhausted,
		// the job lands in the pg-boss dead-letter queue.
		// pg-boss dead-letters automatically when the handler throws.
		// This test verifies the handler does NOT swallow errors.
		const { smokeEmailHandler } = await import('./smoke-email.js').catch(() => {
			throw new Error('smoke-email.ts not implemented yet — red phase');
		});

		const transportError = new Error('SMTP connection refused');
		sendMailSpy.mockRejectedValueOnce(transportError);

		const job = makeSmokeEmailJob({
			to: 'smoke-recipient@example.com',
			requestedAt: '2026-06-10T00:00:00.000Z'
		});

		// The handler must re-throw (or not catch) the error so pg-boss can retry/dead-letter.
		await expect(smokeEmailHandler(job)).rejects.toThrow('SMTP connection refused');
	});
});
