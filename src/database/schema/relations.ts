import { relations } from 'drizzle-orm';

import { alerts } from './alerts';
import { devices } from './devices';
import { notificationLogs } from './notification-logs';
import { temperatureLogs } from './temperature-logs';

export const devicesRelations = relations(devices, ({ many }) => ({
  temperatureLogs: many(temperatureLogs),
  alerts: many(alerts),
}));

export const temperatureLogsRelations = relations(temperatureLogs, ({ one }) => ({
  device: one(devices, {
    fields: [temperatureLogs.deviceId],
    references: [devices.id],
  }),
}));

export const alertsRelations = relations(alerts, ({ one, many }) => ({
  device: one(devices, {
    fields: [alerts.deviceId],
    references: [devices.id],
  }),
  notificationLogs: many(notificationLogs),
}));

export const notificationLogsRelations = relations(notificationLogs, ({ one }) => ({
  alert: one(alerts, {
    fields: [notificationLogs.alertId],
    references: [alerts.id],
  }),
}));
