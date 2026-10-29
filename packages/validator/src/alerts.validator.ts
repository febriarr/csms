import type { z } from "zod";
import {
    checkDateRange,
    isoDateSchema,
    optionalQueryBoolean,
    optionalQueryEnum,
    optionalQueryId,
    paginationQuerySchema,
} from "./common";
import { ALERT_REASONS, DEVICE_STATES } from "./constants";

// Acknowledging an alert has no body: the alert id comes from the route (`idParamSchema`) and the user from
// the session.

export const alertQuerySchema = paginationQuerySchema
    .extend({
        deviceId: optionalQueryId,
        coldStorageId: optionalQueryId,
        toState: optionalQueryEnum(DEVICE_STATES, "Status tidak valid"),
        reasonCode: optionalQueryEnum(ALERT_REASONS, "Alasan alert tidak valid"),
        acknowledged: optionalQueryBoolean, // true = acknowledged only, false = still open, omitted = both
        from: isoDateSchema("Tanggal mulai").optional(),
        to: isoDateSchema("Tanggal akhir").optional(),
    })
    .superRefine((data, ctx) => checkDateRange(data, ctx));

export type AlertQuery = z.infer<typeof alertQuerySchema>;
