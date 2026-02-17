import { prisma } from "@/lib/prisma";
import { GanttRoadmap } from "./gantt-roadmap";

export default async function RoadmapPage() {
  const [workstreams, people] = await Promise.all([
    prisma.workstream.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        initiatives: {
          where: { archivedAt: null },
          orderBy: { sortOrder: "asc" },
          include: {
            milestones: true,
            partnerLinks: { include: { partner: true } },
          },
        },
      },
    }),
    prisma.person.findMany({ orderBy: { name: "asc" } }),
  ]);

  // Attach programId to each workstream for create-workstream action
  const data = workstreams.map((ws) => ({ ...ws, programId: ws.programId }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Roadmap</h1>
        <p className="text-muted-foreground mt-1">FY26 – FY28 Program Timeline by Workstream</p>
      </div>
      <GanttRoadmap
        workstreams={JSON.parse(JSON.stringify(data))}
        people={JSON.parse(JSON.stringify(people))}
      />
    </div>
  );
}
