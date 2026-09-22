import { Pool } from 'pg';

/**
 * Integration/E2E tests need a real Postgres reachable at process.env.DATABASE_URL,
 * migrated with the project's drizzle migrations (npm run db:migrate).
 *
 * This sandbox has no Docker/Postgres, so these suites are written to run in a
 * real dev machine or CI via `docker-compose -f docker-compose.test.yml up -d`
 * followed by `npm run db:migrate` and `npm run test:integration` / `test:e2e`.
 *
 * They self-skip (rather than fail) when no DB is reachable, so `npm test` stays
 * green in environments without a test database — see README-TESTING.md.
 */
export async function isDbReachable(): Promise<boolean> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 2000 });
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  } finally {
    await pool.end().catch(() => undefined);
  }
}

/**
 * Deletes all rows from every application table, in FK-safe order.
 * Call this in beforeEach/afterEach so integration tests are isolated
 * and order-independent (see Test Isolation requirements).
 */
export async function truncateAll(pool: Pool): Promise<void> {
  await pool.query(`
    TRUNCATE TABLE
      alerts,
      device_diagnostics_logs,
      temperature_logs,
      notification_logs,
      notification_recipients,
      devices,
      users
    RESTART IDENTITY CASCADE
  `);
}
