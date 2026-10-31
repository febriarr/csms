import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { sql } from 'drizzle-orm';
import path from 'node:path';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import * as schema from '../../src/database/schema';
import { createAuth } from '../../src/auth/auth';

export const WEB_URL = 'http://localhost:5173';
export const DEVICE_KEY = 'e2e-device-key-0123456789';

export const ADMIN = { username: 'e2e_admin', email: 'e2e-admin@csms.local', password: 'E2eAdmin#12345' };

/** Starts the real application the way main.ts does: same prefix, CORS, proxy setting and sign-in limit. */
export async function createTestApp(): Promise<NestExpressApplication> {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false });

    configureApp(app);
    await app.init();

    return app;
}

/** Migrates the e2e database (the same migrations as production) and empties every table the tests touch. */
export async function resetDatabase(): Promise<void> {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool, { schema });

    try {
        await migrate(db, { migrationsFolder: path.join(__dirname, '../../drizzle') });

        // divisions are seeded by a migration and kept; everything else starts empty
        await db.execute(sql`
            TRUNCATE TABLE
                notification_logs, notification_subscriptions, notification_recipients, alerts,
                device_diagnostics_logs, temperature_logs, monitoring_pauses, devices, cold_storages, locations,
                session, account, verification, "user"
            RESTART IDENTITY CASCADE
        `);

        const auth = createAuth({
            db,
            secret: process.env.BETTER_AUTH_SECRET!,
            baseURL: process.env.BETTER_AUTH_URL!,
            trustedOrigins: [],
            isProd: false,
        });

        await auth.api.createUser({
            body: {
                name: 'E2E Admin',
                email: ADMIN.email,
                password: ADMIN.password,
                role: 'super_admin',
                data: { username: ADMIN.username, displayUsername: ADMIN.username },
            },
        });
    } finally {
        await pool.end();
    }
}
