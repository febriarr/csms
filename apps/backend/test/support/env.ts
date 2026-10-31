/**
 * Runs before every end-to-end spec. These tests TRUNCATE tables, so they only ever talk to the database named in
 * E2E_DATABASE_URL, never to DATABASE_URL (which on a developer machine is the real one).
 */
const url = process.env.E2E_DATABASE_URL;

if (!url) {
    throw new Error(
        'E2E_DATABASE_URL is not set. Point it at a throwaway database, e.g. postgres://postgres:postgres@localhost:5432/csms_e2e',
    );
}

if (!/(e2e|test)/i.test(new URL(url).pathname)) {
    throw new Error(`Refusing to run: the e2e database name must contain "e2e" or "test" (got ${url})`);
}

Object.assign(process.env, {
    NODE_ENV: 'test',
    DATABASE_URL: url,
    DB_SSL: 'false',
    WEB_URL: 'http://localhost:5173',
    BETTER_AUTH_URL: 'http://localhost:3000',
    BETTER_AUTH_SECRET: 'e2e-secret-e2e-secret-e2e-secret-0123456789',
    AUTH_COOKIE_DOMAIN: '',
    DEVICE_API_KEY: 'e2e-device-key-0123456789',
    WHATSAPP_ENABLED: 'false',
    TRUST_PROXY: '0',
    // generous by default; the rate limit spec imports ./strict-limits first to tighten them
    THROTTLE_LIMIT: '1000',
    THROTTLE_LOGIN_LIMIT: '1000',
});
