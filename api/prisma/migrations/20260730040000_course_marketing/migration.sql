-- Featured / marketing fields for landing + public course details pages.
-- Slug is backfilled from title for existing rows, then enforced unique.

ALTER TABLE "courses" ADD COLUMN "slug" TEXT;
ALTER TABLE "courses" ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "courses" ADD COLUMN "featured_order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "courses" ADD COLUMN "tagline" TEXT;
ALTER TABLE "courses" ADD COLUMN "category" TEXT;
ALTER TABLE "courses" ADD COLUMN "emphasis" TEXT;
ALTER TABLE "courses" ADD COLUMN "focus" TEXT;
ALTER TABLE "courses" ADD COLUMN "highlights" JSONB;
ALTER TABLE "courses" ADD COLUMN "audience" TEXT;
ALTER TABLE "courses" ADD COLUMN "outcomes" JSONB;

-- Backfill slug from title + short id suffix so collisions are rare.
UPDATE "courses"
SET "slug" = lower(regexp_replace(trim(title), '[^a-zA-Z0-9]+', '-', 'g'))
  || '-'
  || substr(id, length(id) - 5)
WHERE "slug" IS NULL OR "slug" = '';

-- Clean leading/trailing hyphens from the regex replace.
UPDATE "courses"
SET "slug" = trim(both '-' from "slug");

ALTER TABLE "courses" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "courses_slug_key" ON "courses"("slug");
CREATE INDEX "courses_featured_featured_order_idx" ON "courses"("featured", "featured_order");
