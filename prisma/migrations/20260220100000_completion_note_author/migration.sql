-- AlterTable
ALTER TABLE "SubTaskCompletionNote" ADD COLUMN "userId" TEXT;

-- AddForeignKey
ALTER TABLE "SubTaskCompletionNote" ADD CONSTRAINT "SubTaskCompletionNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
