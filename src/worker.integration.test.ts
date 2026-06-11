/**
 * ATDD Red-Phase Scaffolds — Story 1.5: Jobs & Email Platform
 * Integration Test: Worker + pg-boss + Mailpit
 *
 * TDD RED PHASE: ALL tests in this file use test.skip() and will remain
 * skipped until Story 1.8 (Test Harness & CI) wires real Postgres + Mailpit
 * into the CI environment.
 *
 * Activation guide (Story 1.8+):
 *   1. Remove `test.skip(` → `test(` for each test below.
 *   2. Ensure Postgres + Mailpit are running (via docker compose or CI services).
 *   3. Set DATABASE_URL, SMTP_HOST, SMTP_PORT, etc. in the test environment.
 *   4. Run: `bun run test` — verify it FAILS first (red).
 *   5. Implement the worker startup and job dispatch.
 *   6. Run again — verify it PASSES (green).
 *
 * AC Coverage:
 *   - AC-1: Worker process connects to pg-boss and begins polling without errors
 *   - AC-2: smoke-email job enqueued → handler picks it up → mailer spy invoked
 *   - AC-3: Idempotency — same key enqueued twice → only one email delivered
 *   - AC-4: Dead-letter — failed job lands in pgboss.job with state = 'failed'
 *
 * Note: This file is included in vitest's `server` project (node environment).
 * Real Postgres connectivity is required for these tests to pass.
 */

