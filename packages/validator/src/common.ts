import { z } from "zod";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "./constants";

/*  ids */

export const idSchema = z.uuid({ message: "ID tidak valid" });

export const idParamSchema = z.object({ id: idSchema });

export type IdParam = z.infer<typeof idParamSchema>;

/** Form selects send "" for "nothing chosen"; for a nullable foreign key that means null. */
export const nullableIdSchema = z.preprocess((value) => (value === "" ? null : value), idSchema.nullish());

/* text */

export const requiredText = (label: string, max: number) =>
    z.string().trim().min(1, `${label} wajib diisi`).max(max, `${label} maksimal ${max} karakter`);

/**
 * Optional text from a form.
 *   key missing  -> undefined (field is left untouched on update)
 *   "" or null   -> null      (explicitly cleared)
 *   text         -> trimmed text
 */
export const optionalText = (label: string, max: number) =>
    z
        .string()
        .trim()
        .max(max, `${label} maksimal ${max} karakter`)
        .nullish()
        .transform((value) => (value === undefined ? undefined : value === "" ? null : value));

/* ---------------------------------------------------------------- update */

export const hasAtLeastOneField = (data: object): boolean => Object.values(data).some((value) => value !== undefined);

export const NO_CHANGES_MESSAGE = "Tidak ada perubahan yang dikirim";

/* ----------------------------------------------------------------- query */

// The frontend sends "" for a cleared filter, which must mean "no filter".
const emptyToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

export const optionalQueryId = z.preprocess(emptyToUndefined, idSchema.optional());

export const optionalQueryText = z.preprocess(
    (value) => (typeof value === "string" ? value.trim() || undefined : emptyToUndefined(value)),
    z.string().max(100, "Kata kunci maksimal 100 karakter").optional()
);

export const optionalQueryEnum = <const T extends readonly [string, ...string[]]>(values: T, message: string) =>
    z.preprocess(emptyToUndefined, z.enum(values, { message }).optional());

/** "true" / "false" in a query string -> boolean; absent or "" -> undefined. */
export const optionalQueryBoolean = z.preprocess(
    emptyToUndefined,
    z
        .enum(["true", "false"], { message: "Nilai harus true atau false" })
        .transform((value) => value === "true")
        .optional()
);

export const paginationQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

/* date range */

export const isoDateSchema = (label: string) => z.iso.date({ message: `${label} tidak valid` });

const MS_PER_DAY = 86_400_000;

/**
 * Cross-field checks for a `from` / `to` pair of ISO dates (YYYY-MM-DD):
 * both or neither, `from <= to`, and an optional maximum span in days.
 * Use inside `.superRefine((data, ctx) => checkDateRange(data, ctx, { maxDays }))`.
 */
export function checkDateRange(
    data: { from?: string; to?: string },
    ctx: z.RefinementCtx,
    options: { maxDays?: number } = {}
): void {
    const { from, to } = data;

    if (!from && !to) return;

    if (!from || !to) {
        ctx.addIssue({
            code: "custom",
            path: [from ? "to" : "from"],
            message: "Tanggal mulai dan tanggal akhir harus diisi bersamaan",
        });
        return;
    }

    if (from > to) {
        ctx.addIssue({
            code: "custom",
            path: ["from"],
            message: "Tanggal mulai harus sebelum atau sama dengan tanggal akhir",
        });
        return;
    }

    // ISO dates parse as UTC midnight, so the difference is an exact number of days.
    const days = (Date.parse(to) - Date.parse(from)) / MS_PER_DAY;

    if (options.maxDays !== undefined && days > options.maxDays) {
        ctx.addIssue({
            code: "custom",
            path: ["to"],
            message: `Rentang tanggal maksimal ${options.maxDays} hari`,
        });
    }
}
