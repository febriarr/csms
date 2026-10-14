import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, smallint, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { tstz } from './_helpers';
import { devices } from './devices';
import { resetReasonEnum } from './enums';

// Low volume (a row only exists when something failed) → not partitioned.
// v1 stored a *fixed-shape* object in jsonb; as real columns it can be filtered, aggregated and constrained
// (e.g. "BROWNOUT count per device per month").
//
// id is `integer` (int4, max 2,147,483,647), NOT bigint: even a device failing on every 30s heartbeat for 5 years
// (~5M rows/device) leaves room for hundreds of devices, and it stays a plain JS `number` with no precision or
// BigInt-serialisation concerns. If you ever need int8, use bigint('id', { mode: 'number' }) — see notes.
export const deviceDiagnosticsLogs = pgTable(
    'device_diagnostics_logs',
    {
        id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
        deviceId: uuid('device_id')
            .notNull()
            .references(() => devices.id, { onDelete: 'restrict', onUpdate: 'cascade' }),

        sensorFailCount: integer('sensor_fail_count').notNull(),
        wifiFailCount: integer('wifi_fail_count').notNull(),
        httpFailCount: integer('http_fail_count').notNull(),
        rssi: smallint('rssi'),

        // abnormal-reset report (all null when the row is a plain failure counter)
        resetReason: resetReasonEnum('reset_reason'),
        resetReasonCode: smallint('reset_reason_code'),
        lastRssi: smallint('last_rssi'),
        lastSensorFailCount: integer('last_sensor_fail_count'),
        lastWifiFailCount: integer('last_wifi_fail_count'),
        lastHttpFailCount: integer('last_http_fail_count'),

        recordedAt: tstz('recorded_at').notNull(),
        receivedAt: tstz('received_at').notNull().defaultNow(),
    },
    (t) => [
        // one index serves detail list, trend, summary and "last reason": (device, time range)
        uniqueIndex('device_diagnostics_logs_device_recorded_uidx').on(t.deviceId, t.recordedAt.desc()),
        // cross-device summary filters on time only
        index('device_diagnostics_logs_recorded_at_idx').on(t.recordedAt),
        check(
            'device_diagnostics_logs_counts_chk',
            sql`${t.sensorFailCount} >= 0 AND ${t.wifiFailCount} >= 0 AND ${t.httpFailCount} >= 0`,
        ),
    ],
);
