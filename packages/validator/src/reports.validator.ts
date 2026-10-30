import { z } from "zod";
import {
    checkDateRange,
    idSchema,
    isoDateSchema,
    optionalQueryEnum,
    optionalQueryId,
    optionalQueryText,
    paginationQuerySchema,
} from "./common";
import { MAX_REPORT_RANGE_DAYS, NOTIFICATION_CHANNELS, NOTIFICATION_STATUSES } from "./constants";

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
        // raw = every reading; hourly = one line per hour (min, avg, max, worst status)
        granularity: z.enum(["raw", "hourly"], { message: "Granularity tidak valid" }).default("raw"),
    })
    .superRefine(withinReportRange);

/** The alerts and planned pauses of a period: same device and dates as the export, no format. */
export const temperatureEventsQuerySchema = z
    .object({
        deviceId: idSchema,
        from: isoDateSchema("Tanggal mulai"),
        to: isoDateSchema("Tanggal akhir"),
    })
    .superRefine(withinReportRange);

/** The hourly report: one line per hour of the period, for one device. Same period rules as the export. */
export const temperatureHourlyQuerySchema = temperatureEventsQuerySchema;

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

/* notification log report */

export const notificationLogQuerySchema = paginationQuerySchema
    .extend({
        deviceId: optionalQueryId,
        coldStorageId: optionalQueryId,
        channel: optionalQueryEnum(NOTIFICATION_CHANNELS, "Channel tidak valid"),
        status: optionalQueryEnum(NOTIFICATION_STATUSES, "Status tidak valid"),
        /** Matches the recipient's target (number / address) or name. */
        search: optionalQueryText,
        from: isoDateSchema("Tanggal mulai").optional(),
        to: isoDateSchema("Tanggal akhir").optional(),
    })
    .superRefine(withinReportRange);

export type NotificationLogQuery = z.infer<typeof notificationLogQuerySchema>;
export type TemperatureReportQuery = z.infer<typeof temperatureReportQuerySchema>;
export type TemperatureExportQuery = z.infer<typeof temperatureExportQuerySchema>;
export type TemperatureEventsQuery = z.infer<typeof temperatureEventsQuerySchema>;
export type TemperatureHourlyQuery = z.infer<typeof temperatureHourlyQuerySchema>;
export type DiagnosticsReportQuery = z.infer<typeof diagnosticsReportQuerySchema>;
export type DiagnosticsDetailQuery = z.infer<typeof diagnosticsDetailQuerySchema>;
