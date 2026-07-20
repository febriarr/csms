import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { env } from '../config/env.js';
import * as schema from './schema/index.js';
import { Logger } from 'drizzle-orm';

// Config Pool
export const pool = new Pool({
  connectionString: env.databaseUrl,

  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

// Logger
class SlowQueryLogger implements Logger {
  constructor(private thresholdMs = 300) {}

  logQuery(query: string, params: unknown[]): void {
    const start = performance.now();

    setImmediate(() => {
      const duration = performance.now() - start;

      if (duration > this.thresholdMs) {
        console.warn(`[SLOW QUERY] ${duration.toFixed(1)}ms\n${query}\nparams: ${JSON.stringify(params)}`);
      }
    });
  }
}

// Config drizzle
export const db = drizzle(pool, {
  schema,
  logger: env.nodeEnv === 'development' ? new SlowQueryLogger(300) : false,
});

// utils
export async function connectWithRetry(maxRetries = 10, delayMs = 3000): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await pool.query('SELECT 1');
      console.log('Database connected!');
      return;
    } catch (error) {
      console.log(`DB connection attempt ${attempt}/${maxRetries} failed: `, (error as Error).message);
      if (attempt === maxRetries) {
        throw new Error('Failed to connect to database after max retries');
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}
