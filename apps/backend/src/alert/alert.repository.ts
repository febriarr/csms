import { BaseRepository } from '@/common/abstracts/base.repository';
import { dayRangeInAppTimezone } from '@/common/utils/app_timezone';
import { DatabaseService } from '@/database/database.service';
import { DatabaseTransaction } from '@/database/database.type';
import { alerts, coldStorages, devices, InserAlert, SelectAlert, user } from '@/database/schema';
import { Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, getTableColumns, gte, isNotNull, isNull, lt, SQL } from 'drizzle-orm';
import type { AlertQuery } from '@workspace/validator';
import type { ListAlert, ReportAlertEvent } from '@workspace/shared';

@Injectable()
export class AlertRepository extends BaseRepository<typeof alerts> {
    constructor(db: DatabaseService) {
        super(db, alerts);
    }

    async findOne(id: SelectAlert['id'], tx?: DatabaseTransaction): Promise<SelectAlert | null> {
        const [row] = await this.executor(tx).select().from(alerts).where(eq(alerts.id, id)).limit(1);

        return row ?? null;
    }

    /**
     * One page of alerts, newest first, plus pagination metadata.
     */
    async findPage(query: AlertQuery): Promise<{
        items: ListAlert[];
        total: number;
    }> {
        const where = this.buildWhere(query);

        const [totalRow] = await this.db
            .select({ total: count() })
            .from(alerts)
            .innerJoin(devices, eq(devices.id, alerts.deviceId))
            .where(where);

        const total = totalRow?.total ?? 0;

        const rows = await this.db
            .select({
                alert: getTableColumns(alerts),
                deviceCode: devices.code,
                deviceName: devices.name,
                coldStorageName: coldStorages.name,
                acknowledgedByName: user.name,
            })
            .from(alerts)
            .innerJoin(devices, eq(devices.id, alerts.deviceId))
            .innerJoin(coldStorages, eq(coldStorages.id, devices.coldStorageId))
            .leftJoin(user, eq(user.id, alerts.acknowledgedBy))
            .where(where)
            .orderBy(desc(alerts.occurredAt))
            .limit(query.pageSize)
            .offset((query.page - 1) * query.pageSize);

        return {
            items: rows.map(({ alert, ...names }) => ({
                ...alert,
                ...names,
            })),
            total,
        };
    }

    /**
     * Every alert of one device in the half-open range `[from, to)`, oldest first, for the temperature report.
     * Alerts raised by a reading carry that reading's time, which is how a report line finds its alert.
     * DEVICE_OFFLINE alerts have no reading: they only show up in the event list.
     */
    async findForReport(deviceId: string, range: { from: Date; to: Date }): Promise<ReportAlertEvent[]> {
        const rows = await this.db
            .select({
                at: alerts.occurredAt,
                fromState: alerts.fromState,
                toState: alerts.toState,
                reasonCode: alerts.reasonCode,
                reason: alerts.reason,
                temperature: alerts.temperature,
            })
            .from(alerts)
            .where(
                and(eq(alerts.deviceId, deviceId), gte(alerts.occurredAt, range.from), lt(alerts.occurredAt, range.to)),
            )
            .orderBy(asc(alerts.occurredAt));

        return rows.map((row) => ({ type: 'ALERT' as const, ...row }));
    }

    /**
     * Marks an alert as acknowledged. The `acknowledged_at IS NULL` guard keeps the first acknowledgement: a second
     * click returns undefined and changes nothing.
     */
    async acknowledge(id: SelectAlert['id'], userId: string, now: Date): Promise<SelectAlert | undefined> {
        return this.update(and(eq(alerts.id, id), isNull(alerts.acknowledgedAt)) as SQL, {
            acknowledgedAt: now,
            acknowledgedBy: userId,
        });
    }

    async record(input: InserAlert, tx?: DatabaseTransaction): Promise<SelectAlert> {
        return this.create(input, tx);
    }

    private buildWhere(query: AlertQuery): SQL | undefined {
        // from / to are calendar days in the plant's time zone: [start of from, start of the day after to)
        const range = query.from && query.to ? dayRangeInAppTimezone(query.from, query.to) : undefined;

        return and(
            query.deviceId ? eq(alerts.deviceId, query.deviceId) : undefined,
            query.coldStorageId ? eq(devices.coldStorageId, query.coldStorageId) : undefined,
            query.toState ? eq(alerts.toState, query.toState) : undefined,
            query.reasonCode ? eq(alerts.reasonCode, query.reasonCode) : undefined,
            query.acknowledged === undefined
                ? undefined
                : query.acknowledged
                  ? isNotNull(alerts.acknowledgedAt)
                  : isNull(alerts.acknowledgedAt),
            range ? gte(alerts.occurredAt, range.from) : undefined,
            range ? lt(alerts.occurredAt, range.to) : undefined,
        );
    }
}
