/**
 * Database connection — Story 1.6 (carry-forward from Story 1.8/1.3)
 *
 * Exports a pg.Pool and a Drizzle ORM instance with schema.
 * Used by production server and worker code.
 *
 * Note: boss.ts reads env.DATABASE_URL directly and does NOT import this module.
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { NodePgQueryResultHKT } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../env.js'; // relative import — $lib alias not available in worker
import * as schema from './schema/index.js';

export const pool = new Pool({ connectionString: env.DATABASE_URL });
export const db = drizzle(pool, { schema });
export type DrizzleDb = typeof db;

/** Matches the `tx` parameter inside `db.transaction(async (tx) => { ... })`. */
export type DrizzleTransaction = PgTransaction<
	NodePgQueryResultHKT,
	typeof schema,
	ExtractTablesWithRelations<typeof schema>
>;
