import { pgTable, uuid, varchar, boolean, timestamp, index } from 'drizzle-orm/pg-core';

export const notificationRecipients = pgTable(
  'notification_recipients',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    channel: varchar('channel', { length: 20 }).notNull(),
    target: varchar('target', { length: 150 }).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  t => [index('notification_receipents_channel_idx').on(t.channel)]
);

export type InsertNotificationRecipients = typeof notificationRecipients.$inferInsert;
export type SelectNotificationRecipients = typeof notificationRecipients.$inferSelect;
