import { BaseRepository } from '@/common/abstracts/base.repository';
import { APP_TIMEZONE } from '@/common/utils/app_timezone';
import { DatabaseService } from '@/database/database.service';
import { DatabaseTransaction } from '@/database/database.type';
import {
    coldStorages,
    deviceDiagnosticsLogs,
    devices,
    InsertDeviceDiagnostic,
    SelectDeviceDiagnostic,
} from '@/database/schema';
import { Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, getTableColumns, gte, inArray, isNotNull, lt, sql, SQL } from 'drizzle-orm';
import type { DiagnosticSummaryItem, DiagnosticTrendPoint, ResetReport } from '@workspace/shared';

type InstantRange = { from: Date; to: Date };

const toNumber = (value: unknown): number => Number(value);
const toNullableNumber = (value: unknown): number | null =>
    value === null || value === undefined ? null : Number(value);

@Injectable()
export class DiagnosticRepository extends BaseRepository<typeof deviceDiagnosticsLogs> {
    constructor(db: DatabaseService) {
        super(db, deviceDiagnosticsLogs);
    }

    /**
     * Stores a row unless the device already reported this exact moment (a retry). Returns false for the duplicate,
     * so the caller can tell the two apart without an error.
     */
    async insertIgnoreDuplicate(row: InsertDeviceDiagnostic, tx?: DatabaseTransaction): Promise<boolean> {
        const inserted = await this.executor(tx)
            .insert(deviceDiagnosticsLogs)
            .values(row)
            .onConflictDoNothing({ target: [deviceDiagnosticsLogs.deviceId, deviceDiagnosticsLogs.recordedAt] })
            .returning({ id: deviceDiagnosticsLogs.id });

        return inserted.length > 0;
    }

    /**
     * Per device totals for devices that had at least one failure in the range, worst first. Each device also gets
     * its most recent abnormal reset (a second query, one row per device).
     */
    async summary(range: InstantRange): Promise<DiagnosticSummaryItem[]> {
        const log = deviceDiagnosticsLogs;
        const sensor = sql<number>`coalesce(sum(${log.sensorFailCount}), 0)`.mapWith(toNumber);
        const wifi = sql<number>`coalesce(sum(${log.wifiFailCount}), 0)`.mapWith(toNumber);
        const http = sql<number>`coalesce(sum(${log.httpFailCount}), 0)`.mapWith(toNumber);

        const rows = await this.db
            .select({
                deviceId: devices.id,
                deviceCode: devices.code,
                deviceName: devices.name,
                coldStorageName: coldStorages.name,
                sensorFailTotal: sensor,
                wifiFailTotal: wifi,
                httpFailTotal: http,
                avgRssi: sql<number | null>`avg(${log.rssi})`.mapWith(toNullableNumber),
            })
            .from(log)
            .innerJoin(devices, eq(devices.id, log.deviceId))
            .innerJoin(coldStorages, eq(coldStorages.id, devices.coldStorageId))
            .where(and(gte(log.recordedAt, range.from), lt(log.recordedAt, range.to)))
            .groupBy(devices.id, devices.code, devices.name, coldStorages.name)
            .having(
                sql`coalesce(sum(${log.sensorFailCount}), 0) + coalesce(sum(${log.wifiFailCount}), 0) + coalesce(sum(${log.httpFailCount}), 0) > 0`,
            )
            .orderBy(
                desc(
                    sql`coalesce(sum(${log.sensorFailCount}), 0) + coalesce(sum(${log.wifiFailCount}), 0) + coalesce(sum(${log.httpFailCount}), 0)`,
                ),
            );

        const reasons = await this.lastResetReports(
            rows.map((row) => row.deviceId),
            range,
        );

        return rows.map((row) => ({
            ...row,
            total: row.sensorFailTotal + row.wifiFailTotal + row.httpFailTotal,
            avgRssi: row.avgRssi === null ? null : Math.round(row.avgRssi),
            lastReason: reasons.get(row.deviceId) ?? null,
        }));
    }

