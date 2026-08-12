-- CreateEnum (safe — no-ops if it already exists)
DO $$ BEGIN
  CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable: add columns only if they don't already exist
-- Existing tenants default to ACTIVE so they keep full access.
ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "subscription_status"        "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "trial_ends_at"              TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "paystack_customer_code"     TEXT,
  ADD COLUMN IF NOT EXISTS "paystack_subscription_code" TEXT;
