-- CreateTable
CREATE TABLE "SubTaskCompletionNote" (
    "id" TEXT NOT NULL,
    "subTaskId" TEXT NOT NULL,
    "previousPercent" INTEGER NOT NULL,
    "newPercent" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubTaskCompletionNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubTaskCompletionNote_subTaskId_idx" ON "SubTaskCompletionNote"("subTaskId");

-- AddForeignKey
ALTER TABLE "SubTaskCompletionNote" ADD CONSTRAINT "SubTaskCompletionNote_subTaskId_fkey" FOREIGN KEY ("subTaskId") REFERENCES "SubTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
