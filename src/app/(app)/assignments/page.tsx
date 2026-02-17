import { getAssignments } from "@/lib/actions/assignments";
import { PageHeader } from "@/components/page-header";
import { AssignmentsView } from "./assignments-view";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AssignmentsPage() {
  const [assignments, people, initiatives] = await Promise.all([
    getAssignments(),
    prisma.person.findMany({ orderBy: { name: "asc" } }),
    prisma.initiative.findMany({
      where: { archivedAt: null },
      include: { workstream: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader title="Assignments" description="Track monthly assignments — hours planned vs actual" />
      <AssignmentsView
        assignments={assignments as any}
        people={people}
        initiatives={initiatives}
      />
    </div>
  );
}
