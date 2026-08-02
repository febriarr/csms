import z from 'zod';

export const loginPayloadSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

export type LoginPayload = z.infer<typeof loginPayloadSchema>;