import { describe, test, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Test timeout — pg-boss polling can take 1–3 seconds
// ---------------------------------------------------------------------------

const JOB_POLL_TIMEOUT_MS = 10_000;

// ---------------------------------------------------------------------------
// Mailer spy — so we can assert emails were "sent" without real SMTP
// ---------------------------------------------------------------------------
const sendMailSpy = vi.fn().mockResolvedValue({ messageId: 'integration-msg-id-001' });

vi.mock('./lib/server/email/mailer.js', () => ({
	sendMail: sendMailSpy
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Waits up to `timeoutMs` for `condition()` to return truthy.
 * Polls every `intervalMs` milliseconds.
 * Used to await pg-boss picking up a job.
 */
async function waitFor(
	condition: () => boolean | Promise<boolean>,
	timeoutMs = JOB_POLL_TIMEOUT_MS,
	intervalMs = 250
): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (await condition()) return;
		await new Promise((r) => setTimeout(r, intervalMs));
	}
	throw new Error(`waitFor: condition not met within ${timeoutMs}ms`);
}

// ---------------------------------------------------------------------------
// 1.5-INT-001 — Worker startup
// ---------------------------------------------------------------------------

describe('Story 1.5 — Worker Integration Tests (AC-1, AC-2, AC-3, AC-4)', () => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let boss: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let enqueueJob: (queue: string, data: unknown, options: { key: string }) => Promise<any>;
	let QUEUE: Record<string, string>;

	beforeAll(async () => {
		// Import real modules — DATABASE_URL must be set (Testcontainers or CI service).
		const bossModule = await import('./lib/server/jobs/boss.js');
		const queuesModule = await import('./lib/server/jobs/queues.js');
		const indexModule = await import('./lib/server/jobs/index.js');
		const smokeHandler = await import('./lib/server/jobs/handlers/smoke-email.js');

		boss = bossModule.default;
		QUEUE = queuesModule.QUEUE;
		enqueueJob = indexModule.enqueueJob;

		await boss.start();

		// pg-boss v12 requires explicit queue creation before send/work/getQueueStats can be used.
		// createQueue is idempotent — safe to call on every startup.
		await boss.createQueue(QUEUE.SMOKE_EMAIL);

		await boss.work(QUEUE.SMOKE_EMAIL, smokeHandler.smokeEmailHandler);
	});

	afterAll(async () => {
		if (boss) {
			await boss.stop();
		}
		vi.restoreAllMocks();
	});

	beforeEach(() => {
		sendMailSpy.mockClear();
	});

	test('[P1] 1.5-INT-001 — Worker starts and pg-boss begins polling without errors', async () => {
		// Requires: real Postgres at DATABASE_URL, SMTP vars in env.
		expect(boss).toBeDefined();
		// If boss.start() succeeded, the worker is polling.
		// pg-boss emits an 'error' event on connection failure — absence of error means success.
		// getQueueStats (pg-boss v12 API) returns queue metadata including counts.
		await expect(boss.getQueueStats(QUEUE.SMOKE_EMAIL)).resolves.toBeDefined();
	});

	test('[P1] 1.5-INT-002 — Enqueue smoke-email → handler picks it up → sendMail invoked', async () => {
		// THIS TEST WILL FAIL — worker not implemented + no real Postgres.
		// Activate in Story 1.8.
		//
		// AC-2: Given the worker is running, When a `smoke-email` job is enqueued,
		// Then the handler picks it up and calls mailer.sendMail with correct args.
		const idempotencyKey = `smoke-email:integration-test:${Date.now()}`;

		await enqueueJob(
			QUEUE.SMOKE_EMAIL,
			{
				to: 'integration-test@example.com',
				requestedAt: new Date().toISOString()
			},
			{ key: idempotencyKey }
		);

		// Wait for the worker to pick up and process the job
		await waitFor(() => sendMailSpy.mock.calls.length > 0);

		expect(sendMailSpy).toHaveBeenCalledOnce();

		const [callArgs] = sendMailSpy.mock.calls[0] as [Record<string, unknown>];
		expect(callArgs.to).toBe('integration-test@example.com');
	});

	test('[P1] 1.5-INT-003 — Idempotency: same key enqueued twice → only one email delivered (AC-3)', async () => {
		// THIS TEST WILL FAIL — worker not implemented + no real Postgres.
		// Activate in Story 1.8.
		//
		// AC-3: Given an email job is enqueued with an idempotency key,
		// When the same key is enqueued again,
		// Then pg-boss deduplicates it and only one email is delivered.
		const idempotencyKey = `smoke-email:idempotency-test:abc123`;

		const payload = {
			to: 'dedup-test@example.com',
			requestedAt: new Date().toISOString()
		};

		// Enqueue the same job twice with the same key
		await enqueueJob(QUEUE.SMOKE_EMAIL, payload, { key: idempotencyKey });
		await enqueueJob(QUEUE.SMOKE_EMAIL, payload, { key: idempotencyKey });

		// Wait for the handler to fire
		await waitFor(() => sendMailSpy.mock.calls.length > 0);

		// Only one email must be delivered — pg-boss deduplicates by key
		expect(sendMailSpy).toHaveBeenCalledTimes(1);
	});

	test('[P1] 1.5-INT-004 — Dead-letter: failed handler causes job to land in pgboss.job with state=failed (AC-4)', async () => {
		// AC-4: Given nodemailer encounters a transport error on a job,
		// When retries are exhausted, Then the job lands in the pg-boss dead-letter queue
		// with state = 'failed' and output contains the error.
		//
		// Strategy: Make sendMailSpy reject consistently to exhaust pg-boss retries.
		// Then use findJobs (pg-boss v12 API) to verify state = 'failed'.

		sendMailSpy.mockRejectedValue(new Error('Simulated SMTP failure for dead-letter test'));

		const idempotencyKey = `smoke-email:dead-letter-test:${Date.now()}`;

		await enqueueJob(
			QUEUE.SMOKE_EMAIL,
			{
				to: 'dead-letter-test@example.com',
				requestedAt: new Date().toISOString()
			},
			{ key: idempotencyKey }
		);

		// pg-boss retryLimit is 3 × retryDelay 60s — for integration test, we force immediate failure.
		// Wait for the job to transition to failed state (may need adjusted retryLimit in test env).
		await waitFor(async () => {
			// findJobs (pg-boss v12 API) searches by singletonKey
			const jobs = await boss.findJobs(QUEUE.SMOKE_EMAIL, { key: idempotencyKey });
			return jobs.some((job: { state?: string }) => job.state === 'failed');
		}, 30_000); // Allow up to 30s for retry cycle in integration

		// Verify job is in failed state — this confirms the dead-letter behavior
		const jobs = await boss.findJobs(QUEUE.SMOKE_EMAIL, { key: idempotencyKey });
		const targetJob = jobs.find((job: { state?: string }) => job.state === 'failed');

		expect(targetJob).toBeDefined();
		expect(targetJob?.state).toBe('failed');
	});
});
