/**
 * Database connection — Story 1.8 (carry-forward from Story 1.3)
 *
 * Exports a pg.Pool and a Drizzle ORM instance.
 * Used by production server and worker code.
 *
 * Note: boss.ts reads env.DATABASE_URL directly and does NOT import this module.
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../env.js';

export const pool = new Pool({ connectionString: env.DATABASE_URL });
export const db = drizzle(pool);
