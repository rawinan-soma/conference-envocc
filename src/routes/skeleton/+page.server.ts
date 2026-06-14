import { db } from '$lib/server/db';
import { writeAuditLog } from '$lib/server/services/audit';
import { bookings } from '$lib/server/db/schema/bookings';
import { enqueueJob, QUEUE } from '$lib/server/jobs';
import { sql } from 'drizzle-orm';

export async function load() {
	let insertedId: string | null = null;

	try {
		await db.transaction(async (tx) => {
			const result = await tx
				.insert(bookings)
				.values({
					roomId: 'skeleton-probe',
					organizerId: 'skeleton-probe', // ADD: dummy value for NOT NULL column (Story 4.4)
					eventName: 'Skeleton Probe', // ADD: dummy value for NOT NULL column (Story 4.4)
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

		// Enqueue smoke-email job after the transaction commits.
		// If the job queue is not available (e.g. worker not started in this process),
		// log and continue — the page still renders successfully.
		let jobEnqueued = false;
		try {
			await enqueueJob(
				QUEUE.SMOKE_EMAIL,
				{ to: 'skeleton@example.com', requestedAt: new Date().toISOString() },
				{ singletonKey: 'skeleton-probe' }
			);
			jobEnqueued = true;
		} catch (jobErr: unknown) {
			console.warn('[skeleton] enqueueJob failed (worker may not be running):', jobErr);
		}

		return { insertedId, conflict: false, jobEnqueued };
	} catch (err: unknown) {
		// Check for EXCLUDE constraint violation (23P01) — the probe row already exists (idempotent).
		// Drizzle wraps pg errors in DrizzleQueryError, so check both err.code and err.cause.code.
		const code =
			(err instanceof Error && 'code' in err ? (err as { code?: string }).code : undefined) ??
			(err instanceof Error && err.cause instanceof Error && 'code' in err.cause
				? (err.cause as { code?: string }).code
				: undefined);
		if (code === '23P01') {
			return { insertedId: null, conflict: true, jobEnqueued: false };
		}
		throw err; // re-throw unexpected errors
	}
}
