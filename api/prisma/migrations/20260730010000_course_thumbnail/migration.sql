-- Course cover images are stored as bytes on the course row (not object storage).
-- List/detail JSON responses omit the bytes; clients fetch GET /courses/:id/thumbnail.

ALTER TABLE "courses" ADD COLUMN "thumbnail" BYTEA;
ALTER TABLE "courses" ADD COLUMN "thumbnail_mime_type" TEXT;
