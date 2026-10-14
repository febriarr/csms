import type { Database } from '../database/database.type';
import { createAuth } from './auth';

export const auth = createAuth({
    db: {} as Database,
    secret: 'cli-only-placeholder-secret-0000000000',
    baseURL: 'http://localhost:3000',
    trustedOrigins: [],
    isProd: false,
});
