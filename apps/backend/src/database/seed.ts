import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import * as schema from './schema';
import { createAuth } from '../auth/auth';
import { Database } from './database.type';

const seedUsers = [
    {
        name: 'Super Admin',
        username: 'admin',
        email: 'admin@csms.local',
        password: process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!',
        role: 'super_admin' as const,
    },
];

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db: Database = drizzle(pool, { schema });

    const auth = createAuth({
        db: db, // sesuaikan dengan tipe Database Anda
        secret: process.env.BETTER_AUTH_SECRET!,
        baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
        trustedOrigins: [],
        isProd: false,
    });

    for (const u of seedUsers) {
        const [existing] = await db
            .select({ id: schema.user.id })
            .from(schema.user)
            .where(eq(schema.user.email, u.email))
            .limit(1);

        if (existing) {
            console.log(`skip: ${u.email} sudah ada`);
            continue;
        }

        await auth.api.createUser({
            body: {
                name: u.name,
                email: u.email,
                password: u.password,
                role: u.role,
                data: {
                    username: u.username,
                    displayUsername: u.username,
                },
            },
        });

        console.log(`created: ${u.username} (${u.email})`);
    }

    await pool.end();
}

main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
