import { DatabaseService } from '@/database/database.service';
import type { Database } from '@/database/database.type';
import { alerts, coldStorages, devices, monitoringPauses, notificationLogs } from '@/database/schema';
import { Injectable } from '@nestjs/common';
import type { OverviewAlert } from '@workspace/shared';
import { and, asc, count, desc, eq, gt, gte, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import {
    ACTIONABLE_STATES,
    type AlertPerHourRow,
    type NotificationStatusRow,
    type OpenAlertRow,
} from './overview.type';

type PauseRow = {
    id: string;
    kind: 'MAINTENANCE' | 'MACHINE_OFF';
    startsAt: Date;
    endsAt: Date | null;
    note: string | null;
    deviceName: string | null;
    coldStorageName: string | null;
};

/**
 * Read-only queries that exist only for the Overview page. They span several tables, so this is a plain
 * repository and not a BaseRepository (which is tied to one table and to writing).
 */
@Injectable()
export class OverviewRepository {
    private readonly db: Database;

    constructor(databaseService: DatabaseService) {
        this.db = databaseService.db;
    }

    /** Unacknowledged alerts per state. A recovery (NORMAL) needs nobody to act, so it is not counted. */
    async countOpenAlerts(): Promise<OpenAlertRow[]> {
        return this.db
            .select({ toState: alerts.toState, total: count() })
            .from(alerts)
            .where(and(isNull(alerts.acknowledgedAt), inArray(alerts.toState, [...ACTIONABLE_STATES])))
            .groupBy(alerts.toState);
    }

    /** The newest unacknowledged alerts that need action, with the names the page shows. */
    async findOpenAlerts(limit: number): Promise<OverviewAlert[]> {
        return this.db
            .select({
                id: alerts.id,
                deviceId: alerts.deviceId,
                deviceCode: devices.code,
                deviceName: devices.name,
                coldStorageName: coldStorages.name,
                toState: alerts.toState,
                reasonCode: alerts.reasonCode,
                reason: alerts.reason,
                temperature: alerts.temperature,
                occurredAt: alerts.occurredAt,
            })
            .from(alerts)
            .innerJoin(devices, eq(devices.id, alerts.deviceId))
            .innerJoin(coldStorages, eq(coldStorages.id, devices.coldStorageId))
            .where(and(isNull(alerts.acknowledgedAt), inArray(alerts.toState, [...ACTIONABLE_STATES])))
            .orderBy(desc(alerts.occurredAt))
            .limit(limit);
    }

    /**
     * Alerts that moved a device into a bad state, per hour, in the half-open range `[from, to)`. The hour is cut in
     * UTC and sent as an ISO string: every plant time zone is a whole number of hours away from UTC, so the buckets
     * line up with the clock on the wall, and the driver never has to guess how to parse a timestamp.
     */
    async countAlertsPerHour(range: { from: Date; to: Date }): Promise<AlertPerHourRow[]> {
        const hour = sql<string>`to_char(date_trunc('hour', ${alerts.occurredAt} AT TIME ZONE 'UTC'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;

        const rows = await this.db
            .select({ hour: hour.as('hour'), toState: alerts.toState, total: count() })
            .from(alerts)
            .where(
                and(
                    gte(alerts.occurredAt, range.from),
                    lt(alerts.occurredAt, range.to),
                    inArray(alerts.toState, [...ACTIONABLE_STATES]),
                ),
            )
            .groupBy(hour, alerts.toState);

        return rows.map((row) => ({ ...row, hour: new Date(row.hour) }));
    }

    /** Messages created in the half-open range `[from, to)` per delivery status. */
    async countNotifications(range: { from: Date; to: Date }): Promise<NotificationStatusRow[]> {
        return this.db
            .select({ status: notificationLogs.status, total: count() })
            .from(notificationLogs)
            .where(and(gte(notificationLogs.createdAt, range.from), lt(notificationLogs.createdAt, range.to)))
            .groupBy(notificationLogs.status);
    }

    /** Pauses that are running or still to come (not ended), the ones that started first listed first. */
    async findCurrentPauses(now: Date, limit: number): Promise<PauseRow[]> {
        const rows = await this.db
            .select({
                id: monitoringPauses.id,
                kind: monitoringPauses.kind,
                startsAt: monitoringPauses.startsAt,
                endsAt: monitoringPauses.endsAt,
                note: monitoringPauses.note,
                deviceName: devices.name,
                coldStorageName: coldStorages.name,
            })
            .from(monitoringPauses)
            .leftJoin(devices, eq(devices.id, monitoringPauses.deviceId))
            .leftJoin(coldStorages, eq(coldStorages.id, monitoringPauses.coldStorageId))
            .where(or(isNull(monitoringPauses.endsAt), gt(monitoringPauses.endsAt, now)))
            .orderBy(asc(monitoringPauses.startsAt))
            .limit(limit);

        return rows;
    }
}
