import { BaseRepository } from '@/common/abstracts/base.repository';
import { DatabaseService } from '@/database/database.service';
import { DatabaseTransaction } from '@/database/database.type';
import { coldStorages, devices, monitoringPauses, SelectMonitoringPause, temperatureLogs } from '@/database/schema';
import { Injectable } from '@nestjs/common';
import { ExpiredPause, ReportPauseEvent, SuppressingPause, SuppressionPhase } from '@workspace/shared';
import { PauseQuery } from '@workspace/validator';
import {
    and,
    asc,
    desc,
    eq,
    getTableColumns,
    gt,
    gte,
    inArray,
    isNull,
    lt,
    lte,
    notExists,
    or,
    sql,
    SQL,
} from 'drizzle-orm';

/**
 * An alert raised this soon after the suppression window closed is explained with the pause in its text. Later
 * than that, the pause is no longer the reason the alert fired.
 */
export const EXPIRED_PAUSE_CONTEXT_MINUTES = 5;

type PauseRow = SelectMonitoringPause & {
    deviceName: string | null;
    deviceCode: string | null;
    coldStorageName: string | null;
};

@Injectable()
export class MonitoringPauseRepository extends BaseRepository<typeof monitoringPauses> {
    constructor(db: DatabaseService) {
        super(db, monitoringPauses);
    }

    async findOne(id: string, tx?: DatabaseTransaction): Promise<SelectMonitoringPause | null> {
        const [row] = await this.executor(tx)
            .select()
            .from(monitoringPauses)
            .where(eq(monitoringPauses.id, id))
            .limit(1);

        return row ?? null;
    }

    /** The pause with the names of its target, for responses. */
    async findOneWithTarget(id: string, tx?: DatabaseTransaction): Promise<PauseRow | null> {
        const [row] = await this.selectWithTarget(eq(monitoringPauses.id, id), tx);

        return row ?? null;
    }

    /**
     * Newest first. `deviceId` / `coldStorageId` match the pause's own target only: a pause on a cold storage is
     * not listed under its devices.
     */
    async findMany(filter: PauseQuery): Promise<PauseRow[]> {
        return this.selectWithTarget(
            and(
                filter.deviceId ? eq(monitoringPauses.deviceId, filter.deviceId) : undefined,
                filter.coldStorageId ? eq(monitoringPauses.coldStorageId, filter.coldStorageId) : undefined,
            ),
        );
    }

    /** True when the device (not soft-deleted) or the cold storage the pause would target exists. */
    async targetExists(
        target: { deviceId?: string; coldStorageId?: string },
        tx?: DatabaseTransaction,
    ): Promise<boolean> {
        const db = this.executor(tx);

        if (target.deviceId) {
            const [row] = await db
                .select({ id: devices.id })
                .from(devices)
                .where(and(eq(devices.id, target.deviceId), isNull(devices.deletedAt)))
                .limit(1);

            return row !== undefined;
        }

        if (target.coldStorageId) {
            const [row] = await db
                .select({ id: coldStorages.id })
                .from(coldStorages)
                .where(eq(coldStorages.id, target.coldStorageId))
                .limit(1);

            return row !== undefined;
        }

        return false;
    }

    /**
     * Sets the end of a pause that is still open (no end, or an end in the future after `endedAt`). The guard in
     * the WHERE clause makes a lost race return undefined instead of overwriting a newer end.
     */
    async end(
        id: string,
        values: { endsAt: Date; endedBy: string; note: string | null },
        tx?: DatabaseTransaction,
    ): Promise<SelectMonitoringPause | undefined> {
        return this.update(
            and(
                eq(monitoringPauses.id, id),
                or(isNull(monitoringPauses.endsAt), gt(monitoringPauses.endsAt, values.endsAt)),
            ) as SQL,
            values,
            tx,
        );
    }

    /** Deletes a pause that has not started yet. Returns false when it does not exist or already started. */
    async destroyNotStarted(id: string, now: Date, tx?: DatabaseTransaction): Promise<boolean> {
        const rows = await this.executor(tx)
            .delete(monitoringPauses)
            .where(and(eq(monitoringPauses.id, id), gt(monitoringPauses.startsAt, now)))
            .returning({ id: monitoringPauses.id });

        return rows.length > 0;
    }

