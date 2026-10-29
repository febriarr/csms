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

export const createLocationSchema = z.object({
    divisionId: idSchema,
    name: requiredText("Nama lokasi", 100),
    description: optionalText("Deskripsi", 500),
});

export const updateLocationSchema = createLocationSchema
    .partial()
    .refine(hasAtLeastOneField, { message: NO_CHANGES_MESSAGE });

export const locationQuerySchema = z.object({
    search: optionalQueryText,
    divisionId: optionalQueryId,
});

export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
export type LocationQuery = z.infer<typeof locationQuerySchema>;
