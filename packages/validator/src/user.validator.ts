import { z } from "zod";

export const userRoles = ["super_admin", "admin"] as const;

const passwordSchema = z.string().min(6, "Password minimal 6 karakter");
const roleSchema = z.enum(userRoles, { message: "Role tidak valid" });

export const createUserInput = z.object({
    name: z.string().trim().min(1, "Nama wajib diisi"),
    username: z
        .string()
        .trim()
        .min(3, "Username minimal 3 karakter")
        .max(30, "Username maksimal 30 karakter")
        .regex(/^[a-zA-Z0-9_.]+$/, "Username hanya boleh huruf, angka, underscore, dan titik"),
    password: passwordSchema,
    role: roleSchema,
});

export const updateProfileInput = z.object({
    name: z.string().trim().min(1, "Nama wajib diisi"),
});

export const changePasswordInput = z
    .object({
        currentPassword: z.string().min(1, "Password lama wajib diisi"),
        newPassword: passwordSchema,
    })
    .refine((data) => data.newPassword !== data.currentPassword, {
        path: ["newPassword"],
        message: "Password baru harus berbeda dari password lama",
    });

/** Query string of the user list. Values arrive as strings, so numbers are coerced. */
export const listUsersQuery = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().optional(),
    role: roleSchema.optional(),
});

export type ListUsersQuery = z.infer<typeof listUsersQuery>;
export type UpdateProfileInput = z.infer<typeof updateProfileInput>;
export type ChangePasswordInput = z.infer<typeof changePasswordInput>;

export const updateUserInput = z.object({ password: passwordSchema });
export const updateRoleInput = z.object({ role: roleSchema });

export type CreateUserInput = z.infer<typeof createUserInput>;
export type UpdateUserInput = z.infer<typeof updateUserInput>;
export type UpdateRoleInput = z.infer<typeof updateRoleInput>;
