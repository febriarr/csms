import { sql } from 'drizzle-orm';
import {
    boolean,
    check,
    index,
    integer,
    numeric,
    pgTable,
    real,
    uniqueIndex,
    uuid,
    varchar,
} from 'drizzle-orm/pg-core';
import { coldStorages } from './cold_storages';
import { deviceStateEnum } from './enums';
import { pk, softDelete, timestamps, tstz } from './_helpers';

export const devices = pgTable(
    'devices',
    {
        id: pk(),
        code: varchar('code', { length: 50 }).notNull(),
        name: varchar('name', { length: 100 }).notNull(),
        /**
         * which cold room, and which spot inside it (v1 had one free-text 'locattion' column)
         */
        coldStorageId: uuid('cold_storage_id')
            .notNull()
            .references(() => coldStorages.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
        pointLabel: varchar('point_label', { length: 100 }), // e.g "Pintu", "Belakang atas"
        // thresholds (order enforced by the CHECK below, not only by the zod validator)
        // NULL = this device has no DEFROST state (production spiral: only NORMAL / WARNING / CRITICAL)
        defrostThreshold: numeric('defrost_threshold', { precision: 5, scale: 2, mode: 'number' }),
        warningThreshold: numeric('warning_threshold', { precision: 5, scale: 2, mode: 'number' }).notNull(),
        criticalThreshold: numeric('critical_threshold', { precision: 5, scale: 2, mode: 'number' }).notNull(),

        // v1 hard-coded 30s in code (HEARTBEAT_INTERVAL_MS); per-device so mixed firmware can coexist.
        // Offline detection can stay "heartbeat * N".
        heartbeatIntervalSeconds: integer('heartbeat_interval_seconds').notNull().default(30),
        firmwareVersion: varchar('firmware_version', { length: 32 }),

        // current state
        state: deviceStateEnum('state').notNull().default('NORMAL'),
        stateChangedAt: tstz('state_changed_at').defaultNow().notNull(),
        lastSeenAt: tstz('last_seen_at'), // server time of the last message

        // Latest reading, denormalised from temperature_logs. The status page reads this instead of
        // sorting a huge log table per device. Update it in the SAME statement as last_seen_at.
        lastTemperature: real('last_temperature'),
        lastRecordedAt: tstz('last_recorded_at'), // device time of that reading

        isActive: boolean('is_active').notNull().default(true), // monitoring on/off
        ...softDelete,
        ...timestamps,
    },
    (t) => [
        // a deleted device releases its code
        uniqueIndex('devices_code_active_uidx')
            .on(t.code)
            .where(sql`${t.deletedAt} IS NULL`),
        // joins/filters by cold room (cross-storage reports)
        index('devices_cold_storage_id_idx').on(t.coldStorageId),
        // two active devices cannot claim the same spot in one cold room
        uniqueIndex('devices_storage_point_uidx')
            .on(t.coldStorageId, t.pointLabel)
            .where(sql`${t.deletedAt} IS NULL`),
        check(
            'devices_threshold_order_chk',
            sql`(${t.defrostThreshold} IS NULL OR ${t.defrostThreshold} < ${t.warningThreshold})
       AND ${t.warningThreshold} < ${t.criticalThreshold}`,
        ),
        check('devices_heartbeat_chk', sql`${t.heartbeatIntervalSeconds} > 0`),
    ],
);

export type SelectDevices = typeof devices.$inferSelect;
export type InsertDevices = typeof devices.$inferInsert;
