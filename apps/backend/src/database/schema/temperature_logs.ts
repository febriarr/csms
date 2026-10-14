import { pgTable, primaryKey, real, uuid } from 'drizzle-orm/pg-core';
import { tstz } from './_helpers';
import { devices } from './devices';

// Retention: 5 years for audit. After that, delete in small batches (e.g. WHERE recorded_at < $cutoff, by month),
// or revisit partitioning if volume has grown a lot by then.
// PK (device_id, recorded_at) does three jobs:
//   1. makes ingestion idempotent: INSERT ... ON CONFLICT (device_id, recorded_at) DO NOTHING
//   2. is the only index needed: "latest per device" and "device + date range" are both range scans on it
//   3. already contains the column you would partition on, so partitioning later needs no key change
// No uuid id (random v4 keys bloat the index at this volume) and no created_at (== received_at).
export const temperatureLogs = pgTable(
    'temperature_logs',
    {
        deviceId: uuid('device_id')
            .notNull()
            .references(() => devices.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
        recordedAt: tstz('recorded_at').notNull(), // device time
        temperature: real('temperature').notNull(),
        receivedAt: tstz('received_at').notNull().defaultNow(), // server time
    },
    (t) => [primaryKey({ columns: [t.deviceId, t.recordedAt] })],
);
