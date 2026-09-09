import { index, integer, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

import { devices } from './devices';

export const deviceDiagnosticsLogs = pgTable(
  'device_diagnostics_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    deviceId: uuid('device_id')
      .notNull()
      .references(() => devices.id, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),

    sensorFailCount: integer('sensor_fail_count').notNull(),
    wifiFailCount: integer('wifi_fail_count').notNull(),
    httpFailCount: integer('http_fail_count').notNull(),
    rssi: integer('rssi'),

    recordedAt: timestamp('recorded_at', { mode: 'date', withTimezone: true }).notNull(),
    receivedAt: timestamp('received_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
  },
  t => [
    index('device_diagnostics_logs_device_id_idx').on(t.deviceId),
    index('device_diagnostics_logs_device_id_recorded_at_idx').on(t.deviceId, t.recordedAt),
    index('device_diagnostics_logs_recorded_at_idx').on(t.recordedAt),
  ]
);

export type InsertDeviceDiagnostics = typeof deviceDiagnosticsLogs.$inferInsert;
export type SelectDeviceDiagnostics = typeof deviceDiagnosticsLogs.$inferSelect;
