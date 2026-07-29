import { relations } from 'drizzle-orm';
import { devices } from './devices';
import { temperatureLogs } from './temperature-logs';

export const devicesRelations = relations(devices, ({ many }) => ({
  temperatureLogs: many(temperatureLogs),
}));

export const temperatureLogsRelations = relations(temperatureLogs, ({ one }) => ({
  device: one(devices, {
    fields: [temperatureLogs.deviceId],
    references: [devices.id],
  }),
}));
