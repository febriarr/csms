import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { env } from '../config/env';
import * as schema from './schema';
import { Logger } from 'drizzle-orm';
import { logger } from '../shared/logger/logger';

// Config Pool
export const pool = new Pool({
  connectionString: env.databaseUrl,

  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

// Config drizzle
export const db = drizzle(pool, {
  schema,
});

// utils
export async function connectWithRetry(maxRetries = 10, delayMs = 3000): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await pool.query('SELECT 1');
      logger.info('Database connected!');
      return;
    } catch (error) {
      logger.error(`DB connection attempt ${attempt}/${maxRetries} failed: ${(error as Error).message}`);
      if (attempt === maxRetries) {
        throw new Error('Failed to connect to database after max retries');
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}
