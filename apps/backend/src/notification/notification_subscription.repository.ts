import { BaseRepository } from '@/common/abstracts/base.repository';
import { DatabaseService } from '@/database/database.service';
import { DatabaseTransaction } from '@/database/database.type';
import {
    coldStorages,
    devices,
    divisions,
    InsertNotificationSubscription,
    locations,
    notificationSubscriptions,
    SelecttNotificationSubscription,
} from '@/database/schema';
import { Injectable } from '@nestjs/common';
import { eq, inArray, sql } from 'drizzle-orm';

export type SubscriptionRow = Pick<
    SelecttNotificationSubscription,
    'id' | 'recipientId' | 'scope' | 'divisionId' | 'locationId' | 'coldStorageId' | 'deviceId'
> & {
    /** Name of whatever the scope points at; null for scope ALL. */
    targetName: string | null;
};

type SubscriptionTarget = Omit<InsertNotificationSubscription, 'id' | 'recipientId'>;

@Injectable()
export class NotificationSubscriptionRepository extends BaseRepository<typeof notificationSubscriptions> {
    constructor(db: DatabaseService) {
        super(db, notificationSubscriptions);
    }

    /**
     * Exactly one of the four foreign keys is set per row (CHECK constraint), so only `recipientId` is
     * required; the target tables are LEFT JOINed and coalesced into a single name.
     */
    async listByRecipientIds(recipientIds: string[]): Promise<SubscriptionRow[]> {
        if (recipientIds.length === 0) return [];

        const targetName = sql<
            string | null
        >`coalesce(${devices.name}, ${coldStorages.name}, ${locations.name}, ${divisions.name})`;

        return this.db
            .select({
                id: notificationSubscriptions.id,
                recipientId: notificationSubscriptions.recipientId,
                scope: notificationSubscriptions.scope,
                divisionId: notificationSubscriptions.divisionId,
                locationId: notificationSubscriptions.locationId,
                coldStorageId: notificationSubscriptions.coldStorageId,
                deviceId: notificationSubscriptions.deviceId,
                targetName,
            })
            .from(notificationSubscriptions)
            .leftJoin(divisions, eq(notificationSubscriptions.divisionId, divisions.id))
            .leftJoin(locations, eq(notificationSubscriptions.locationId, locations.id))
            .leftJoin(coldStorages, eq(notificationSubscriptions.coldStorageId, coldStorages.id))
            .leftJoin(devices, eq(notificationSubscriptions.deviceId, devices.id))
            .where(inArray(notificationSubscriptions.recipientId, recipientIds))
            .orderBy(notificationSubscriptions.scope, targetName);
    }

    /**
     * Inserts subscriptions for a recipient. Pass `tx` to run inside a caller's transaction
     * (e.g. creating the recipient and its subscriptions together). Empty list = nothing to do.
     */
    async createMany(recipientId: string, items: SubscriptionTarget[], tx?: DatabaseTransaction): Promise<void> {
        if (items.length === 0) return;

        await this.executor(tx)
            .insert(notificationSubscriptions)
            .values(items.map((item) => ({ ...item, recipientId })));
    }

    /** The "Save" action: the given list replaces everything the recipient has now, atomically. */
    async replaceForRecipient(recipientId: string, items: SubscriptionTarget[]): Promise<void> {
        await this.withTransaction(async (tx) => {
            await tx.delete(notificationSubscriptions).where(eq(notificationSubscriptions.recipientId, recipientId));
            await this.createMany(recipientId, items, tx);
        });
    }
}
