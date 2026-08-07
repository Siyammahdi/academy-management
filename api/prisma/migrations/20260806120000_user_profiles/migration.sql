-- Profile fields on users, teacher_profiles table, and student guardian fields.

CREATE TYPE "Gender" AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "full_name" TEXT,
  ADD COLUMN IF NOT EXISTS "phone" TEXT,
  ADD COLUMN IF NOT EXISTS "gender" "Gender",
  ADD COLUMN IF NOT EXISTS "date_of_birth" DATE,
  ADD COLUMN IF NOT EXISTS "blood_group" TEXT,
  ADD COLUMN IF NOT EXISTS "nationality" TEXT,
  ADD COLUMN IF NOT EXISTS "national_id" TEXT,
  ADD COLUMN IF NOT EXISTS "address_line" TEXT,
  ADD COLUMN IF NOT EXISTS "city" TEXT,
  ADD COLUMN IF NOT EXISTS "district" TEXT,
  ADD COLUMN IF NOT EXISTS "postal_code" TEXT,
  ADD COLUMN IF NOT EXISTS "country" TEXT DEFAULT 'Bangladesh',
  ADD COLUMN IF NOT EXISTS "avatar" BYTEA,
  ADD COLUMN IF NOT EXISTS "avatar_mime_type" TEXT,
  ADD COLUMN IF NOT EXISTS "last_login_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "users_phone_idx" ON "users"("phone");

ALTER TABLE "students"
  ADD COLUMN IF NOT EXISTS "guardian_name" TEXT,
  ADD COLUMN IF NOT EXISTS "guardian_phone" TEXT,
  ADD COLUMN IF NOT EXISTS "emergency_contact" TEXT;

CREATE TABLE IF NOT EXISTS "teacher_profiles" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "employee_id" TEXT,
  "designation" TEXT,
  "department" TEXT,
  "bio" TEXT,
  "qualifications" TEXT,
  "experience" TEXT,
  "joining_date" DATE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "teacher_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "teacher_profiles_user_id_key" ON "teacher_profiles"("user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'teacher_profiles_user_id_fkey'
  ) THEN
    ALTER TABLE "teacher_profiles"
      ADD CONSTRAINT "teacher_profiles_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Backfill display name/phone from linked student profiles.
UPDATE "users" u
SET
  "full_name" = COALESCE(u."full_name", s."full_name"),
  "phone" = COALESCE(u."phone", s."phone")
FROM "students" s
WHERE s."user_id" = u."id";
