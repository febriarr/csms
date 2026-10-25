import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { admin as adminPlugin, username } from 'better-auth/plugins';
import type { Database } from '../database/database.type';
import * as schema from '../database/schema';
import { ac, roles } from './permissions';
import { uuidv7 } from 'uuidv7';

export interface CreateAuthOptions {
    db: Database;
    secret: string;
    baseURL: string;
    trustedOrigins: string[];
    cookieDomain?: string;
    isProd: boolean;
}

export function createAuth(o: CreateAuthOptions) {
    return betterAuth({
        appName: 'CSMS',
        baseURL: o.baseURL,
        secret: o.secret,
        trustedOrigins: o.trustedOrigins,
        database: drizzleAdapter(o.db, { provider: 'pg', schema }),
        emailAndPassword: {
            enabled: true,
            disableSignUp: true, // tidak ada sign-up publik
            autoSignIn: false,
            minPasswordLength: 6,
        },
        plugins: [
            username({ displayUsername: true }), // `username` dipakai untuk display
            adminPlugin({ ac, roles, defaultRole: 'admin' }),
        ],
        advanced: {
            useSecureCookies: o.isProd,
            ...(o.cookieDomain && {
                crossSubDomainCookies: { enabled: true, domain: o.cookieDomain },
            }),
            database: {
                generateId: () => uuidv7(),
            },
            cookiePrefix: 'csms',
        },
    });
}

export type Auth = ReturnType<typeof createAuth>;
