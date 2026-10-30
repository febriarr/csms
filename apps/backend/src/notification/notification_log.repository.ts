import { BaseRepository } from '@/common/abstracts/base.repository';
import { DatabaseService } from '@/database/database.service';
import { DatabaseTransaction } from '@/database/database.type';
import {
    alerts,
    coldStorages,
    devices,
    InsertNotificationLog,
    notificationLogs,
    notificationRecipients,
    SelectNotificationLog,
} from '@/database/schema';
import { Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, getTableColumns, gte, ilike, lt, or, SQL, sql } from 'drizzle-orm';
import type { DispatchableLog, NotificationSeverity } from './notification.type';
import { NotificationLogQuery } from '@workspace/validator';
import { ListNotificationLog } from '@workspace/shared';
import { dayRangeInAppTimezone } from '@/common/utils/app_timezone';

/**
 * Seconds to wait after the previous attempt before trying again: attempt n is retried after RETRY_DELAYS[n].
 * The array length is also the number of attempts a message gets before it is marked FAILED.
 */
export const RETRY_DELAYS_SECONDS = [0, 30, 120, 300, 600] as const;
export const MAX_ATTEMPTS = RETRY_DELAYS_SECONDS.length;

/** An alert that could not be delivered for this long is stale: telling people about it now would mislead. */
export const MAX_MESSAGE_AGE_MINUTES = 60;

@Injectable()
export class NotificationLogRepository extends BaseRepository<typeof notificationLogs> {
    constructor(db: DatabaseService) {
        super(db, notificationLogs);
    }

    /** Inserts the PENDING rows of one alert. Pass the alert's transaction so both commit together. */
    async createMany(rows: InsertNotificationLog[], tx?: DatabaseTransaction): Promise<SelectNotificationLog[]> {
        if (rows.length === 0) return [];

        return this.executor(tx).insert(notificationLogs).values(rows).returning();
    }

    /**
     * Messages that are due: PENDING, young enough, with attempts left, and past the delay since their last
     * attempt. CRITICAL and OFFLINE come before WARNING, then oldest first.
     */
    async findDue(limit: number, now: Date): Promise<DispatchableLog[]> {
        const oldest = new Date(now.getTime() - MAX_MESSAGE_AGE_MINUTES * 60_000);
        const retryDelays = sql.raw(`ARRAY[${RETRY_DELAYS_SECONDS.join(',')}]`);

        const rows = await this.db
            .select({
                id: notificationLogs.id,
                channel: notificationLogs.channel,
                recipient: notificationLogs.recipient,
                message: notificationLogs.message,
                attemptCount: notificationLogs.attemptCount,
                severity: alerts.toState,
            })
            .from(notificationLogs)
            .innerJoin(alerts, eq(alerts.id, notificationLogs.alertId))
            .where(
                and(
                    eq(notificationLogs.status, 'PENDING'),
                    lt(notificationLogs.attemptCount, MAX_ATTEMPTS),
                    gte(notificationLogs.createdAt, oldest),
                    // parenthesised: and() joins with AND, so a bare OR here would bind to the wrong terms
                    sql`(${notificationLogs.attemptCount} = 0 OR ${notificationLogs.updatedAt} + make_interval(secs => (${retryDelays})[${notificationLogs.attemptCount} + 1]) <= ${now})`,
                ),
            )
            .orderBy(sql`CASE WHEN ${alerts.toState} = 'WARNING' THEN 1 ELSE 0 END`, asc(notificationLogs.createdAt))
            .limit(limit);

        return rows.flatMap((row) =>
            row.recipient !== null && row.message !== null && isSeverity(row.severity)
                ? [
                      {
                          id: row.id,
                          channel: row.channel,
                          recipient: row.recipient,
                          message: row.message,
                          attemptCount: row.attemptCount,
                          severity: row.severity,
                      },
                  ]
                : [],
        );
    }

    async markSent(id: string, attemptCount: number, now: Date): Promise<void> {
        await this.db
            .update(notificationLogs)
            .set({ status: 'SUCCESS', sentAt: now, errorMessage: null, attemptCount: attemptCount + 1 })
            .where(eq(notificationLogs.id, id));
    }

