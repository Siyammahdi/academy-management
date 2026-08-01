-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('paystation', 'sslcommerz', 'manual');

-- AlterTable
ALTER TABLE "payments" ADD COLUMN "provider" "PaymentProvider";

-- Backfill: existing gateway rows were SSLCommerz; manual rows stay manual.
UPDATE "payments" SET "provider" = 'sslcommerz' WHERE "method" = 'gateway';
UPDATE "payments" SET "provider" = 'manual' WHERE "method" = 'manual';

ALTER TABLE "payments" ALTER COLUMN "provider" SET NOT NULL;
ALTER TABLE "payments" ALTER COLUMN "provider" SET DEFAULT 'manual';

CREATE INDEX "payments_provider_idx" ON "payments"("provider");
