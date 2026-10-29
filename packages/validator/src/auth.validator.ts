import { z } from "zod";

export const loginInput = z.object({
    username: z.string(),
    password: z.string(),
});

export type LoginInput = z.infer<typeof loginInput>;
