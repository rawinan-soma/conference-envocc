import { createHash, randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { bookings } from '$lib/server/db/schema/bookings.js';
import {
	createRegistrant,
	cancelRegistrantByCancelToken
} from '$lib/server/db/queries/registrations.js';
import { writeAuditLog } from '$lib/server/services/audit.js';
import type { RegistrationInput } from '$lib/schemas/registration.js';

/**
 * Thrown by createRegistration when registrationEnabled = false on the booking.
 * The route action catches this and returns fail(400, { form }).
 * The integration test (5.2-INT-CLOSED-001) asserts this is thrown.
 */
export class RegistrationClosedError extends Error {
	constructor() {
		super('Registration is closed for this event.');
		this.name = 'RegistrationClosedError';
	}
}

/**
 * Result of a successful registration.
 * cancelToken is the PLAINTEXT 64-char hex — pass to confirmation email service (Story 5.3).
 * Never store or return cancelToken to the browser.
 */
export type CreateRegistrationResult = {
	registrationId: string;
	cancelToken: string; // plaintext — for Story 5.3 email only
};

/**
 * Creates a registration record inside a db.transaction().
 * Re-checks registrationEnabled from the booking before inserting (R-005 MITIGATE).
 * Also writes an audit log entry.
 *
 * @param bookingId - The booking's primary key (from getBookingByRegistrationToken in the action)
 * @param input - Validated RegistrationInput from superforms + valibot
 * @returns registrationId and plaintext cancelToken (for Story 5.3 email)
 * @throws RegistrationClosedError if booking.registrationEnabled = false
 */
export async function createRegistration(
	bookingId: string,
	input: RegistrationInput
): Promise<CreateRegistrationResult> {
	const cancelTokenPlain = randomBytes(32).toString('hex');
	const cancelTokenHash = createHash('sha256').update(cancelTokenPlain).digest('hex');

	const result = await db.transaction(async (tx) => {
		// R-005 MITIGATE: re-read registrationEnabled inside the transaction (TOCTOU-safe)
		// Query the booking by PK inside the transaction to prevent race conditions.
		const [booking] = await tx
			.select({ id: bookings.id, registrationEnabled: bookings.registrationEnabled })
			.from(bookings)
			.where(eq(bookings.id, bookingId))
			.limit(1);

		if (!booking || !booking.registrationEnabled) {
			throw new RegistrationClosedError();
		}

		const registration = await createRegistrant(tx, {
			bookingId,
			title: input.title,
			titleOtherText: input.titleOtherText ?? null,
			firstName: input.firstName,
			lastName: input.lastName,
			organization: input.organization,
			email: input.email,
			mealType: input.mealType && input.mealType !== '' ? input.mealType : null,
			mealTypeOtherText: input.mealTypeOtherText ?? null,
			cancelTokenHash,
			status: 'registered'
		});

		await writeAuditLog(tx, {
			actorId: null, // unauthenticated external registrant
			entity: 'registration',
			action: 'create',
			diff: {
				registrationId: registration.id,
				bookingId,
				title: input.title
			}
		});

		return registration;
	});

	return {
		registrationId: result.id,
		cancelToken: cancelTokenPlain
	};
}

/**
 * Cancels a registration by the plaintext cancel token from the cancel link.
 *
 * AC-2 (R-002 MITIGATE): Single-use token — after first success, cancel_token_hash is NULL.
 * AC-3 (R-002 IDOR): No client-supplied registrationId — lookup is hash-only.
 *
 * @param cancelTokenPlain - 64-char hex plaintext from ?token= query parameter
 * @returns { cancelled: true } on success; { cancelled: false } if token invalid or already used
 */
export async function cancelRegistration(
	cancelTokenPlain: string
): Promise<{ cancelled: boolean }> {
	const result = await db.transaction(async (tx) => {
		const cancelResult = await cancelRegistrantByCancelToken(tx, cancelTokenPlain);

		if (cancelResult.cancelled) {
			await writeAuditLog(tx, {
				actorId: null, // unauthenticated external registrant (mirrors createRegistration)
				entity: 'registration',
				action: 'cancel',
				diff: {
					registrationId: cancelResult.registrationId,
					bookingId: cancelResult.bookingId
				}
			});
		}

		return { cancelled: cancelResult.cancelled };
	});

	return result;
}
