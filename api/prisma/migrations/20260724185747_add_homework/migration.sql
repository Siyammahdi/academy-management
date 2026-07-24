-- CreateTable
CREATE TABLE "homeworks" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "homeworks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "homeworks_batch_id_due_date_idx" ON "homeworks"("batch_id", "due_date");

-- AddForeignKey
ALTER TABLE "homeworks" ADD CONSTRAINT "homeworks_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
