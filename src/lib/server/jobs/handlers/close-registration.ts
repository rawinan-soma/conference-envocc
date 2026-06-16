// Handler for close-registration queue
// Closes registration on a booking when the closing date is reached.
// IMPORTANT: No $app/* or $env/dynamic imports — use relative paths
// R-011 DOCUMENT: The worker is a standalone Bun process (bun run src/worker.ts), NOT the
// SvelteKit dev server. Vite's $lib alias is a build-time SvelteKit feature unavailable in a
// raw Bun execution. Any import using $lib, $app/*, or $env/dynamic will throw
// MODULE_NOT_FOUND at runtime. Use only relative imports here.
import * as v from 'valibot';
import { eq, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { bookings } from '../../db/schema/bookings.js';
import { writeAuditLog } from '../../services/audit.js';
import { CloseRegistrationPayload } from '../queues.js';

// Minimal job shape — compatible with pg-boss Job<T> and unit test stubs
interface JobLike {
	id: string;
	name: string;
	data: unknown;
}

// pg-boss v12 WorkHandler receives an array of jobs; accepts single job for testability
export async function closeRegistrationHandler(jobOrJobs: JobLike | JobLike[]): Promise<void> {
	const jobs = Array.isArray(jobOrJobs) ? jobOrJobs : [jobOrJobs];
	for (const job of jobs) {
		const result = v.safeParse(CloseRegistrationPayload, job.data);
		if (!result.success) {
			throw new Error(
				`Invalid close-registration payload: ${JSON.stringify(v.flatten(result.issues))}`
			);
		}
		const { bookingId } = result.output;

		await db.transaction(async (tx) => {
			// R-004 MITIGATE: idempotency guard — re-read the booking inside the transaction
			const [booking] = await tx
				.select({
					id: bookings.id,
					registrationEnabled: bookings.registrationEnabled,
					registrationClosesAt: bookings.registrationClosesAt
				})
				.from(bookings)
				.where(eq(bookings.id, bookingId))
				.limit(1)
				.for('update'); // Row lock: serialize concurrent deliveries of the same job
			// so the enabled-check + UPDATE + audit-write are atomic (R-004 MITIGATE,
			// concurrent double-fire safe — not just sequential re-runs).

			if (!booking) {
				// Booking deleted — silently skip
				return;
			}
			if (!booking.registrationEnabled) {
				// Already closed — no-op (R-004 MITIGATE: double-fire safe)
				return;
			}
			// Time guard: close only when registrationClosesAt is set AND is in the past.
			// Two stale-job scenarios this handles:
			//   (a) registrationClosesAt was removed (set to null after this job was enqueued)
			//       → !booking.registrationClosesAt is true → no-op (removal means "don't auto-close")
			//   (b) registrationClosesAt was pushed to the future (date extended after enqueue)
			//       → booking.registrationClosesAt > new Date() → no-op (a later job will fire correctly)
			if (!booking.registrationClosesAt || booking.registrationClosesAt > new Date()) {
				// Stale or cancelled close job — no-op
				return;
			}

			await tx
				.update(bookings)
				.set({ registrationEnabled: false, updatedAt: sql`now()` })
				.where(eq(bookings.id, bookingId));

			await writeAuditLog(tx, {
				actorId: null, // system-triggered job
				entity: 'booking',
				action: 'close-registration',
				diff: { bookingId }
			});
		});
	}
}
