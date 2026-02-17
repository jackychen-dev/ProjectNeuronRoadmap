import { getResources, getTeams } from "@/lib/actions/resources";
import { PageHeader } from "@/components/page-header";
import { ResourcesView } from "./resources-view";

export const dynamic = "force-dynamic";

export default async function ResourcesPage() {
  const [resources, teams] = await Promise.all([
    getResources(),
    getTeams(),
  ]);

  return (
    <div>
      <PageHeader title="Resources" description="Manage team members and resource buckets (Owner/Mid/Senior)">
      </PageHeader>
      <ResourcesView resources={resources} teams={teams} />
    </div>
  );
}

