/**
 * Relations for Drizzle's relational query API (`db.query.devices.findMany({ with: { coldStorage: true } })`).
 * They live in their own file because they reference EVERY table: table files only know their foreign keys,
 * so nothing here creates an import cycle between them.
 *
 * Tables that have two or more foreign keys to the same table (monitoring_pauses → user) need a
 * `relationName` on both sides, otherwise Drizzle cannot tell which key a relation belongs to.
 */
import { relations } from 'drizzle-orm';
import { alerts } from './alerts';
import { coldStorages } from './cold_storages';
import { deviceDiagnosticsLogs } from './device_diagnostics_logs';
import { devices } from './devices';
import { divisions } from './divisions';
import { locations } from './locations';
import { monitoringPauses } from './monitoring_pauses';
import { notificationLogs } from './notification_logs';
import { notificationRecipients } from './notification_recipients';
import { notificationSubscriptions } from './notification_subscriptions';
import { temperatureLogs } from './temperature_logs';
import { account, session, user } from './auth';

// User
export const userRelations = relations(user, ({ many }) => ({
    sessions: many(session),
    accounts: many(account),
    acknowledgedAlerts: many(alerts, { relationName: 'alert_acknowledged_by' }),
    createdPauses: many(monitoringPauses, { relationName: 'pause_created_by' }),
    endedPauses: many(monitoringPauses, { relationName: 'pause_ended_by' }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
    user: one(user, {
        fields: [session.userId],
        references: [user.id],
    }),
}));

export const accountRelations = relations(account, ({ one }) => ({
    user: one(user, {
        fields: [account.userId],
        references: [user.id],
    }),
}));
/**ownership chain */

export const divisionsRelations = relations(divisions, ({ many }) => ({
    locations: many(locations),
    recipients: many(notificationRecipients),
    subscriptions: many(notificationSubscriptions),
}));

export const locationsRelations = relations(locations, ({ one, many }) => ({
    division: one(divisions, { fields: [locations.divisionId], references: [divisions.id] }),
    coldStorages: many(coldStorages),
    subscriptions: many(notificationSubscriptions),
}));

export const coldStoragesRelations = relations(coldStorages, ({ one, many }) => ({
    location: one(locations, { fields: [coldStorages.locationId], references: [locations.id] }),
    devices: many(devices),
    pauses: many(monitoringPauses),
    subscriptions: many(notificationSubscriptions),
}));

export const devicesRelations = relations(devices, ({ one, many }) => ({
    coldStorage: one(coldStorages, { fields: [devices.coldStorageId], references: [coldStorages.id] }),
    temperatureLogs: many(temperatureLogs),
    diagnosticsLogs: many(deviceDiagnosticsLogs),
    alerts: many(alerts),
    pauses: many(monitoringPauses),
    subscriptions: many(notificationSubscriptions),
}));

/* logs */

export const temperatureLogsRelations = relations(temperatureLogs, ({ one }) => ({
    device: one(devices, { fields: [temperatureLogs.deviceId], references: [devices.id] }),
}));

export const deviceDiagnosticsLogsRelations = relations(deviceDiagnosticsLogs, ({ one }) => ({
    device: one(devices, { fields: [deviceDiagnosticsLogs.deviceId], references: [devices.id] }),
}));

/* alerts */

export const alertsRelations = relations(alerts, ({ one, many }) => ({
    device: one(devices, { fields: [alerts.deviceId], references: [devices.id] }),
    acknowledgedByUser: one(user, {
        fields: [alerts.acknowledgedBy],
        references: [user.id],
        relationName: 'alert_acknowledged_by',
    }),
    notificationLogs: many(notificationLogs),
}));

/* pauses */

export const monitoringPausesRelations = relations(monitoringPauses, ({ one }) => ({
    device: one(devices, { fields: [monitoringPauses.deviceId], references: [devices.id] }),
    coldStorage: one(coldStorages, { fields: [monitoringPauses.coldStorageId], references: [coldStorages.id] }),
    createdByUser: one(user, {
        fields: [monitoringPauses.createdBy],
        references: [user.id],
        relationName: 'pause_created_by',
    }),
    endedByUser: one(user, {
        fields: [monitoringPauses.endedBy],
        references: [user.id],
        relationName: 'pause_ended_by',
    }),
}));

/* notifications */

export const notificationRecipientsRelations = relations(notificationRecipients, ({ one, many }) => ({
    division: one(divisions, { fields: [notificationRecipients.divisionId], references: [divisions.id] }),
    subscriptions: many(notificationSubscriptions),
    notificationLogs: many(notificationLogs),
}));

// Only the FK that matches `scope` is set, so the other `one` relations resolve to null.
export const notificationSubscriptionsRelations = relations(notificationSubscriptions, ({ one }) => ({
    recipient: one(notificationRecipients, {
        fields: [notificationSubscriptions.recipientId],
        references: [notificationRecipients.id],
    }),
    division: one(divisions, { fields: [notificationSubscriptions.divisionId], references: [divisions.id] }),
    location: one(locations, { fields: [notificationSubscriptions.locationId], references: [locations.id] }),
    coldStorage: one(coldStorages, {
        fields: [notificationSubscriptions.coldStorageId],
        references: [coldStorages.id],
    }),
    device: one(devices, { fields: [notificationSubscriptions.deviceId], references: [devices.id] }),
}));

export const notificationLogsRelations = relations(notificationLogs, ({ one }) => ({
    alert: one(alerts, { fields: [notificationLogs.alertId], references: [alerts.id] }),
    recipient: one(notificationRecipients, {
        fields: [notificationLogs.recipientId],
        references: [notificationRecipients.id],
    }),
}));
