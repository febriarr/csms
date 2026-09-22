import dotenv from 'dotenv';
import path from 'node:path';

// Load .env.test EXPLICITLY, before src/config/env.ts's own dotenv.config()
// gets a chance to pull in the real .env. override:true so this always wins.
dotenv.config({ path: path.resolve(process.cwd(), '.env.test'), override: true });

// Fallback defaults, in case .env.test is missing (e.g. fresh clone, CI without the file)
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.APP_NAME = process.env.APP_NAME ?? 'CI-CSMS-TEST';
process.env.PORT = process.env.PORT ?? '3999';
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://test:test@localhost:5432/ci_csms_test';
process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET ?? 'test-access-secret';
process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET ?? 'test-refresh-secret';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
