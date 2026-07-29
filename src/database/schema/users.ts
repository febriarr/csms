import { pgEnum, pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['admin', 'super_admin']);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone: varchar('phone', { length: 13 }),
  password: varchar('password', { length: 100 }).notNull(),
  role: roleEnum('role').notNull().default('admin'),
  createdAt: timestamp('created_at', {
    mode: 'date',
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp('updated_at', {
    mode: 'date',
    withTimezone: true,
  })
    .defaultNow()
    .$onUpdateFn(() => new Date())
    .notNull(),
});

export type Role = (typeof roleEnum.enumValues)[number];
export type SelectUsers = typeof users.$inferSelect;
export type InsertUsers = typeof users.$inferInsert;
