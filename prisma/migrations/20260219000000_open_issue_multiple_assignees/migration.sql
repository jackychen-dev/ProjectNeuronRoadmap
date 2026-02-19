-- Create OpenIssueAssignee for multiple assignees per issue
CREATE TABLE "OpenIssueAssignee" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,

    CONSTRAINT "OpenIssueAssignee_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OpenIssueAssignee_issueId_personId_key" ON "OpenIssueAssignee"("issueId", "personId");

ALTER TABLE "OpenIssueAssignee" ADD CONSTRAINT "OpenIssueAssignee_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "OpenIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OpenIssueAssignee" ADD CONSTRAINT "OpenIssueAssignee_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill from single assigneeId
INSERT INTO "OpenIssueAssignee" ("id", "issueId", "personId")
SELECT gen_random_uuid()::text, "id", "assigneeId" FROM "OpenIssue" WHERE "assigneeId" IS NOT NULL;

-- Drop legacy single assignee
ALTER TABLE "OpenIssue" DROP CONSTRAINT IF EXISTS "OpenIssue_assigneeId_fkey";
ALTER TABLE "OpenIssue" DROP COLUMN IF EXISTS "assigneeId";
