import { boolean, numeric, pgEnum, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const deviceStateEnum = pgEnum('device_state', ['NORMAL', 'WARNING', 'CRITICAL', 'DEFROST', 'OFFLINE']);

export const devices = pgTable('devices', {
  id: uuid('id').defaultRandom().primaryKey(),

  code: varchar('code', { length: 50 }).notNull().unique(),

  name: varchar('name', { length: 100 }).notNull(),

  location: varchar('location', { length: 150 }),

  normalMinTemperature: numeric('normal_min_temperature', {
    precision: 5,
    scale: 2,
    mode: 'number',
  }).notNull(),

  normalMaxTemperature: numeric('normal_max_temperature', {
    precision: 5,
    scale: 2,
    mode: 'number',
  }).notNull(),

  state: deviceStateEnum('state').notNull().default('NORMAL'),

  isActive: boolean('is_active').notNull().default(true),

  stateChangedAt: timestamp('state_changed_at', {
    mode: 'date',
    withTimezone: true,
  }),

  lastSeenAt: timestamp('last_seen_at', {
    mode: 'date',
    withTimezone: true,
  }),

  createdAt: timestamp('created_at', {
    mode: 'date',
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),

  updatedAt: timestamp('updated_at', {
    mode: 'date',
    withTimezone: true,
  })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
});

export type InserDevices = typeof devices.$inferInsert;
export type SelectDevices = typeof devices.$inferSelect;
