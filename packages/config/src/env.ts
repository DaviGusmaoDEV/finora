import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  COOKIE_NAME: z.string().min(1).default('finora_session'),
});

export function parseEnv(input: Record<string, string | undefined>) {
  return envSchema.parse(input);
}
