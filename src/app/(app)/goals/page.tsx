import { getGoals } from "@/lib/actions/goals";
import { getFeatures } from "@/lib/actions/features";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { GoalsList } from "./goals-list";
import { CreateGoalDialog } from "./create-goal-dialog";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const [goals, features, users] = await Promise.all([
    getGoals(),
    getFeatures(),
    prisma.user.findMany({ select: { id: true, name: true, email: true } }),
  ]);

  return (
    <div>
      <PageHeader title="Goals" description="Quarterly goals and release targets">
        <CreateGoalDialog users={users} />
      </PageHeader>
      <GoalsList goals={goals} features={features} />
    </div>
  );
}

