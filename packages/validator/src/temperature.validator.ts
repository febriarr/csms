import { z } from "zod";

/** A device clock this far ahead is wrong; accepting it would freeze the device's state (see isNewest). */
export const MAX_CLOCK_AHEAD_MS = 5 * 60_000;

/** Older than this is garbage (a device that lost its clock reports 1970), not a delayed upload. */
export const MAX_READING_AGE_MS = 30 * 24 * 3_600_000;

export const resetReportSchema = z.object({
    resetReason: z.enum(["BROWNOUT", "PANIC", "WATCHDOG", "UNKNOWN"]),
    resetReasonCode: z.number().int(),
    lastRssi: z.number().int().nullable(),
    lastSensorFailCount: z.number().int().nonnegative(),
    lastWifiFailCount: z.number().int().nonnegative(),
    lastHttpFailCount: z.number().int().nonnegative(),
});

/**
 * What a device posts. The field names are the ones the existing firmware already sends, so the devices do not
 * have to change. Device facing, so it lives here and not in the validator package the frontend uses.
 */
export const telemetrySchema = z
    .object({
        deviceCode: z.string().trim().min(3),
        timestamp: z.iso.datetime({ offset: true }),
        temperature: z
            .number()
            .finite("Temperature must be a valid number")
            .min(-100, "Temperature is too low")
            .max(100, "Temperature is too high"),

        sensorFailCount: z.number().int().nonnegative().default(0),
        wifiFailCount: z.number().int().nonnegative().default(0),
        httpFailCount: z.number().int().nonnegative().default(0),
        rssi: z.number().int().nullable().default(null),

        reason: resetReportSchema.nullable().optional(),
    })
    .superRefine((data, ctx) => {
        const age = Date.now() - Date.parse(data.timestamp);

        if (age < -MAX_CLOCK_AHEAD_MS) {
            ctx.addIssue({
                code: "custom",
                path: ["timestamp"],
                message: "Timestamp is in the future: check the device clock",
            });
        } else if (age > MAX_READING_AGE_MS) {
            ctx.addIssue({ code: "custom", path: ["timestamp"], message: "Timestamp is too old" });
        }
    });

export type TelemetryInput = z.infer<typeof telemetrySchema>;