    /** Counts the attempt and either schedules a retry (still PENDING) or gives up (FAILED). */
    async markFailed(id: string, attemptCount: number, error: string): Promise<void> {
        const attempts = attemptCount + 1;

        await this.db
            .update(notificationLogs)
            .set({
                status: attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING',
                attemptCount: attempts,
                errorMessage: error.slice(0, 1000),
            })
            .where(eq(notificationLogs.id, id));
    }

    /** Gives up on messages that are too old to be worth sending. Returns how many were expired. */
    async expireStale(now: Date): Promise<number> {
        const oldest = new Date(now.getTime() - MAX_MESSAGE_AGE_MINUTES * 60_000);

        const rows = await this.db
            .update(notificationLogs)
            .set({ status: 'FAILED', errorMessage: 'Expired before it could be delivered' })
            .where(and(eq(notificationLogs.status, 'PENDING'), lt(notificationLogs.createdAt, oldest)))
            .returning({ id: notificationLogs.id });

        return rows.length;
    }

    /** One page of notification logs, newest first, with the alert, device and recipient they belong to. */
    async findPage(query: NotificationLogQuery): Promise<{ items: ListNotificationLog[]; total: number }> {
        const where = this.buildWhere(query);

        const [totalRow] = await this.db
            .select({ total: count() })
            .from(notificationLogs)
            .innerJoin(alerts, eq(alerts.id, notificationLogs.alertId))
            .innerJoin(devices, eq(devices.id, alerts.deviceId))
            .leftJoin(notificationRecipients, eq(notificationRecipients.id, notificationLogs.recipientId))
            .where(where);

        const rows = await this.db
            .select({
                log: getTableColumns(notificationLogs),
                recipientName: notificationRecipients.name,
                alertState: alerts.toState,
                alertOccurredAt: alerts.occurredAt,
                deviceId: devices.id,
                deviceCode: devices.code,
                deviceName: devices.name,
                coldStorageName: coldStorages.name,
            })
            .from(notificationLogs)
            .innerJoin(alerts, eq(alerts.id, notificationLogs.alertId))
            .innerJoin(devices, eq(devices.id, alerts.deviceId))
            .innerJoin(coldStorages, eq(coldStorages.id, devices.coldStorageId))
            .leftJoin(notificationRecipients, eq(notificationRecipients.id, notificationLogs.recipientId))
            .where(where)
            // the rows of one alert are inserted together and share created_at: the id keeps the paging stable
            .orderBy(desc(notificationLogs.createdAt), desc(notificationLogs.id))
            .limit(query.pageSize)
            .offset((query.page - 1) * query.pageSize);

        return {
            items: rows.map(({ log, ...context }) => ({ ...log, ...context })),
            total: totalRow?.total ?? 0,
        };
    }

    private buildWhere(query: NotificationLogQuery): SQL | undefined {
        // from / to are calendar days in the plant's time zone, applied to the moment the message was queued
        const range = query.from && query.to ? dayRangeInAppTimezone(query.from, query.to) : undefined;
        // % and _ typed by the user are text, not wildcards
        const pattern = query.search ? `%${query.search.replace(/[\\%_]/g, '\\$&')}%` : undefined;

        return and(
            query.deviceId ? eq(alerts.deviceId, query.deviceId) : undefined,
            query.coldStorageId ? eq(devices.coldStorageId, query.coldStorageId) : undefined,
            query.channel ? eq(notificationLogs.channel, query.channel) : undefined,
            query.status ? eq(notificationLogs.status, query.status) : undefined,
            pattern
                ? or(ilike(notificationLogs.recipient, pattern), ilike(notificationRecipients.name, pattern))
                : undefined,
            range ? gte(notificationLogs.createdAt, range.from) : undefined,
            range ? lt(notificationLogs.createdAt, range.to) : undefined,
        );
    }
}

function isSeverity(value: string): value is NotificationSeverity {
    return value === 'WARNING' || value === 'CRITICAL' || value === 'OFFLINE';
}
