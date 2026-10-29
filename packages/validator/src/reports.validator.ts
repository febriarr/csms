import { z } from "zod";
import { checkDateRange, idSchema, isoDateSchema, optionalQueryId, paginationQuerySchema } from "./common";
import { MAX_REPORT_RANGE_DAYS } from "./constants";

const withinReportRange = (data: { from?: string; to?: string }, ctx: z.RefinementCtx) =>
    checkDateRange(data, ctx, { maxDays: MAX_REPORT_RANGE_DAYS });

/*  temperature report */

export const temperatureReportQuerySchema = z
    .object({
        deviceId: optionalQueryId,
        from: isoDateSchema("Tanggal mulai").optional(),
        to: isoDateSchema("Tanggal akhir").optional(),
        page: paginationQuerySchema.shape.page,
        pageSize: z.coerce.number().int().positive().max(100).default(50),
    })
    .superRefine(withinReportRange);

export const temperatureExportQuerySchema = z
    .object({
        deviceId: idSchema,
        from: isoDateSchema("Tanggal mulai"),
        to: isoDateSchema("Tanggal akhir"),
        format: z.enum(["xlsx", "csv"], { message: "Format tidak valid" }),
    })
    .superRefine(withinReportRange);

/* diagnostics report */

export const diagnosticsReportQuerySchema = z
    .object({
        deviceId: optionalQueryId,
        from: isoDateSchema("Tanggal mulai").optional(),
        to: isoDateSchema("Tanggal akhir").optional(),
    })
    .superRefine(withinReportRange);

export const diagnosticsDetailQuerySchema = z
    .object({
        deviceId: idSchema,
        from: isoDateSchema("Tanggal mulai").optional(),
        to: isoDateSchema("Tanggal akhir").optional(),
        page: paginationQuerySchema.shape.page,
        pageSize: paginationQuerySchema.shape.pageSize,
    })
    .superRefine(withinReportRange);

export type TemperatureReportQuery = z.infer<typeof temperatureReportQuerySchema>;
export type TemperatureExportQuery = z.infer<typeof temperatureExportQuerySchema>;
export type DiagnosticsReportQuery = z.infer<typeof diagnosticsReportQuerySchema>;
export type DiagnosticsDetailQuery = z.infer<typeof diagnosticsDetailQuerySchema>;
