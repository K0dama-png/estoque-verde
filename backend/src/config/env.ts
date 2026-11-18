import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(3333),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET precisa ter pelo menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  ORACLE_USER: z.string().min(1),
  ORACLE_PASSWORD: z.string().min(1),
  ORACLE_CONNECT_STRING: z.string().min(1),
  ORACLE_POOL_MIN: z.coerce.number().int().min(0).default(1),
  ORACLE_POOL_MAX: z.coerce.number().int().positive().default(10),
  ORACLE_POOL_INCREMENT: z.coerce.number().int().positive().default(1),
  CORS_ORIGIN: z.string().default('*'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
  throw new Error(`Variáveis de ambiente inválidas: ${details}`);
}

if (parsed.data.ORACLE_POOL_MIN > parsed.data.ORACLE_POOL_MAX) {
  throw new Error('ORACLE_POOL_MIN não pode ser maior que ORACLE_POOL_MAX');
}

export const env = parsed.data;
