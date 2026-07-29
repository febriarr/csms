import z from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(3),
  email: z.email(),
  password: z.string().min(6),
  phone: z
    .string()
    .optional()
    .refine(val => !val || /^[0-9+]{8,15}$/.test(val), {
      message: 'Nomor telepon harus angka, 8–15 digit',
    }),
  role: z.enum(['admin', 'super_admin']).default('admin'),
});

export const updateUserSchema = createUserSchema.partial();

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
