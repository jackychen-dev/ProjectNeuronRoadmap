import { getCostSummary } from "@/lib/actions/costs";
import { getFeatures } from "@/lib/actions/features";
import { getGoals } from "@/lib/actions/goals";
import { getIssues } from "@/lib/actions/issues";
import { PageHeader } from "@/components/page-header";
import { CostView } from "./cost-view";

export const dynamic = "force-dynamic";

export default async function CostPage() {
  const [costData, features, goals, issues] = await Promise.all([
    getCostSummary(),
    getFeatures(),
    getGoals(),
    getIssues(),
  ]);

  return (
    <div>
      <PageHeader title="Cost Tracking" description="Track costs by feature, goal, and type" />
      <CostView
        costData={costData}
        features={features}
        goals={goals}
        issues={issues}
      />
    </div>
  );
}

