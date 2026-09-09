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

export const temperatureExportQuerySchema = z
  .object({
    deviceId: z.string().uuid({ message: 'Device tidak valid' }),
    from: z.iso.date({ message: 'Tanggal mulai tidak valid' }),
    to: z.iso.date({ message: 'Tanggal akhir tidak valid' }),
    format: z.enum(['xlsx', 'csv'], { message: 'Format tidak valid' }),
  })
  .refine(data => data.from <= data.to, {
    message: 'Tanggal mulai harus sebelum atau sama dengan tanggal akhir',
    path: ['from'],
  })
  .refine(
    data => {
      const from = new Date(data.from);
      const maxTo = new Date(from);
      maxTo.setMonth(maxTo.getMonth() + 1);
      return new Date(data.to) <= maxTo;
    },
    { message: 'Rentang tanggal maksimal 1 bulan', path: ['to'] }
  );

export type TemperatureExportQuery = z.infer<typeof temperatureExportQuerySchema>;

export const PAGE_SIZE = 50;
