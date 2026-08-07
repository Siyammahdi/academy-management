-- Email verification: User.is_email_verified + otp_codes table.

CREATE TYPE "OtpType" AS ENUM ('EMAIL');

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "is_email_verified" BOOLEAN NOT NULL DEFAULT false;

-- Existing accounts stay usable after deploy.
UPDATE "users" SET "is_email_verified" = true WHERE "is_email_verified" = false;

CREATE TABLE IF NOT EXISTS "otp_codes" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "type" "OtpType" NOT NULL,
  "code_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "otp_codes_user_id_type_idx" ON "otp_codes"("user_id", "type");
CREATE INDEX IF NOT EXISTS "otp_codes_expires_at_idx" ON "otp_codes"("expires_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'otp_codes_user_id_fkey'
  ) THEN
    ALTER TABLE "otp_codes"
      ADD CONSTRAINT "otp_codes_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
