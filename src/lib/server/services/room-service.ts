/**
 * Room service — Story 3.1
 *
 * Provides createRoom, updateRoom, listRooms, and getRoomById.
 * All mutations wrap DB operations in a transaction that also writes an audit_log entry
 * (AC-5 — audit on room mutations).
 *
 * Only active rooms are returned by listRooms (respects the is_active soft-delete flag).
 * getRoomById returns any room (including inactive) — used internally by the edit route.
 */
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
// deactivateRoom
// ---------------------------------------------------------------------------

/**
 * Soft-delete a room by setting is_active = false.
 * Wraps the UPDATE in a transaction that also writes an audit_log entry.
 * Does NOT check for future bookings — cascade behaviour is deferred to Story 7.1.
 *
 * @param actorId - The authenticated admin user's ID
 * @param roomId  - The room's primary key ID
 * @throws Error if no room row exists for the given ID
 */
export async function deactivateRoom(actorId: string, roomId: string): Promise<Room> {
	const existing = await getRoomById(roomId);
	if (!existing) {
		throw new Error('deactivateRoom: room not found');
	}

	return db.transaction(async (tx) => {
		const [room] = await tx
			.update(rooms)
			.set({
				isActive: false,
				updatedAt: new Date()
			})
			.where(eq(rooms.id, roomId))
			.returning();

		if (!room) {
			throw new Error(`deactivateRoom: no room row matched for update (id=${roomId})`);
		}

		await writeAuditLog(tx, {
			actorId,
			entity: 'room',
			action: 'deactivate',
			diff: { isActive: { old: true, new: false } }
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
