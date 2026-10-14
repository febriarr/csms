import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: z.string().min(1),
    DB_POOL_MAX: z.coerce.number().int().min(1).default(10),
    DB_POOL_IDLE_TIMEOUT_MS: z.coerce.number().default(30_000),
    DB_POOL_CONNECTION_TIMEOUT_MS: z.coerce.number().default(5_000),
    DB_POOL_MAX_LIFETIME_SECONDS: z.coerce.number().default(1_800),
    DB_STATEMENT_TIMEOUT_MS: z.coerce.number().default(30_000),
    DB_IDLE_IN_TX_TIMEOUT_MS: z.coerce.number().default(15_000),
    DB_SSL: z
        .enum(['true', 'false'])
        .default('false')
        .transform((v) => v === 'true'),

    WEB_URL: z.string().url(),
    BETTER_AUTH_URL: z.string().url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    AUTH_COOKIE_DOMAIN: z
        .string()
        .optional()
        .transform((v) => (v ? v : undefined)),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
    const result = envSchema.safeParse(config);
    if (!result.success) {
        const details = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
        throw new Error(`Invalid environment variables:\n${details}`);
    }
    return result.data;
}
