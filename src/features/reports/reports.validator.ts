import { z } from 'zod';

export const temperatureReportQuerySchema = z
  .object({
    deviceId: z.string().uuid({ message: 'Device tidak valid' }).optional(),

    from: z.iso.date({ message: 'Tanggal mulai tidak valid' }).optional(),

    to: z.iso.date({ message: 'Tanggal akhir tidak valid' }).optional(),

    page: z.coerce.number().int().positive().default(1),
  })
  .refine(data => !data.from || !data.to || data.from <= data.to, {
    message: 'Tanggal mulai harus sebelum atau sama dengan tanggal akhir',
    path: ['from'],
  });

export type TemperatureReportQuery = z.infer<typeof temperatureReportQuerySchema>;

export const PAGE_SIZE = 50;
