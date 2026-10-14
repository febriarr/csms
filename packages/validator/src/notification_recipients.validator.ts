import { z } from "zod";
import {
    hasAtLeastOneField,
    nullableIdSchema,
    NO_CHANGES_MESSAGE,
    optionalQueryBoolean,
    optionalQueryEnum,
    optionalQueryId,
    optionalQueryText,
    requiredText,
} from "./common";
import { NOTIFICATION_CHANNELS, type NotificationChannel } from "./constants";

/** Indonesian WhatsApp number in international format without "+" (62...). */
const WHATSAPP_PATTERN = /^62\d{8,15}$/;

/**
 * Returns an error message when `target` is not valid for `channel`, otherwise null.
 * Exported for the SERVICE: a partial update that sends only `target` (or only `channel`) cannot be checked
 * here, so the service re-runs this on the merged values.
 */
export function recipientTargetIssue(channel: NotificationChannel, target: string): string | null {
    if (channel === "EMAIL") {
        return z.email().safeParse(target).success ? null : "Target harus berupa alamat email yang valid";
    }

    return WHATSAPP_PATTERN.test(target)
        ? null
        : "Target harus berupa nomor WhatsApp yang valid (contoh: 628123456789)";
}

const recipientShape = {
    name: requiredText("Nama", 100),
    divisionId: nullableIdSchema, // PIC's own division; null = none
    channel: z.enum(NOTIFICATION_CHANNELS, { message: "Channel notifikasi tidak valid" }),
    target: requiredText("Target", 150),
};

function checkTarget(data: { channel?: NotificationChannel; target?: string }, ctx: z.RefinementCtx): void {
    // Both are needed to judge the format; otherwise leave it to the service.
    if (data.channel === undefined || data.target === undefined) return;

    const issue = recipientTargetIssue(data.channel, data.target);

    if (issue) ctx.addIssue({ code: "custom", path: ["target"], message: issue });
}

/** Emails are stored lower-case so the (channel, target) unique index cannot be dodged with "A@x.com". */
function normalizeTarget<T extends { channel?: NotificationChannel; target?: string }>(data: T): T {
    return data.channel === "EMAIL" && data.target ? { ...data, target: data.target.toLowerCase() } : data;
}

export const createNotificationRecipientSchema = z
    .object({ ...recipientShape, isActive: z.boolean().default(true) })
    .superRefine(checkTarget)
    .transform(normalizeTarget);

export const updateNotificationRecipientSchema = z
    .object({ ...recipientShape, isActive: z.boolean() })
    .partial()
    .superRefine(checkTarget)
    .refine(hasAtLeastOneField, { message: NO_CHANGES_MESSAGE })
    .transform(normalizeTarget);

export const notificationRecipientQuerySchema = z.object({
    name: optionalQueryText,
    channel: optionalQueryEnum(NOTIFICATION_CHANNELS, "Channel notifikasi tidak valid"),
    divisionId: optionalQueryId,
    isActive: optionalQueryBoolean,
});

export type CreateNotificationRecipientInput = z.infer<typeof createNotificationRecipientSchema>;
export type UpdateNotificationRecipientInput = z.infer<typeof updateNotificationRecipientSchema>;
export type NotificationRecipientQuery = z.infer<typeof notificationRecipientQuerySchema>;
