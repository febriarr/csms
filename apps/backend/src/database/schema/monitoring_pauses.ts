import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { coldStorages } from './cold_storages';
import { devices } from './devices';
import { pauseKindEnum } from './enums';
import { pk, timestamps, tstz } from './_helpers';
import { user } from './auth';

// Planned downtime: a production spiral machine that is switched off, or maintenance on any cold room.
// While a pause is active for a device (directly, or via its cold storage):
//   - no alerts are created and no state change is applied (readings are still stored, for audit)
//   - OFFLINE detection is NOT affected: devices keep sending during a pause, so silence is a real fault
// After `ends_at` the machine needs time to pull the temperature down in stages (CRITICAL → WARNING → NORMAL).
// Suppression therefore continues until the FIRST reading below the device's warning threshold, but never
// longer than `max_pulldown_minutes`. If the deadline passes while the temperature is still high, alerts fire
// normally (the machine failed to pull down). `ends_at = NULL` means "until further notice"; end it by
// setting ends_at (and ended_by).
//
//   "is device D (in cold storage C, warning threshold W) paused at time T?"
//   SELECT EXISTS (
//     SELECT 1 FROM monitoring_pauses p
//      WHERE (p.device_id = D OR p.cold_storage_id = C)
//        AND p.starts_at <= T
//        AND (   p.ends_at IS NULL
//             OR T < p.ends_at
//             OR (    T < p.ends_at + make_interval(mins => p.max_pulldown_minutes)
//                 AND NOT EXISTS (SELECT 1 FROM temperature_logs l
//                                  WHERE l.device_id = D
//                                    AND l.recorded_at >= p.ends_at AND l.recorded_at <= T
//                                    AND l.temperature < W))));
// "Settled" is derived per device from temperature_logs (served by its primary key), so a pause on a whole
// cold storage works even though its devices settle at different times. Only the telemetry service needs
// this check.
export const monitoringPauses = pgTable(
    'monitoring_pauses',
    {
        id: pk(),
        // exactly one target: a single device, or a whole cold storage
        deviceId: uuid('device_id').references(() => devices.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
        coldStorageId: uuid('cold_storage_id').references(() => coldStorages.id, {
            onDelete: 'restrict',
            onUpdate: 'cascade',
        }),
        kind: pauseKindEnum('kind').notNull(),
        startsAt: tstz('starts_at').notNull().defaultNow(), // may be in the future (scheduled maintenance)
        endsAt: tstz('ends_at'),
        maxPulldownMinutes: integer('max_pulldown_minutes').notNull().default(0), // 0 = resume alerting right at ends_at
        note: text('note'),
        createdBy: uuid('created_by').references(() => user.id, { onDelete: 'set null', onUpdate: 'cascade' }),
        endedBy: uuid('ended_by').references(() => user.id, { onDelete: 'set null', onUpdate: 'cascade' }),
        ...timestamps,
    },
    (t) => [
        index('monitoring_pauses_device_idx').on(t.deviceId, t.startsAt.desc()),
        index('monitoring_pauses_cold_storage_idx').on(t.coldStorageId, t.startsAt.desc()),
        check('monitoring_pauses_one_target_chk', sql`num_nonnulls(${t.deviceId}, ${t.coldStorageId}) = 1`),
        check('monitoring_pauses_range_chk', sql`${t.endsAt} IS NULL OR ${t.endsAt} > ${t.startsAt}`),
        check('monitoring_pauses_pulldown_chk', sql`${t.maxPulldownMinutes} >= 0`),
    ],
);

export type SelectMonitoringPause = typeof monitoringPauses.$inferSelect;
export type InsertMonitoringPause = typeof monitoringPauses.$inferInsert;
