// pg-boss singleton — connect once, export instance
// IMPORTANT: Use relative import — $lib alias not available in worker process
import { PgBoss } from 'pg-boss';
import { env } from '../env.js';

const boss = new PgBoss({
	connectionString: env.DATABASE_URL
	// pg-boss schema lives in 'pgboss' by default — do not change
	// Note: retryLimit, retryDelay, expireInSeconds, deleteAfterSeconds are
	// queue-level options set via boss.createQueue() or per-send options in pg-boss v12
});

export default boss;
