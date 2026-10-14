import { z } from "zod";
import { hasAtLeastOneField, NO_CHANGES_MESSAGE, requiredText } from "./common";

export const createDivisionSchema = z.object({
    name: requiredText("Nama divisi", 100),
});

export const updateDivisionSchema = createDivisionSchema
    .partial()
    .refine(hasAtLeastOneField, { message: NO_CHANGES_MESSAGE });

export type CreateDivisionInput = z.infer<typeof createDivisionSchema>;
export type UpdateDivisionInput = z.infer<typeof updateDivisionSchema>;
