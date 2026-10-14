import { index, pgTable, real, text, uuid } from 'drizzle-orm/pg-core';
import { timestamps, tstz } from './_helpers';
import { devices } from './devices';
import { alertReasonEnum, deviceStateEnum } from './enums';
import { user } from './auth';

// One row = one state transition of a device.
export const alerts = pgTable(
    'alerts',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        deviceId: uuid('device_id')
            .notNull()
            .references(() => devices.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
        fromState: deviceStateEnum('from_state').notNull(),
        toState: deviceStateEnum('to_state').notNull(),
        reasonCode: alertReasonEnum('reason_code').notNull(),
        reason: text('reason'),
        // structured value at the time of the transition (v1 only had it inside the reason text)
        temperature: real('temperature'),
        occurredAt: tstz('occurred_at').notNull(),

        // OPTIONAL acknowledgement workflow (null until someone acknowledges)
        acknowledgedAt: tstz('acknowledged_at'),
        acknowledgedBy: uuid('acknowledged_by').references(() => user.id, {
            onDelete: 'set null',
            onUpdate: 'cascade',
        }),

        ...timestamps,
    },
    (t) => [
        // device history, newest first (also covers plain device_id lookups)
        index('alerts_device_occurred_at_idx').on(t.deviceId, t.occurredAt.desc()),
        // global timeline
        index('alerts_occurred_at_idx').on(t.occurredAt.desc()),
        // v1 also indexed reason_code and to_state: low-cardinality enums on a small table, never selective.
    ],
);

export type SelectAlert = typeof alerts.$inferSelect;
export type InserAlert = typeof alerts.$inferInsert;
