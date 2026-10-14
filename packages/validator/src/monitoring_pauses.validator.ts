import { z } from "zod";
import { idSchema, optionalQueryId, optionalText } from "./common";
import { PAUSE_KINDS } from "./constants";

const isoDateTime = (label: string) => z.iso.datetime({ offset: true, message: `${label} tidak valid` });

/** Upper bound for the pull-down allowance: one day. */
const MAX_PULLDOWN_MINUTES = 24 * 60;

export const createPauseSchema = z
    .object({
        // exactly one of the two (the database enforces it too)
        deviceId: idSchema.optional(),
        coldStorageId: idSchema.optional(),
        kind: z.enum(PAUSE_KINDS, { message: "Jenis pause tidak valid" }),
        startsAt: isoDateTime("Waktu mulai").optional(), // omitted = starts now
        endsAt: isoDateTime("Waktu selesai").nullish(), // null / omitted = until further notice
        maxPulldownMinutes: z.coerce
            .number({ message: "Batas waktu pull-down harus berupa angka" })
            .int("Batas waktu pull-down harus bilangan bulat")
            .min(0, "Batas waktu pull-down tidak boleh negatif")
            .max(MAX_PULLDOWN_MINUTES, `Batas waktu pull-down maksimal ${MAX_PULLDOWN_MINUTES} menit`)
            .default(0),
        note: optionalText("Catatan", 500),
    })
    .superRefine((data, ctx) => {
        const targets = [data.deviceId, data.coldStorageId].filter(Boolean).length;

        if (targets !== 1) {
            ctx.addIssue({
                code: "custom",
                path: ["deviceId"],
                message: "Pilih tepat satu target: device atau cold storage",
            });
        }

        if (data.endsAt) {
            const start = data.startsAt ? Date.parse(data.startsAt) : Date.now();

            if (Date.parse(data.endsAt) <= start) {
                ctx.addIssue({
                    code: "custom",
                    path: ["endsAt"],
                    message: "Waktu selesai harus setelah waktu mulai",
                });
            }
        }
    });

/**
 * Ends a running pause. `endsAt` defaults to "now" in the service; the service must also check it against the
 * pause's own `starts_at` (needs the stored row).
 */
export const endPauseSchema = z.object({
    endsAt: isoDateTime("Waktu selesai").optional(),
    note: optionalText("Catatan", 500),
});

export const pauseQuerySchema = z.object({
    deviceId: optionalQueryId,
    coldStorageId: optionalQueryId,
});

export type CreatePauseInput = z.infer<typeof createPauseSchema>;
export type EndPauseInput = z.infer<typeof endPauseSchema>;
export type PauseQuery = z.infer<typeof pauseQuerySchema>;