    /** Totals per calendar day (in the plant's time zone) for one device, oldest day first. */
    async trend(deviceId: string, range: InstantRange): Promise<DiagnosticTrendPoint[]> {
        const log = deviceDiagnosticsLogs;
        // The zone is inlined as a literal, not bound as a parameter: the same expression is used in SELECT and in
        // GROUP BY, and PostgreSQL treats two bound parameters ($1, $2) as different values, so it would refuse to
        // group by an expression it cannot prove equal to the selected one.
        const day = sql<string>`to_char(${log.recordedAt} AT TIME ZONE ${sql.raw(`'${APP_TIMEZONE}'`)}, 'YYYY-MM-DD')`;

        const rows = await this.db
            .select({
                day,
                sensorFailTotal: sql<number>`coalesce(sum(${log.sensorFailCount}), 0)`.mapWith(toNumber),
                wifiFailTotal: sql<number>`coalesce(sum(${log.wifiFailCount}), 0)`.mapWith(toNumber),
                httpFailTotal: sql<number>`coalesce(sum(${log.httpFailCount}), 0)`.mapWith(toNumber),
                avgRssi: sql<number | null>`avg(${log.rssi})`.mapWith(toNullableNumber),
            })
            .from(log)
            .where(and(eq(log.deviceId, deviceId), gte(log.recordedAt, range.from), lt(log.recordedAt, range.to)))
            .groupBy(day)
            .orderBy(asc(day));

        return rows.map((row) => ({ ...row, avgRssi: row.avgRssi === null ? null : Math.round(row.avgRssi) }));
    }

    /** One page of a device's diagnostic rows in the range, newest first, plus the total. */
    async detailPage(
        deviceId: string,
        range: InstantRange,
        page: number,
        pageSize: number,
    ): Promise<{ items: SelectDeviceDiagnostic[]; total: number; totalPages: number }> {
        const log = deviceDiagnosticsLogs;
        const where: SQL | undefined = and(
            eq(log.deviceId, deviceId),
            gte(log.recordedAt, range.from),
            lt(log.recordedAt, range.to),
        );

        const [totalRow] = await this.db.select({ total: count() }).from(log).where(where);
        const items = await this.db
            .select(getTableColumns(deviceDiagnosticsLogs))
            .from(log)
            .where(where)
            .orderBy(desc(log.recordedAt))
            .limit(pageSize)
            .offset((page - 1) * pageSize);

        return { items, total: totalRow?.total ?? 0, totalPages: Math.ceil(totalRow?.total / pageSize) };
    }

    /** The newest abnormal reset per device inside the range (DISTINCT ON keeps one row per device). */
    private async lastResetReports(deviceIds: string[], range: InstantRange): Promise<Map<string, ResetReport>> {
        const reports = new Map<string, ResetReport>();

        if (deviceIds.length === 0) return reports;

        const log = deviceDiagnosticsLogs;
        const rows = await this.db
            .selectDistinctOn([log.deviceId], {
                deviceId: log.deviceId,
                resetReason: log.resetReason,
                resetReasonCode: log.resetReasonCode,
                lastRssi: log.lastRssi,
                lastSensorFailCount: log.lastSensorFailCount,
                lastWifiFailCount: log.lastWifiFailCount,
                lastHttpFailCount: log.lastHttpFailCount,
                recordedAt: log.recordedAt,
            })
            .from(log)
            .where(
                and(
                    inArray(log.deviceId, deviceIds),
                    isNotNull(log.resetReason),
                    gte(log.recordedAt, range.from),
                    lt(log.recordedAt, range.to),
                ),
            )
            .orderBy(log.deviceId, desc(log.recordedAt));

        for (const { deviceId, resetReason, ...rest } of rows) {
            if (resetReason !== null) reports.set(deviceId, { resetReason, ...rest });
        }

        return reports;
    }
}
