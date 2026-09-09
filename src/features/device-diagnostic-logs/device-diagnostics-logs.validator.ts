import { z } from 'zod';

export const diagnosticsReportQuerySchema = z
  .object({
    deviceId: z.string().uuid({ message: 'Device tidak valid' }).optional(),
    from: z.iso.date({ message: 'Tanggal mulai tidak valid' }).optional(),
    to: z.iso.date({ message: 'Tanggal akhir tidak valid' }).optional(),
  })
  .refine(data => !data.from || !data.to || data.from <= data.to, {
    message: 'Tanggal mulai harus sebelum atau sama dengan tanggal akhir',
    path: ['from'],
  });

export type DiagnosticsReportQuery = z.infer<typeof diagnosticsReportQuerySchema>;
