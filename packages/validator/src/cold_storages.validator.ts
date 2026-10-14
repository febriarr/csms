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

export const createColdStorageSchema = z.object({
    locationId: idSchema,
    name: requiredText("Nama cold storage", 100),
    description: optionalText("Deskripsi", 500),
});

export const updateColdStorageSchema = createColdStorageSchema
    .partial()
    .refine(hasAtLeastOneField, { message: NO_CHANGES_MESSAGE });

export const coldStorageQuerySchema = z.object({
    search: optionalQueryText,
    locationId: optionalQueryId,
    divisionId: optionalQueryId,
});

export type CreateColdStorageInput = z.infer<typeof createColdStorageSchema>;
export type UpdateColdStorageInput = z.infer<typeof updateColdStorageSchema>;
export type ColdStorageQuery = z.infer<typeof coldStorageQuerySchema>;
