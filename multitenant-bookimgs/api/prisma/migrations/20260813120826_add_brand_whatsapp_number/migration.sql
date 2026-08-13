-- AlterTable
ALTER TABLE "brands" ADD COLUMN     "whatsapp_number" TEXT;

-- AlterTable
ALTER TABLE "subscription_plans" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "subscriptions" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;
