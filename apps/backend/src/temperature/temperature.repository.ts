import { BaseRepository } from '@/common/abstracts/base.repository';
import { DatabaseService } from '@/database/database.service';
import { DatabaseTransaction } from '@/database/database.type';
import { InsertTemperature, ReadingEvaluation, ReadingState, temperatureLogs } from '@/database/schema';
import { APP_TIMEZONE } from '@/common/utils/app_timezone';
import { Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, gt, gte, inArray, lt, sql, SQL } from 'drizzle-orm';
import type { TemperatureReading } from '@workspace/shared';
import type { HourlyAggregate } from './temperature.type';

type InstantRange = { from: Date; to: Date };

const EXPORT_CHUNK_SIZE = 5000;

/** What a report line is made of: the raw reading and the snapshot taken when it arrived. */
const readingColumns = {
    recordedAt: temperatureLogs.recordedAt,
    temperature: temperatureLogs.temperature,
    receivedAt: temperatureLogs.receivedAt,
    state: temperatureLogs.state,
    evaluation: temperatureLogs.evaluation,
    pauseId: temperatureLogs.pauseId,
};

@Injectable()
export class TemperatureRepository extends BaseRepository<typeof temperatureLogs> {
    constructor(db: DatabaseService) {
        super(db, temperatureLogs);
    }

    /**
     * Stores the reading unless this device already reported this exact moment (INSERT ... ON CONFLICT DO NOTHING on
     * the primary key). Returns false for the duplicate. The first value wins and is never overwritten: these rows
     * are audit data.
     */
    async insertIgnoreDuplicate(row: InsertTemperature, tx?: DatabaseTransaction): Promise<boolean> {
        const inserted = await this.executor(tx)
            .insert(temperatureLogs)
            .values(row)
            .onConflictDoNothing({ target: [temperatureLogs.deviceId, temperatureLogs.recordedAt] })
            .returning({ deviceId: temperatureLogs.deviceId });

        return inserted.length > 0;
    }

    /**
     * Replaces the provisional `evaluation` of a reading stored earlier in the same transaction. The planned-pause
     * check has to run after the insert (the reading itself can end a pull-down), so the decision is only known then.
     * Only ever called inside the ingest transaction: nobody else sees the provisional value.
     */
    async markEvaluation(
        deviceId: string,
        recordedAt: Date,
        values: { evaluation: ReadingEvaluation; pauseId: string | null },
        tx?: DatabaseTransaction,
    ): Promise<void> {
        await this.executor(tx)
            .update(temperatureLogs)
            .set(values)
            .where(and(eq(temperatureLogs.deviceId, deviceId), eq(temperatureLogs.recordedAt, recordedAt)));
    }

    /** One page of a device's readings in the range, newest first, plus the total. Served by the primary key. */
    async findPage(
        deviceId: string,
        range: InstantRange,
        page: number,
        pageSize: number,
    ): Promise<{ items: TemperatureReading[]; total: number }> {
        const where = this.inRange(deviceId, range);

        const [totalRow] = await this.db.select({ total: count() }).from(temperatureLogs).where(where);
        const items = await this.db
            .select(readingColumns)
            .from(temperatureLogs)
            .where(where)
            .orderBy(desc(temperatureLogs.recordedAt))
            .limit(pageSize)
            .offset((page - 1) * pageSize);

        return { items, total: totalRow?.total ?? 0 };
    }

    /** How many readings of the range fall in each state / evaluation pair. One pass over the range. */
    async countByStateAndEvaluation(
        deviceId: string,
        range: InstantRange,
    ): Promise<{ state: ReadingState; evaluation: ReadingEvaluation; total: number }[]> {
        return this.db
            .select({ state: temperatureLogs.state, evaluation: temperatureLogs.evaluation, total: count() })
            .from(temperatureLogs)
            .where(this.inRange(deviceId, range))
            .groupBy(temperatureLogs.state, temperatureLogs.evaluation);
    }

