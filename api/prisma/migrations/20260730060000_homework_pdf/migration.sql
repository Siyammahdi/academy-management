-- Optional PDF attachment on homework (in-DB bytes, like course thumbnails).
ALTER TABLE "homeworks" ADD COLUMN "pdf" BYTEA;
ALTER TABLE "homeworks" ADD COLUMN "pdf_mime_type" TEXT;
