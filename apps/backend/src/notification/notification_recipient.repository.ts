import { BaseRepository } from '@/common/abstracts/base.repository';
import { DatabaseService } from '@/database/database.service';
import {
    coldStorages,
    devices,
    divisions,
    InsertNotificationRecipient,
    locations,
    notificationRecipients,
    notificationSubscriptions,
    SelectNotificationRecipient,
} from '@/database/schema';
import { Injectable } from '@nestjs/common';
import { and, asc, eq, getTableColumns, ilike, or, SQL } from 'drizzle-orm';

export type RecipientRow = SelectNotificationRecipient & { division: string | null };

export interface RecipientFilter {
    name?: string;
    channel?: SelectNotificationRecipient['channel'];
    divisionId?: string;
    isActive?: boolean;
}

@Injectable()
export class NotificationRecipientRepository extends BaseRepository<typeof notificationRecipients> {
    constructor(db: DatabaseService) {
        super(db, notificationRecipients);
    }

    async list(filter: RecipientFilter): Promise<RecipientRow[]> {
        const { name, channel, divisionId, isActive } = filter;
        const conditions: SQL[] = [];

        if (name) conditions.push(ilike(notificationRecipients.name, `%${name}%`));
        if (channel) conditions.push(eq(notificationRecipients.channel, channel));
        if (divisionId) conditions.push(eq(notificationRecipients.divisionId, divisionId));
        if (isActive !== undefined) conditions.push(eq(notificationRecipients.isActive, isActive));

        return this.db
            .select({ ...getTableColumns(notificationRecipients), division: divisions.name })
            .from(notificationRecipients)
            .leftJoin(divisions, eq(notificationRecipients.divisionId, divisions.id))
            .where(and(...conditions))
            .orderBy(asc(notificationRecipients.name));
    }

    async findById(id: SelectNotificationRecipient['id']): Promise<RecipientRow | undefined> {
        const [row] = await this.db
            .select({ ...getTableColumns(notificationRecipients), division: divisions.name })
            .from(notificationRecipients)
            .leftJoin(divisions, eq(notificationRecipients.divisionId, divisions.id))
            .where(eq(notificationRecipients.id, id));

        return row;
    }

    async updateById(
        id: SelectNotificationRecipient['id'],
        input: Partial<InsertNotificationRecipient>,
    ): Promise<SelectNotificationRecipient | undefined> {
        return this.update(eq(notificationRecipients.id, id), input);
    }

    /** Subscriptions are removed by the database (onDelete cascade). */
    async destroy(id: SelectNotificationRecipient['id']): Promise<SelectNotificationRecipient | undefined> {
        const [row] = await this.db.delete(notificationRecipients).where(eq(notificationRecipients.id, id)).returning();

        return row;
    }

    /**
     * Active recipients of `channel` that should be told about `deviceId`.
     * A subscription matches when it is ALL, or targets the device or any of its ancestors
     * (device -> cold storage -> location -> division). A recipient with several matching subscriptions
     * is returned once (DISTINCT). Unknown device -> empty list.
     */
    async findForDevice(
        deviceId: string,
        channel: SelectNotificationRecipient['channel'],
    ): Promise<SelectNotificationRecipient[]> {
        return this.db
            .selectDistinct(getTableColumns(notificationRecipients))
            .from(notificationRecipients)
            .innerJoin(notificationSubscriptions, eq(notificationSubscriptions.recipientId, notificationRecipients.id))
            .innerJoin(devices, eq(devices.id, deviceId))
            .innerJoin(coldStorages, eq(coldStorages.id, devices.coldStorageId))
            .innerJoin(locations, eq(locations.id, coldStorages.locationId))
            .where(
                and(
                    eq(notificationRecipients.isActive, true),
                    eq(notificationRecipients.channel, channel),
                    or(
                        eq(notificationSubscriptions.scope, 'ALL'),
                        eq(notificationSubscriptions.deviceId, devices.id),
                        eq(notificationSubscriptions.coldStorageId, coldStorages.id),
                        eq(notificationSubscriptions.locationId, locations.id),
                        eq(notificationSubscriptions.divisionId, locations.divisionId),
                    ),
                ),
            );
    }
}
