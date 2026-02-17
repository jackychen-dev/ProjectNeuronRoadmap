import { getIssues } from "@/lib/actions/issues";
import { getFeatures } from "@/lib/actions/features";
import { getGoals } from "@/lib/actions/goals";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { IssuesTable } from "./issues-table";
import { CreateIssueDialog } from "./create-issue-dialog";

export const dynamic = "force-dynamic";

export default async function IssuesPage() {
  const [issues, features, goals, users] = await Promise.all([
    getIssues(),
    getFeatures(),
    getGoals(),
    prisma.user.findMany({ select: { id: true, name: true, email: true } }),
  ]);

  return (
    <div>
      <PageHeader title="Issues" description="Track and manage open issues with cyclical status">
        <CreateIssueDialog features={features} goals={goals} users={users} />
      </PageHeader>
      <IssuesTable issues={issues} />
    </div>
  );
}

