const { z } = require('zod');
require('dotenv').config();

// Fail fast: if a required env var is missing/malformed, the app should not boot.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),

  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().default(3306),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().default(''),

  JWT_ACCESS_SECRET: z.string().min(10),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(10),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  REFRESH_COOKIE_NAME: z.string().default('lms_refresh_token'),

  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(20),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

module.exports = parsed.data;
