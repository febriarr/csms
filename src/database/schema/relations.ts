import { relations } from 'drizzle-orm';
import { alerts } from './alerts';
import { devices } from './devices';
import { notificationLogs } from './notification-logs';
import { temperatureLogs } from './temperature-logs';
import { deviceDiagnosticsLogs } from './device-diagnostics-logs';

export const devicesRelations = relations(devices, ({ many }) => ({
  temperatureLogs: many(temperatureLogs),
  diagnosticsLogs: many(deviceDiagnosticsLogs),
  alerts: many(alerts),
}));

export const deviceDiagnosticsLogsRelations = relations(deviceDiagnosticsLogs, ({ one }) => ({
  device: one(devices, {
    fields: [deviceDiagnosticsLogs.deviceId],
    references: [devices.id],
  }),
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
