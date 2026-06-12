/**
 * Room service — Story 3.1 + 3.2
 *
 * Provides createRoom, updateRoom, listRooms, getRoomById, and uploadRoomPhoto.
 * All mutations wrap DB operations in a transaction that also writes an audit_log entry
 * (AC-5 — audit on room mutations).
 *
 * Only active rooms are returned by listRooms (respects the is_active soft-delete flag).
 * getRoomById returns any room (including inactive) — used internally by the edit route.
 */
import * as fs from 'fs/promises';
import * as path from 'path';

import { asc, eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import type { RoomFeature, RoomInput } from '$lib/schemas/room.js';

import { db } from '../db/index.js';
import { rooms } from '../db/schema/rooms.js';
import type { Room } from '../db/schema/rooms.js';
import { writeAuditLog } from './audit.js';

/**
 * Broader input type that accepts both mutable and readonly feature arrays.
 * This allows callers (tests) to use `as const` tuples for features without TS errors.
 */
type RoomInputBroad = Omit<RoomInput, 'features'> & {
	features: ReadonlyArray<RoomFeature>;
};

// ---------------------------------------------------------------------------
// listRooms
// ---------------------------------------------------------------------------

/**
 * Return all active rooms ordered by floor then name.
 * Used by the admin room list and (Epic 4) booking/calendar selectors.
 * Leverages the partial index `idx_rooms_is_active WHERE is_active = true` (Task 1.3).
 */
export async function listRooms(): Promise<Room[]> {
	return db
		.select()
		.from(rooms)
		.where(eq(rooms.isActive, true))
		.orderBy(asc(rooms.floor), asc(rooms.name));
}

// ---------------------------------------------------------------------------
// getRoomById
// ---------------------------------------------------------------------------

/**
 * Look up a room by its primary key ID.
 * Returns null if the room does not exist.
 * Returns inactive rooms — callers can check isActive if needed.
 */
export async function getRoomById(id: string): Promise<Room | null> {
	const rows = await db.select().from(rooms).where(eq(rooms.id, id));
	return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// createRoom
// ---------------------------------------------------------------------------

/**
 * Insert a new room row inside a transaction that also writes an audit_log entry.
 *
 * @param actorId - The authenticated admin user's ID
 * @param input   - Validated RoomInput (name, floor, capacity, features)
 */
export async function createRoom(actorId: string, input: RoomInputBroad): Promise<Room> {
	return db.transaction(async (tx) => {
		const [room] = await tx
			.insert(rooms)
			.values({
				id: uuidv7(), // UUID v7 — time-ordered, non-enumerable
				name: input.name,
				floor: input.floor,
				capacity: input.capacity,
				features: [...input.features],
				isActive: true
			})
			.returning();

		if (!room) {
			// Defensive: a successful INSERT ... RETURNING always yields a row.
			// Check before writing the audit log so we fail fast (the tx rolls back either way).
			throw new Error('createRoom: insert returned no row');
		}

		await writeAuditLog(tx, {
			actorId,
			entity: 'room',
			action: 'create',
			diff: {
				name: input.name,
				floor: input.floor,
				capacity: input.capacity,
				features: [...input.features]
			}
		});

		return room;
	});
}

// ---------------------------------------------------------------------------
// updateRoom
// ---------------------------------------------------------------------------

/**
 * Compute diff between existing room and new input (only changed fields).
 */
function computeRoomDiff(
	existing: Room,
	input: RoomInputBroad
): Record<string, { old: unknown; new: unknown }> {
	const diff: Record<string, { old: unknown; new: unknown }> = {};

	if (existing.name !== input.name) {
		diff['name'] = { old: existing.name, new: input.name };
	}
	if (existing.floor !== input.floor) {
		diff['floor'] = { old: existing.floor, new: input.floor };
	}
	if (existing.capacity !== input.capacity) {
		diff['capacity'] = { old: existing.capacity, new: input.capacity };
	}

	// Features: compare sorted arrays to detect changes regardless of order
	const existingFeaturesSorted = [...existing.features].sort().join(',');
	const inputFeaturesSorted = [...input.features].sort().join(',');
	if (existingFeaturesSorted !== inputFeaturesSorted) {
		diff['features'] = { old: existing.features, new: input.features };
	}

	return diff;
}

/**
 * Update an existing room row inside a transaction that also writes an audit_log entry.
 * No-op if nothing changed (avoids empty-diff audit log pollution).
 *
 * @param actorId - The authenticated admin user's ID
 * @param roomId  - The room's primary key ID
 * @param input   - Validated RoomInput with updated values
 * @throws Error if no room row exists for the given ID
 */
export async function updateRoom(
	actorId: string,
	roomId: string,
	input: RoomInputBroad
): Promise<Room> {
	// Load the current row to compute diff and validate existence
	const existing = await getRoomById(roomId);
	if (!existing) {
		throw new Error(`updateRoom: room ${roomId} not found`);
	}

	const diff = computeRoomDiff(existing, input);

	// No-op save: nothing changed — skip UPDATE + audit log
	if (Object.keys(diff).length === 0) {
		return existing;
	}

	return db.transaction(async (tx) => {
		const [room] = await tx
			.update(rooms)
			.set({
				name: input.name,
				floor: input.floor,
				capacity: input.capacity,
				features: [...input.features],
				updatedAt: new Date() // Drizzle does NOT auto-update updatedAt — must be explicit
			})
			.where(eq(rooms.id, roomId))
			.returning();

		if (!room) {
			throw new Error(`updateRoom: no room row matched for update (id=${roomId})`);
		}

		await writeAuditLog(tx, {
			actorId,
			entity: 'room',
			action: 'update',
			diff
		});

		return room;
	});
}

// ---------------------------------------------------------------------------
// uploadRoomPhoto
// ---------------------------------------------------------------------------

/**
 * Allowed MIME types for room photo uploads.
 * Server-side validation only — never rely on file extension alone.
 */
export const ALLOWED_PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/**
 * Map from MIME type to file extension for stored filenames.
 */
const MIME_TO_EXT: Record<(typeof ALLOWED_PHOTO_MIME_TYPES)[number], string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp'
};

/**
 * Stable, locale-independent codes for photo validation failures.
 * The HTTP layer maps each code to a localized Paraglide message (never raw English).
 */
export type PhotoValidationCode = 'invalid_type' | 'too_large';

/**
 * Typed validation error for photo upload failures (MIME type or size).
 * The HTTP layer (form action) maps this to HTTP 422 and the `code` to a localized message.
 */
export class PhotoValidationError extends Error {
	readonly code: PhotoValidationCode;

	constructor(code: PhotoValidationCode, message: string) {
		super(message);
		this.name = 'PhotoValidationError';
		this.code = code;
	}
}

/**
 * Upload a room photo to the on-prem volume and record the path in the DB.
 *
 * Implementation notes (Story 3.2 Dev Notes):
 * - Resolves UPLOAD_DIR from process.env (not SvelteKit $env) — service must stay portable.
 * - Validates MIME type against ALLOWED_PHOTO_MIME_TYPES (throws PhotoValidationError if rejected).
 * - Validates size ≤ PHOTO_MAX_BYTES (default 10MB; env-configurable).
 * - Filename: `{uuidv7()}-{roomId}.{ext}` — time-ordered, unique, non-enumerable. The
 *   filename is reduced to its basename so an attacker-influenced roomId (no UUID route
 *   matcher exists) can never inject path separators into the stored path.
 * - File written BEFORE the DB transaction (safe ordering: if the file write fails, no DB
 *   change occurs). If the transaction fails, the just-written file is unlinked so it does
 *   not orphan on the volume. NOTE: uuid-prefixed names never collide, so a failed upload
 *   is NOT "overwritten on retry" — explicit cleanup is required.
 * - DB UPDATE + writeAuditLog wrapped in db.transaction() for atomicity (AC-1).
 *
 * @param actorId - The authenticated admin user's ID
 * @param roomId  - The room's primary key ID
 * @param file    - File data, MIME type, and size (from FormData File)
 * @throws PhotoValidationError if MIME type or size is invalid
 * @throws Error if UPLOAD_DIR is not set at runtime
 */
export async function uploadRoomPhoto(
	actorId: string,
	roomId: string,
	file: { data: Buffer; mimeType: string; size: number }
): Promise<Room> {
	// Resolve UPLOAD_DIR from process.env — throws clearly if not set
	const uploadDir = process.env['UPLOAD_DIR'];
	if (!uploadDir) {
		throw new Error(
			'uploadRoomPhoto: UPLOAD_DIR environment variable is not set. ' +
				'Configure UPLOAD_DIR to point to the on-prem volume mount path.'
		);
	}

	// Validate MIME type against allowed list
	const allowedMimes: readonly string[] = ALLOWED_PHOTO_MIME_TYPES;
	if (!allowedMimes.includes(file.mimeType)) {
		throw new PhotoValidationError(
			'invalid_type',
			`Unsupported file type: ${file.mimeType}. ` +
				`Allowed types: ${ALLOWED_PHOTO_MIME_TYPES.join(', ')}.`
		);
	}

	// Validate file size
	const maxBytes = Number(process.env['PHOTO_MAX_BYTES'] ?? String(10 * 1024 * 1024));
	if (file.size > maxBytes) {
		throw new PhotoValidationError(
			'too_large',
			`File size ${file.size} bytes exceeds the maximum allowed size of ${maxBytes} bytes.`
		);
	}

	// Generate unique filename: {uuidv7()}-{roomId}.{ext}
	// basename() strips any path separators a malicious roomId could introduce (defense in
	// depth — there is no UUID route matcher, so roomId is not guaranteed to be a bare UUID).
	const mimeType = file.mimeType as (typeof ALLOWED_PHOTO_MIME_TYPES)[number];
	const ext = MIME_TO_EXT[mimeType];
	const filename = path.basename(`${uuidv7()}-${roomId}.${ext}`);

	// Ensure the upload directory exists
	await fs.mkdir(uploadDir, { recursive: true });

	// Write the file BEFORE the DB transaction (safe ordering: a write failure means no DB change)
	const filePath = path.join(uploadDir, filename);
	await fs.writeFile(filePath, file.data);

	// Wrap DB update + audit log in a transaction (atomicity — AC-1).
	// If the transaction fails, unlink the just-written file so it does not orphan the volume.
	try {
		return await db.transaction(async (tx) => {
			const [room] = await tx
				.update(rooms)
				.set({
					photoPath: filename,
					updatedAt: new Date()
				})
				.where(eq(rooms.id, roomId))
				.returning();

			if (!room) {
				throw new Error(`uploadRoomPhoto: no room row matched for update (id=${roomId})`);
			}

			await writeAuditLog(tx, {
				actorId,
				entity: 'room',
				action: 'upload_photo',
				diff: { photoPath: filename }
			});

			return room;
		});
	} catch (err) {
		// Best-effort cleanup of the orphaned file; swallow unlink errors so the original
		// transaction error is what propagates to the caller.
		await fs.unlink(filePath).catch(() => {});
		throw err;
	}
}
