-- AlterTable: add status, startDate, targetDate to Program (schema had these; init migration did not)
ALTER TABLE "Program" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS';
ALTER TABLE "Program" ADD COLUMN "startDate" TIMESTAMP(3);
ALTER TABLE "Program" ADD COLUMN "targetDate" TIMESTAMP(3);
