import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { deviceStateEnum, devices } from './devices';

export const alertReasonEnum = pgEnum('alert_reason', [
  'HIGH_TEMPERATURE',
  'LOW_TEMPERATURE',
  'DEVICE_OFFLINE',
  'DEFROST_DETECTED',
]);

export const alerts = pgTable(
  'alerts',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    deviceId: uuid('device_id')
      .notNull()
      .references(() => devices.id, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),

    fromState: deviceStateEnum('from_state').notNull(),

    toState: deviceStateEnum('to_state').notNull(),

    reasonCode: alertReasonEnum('reason_code').notNull(),

    reason: text('reason'),

    occurredAt: timestamp('occurred_at', {
      mode: 'date',
      withTimezone: true,
    }).notNull(),

    createdAt: timestamp('created_at', {
      mode: 'date',
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  t => [
    // Riwayat alert berdasarkan device
    index('alerts_device_id_idx').on(t.deviceId),

    // Timeline semua alert
    index('alerts_occurred_at_idx').on(t.occurredAt),

    // Riwayat alert terbaru suatu device
    index('alerts_device_occurred_at_idx').on(t.deviceId, t.occurredAt),

    // Statistik berdasarkan jenis alert
    index('alerts_reason_code_idx').on(t.reasonCode),

    // Filter state tujuan (misalnya semua CRITICAL)
    index('alerts_to_state_idx').on(t.toState),
  ]
);
