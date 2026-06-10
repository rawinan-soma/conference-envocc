// Re-exports: boss, QUEUE, enqueueJob helper
// IMPORTANT: Use relative imports — $lib alias not available in worker process
import type { SendOptions } from 'pg-boss';

export { default as boss } from './boss.js';
export { QUEUE } from './queues.js';

/**
 * Enqueue a job with an idempotency key.
 * Supply `singletonKey` (pg-boss v12 field) for deduplication.
 * Format: `<queue-name>:<entity-id>:<event>` e.g. `send-email:booking:abc123:confirmation`
 */
export async function enqueueJob<T>(
	queue: string,
	data: T,
	options: SendOptions & { singletonKey?: string; key?: string }
) {
	const { default: boss } = await import('./boss.js');
	// Support both `key` (legacy/tests) and `singletonKey` (pg-boss v12 native)
	const sendOptions: SendOptions = {
		...options,
		singletonKey: options.singletonKey ?? options.key
	};
	return boss.send(queue, data as object, sendOptions);
}
