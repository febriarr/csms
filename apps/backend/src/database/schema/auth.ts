import { pgTable, text, timestamp, boolean, index, uuid } from 'drizzle-orm/pg-core';
import { pk } from './_helpers';

export const user = pgTable('user', {
    id: pk(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    image: text('image'),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
    username: text('username').unique(),
    displayUsername: text('display_username'),
    role: text('role'),
    banned: boolean('banned').default(false),
    banReason: text('ban_reason'),
    banExpires: timestamp('ban_expires'),
});

export const session = pgTable(
    'session',
    {
        id: text('id').primaryKey(),
        expiresAt: timestamp('expires_at', { mode: 'date', withTimezone: true }).notNull(),
        token: text('token').notNull().unique(),
        createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull(),
        ipAddress: text('ip_address'),
        userAgent: text('user_agent'),
        userId: uuid('user_id')
            .notNull()
            .references(() => user.id, { onDelete: 'cascade' }),
        impersonatedBy: text('impersonated_by'),
    },
    (table) => [index('session_userId_idx').on(table.userId)],
);

export const account = pgTable(
    'account',
    {
        id: text('id').primaryKey(),
        accountId: text('account_id').notNull(),
        providerId: text('provider_id').notNull(),
        userId: uuid('user_id')
            .notNull()
            .references(() => user.id, { onDelete: 'cascade' }),
        accessToken: text('access_token'),
        refreshToken: text('refresh_token'),
        idToken: text('id_token'),
        accessTokenExpiresAt: timestamp('access_token_expires_at'),
        refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
        scope: text('scope'),
        password: text('password'),
        createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull(),
    },
    (table) => [index('account_userId_idx').on(table.userId)],
);

export const verification = pgTable(
    'verification',
    {
        id: text('id').primaryKey(),
        identifier: text('identifier').notNull(),
        value: text('value').notNull(),
        expiresAt: timestamp('expires_at', { mode: 'date', withTimezone: true }).notNull(),
        createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
            .defaultNow()
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull(),
    },
    (table) => [index('verification_identifier_idx').on(table.identifier)],
);
