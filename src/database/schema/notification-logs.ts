import { index, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { alerts } from './alerts';

export const notificationChannelEnum = pgEnum('notification_channel', [
  'WHATSAPP',
  'EMAIL',
  'TELEGRAM',
  'DASHBOARD',
  'WEBHOOK',
]);

export const notificationStatusEnum = pgEnum('notification_status', ['PENDING', 'SUCCESS', 'FAILED']);

export const notificationLogs = pgTable(
  'notification_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    alertId: uuid('alert_id')
      .notNull()
      .references(() => alerts.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),

    channel: notificationChannelEnum('channel').notNull(),

    status: notificationStatusEnum('status').notNull().default('PENDING'),

    recipient: varchar('recipient', {
      length: 255,
    }),

    message: text('message'),

    errorMessage: text('error_message'),

    sentAt: timestamp('sent_at', {
      mode: 'date',
      withTimezone: true,
    }),

    createdAt: timestamp('created_at', {
      mode: 'date',
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  t => [
    index('notification_logs_alert_id_idx').on(t.alertId),

    index('notification_logs_channel_idx').on(t.channel),

    index('notification_logs_status_idx').on(t.status),

    index('notification_logs_sent_at_idx').on(t.sentAt),
  ]
);
