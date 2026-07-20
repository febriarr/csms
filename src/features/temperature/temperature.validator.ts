import { z } from 'zod';

export const createTemperatureSchema = z.object({
  deviceId: z.string().trim().min(1, 'Device ID is required').max(100, 'Device ID is too long'),

  timestamp: z.iso.datetime(),

  temperature: z
    .number()
    .finite('Temperature must be a valid number')
    .min(-100, 'Temperature is too low')
    .max(100, 'Temperature is too high'),
});

export type CreateTemperatureDto = z.infer<typeof createTemperatureSchema>;
