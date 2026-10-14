import { sql } from 'drizzle-orm';
import { boolean, index, pgTable, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { divisions } from './divisions';
import { notificationChannelEnum } from './enums';
import { pk, timestamps } from './_helpers';

export const notificationRecipients = pgTable(
    'notification_recipients',
    {
        id: pk(),
        name: varchar('name', { length: 100 }).notNull(),
        // the PIC's own division (organisational info; what they RECEIVE is decided by subscriptions)
        divisionId: uuid('division_id').references(() => divisions.id, { onDelete: 'set null', onUpdate: 'cascade' }),
        // one row = one delivery endpoint. A PIC reachable by WhatsApp AND email is two rows; if that becomes
        // painful, split into person + contacts.
        channel: notificationChannelEnum('channel').notNull(),
        target: varchar('target', { length: 150 }).notNull(),
        isActive: boolean('is_active').notNull().default(true),
        ...timestamps,
    },
    (t) => [
        // the same number/email cannot be registered twice on one channel
        uniqueIndex('notification_recipients_channel_target_uidx').on(t.channel, t.target),
        // hot path: "active recipients of channel X" on every WARNING/CRITICAL
        index('notification_recipients_active_channel_idx')
            .on(t.channel)
            .where(sql`${t.isActive}`),
    ],
);
