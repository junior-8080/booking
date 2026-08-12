import { z } from 'zod';
import 'dotenv/config';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Email
  EMAIL_PROVIDER: z.enum(['brevo', 'resend', 'sendgrid']).default('brevo'),
  EMAIL_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().default('noreply@bookimgs.app'),
  EMAIL_FROM_NAME: z.string().default('BookImgs'),

  // Brevo (email + SMS, worldwide)
  BREVO_API_KEY: z.string().optional(),
  BREVO_SMS_SENDER: z.string().max(11).default('BookImgs'),

  // SMS (US)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),

  // SMS (Ghana)
  HUBTEL_CLIENT_ID: z.string().optional(),
  HUBTEL_CLIENT_SECRET: z.string().optional(),
  HUBTEL_FROM_NUMBER: z.string().optional(),

  // Cloudflare R2
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  R2_PUBLIC_URL: z.string().url(),

  // App base URL for subdomain resolution
  APP_BASE_DOMAIN: z.string().default('localhost'),

  // CORS — comma-separated list of allowed origins; subdomains of
  // APP_BASE_DOMAIN are always allowed in addition to this list
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3001'),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof parsed.data;
