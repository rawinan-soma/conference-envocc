// IMPORTANT: No $app/* or $env/dynamic imports here or in any imported module
// IMPORTANT: Use relative paths (not $lib alias) — Vite alias not available in standalone Bun process
import './lib/server/env.js'; // validate env at startup — will process.exit(1) on missing vars
import boss from './lib/server/jobs/boss.js';
import { QUEUE } from './lib/server/jobs/queues.js';
import { smokeEmailHandler } from './lib/server/jobs/handlers/smoke-email.js';
import { sendEmailHandler } from './lib/server/jobs/handlers/send-email.js';
import pino from 'pino';

const logger = pino({ level: 'info' });

async function main() {
	await boss.start();
	logger.info('pg-boss started');

	// pg-boss v12 WorkHandler passes Job<T>[] which extends our JobLike interface
	// Await boss.work() so registration errors surface immediately rather than being silently lost.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	await boss.work(QUEUE.SMOKE_EMAIL, smokeEmailHandler as any);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	await boss.work(QUEUE.SEND_EMAIL, sendEmailHandler as any);

	logger.info('Worker ready, handlers registered');

	process.on('SIGTERM', async () => {
		logger.info('SIGTERM received, stopping worker');
		await boss.stop();
		process.exit(0);
	});
}

main().catch((err) => {
	console.error('Worker startup failed:', err);
	process.exit(1);
});
