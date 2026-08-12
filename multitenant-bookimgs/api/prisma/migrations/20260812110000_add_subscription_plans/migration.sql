-- Rename existing enum so the model name is free
ALTER TYPE "SubscriptionPlan" RENAME TO "PlanInterval";

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
    "name"        TEXT         NOT NULL,
    "interval"    "PlanInterval" NOT NULL,
    "amount"      INTEGER      NOT NULL,
    "currency"    TEXT         NOT NULL,
    "description" TEXT,
    "is_active"   BOOLEAN      NOT NULL DEFAULT true,
    "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- Add plan_id FK to subscriptions
ALTER TABLE "subscriptions" ADD COLUMN "plan_id" UUID;

ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey"
  FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
