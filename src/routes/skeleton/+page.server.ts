import { db } from '$lib/server/db';
import { writeAuditLog } from '$lib/server/services/audit';
import { bookings } from '$lib/server/db/schema/bookings';
import { enqueueJob, QUEUE } from '$lib/server/jobs';
import { sql } from 'drizzle-orm';

export async function load() {
	let insertedId: number | null = null;

	try {
		await db.transaction(async (tx) => {
			const result = await tx
				.insert(bookings)
				.values({
					roomId: 'skeleton-probe',
					// Use raw SQL for tstzrange with Asia/Bangkok offset (+07)
					during: sql`tstzrange('2099-01-01 10:00:00+07', '2099-01-01 11:00:00+07', '[)')`,
					status: 'active'
				})
				.returning({ id: bookings.id });

			insertedId = result[0]?.id ?? null;

			await writeAuditLog(tx, {
				actorId: null,
				entity: 'booking',
				action: 'skeleton-probe',
				diff: { probe: true }
			});
		});

		// Enqueue smoke-email job after the transaction commits
		await enqueueJob(
			QUEUE.SMOKE_EMAIL,
			{ to: 'skeleton@example.com', requestedAt: new Date().toISOString() },
			{ singletonKey: 'skeleton-probe' }
		);

		return { insertedId, conflict: false, jobEnqueued: true };
	} catch (err: unknown) {
		if (err instanceof Error && 'code' in err && (err as { code?: string }).code === '23P01') {
			// EXCLUDE constraint fired — the probe row already exists (idempotent)
			return { insertedId: null, conflict: true, jobEnqueued: false };
		}
		throw err; // re-throw unexpected errors
	}
}
