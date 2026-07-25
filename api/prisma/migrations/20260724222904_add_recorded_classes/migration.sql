-- CreateTable
CREATE TABLE "recorded_classes" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "youtube_video_id" TEXT NOT NULL,
    "recorded_for" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recorded_classes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recorded_classes_batch_id_recorded_for_idx" ON "recorded_classes"("batch_id", "recorded_for");

-- AddForeignKey
ALTER TABLE "recorded_classes" ADD CONSTRAINT "recorded_classes_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
