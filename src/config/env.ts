import dotenv from 'dotenv';
import z from 'zod';

dotenv.config();

const envSchema = z.object({
  APP_NAME: z.string().default('CI-CSMS'),

  PORT: z.coerce.number().int().positive().default(3000),

  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  DATABASE_URL: z.string().min(1),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error(result.error.format());
  throw new Error('Invalid environment variables.');
}

export const env = {
  appName: result.data.APP_NAME,
  port: result.data.PORT,
  nodeEnv: result.data.NODE_ENV,
  databaseUrl: result.data.DATABASE_URL,
};
