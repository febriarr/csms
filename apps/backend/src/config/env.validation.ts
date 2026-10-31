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

    DEVICE_API_KEY: z.string().min(16),

    // How many reverse proxies sit in front of the API (nginx, Cloudflare, ...). 0 = none: the socket address is the
    // client. Wrong here means every user shares the proxy's address and the rate limit hits them all together.
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    // Requests per minute and per client address. The login limit is separate and much stricter.
    THROTTLE_LIMIT: z.coerce.number().int().min(1).default(300),
    THROTTLE_LOGIN_LIMIT: z.coerce.number().int().min(1).default(10),

    WHATSAPP_ENABLED: z
        .enum(['true', 'false'])
        .default('false')
        .transform((v) => v === 'true'),
    WHATSAPP_AUTH_DIR: z.string().min(1).default('.baileys_auth'),
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
