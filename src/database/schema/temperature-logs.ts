import { index, numeric, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

import { devices } from './devices';

export const temperatureLogs = pgTable(
  'temperature_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    deviceId: uuid('device_id')
      .notNull()
      .references(() => devices.id, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),

    temperature: numeric('temperature', {
      precision: 5,
      scale: 2,
      mode: 'number',
    }).notNull(),

    recordedAt: timestamp('recorded_at', {
      mode: 'date',
      withTimezone: true,
    }).notNull(),

    receivedAt: timestamp('received_at', {
      mode: 'date',
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    createdAt: timestamp('created_at', {
      mode: 'date',
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  t => [
    // Histori berdasarkan device
    index('temperature_logs_device_id_idx').on(t.deviceId),

    // Query histori & latest temperature per device
    index('temperature_logs_device_id_recorded_at_idx').on(t.deviceId, t.recordedAt),

    // Query berdasarkan rentang waktu
    index('temperature_logs_recorded_at_idx').on(t.recordedAt),
  ]
);

export type InsertTemperature = typeof temperatureLogs.$inferInsert;
export type SelectTemperature = typeof temperatureLogs.$inferSelect;