    /**
     * The pauses that suppress alerts for these devices at `at`. A pause on a device, or on the cold storage the
     * device sits in, counts. A pause suppresses while it runs, and after it ended for `max_pulldown_minutes` unless
     * the device already read below its warning threshold since the pause ended (the pull-down is done).
     *
     * This is the single definition of "paused": the telemetry service and the device list both use it, so the
     * badge on screen and the decision to raise an alert cannot disagree.
     */
    async findSuppressing(deviceIds: string[], at: Date, tx?: DatabaseTransaction): Promise<SuppressingPause[]> {
        if (deviceIds.length === 0) return [];

        const db = this.executor(tx);

        const settled = db
            .select({ one: sql`1` })
            .from(temperatureLogs)
            .where(
                and(
                    eq(temperatureLogs.deviceId, devices.id),
                    gte(temperatureLogs.recordedAt, monitoringPauses.endsAt),
                    lte(temperatureLogs.recordedAt, at),
                    lt(temperatureLogs.temperature, devices.warningThreshold),
                ),
            );

        return db
            .select({
                deviceId: devices.id,
                pauseId: monitoringPauses.id,
                kind: monitoringPauses.kind,
                startsAt: monitoringPauses.startsAt,
                endsAt: monitoringPauses.endsAt,
                phase: sql<SuppressionPhase>`CASE WHEN ${monitoringPauses.endsAt} IS NULL OR ${at} < ${monitoringPauses.endsAt} THEN 'PAUSED' ELSE 'PULLING_DOWN' END`,
            })
            .from(devices)
            .innerJoin(
                monitoringPauses,
                or(
                    eq(monitoringPauses.deviceId, devices.id),
                    eq(monitoringPauses.coldStorageId, devices.coldStorageId),
                ),
            )
            .where(
                and(
                    inArray(devices.id, deviceIds),
                    lte(monitoringPauses.startsAt, at),
                    or(
                        isNull(monitoringPauses.endsAt),
                        gt(monitoringPauses.endsAt, at),
                        and(
                            sql`${at} < ${monitoringPauses.endsAt} + make_interval(mins => ${monitoringPauses.maxPulldownMinutes})`,
                            notExists(settled),
                        ),
                    ),
                ),
            );
    }

    /**
     * The pause whose suppression window closed within the last few minutes before `at`, if any. Used only to
     * explain an alert in its text ("still too warm after the machine-off period").
     */
    async findJustExpired(
        target: { deviceId: string; coldStorageId: string },
        at: Date,
        tx?: DatabaseTransaction,
    ): Promise<ExpiredPause | null> {
        const windowEnd = sql`${monitoringPauses.endsAt} + make_interval(mins => ${monitoringPauses.maxPulldownMinutes})`;

        const [row] = await this.executor(tx)
            .select({ kind: monitoringPauses.kind, endedAt: monitoringPauses.endsAt })
            .from(monitoringPauses)
            .where(
                and(
                    or(
                        eq(monitoringPauses.deviceId, target.deviceId),
                        eq(monitoringPauses.coldStorageId, target.coldStorageId),
                    ),
                    sql`${monitoringPauses.endsAt} IS NOT NULL`,
                    sql`${windowEnd} <= ${at}`,
                    sql`${at} < ${windowEnd} + make_interval(mins => ${EXPIRED_PAUSE_CONTEXT_MINUTES})`,
                ),
            )
            .orderBy(desc(monitoringPauses.endsAt))
            .limit(1);

        return row && row.endedAt ? { kind: row.kind, endedAt: row.endedAt } : null;
    }

    /**
     * The pauses that touched a device in the half-open range `[from, to)`, oldest first, for the temperature
     * report: pauses on the device itself or on the cold storage it sits in, from their start until their pull-down
     * allowance ran out. A pause that started before the range and still suppresses inside it is included.
     */
    async findOverlapping(
        target: { deviceId: string; coldStorageId: string },
        range: { from: Date; to: Date },
    ): Promise<ReportPauseEvent[]> {
        const suppressedUntil = sql`${monitoringPauses.endsAt} + make_interval(mins => ${monitoringPauses.maxPulldownMinutes})`;

        const rows = await this.db
            .select({
                id: monitoringPauses.id,
                kind: monitoringPauses.kind,
                startsAt: monitoringPauses.startsAt,
                endsAt: monitoringPauses.endsAt,
                maxPulldownMinutes: monitoringPauses.maxPulldownMinutes,
                note: monitoringPauses.note,
                deviceId: monitoringPauses.deviceId,
            })
            .from(monitoringPauses)
            .where(
                and(
                    or(
                        eq(monitoringPauses.deviceId, target.deviceId),
                        eq(monitoringPauses.coldStorageId, target.coldStorageId),
                    ),
                    lt(monitoringPauses.startsAt, range.to),
                    or(isNull(monitoringPauses.endsAt), sql`${suppressedUntil} > ${range.from}`),
                ),
            )
            .orderBy(asc(monitoringPauses.startsAt));

        return rows.map(({ deviceId, startsAt, ...pause }) => ({
            type: 'PAUSE' as const,
            at: startsAt,
            scope: deviceId === null ? ('COLD_STORAGE' as const) : ('DEVICE' as const),
            ...pause,
        }));
    }

    private async selectWithTarget(where: SQL | undefined, tx?: DatabaseTransaction): Promise<PauseRow[]> {
        const rows = await this.executor(tx)
            .select({
                pause: getTableColumns(monitoringPauses),
                deviceName: devices.name,
                deviceCode: devices.code,
                coldStorageName: coldStorages.name,
            })
            .from(monitoringPauses)
            .leftJoin(devices, eq(devices.id, monitoringPauses.deviceId))
            .leftJoin(coldStorages, eq(coldStorages.id, monitoringPauses.coldStorageId))
            .where(where)
            .orderBy(desc(monitoringPauses.startsAt));

        return rows.map(({ pause, ...target }) => ({ ...pause, ...target }));
    }
}
