import { prisma } from "@/lib/prisma";
import { serializeForClient } from "@/lib/serialize";
import { DeliverablesTable } from "./deliverables-table";

export const dynamic = "force-dynamic";

export default async function DeliverablesPage() {
  const initiatives = await prisma.initiative.findMany({
    where: { archivedAt: null },
    orderBy: [{ workstreamId: "asc" }, { sortOrder: "asc" }],
    include: {
      workstream: true,
      milestones: { orderBy: { date: "asc" } },
      partnerLinks: { include: { partner: true } },
    },
  });

  const workstreams = await prisma.workstream.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Deliverables</h1>
          <p className="text-muted-foreground mt-1">All initiatives across workstreams</p>
        </div>
      </div>
      <DeliverablesTable
        initiatives={serializeForClient(initiatives)}
        workstreams={serializeForClient(workstreams)}
      />
    </div>
  );
}

