import { sql } from 'drizzle-orm';
import { index, pgTable, smallint, text, uuid, varchar } from 'drizzle-orm/pg-core';
import { alerts } from './alerts';
import { pk, timestamps, tstz } from './_helpers';
import { notificationChannelEnum, notificationStatusEnum } from './enums';
import { notificationRecipients } from './notification_recipients';

// NOTE: v1 declares this table but nothing writes to it (the WhatsApp worker sends without logging).
export const notificationLogs = pgTable(
    'notification_logs',
    {
        id: pk(),
        alertId: uuid('alert_id')
            .notNull()
            .references(() => alerts.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
        recipientId: uuid('recipient_id').references(() => notificationRecipients.id, {
            onDelete: 'set null',
            onUpdate: 'cascade',
        }),
        channel: notificationChannelEnum('channel').notNull(),
        // snapshot of the target at send time (the recipient may be edited or deleted later)
        recipient: varchar('recipient', { length: 255 }),
        status: notificationStatusEnum('status').notNull().default('PENDING'),
        attemptCount: smallint('attempt_count').notNull().default(0),
        message: text('message'),
        errorMessage: text('error_message'),
        sentAt: tstz('sent_at'),
        ...timestamps,
    },
    (t) => [
        index('notification_logs_alert_id_idx').on(t.alertId),
        // retry worker / failure dashboard only look at unfinished or failed rows
        index('notification_logs_open_idx')
            .on(t.createdAt)
            .where(sql`${t.status} <> 'SUCCESS'`),
    ],
);

export type SelectNotificationLog = typeof notificationLogs.$inferSelect;
export type InsertNotificationLog = typeof notificationLogs.$inferInsert;
