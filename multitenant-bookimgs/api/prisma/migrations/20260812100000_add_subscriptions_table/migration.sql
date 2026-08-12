-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateTable
CREATE TABLE "subscriptions" (
    "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id"   UUID         NOT NULL,
    "plan"        "SubscriptionPlan"    NOT NULL,
    "status"      "SubscriptionStatus"  NOT NULL DEFAULT 'ACTIVE',
    "starts_at"   TIMESTAMPTZ  NOT NULL,
    "expires_at"  TIMESTAMPTZ  NOT NULL,
    "amount"      INTEGER      NOT NULL,
    "currency"    TEXT         NOT NULL,
    "reference"   TEXT,
    "notes"       TEXT,
    "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