    /**
     * One summary per hour that has readings, oldest first. Hours are cut in the plant time zone. Everything is
     * counted in ONE pass over the device's range, which the (device_id, recorded_at) primary key serves; the answer
     * is at most 24 rows per day however often the device reports. Hours without readings are not here: the caller
     * fills them in, because a silent hour belongs in the report.
     *
     * `max(state)` is the worst state because Postgres orders an enum by its declaration order, and the enum is
     * declared from NORMAL up to CRITICAL.
     */
    async findHourly(deviceId: string, range: InstantRange): Promise<HourlyAggregate[]> {
        // The zone is a constant of the code, so it goes into the SQL text as a literal. As a bind parameter it would
        // be a different $n in SELECT and in GROUP BY, and Postgres then refuses the grouping.
        const zone = sql.raw(`'${APP_TIMEZONE}'`);
        const hour = sql<Date>`date_trunc('hour', ${temperatureLogs.recordedAt}, ${zone})`;
        const state = temperatureLogs.state;
        const evaluation = temperatureLogs.evaluation;
        const countWhere = (condition: SQL) => sql<number>`(count(*) FILTER (WHERE ${condition}))::int`;

        const rows = await this.db
            .select({
                hour: hour.as('hour'),
                readings: sql<number>`count(*)::int`.as('readings'),
                min: sql<number>`min(${temperatureLogs.temperature})::float`.as('min'),
                avg: sql<number>`round(avg(${temperatureLogs.temperature})::numeric, 2)::float`.as('avg'),
                max: sql<number>`max(${temperatureLogs.temperature})::float`.as('max'),
                worstState: sql<ReadingState>`max(${state})`.as('worst_state'),
                warningCount: countWhere(sql`${state} = 'WARNING'`).as('warning_count'),
                criticalCount: countWhere(sql`${state} = 'CRITICAL'`).as('critical_count'),
                pausedCount: countWhere(sql`${evaluation} = 'PAUSED'`).as('paused_count'),
                pullingDownCount: countWhere(sql`${evaluation} = 'PULLING_DOWN'`).as('pulling_down_count'),
                inactiveCount: countWhere(sql`${evaluation} = 'DEVICE_INACTIVE'`).as('inactive_count'),
                lateCount: countWhere(sql`${evaluation} = 'LATE_ARRIVAL'`).as('late_count'),
                evaluatedExcursions: countWhere(
                    sql`${state} IN ('WARNING', 'CRITICAL') AND ${evaluation} = 'EVALUATED'`,
                ).as('evaluated_excursions'),
            })
            .from(temperatureLogs)
            .where(this.inRange(deviceId, range))
            .groupBy(hour)
            .orderBy(asc(hour));

        // the driver may hand a timestamp back as text: the rest of the code wants a Date
        return rows.map((row) => ({ ...row, hour: new Date(row.hour) }));
    }

    /**
     * Readings since `since`, the highest one per minute, for several devices in ONE query. Taking the highest (not
     * the average) keeps a short spike visible on the sparkline, and keeps the answer small (at most one point per
     * device per minute) however often a device reports. Served by the (device_id, recorded_at) primary key.
     */
    async findRecentPerMinute(
        deviceIds: string[],
        since: Date,
    ): Promise<{ deviceId: string; bucket: Date; temperature: number }[]> {
        const minute = sql<Date>`date_trunc('minute', ${temperatureLogs.recordedAt})`;

        return this.db
            .select({
                deviceId: temperatureLogs.deviceId,
                bucket: minute.as('bucket'),
                temperature: sql<number>`round(max(${temperatureLogs.temperature})::numeric, 2)::float`.as(
                    'temperature',
                ),
            })
            .from(temperatureLogs)
            .where(and(inArray(temperatureLogs.deviceId, deviceIds), gte(temperatureLogs.recordedAt, since)))
            .groupBy(temperatureLogs.deviceId, minute)
            .orderBy(asc(temperatureLogs.deviceId), asc(minute));
    }

    /**
     * The readings of the range, oldest first, in chunks. It pages by position (the last recorded_at seen) instead
     * of OFFSET, so every chunk costs the same however far the export has got, and memory stays bounded.
     */
    async *iterateRange(deviceId: string, range: InstantRange): AsyncGenerator<TemperatureReading[]> {
        let cursor: Date | null = null;

        for (;;) {
            const rows: TemperatureReading[] = await this.db
                .select(readingColumns)
                .from(temperatureLogs)
                .where(
                    and(
                        eq(temperatureLogs.deviceId, deviceId),
                        cursor ? gt(temperatureLogs.recordedAt, cursor) : gte(temperatureLogs.recordedAt, range.from),
                        lt(temperatureLogs.recordedAt, range.to),
                    ),
                )
                .orderBy(asc(temperatureLogs.recordedAt))
                .limit(EXPORT_CHUNK_SIZE);

            if (rows.length === 0) return;

            yield rows;

            if (rows.length < EXPORT_CHUNK_SIZE) return;

            cursor = rows[rows.length - 1].recordedAt;
        }
    }

    /** A device's readings in the half-open range `[from, to)`. */
    private inRange(deviceId: string, range: InstantRange) {
        return and(
            eq(temperatureLogs.deviceId, deviceId),
            gte(temperatureLogs.recordedAt, range.from),
            lt(temperatureLogs.recordedAt, range.to),
        );
    }
}
