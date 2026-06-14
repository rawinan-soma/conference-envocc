/**
 * Booking form schema — Story 4.4
 *
 * Shared Valibot schema for creating a booking.
 * Validated on the server in the /bookings/new route action via superforms + valibot adapter.
 *
 * Field model: `startAt` and `endAt` are ISO datetime strings from `<input type="datetime-local">`.
 * A browser datetime-local input submits a value like "2026-07-01T09:00" — this passes v.isoDateTime().
 * The `?date=` query param is used ONLY to pre-populate the date portion of startAt/endAt in the
 * load function (e.g. `startAt: date ? date + 'T09:00' : ''`). There is NO separate `date` field in
 * the schema. This matches the established block-slot pattern (src/lib/schemas/block-slot.ts).
 *
 * Cross-field check: endAt > startAt (ISO string comparison is valid for datetime-local values).
 * Cross-field check: registrationClosesAt required when registrationEnabled = true.
 *
 * Note: roomId is validated as non-empty (the pre-filled value from ?room= param
 * or from the room selector). The dev does NOT need to fetch-validate that the
 * room exists in this schema — that's handled in the service.
 *
 * registrationClosesAt: The `<input type="datetime-local">` is conditionally rendered when
 * registrationEnabled is true. When the checkbox is unchecked and the input is hidden, the
 * browser may still submit an empty string "". v.optional() skips validation only for
 * `undefined`, not `""`, so without the v.literal('') branch, an empty string would fail
 * isoDateTime and surface a spurious validation error. The union accepts "" as valid/absent.
 * When the field is visible and filled, isoDateTime validates it normally.
 */
import * as v from 'valibot';

export const BookingSchema = v.pipe(
	v.object({
		roomId: v.pipe(v.string(), v.minLength(1, 'Room is required.')),
		eventName: v.pipe(v.string(), v.trim(), v.minLength(1, 'Event name is required.')),
		startAt: v.pipe(v.string(), v.isoDateTime('Start must be a valid date-time.')),
		endAt: v.pipe(v.string(), v.isoDateTime('End must be a valid date-time.')),
		agenda: v.optional(v.pipe(v.string(), v.trim())),
		cateringEnabled: v.boolean(),
		registrationEnabled: v.boolean(),
		// Accept '' (empty string from a hidden/unfilled datetime-local input) as a valid
		// absent value — v.optional() only bypasses for `undefined`, not `""`, so without
		// the v.literal('') branch, a hidden input would submit "" and fail isoDateTime.
		// The cross-field forward check uses !!d.registrationClosesAt, so '' is treated as
		// absent (falsy) and triggers the "required" error when registrationEnabled is true.
		// The service guard also uses !!input.registrationClosesAt, so '' → null stored (correct).
		registrationClosesAt: v.optional(
			v.union([
				v.literal(''),
				v.pipe(v.string(), v.isoDateTime('Registration closing date must be a valid date-time.'))
			])
		)
	}),
	v.check((d) => d.endAt > d.startAt, 'End time must be after start time.'),
	// Forward to the registrationClosesAt field so the dedicated field-level error renders
	// (booking_registration_closes_required) instead of leaking into the path-less _errors
	// loop, which would otherwise show the end-after-start message. (Story 4.4 code review)
	v.forward(
		v.check(
			(d) => !d.registrationEnabled || !!d.registrationClosesAt,
			'Registration closing date is required when registration is enabled.'
		),
		['registrationClosesAt']
	)
);

export type BookingInput = v.InferOutput<typeof BookingSchema>;
