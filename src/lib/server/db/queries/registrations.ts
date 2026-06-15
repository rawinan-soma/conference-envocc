import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { NodePgQueryResultHKT } from 'drizzle-orm/node-postgres';
import type * as schema from '../schema/index.js';
import { registrations } from '../schema/registrations.js';
import type { RegistrationInsert, Registration } from '../schema/registrations.js';

// Matches the tx parameter inside db.transaction(async (tx) => { ... })
type DrizzleTransaction = PgTransaction<
	NodePgQueryResultHKT,
	typeof schema,
	ExtractTablesWithRelations<typeof schema>
>;

/**
 * Inserts a registration record inside a transaction.
 * Returns the newly created registration row.
 *
 * @param tx - Drizzle transaction (from db.transaction())
 * @param data - The registration data to insert
 */
export async function createRegistrant(
	tx: DrizzleTransaction,
	data: RegistrationInsert
): Promise<Registration> {
	const [row] = await tx.insert(registrations).values(data).returning();
	if (!row) {
		throw new Error('Failed to insert registration row');
	}
	return row;
}
