/**
 * Resend a Lost Link service — Story 5.5
 *
 * Handles the token replacement logic for the resend flow.
 *
 * Token replacement strategy (AR-05):
 *   - The original cancel token plaintext is never stored (only the sha256 hash).
 *   - A resend CANNOT re-send the original link.
 *   - A new 32-byte CSPRNG token is generated, its hash replaces the old hash in DB,
 *     and the new cancel link is built from the new plaintext.
 *   - The old cancel link is invalidated as a consequence (password-reset semantics).
 *
 * Neutral disclosure (R-003 PARTIAL MITIGATE — body/status neutrality only):
 *   - The DB lookup always executes — no early short-circuit before the query.
 *   - Returns found: boolean internally; the ACTION is responsible for discarding
 *     this from the response so the client never sees a found/not-found distinction.
 *   - Timing neutrality is consciously deferred (MVP): the found path runs
 *     SELECT + UPDATE + audit log while the not-found path runs SELECT only,
 *     creating a measurable latency difference. See story 5.5 §R-003 architecture
 *     note — this is an accepted residual risk; a constant-time dummy path can be
 *     added in a future story if the risk score is re-evaluated.
 *
 * Lint boundary (AR-06):
 *   - This service is under src/lib/server/services/ and is called only from
 *     +page.server.ts (web process). NEVER import this from worker.ts.
 *
 * [Source: architecture.md §AR-05 + §R-003]
 * [Source: src/lib/server/services/registration-service.ts — cancel token pattern]
 */

import { createHash, randomBytes } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { registrations } from '$lib/server/db/schema/registrations.js';
import { getActiveRegistrationByEmail } from '$lib/server/db/queries/registrations.js';
import { writeAuditLog } from '$lib/server/services/audit.js';

export type ResendRegistrationResult =
	| { found: false; eventName: string }
	| {
			found: true;
			cancelLink: string;
			registrationId: string;
			/** First 12 hex chars of the new cancel token plaintext (unique per rotation).
			 *  Used by the action to build a per-rotation singletonKey so every
			 *  token rotation enqueues a distinct email job (avoids stale-link bug
			 *  when the user resends twice within the dedup window).
			 */
			tokenNonce: string;
			firstName: string;
			lastName: string;
			eventName: string;
	  };

/**
 * Resend the confirmation link for a registration.
 *
 * Always runs the DB lookup (R-003 MITIGATE). When a status='registered'
 * row exists for the given email + booking, generates a NEW cancel token
 * (AR-05), replaces the stored hash, writes an audit log entry, and
 * returns the new cancel link. When no row exists, returns found: false.
 *
 * @param bookingId - The booking's primary key (from route action)
 * @param bookingEventToken - The public registration token (for cancel link URL)
 * @param email - Email address from the resend form
 * @param origin - Request origin (e.g. https://example.com) for building absolute URL
 * @param eventName - Event name from the booking row (passed in — not re-fetched)
 */
export async function resendRegistrationLink(
	bookingId: string,
	bookingEventToken: string,
	email: string,
	origin: string,
	eventName: string
): Promise<ResendRegistrationResult> {
	return db.transaction(async (tx) => {
		// R-003 MITIGATE: always execute the lookup — never short-circuit before this.
		const registration = await getActiveRegistrationByEmail(tx, bookingId, email);

		if (!registration) {
			return { found: false, eventName };
		}

		// AR-05: generate a new 32-byte CSPRNG cancel token.
		// The original plaintext is gone — we cannot re-send it. Replace the hash.
		const newPlaintext = randomBytes(32).toString('hex');
		const newHash = createHash('sha256').update(newPlaintext).digest('hex');

		// Replace the stored hash (old cancel link is now invalidated — intentional).
		await tx
			.update(registrations)
			.set({
				cancelTokenHash: newHash,
				updatedAt: sql`now()`
			})
			.where(eq(registrations.id, registration.id));

		// Build cancel link with the new plaintext (Story 5.4 contract: ?token= query param).
		const cancelLink = `${origin}/r/${bookingEventToken}/cancel?token=${newPlaintext}`;

		// AC-8: write audit log entry for the resend.
		await writeAuditLog(tx, {
			actorId: null, // unauthenticated external attendee
			entity: 'registration',
			action: 'resend-link',
			diff: { registrationId: registration.id }
		});

		return {
			found: true,
			cancelLink,
			registrationId: registration.id,
			// First 12 hex chars of the new plaintext — enough entropy to be
			// unique per rotation without exposing the full token.
			tokenNonce: newPlaintext.slice(0, 12),
			firstName: registration.firstName,
			lastName: registration.lastName,
			eventName
		};
	});
}
