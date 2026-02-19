-- OpenIssue: add assignee (Person)
ALTER TABLE "OpenIssue" ADD COLUMN IF NOT EXISTS "assigneeId" TEXT;
ALTER TABLE "OpenIssue" ADD CONSTRAINT "OpenIssue_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- IssueComment: add parent for threading
ALTER TABLE "IssueComment" ADD COLUMN IF NOT EXISTS "parentId" TEXT;
ALTER TABLE "IssueComment" ADD CONSTRAINT "IssueComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "IssueComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- IssueCommentMention for @people
CREATE TABLE IF NOT EXISTS "IssueCommentMention" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,

    CONSTRAINT "IssueCommentMention_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "IssueCommentMention_commentId_personId_key" ON "IssueCommentMention"("commentId", "personId");
ALTER TABLE "IssueCommentMention" ADD CONSTRAINT "IssueCommentMention_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "IssueComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IssueCommentMention" ADD CONSTRAINT "IssueCommentMention_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
