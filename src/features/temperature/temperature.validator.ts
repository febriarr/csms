import { z } from 'zod';

export const createTemperatureSchema = z.object({
  deviceCode: z.string().min(3),

  timestamp: z.iso.datetime(),

  temperature: z
    .number()
    .finite('Temperature must be a valid number')
    .min(-100, 'Temperature is too low')
    .max(100, 'Temperature is too high'),

  sensorFailCount: z.number().int().nonnegative().default(0),
  wifiFailCount: z.number().int().nonnegative().default(0),
  httpFailCount: z.number().int().nonnegative().default(0),
});

export type CreateTemperatureDto = z.infer<typeof createTemperatureSchema>;
