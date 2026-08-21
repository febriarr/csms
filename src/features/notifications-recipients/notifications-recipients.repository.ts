import { and, desc, eq, ilike } from 'drizzle-orm';
import {
  type Database,
  DatabaseTransaction,
  InsertNotificationRecipients,
  notificationRecipients,
  type SelectNotificationRecipients,
} from '../../database';
import { BaseRepository } from '../../shared/abstract/base-repository';
import type { NotificationsRecipientsQuery } from './notifications-recipients.validator';

export class NotificationsRecipientsRepository extends BaseRepository<typeof notificationRecipients> {
  constructor(db: Database) {
    super(db, notificationRecipients);
  }

  async findAll(query?: NotificationsRecipientsQuery): Promise<SelectNotificationRecipients[]> {
    const conditions = [];
    if (query?.name) {
      const pattern = `%${query.name}%`;
      conditions.push(ilike(notificationRecipients.name, pattern));
    }
    if (query?.channel) {
      conditions.push(eq(notificationRecipients.channel, query.channel));
    }

    return this.db.query.notificationRecipients.findMany({
      where: and(...conditions),
      orderBy: desc(notificationRecipients.createdAt),
    });
  }

  async findById(id: string): Promise<SelectNotificationRecipients | undefined> {
    const result = await this.db.query.notificationRecipients.findFirst({
      where: and(eq(notificationRecipients.id, id)),
    });
    return result || undefined;
  }

  async updateById(
    id: string,
    input: Partial<InsertNotificationRecipients>
  ): Promise<SelectNotificationRecipients | undefined> {
    const result = await this.update(eq(notificationRecipients.id, id), input);
    return result || undefined;
  }

  async deleteById(id: string): Promise<SelectNotificationRecipients | undefined> {
    const [result] = await this.db.delete(notificationRecipients).where(eq(notificationRecipients.id, id)).returning();
    return result || undefined;
  }

  async findActiveByChannel(channel: string, tx?: DatabaseTransaction): Promise<SelectNotificationRecipients[]> {
    const db = tx ?? this.db;
    return db.query.notificationRecipients.findMany({
      where: and(eq(notificationRecipients.channel, channel), eq(notificationRecipients.isActive, true)),
    });
  }
}
