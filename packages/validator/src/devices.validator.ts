import { z } from "zod";
import {
    hasAtLeastOneField,
    idSchema,
    NO_CHANGES_MESSAGE,
    optionalQueryId,
    optionalQueryText,
    optionalText,
    requiredText,
} from "./common";

/** Sensor/threshold range accepted by the system (same bounds as the telemetry payload). */
const MIN_TEMPERATURE = -100;
const MAX_TEMPERATURE = 100;

/** Heartbeat bounds in seconds. Adjust if a device class legitimately reports faster or slower. */
const MIN_HEARTBEAT_SECONDS = 5;
const MAX_HEARTBEAT_SECONDS = 3600;

/**
 * A threshold typed into a form arrives as a number or as numeric text. Numbers pass through, text is converted,
 * blank text becomes `undefined` (-> "wajib diisi"), anything else fails as "harus berupa angka".
 * Also rejects out-of-range values and more than 2 decimals (the column is numeric(5,2); the database would
 * round silently).
 *
 * `z.preprocess` instead of `z.union([...]).pipe(z.coerce.number())`: in zod 4 `z.coerce.number()` has input type
 * `unknown`, which `.pipe()` refuses after a `string | number` schema.
 */
const temperatureField = (label: string) =>
    z.preprocess(
        (value) => {
            if (typeof value !== "string") return value;

            const text = value.trim();

            return text === "" ? undefined : Number(text);
        },
        z
            .number({
                error: (issue) => (issue.input === undefined ? `${label} wajib diisi` : `${label} harus berupa angka`),
            })
            .min(MIN_TEMPERATURE, `${label} minimal ${MIN_TEMPERATURE}°C`)
            .max(MAX_TEMPERATURE, `${label} maksimal ${MAX_TEMPERATURE}°C`)
            .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6, {
                message: `${label} maksimal 2 angka di belakang koma`,
            })
    );

/** The spiral has no DEFROST state: "" / null / missing all mean "no defrost threshold". */
const optionalTemperatureField = (label: string) =>
    z.preprocess((value) => (value === "" ? null : value), temperatureField(label).nullish());

const heartbeatField = z.coerce
    .number({ message: "Interval heartbeat harus berupa angka" })
    .int("Interval heartbeat harus bilangan bulat")
    .min(MIN_HEARTBEAT_SECONDS, `Interval heartbeat minimal ${MIN_HEARTBEAT_SECONDS} detik`)
    .max(MAX_HEARTBEAT_SECONDS, `Interval heartbeat maksimal ${MAX_HEARTBEAT_SECONDS} detik`);

/*  threshold order */

export type ThresholdInput = {
    defrostThreshold?: number | null;
    warningThreshold?: number;
    criticalThreshold?: number;
};

export type ThresholdIssue = { path: "warningThreshold" | "criticalThreshold"; message: string };

/**
 * Pure check of defrost < warning < critical, comparing only the values that are present.
 * Exported so the SERVICE can run it on the merged result of an update (a partial update cannot be checked
 * against values it does not contain — the database CHECK would reject it with an opaque error).
 */
export function thresholdOrderIssues(data: ThresholdInput): ThresholdIssue[] {
    const { defrostThreshold, warningThreshold, criticalThreshold } = data;
    const issues: ThresholdIssue[] = [];

    if (defrostThreshold != null && warningThreshold != null && defrostThreshold >= warningThreshold) {
        issues.push({ path: "warningThreshold", message: "Batas warning harus lebih besar dari batas defrost" });
    }

    if (warningThreshold != null && criticalThreshold != null && warningThreshold >= criticalThreshold) {
        issues.push({ path: "criticalThreshold", message: "Batas critical harus lebih besar dari batas warning" });
    }

    return issues;
}

function checkThresholdOrder(data: ThresholdInput, ctx: z.RefinementCtx): void {
    for (const issue of thresholdOrderIssues(data)) {
        ctx.addIssue({ code: "custom", path: [issue.path], message: issue.message });
    }
}

/* schemas */

export const createDeviceSchema = z
    .object({
        code: requiredText("Kode device", 50),
        name: requiredText("Nama device", 100),
        coldStorageId: idSchema,
        pointLabel: optionalText("Titik", 100),
        defrostThreshold: optionalTemperatureField("Batas defrost"),
        warningThreshold: temperatureField("Batas warning"),
        criticalThreshold: temperatureField("Batas critical"),
        heartbeatIntervalSeconds: heartbeatField.default(30),
        firmwareVersion: optionalText("Versi firmware", 32),
    })
    .superRefine(checkThresholdOrder);

export const updateDeviceSchema = z
    .object({
        code: requiredText("Kode device", 50).optional(),
        name: requiredText("Nama device", 100).optional(),
        coldStorageId: idSchema.optional(),
        pointLabel: optionalText("Titik", 100),
        defrostThreshold: optionalTemperatureField("Batas defrost"), // null = remove the defrost state
        warningThreshold: temperatureField("Batas warning").optional(),
        criticalThreshold: temperatureField("Batas critical").optional(),
        heartbeatIntervalSeconds: heartbeatField.optional(),
        firmwareVersion: optionalText("Versi firmware", 32),
    })
    .superRefine(checkThresholdOrder)
    .refine(hasAtLeastOneField, { message: NO_CHANGES_MESSAGE });

export const deviceQuerySchema = z.object({
    search: optionalQueryText,
    divisionId: optionalQueryId,
    locationId: optionalQueryId,
    coldStorageId: optionalQueryId,
});

export type CreateDeviceInput = z.infer<typeof createDeviceSchema>;
export type UpdateDeviceInput = z.infer<typeof updateDeviceSchema>;
export type DeviceQuery = z.infer<typeof deviceQuerySchema>;
