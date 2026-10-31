import 'dotenv/config';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

/** A database that is still starting (a fresh container, a restart) refuses connections for a few seconds. */
const MAX_ATTEMPTS = 15;
const RETRY_DELAY_MS = 2_000;

async function waitForDatabase(pool: Pool): Promise<void> {
    for (let attempt = 1; ; attempt++) {
        try {
            await pool.query('select 1');

            return;
        } catch (error) {
            if (attempt >= MAX_ATTEMPTS) throw error;

            const reason = error instanceof Error ? error.message : String(error);
            console.log(`database not ready (${attempt}/${MAX_ATTEMPTS}): ${reason}`);
            await sleep(RETRY_DELAY_MS);
        }
    }
}

/**
 * Applies the SQL files in `drizzle/` to DATABASE_URL, the same migrations `drizzle-kit migrate` applies.
 * It exists so a production image can migrate without drizzle-kit (a dev dependency): the Docker setup runs it
 * once before the API starts. Already applied migrations are skipped, so running it twice is safe.
 */
async function main(): Promise<void> {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');

    const pool = new Pool({ connectionString: url, ssl: process.env.DB_SSL === 'true' });

    try {
        await waitForDatabase(pool);

        // the folder sits next to package.json; the process is started from there (`cwd`), as for the API
        await migrate(drizzle(pool), { migrationsFolder: path.join(process.cwd(), 'drizzle') });
        console.log('migrations applied');
    } finally {
        await pool.end();
    }
}

main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
});
