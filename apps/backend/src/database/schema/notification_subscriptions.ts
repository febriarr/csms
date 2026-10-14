import { sql } from 'drizzle-orm';
import { check, index, pgTable, unique, uuid } from 'drizzle-orm/pg-core';
import { coldStorages } from './cold_storages';
import { devices } from './devices';
import { divisions } from './divisions';
import { subscriptionScopeEnum } from './enums';
import { locations } from './locations';
import { notificationRecipients } from './notification_recipients';
import { pk, timestamps } from './_helpers';

// Which recipient gets alerts from which part of the plant. Examples:
//   ME PIC           → scope DIVISION (Warehouse) + scope DIVISION (Production)   (or one row with scope ALL)
//   Warehouse PIC    → scope DIVISION (Warehouse)
//   a shift leader   → scope COLD_STORAGE (one spiral room)
// A device matches a subscription when ANY of its ancestors (device → cold storage → location → division)
// is the subscribed target, so a new device is covered automatically. No subscription = no alerts.
// Exactly the FK that matches `scope` is set (all four are NULL for ALL).
export const notificationSubscriptions = pgTable(
    'notification_subscriptions',
    {
        id: pk(),
        recipientId: uuid('recipient_id')
            .notNull()
            .references(() => notificationRecipients.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
        scope: subscriptionScopeEnum('scope').notNull(),
        divisionId: uuid('division_id').references(() => divisions.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
        locationId: uuid('location_id').references(() => locations.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
        coldStorageId: uuid('cold_storage_id').references(() => coldStorages.id, {
            onDelete: 'cascade',
            onUpdate: 'cascade',
        }),
        deviceId: uuid('device_id').references(() => devices.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
        ...timestamps,
    },
    (t) => [
        index('notification_subscriptions_recipient_idx').on(t.recipientId),
        // no duplicate subscriptions (NULLS NOT DISTINCT, PostgreSQL 15+, because most FK columns are NULL)
        unique('notification_subscriptions_target_uniq')
            .on(t.recipientId, t.scope, t.divisionId, t.locationId, t.coldStorageId, t.deviceId)
            .nullsNotDistinct(),
        check(
            'notification_subscriptions_scope_chk',
            sql`(${t.scope} = 'ALL' AND num_nonnulls(${t.divisionId}, ${t.locationId}, ${t.coldStorageId}, ${t.deviceId}) = 0)
       OR (${t.scope} = 'DIVISION' AND ${t.divisionId} IS NOT NULL AND num_nonnulls(${t.locationId}, ${t.coldStorageId}, ${t.deviceId}) = 0)
       OR (${t.scope} = 'LOCATION' AND ${t.locationId} IS NOT NULL AND num_nonnulls(${t.divisionId}, ${t.coldStorageId}, ${t.deviceId}) = 0)
       OR (${t.scope} = 'COLD_STORAGE' AND ${t.coldStorageId} IS NOT NULL AND num_nonnulls(${t.divisionId}, ${t.locationId}, ${t.deviceId}) = 0)
       OR (${t.scope} = 'DEVICE' AND ${t.deviceId} IS NOT NULL AND num_nonnulls(${t.divisionId}, ${t.locationId}, ${t.coldStorageId}) = 0)`,
        ),
    ],
);
