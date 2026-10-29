import { sql } from 'drizzle-orm';
import { check, index, pgTable, primaryKey, real, uuid } from 'drizzle-orm/pg-core';
import { tstz } from './_helpers';
import { devices } from './devices';
import { readingEvaluationEnum, temperatureStateEnum } from './enums';
import { monitoringPauses } from './monitoring_pauses';

// Retention: 5 years for audit. After that, delete in small batches (e.g. WHERE recorded_at < $cutoff, by month),
// or revisit partitioning if volume has grown a lot by then.
// PK (device_id, recorded_at) does three jobs:
//   1. makes ingestion idempotent: INSERT ... ON CONFLICT (device_id, recorded_at) DO NOTHING
//   2. is the only index needed: "latest per device" and "device + date range" are both range scans on it
//   3. already contains the column you would partition on, so partitioning later needs no key change
// No uuid id (random v4 keys bloat the index at this volume) and no created_at (== received_at).
//
// `state`, `evaluation` and `pause_id` are a snapshot taken when the reading arrived, so a report can say what the
// system knew and did at that moment. They are never recomputed: thresholds and pauses change later, the audit
// trail must not.
//   state       how the reading classified against the device's thresholds at that moment
//   evaluation  whether the alert logic looked at the reading, and if not, why (planned pause, pull-down,
//               monitoring switched off, late arrival). This is the answer to "above threshold, but no alert".
//   pause_id    the planned pause behind PAUSED / PULLING_DOWN, otherwise null
export const temperatureLogs = pgTable(
    'temperature_logs',
    {
        deviceId: uuid('device_id')
            .notNull()
            .references(() => devices.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
        recordedAt: tstz('recorded_at').notNull(), // device time
        temperature: real('temperature').notNull(),
        receivedAt: tstz('received_at').notNull().defaultNow(), // server time
        state: temperatureStateEnum('state').notNull(),
        evaluation: readingEvaluationEnum('evaluation').notNull(),
        pauseId: uuid('pause_id').references(() => monitoringPauses.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    },
    (t) => [
        primaryKey({ columns: [t.deviceId, t.recordedAt] }),
        // Almost every row has no pause, so the index only holds the few that have: it exists for the foreign key
        // check when a pause is deleted, not for reads.
        index('temperature_logs_pause_idx')
            .on(t.pauseId)
            .where(sql`${t.pauseId} IS NOT NULL`),
        check('temperature_logs_pause_chk', sql`${t.pauseId} IS NULL OR ${t.evaluation} IN ('PAUSED', 'PULLING_DOWN')`),
    ],
);

export type InsertTemperature = typeof temperatureLogs.$inferInsert;
export type SelectTemperature = typeof temperatureLogs.$inferSelect;
