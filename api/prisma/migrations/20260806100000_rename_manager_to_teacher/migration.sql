-- Rename role `manager` → `teacher` and junction table `batch_managers` → `batch_teachers`.
-- Idempotent-ish: safe to reason about from a DB that still has the old names.

-- 1) Enum value rename (PostgreSQL 10+)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'RoleName' AND e.enumlabel = 'manager'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'RoleName' AND e.enumlabel = 'teacher'
  ) THEN
    ALTER TYPE "RoleName" RENAME VALUE 'manager' TO 'teacher';
  END IF;
END $$;

-- 2) Junction table rename
DO $$
BEGIN
  IF to_regclass('public.batch_managers') IS NOT NULL
     AND to_regclass('public.batch_teachers') IS NULL THEN
    ALTER TABLE "batch_managers" RENAME TO "batch_teachers";
  END IF;
END $$;

-- 3) Indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'batch_managers_user_id_idx') THEN
    ALTER INDEX "batch_managers_user_id_idx" RENAME TO "batch_teachers_user_id_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'batch_managers_batch_id_user_id_key') THEN
    ALTER INDEX "batch_managers_batch_id_user_id_key" RENAME TO "batch_teachers_batch_id_user_id_key";
  END IF;
END $$;

-- 4) Constraints
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'batch_managers_pkey'
  ) THEN
    ALTER TABLE "batch_teachers" RENAME CONSTRAINT "batch_managers_pkey" TO "batch_teachers_pkey";
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'batch_managers_batch_id_fkey'
  ) THEN
    ALTER TABLE "batch_teachers" RENAME CONSTRAINT "batch_managers_batch_id_fkey" TO "batch_teachers_batch_id_fkey";
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'batch_managers_user_id_fkey'
  ) THEN
    ALTER TABLE "batch_teachers" RENAME CONSTRAINT "batch_managers_user_id_fkey" TO "batch_teachers_user_id_fkey";
  END IF;
END $$;
