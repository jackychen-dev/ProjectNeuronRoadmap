import { prisma } from "@/lib/prisma";
import { GanttRoadmap } from "./gantt-roadmap";

export const dynamic = "force-dynamic";

export default async function RoadmapPage() {
  const [programs, workstreams, people] = await Promise.all([
    prisma.program.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        burnSnapshots: { orderBy: { date: "desc" }, take: 1 },
        workstreams: {
          orderBy: { sortOrder: "asc" },
          include: {
            initiatives: {
              where: { archivedAt: null },
              include: { subTasks: true },
            },
          },
        },
      },
    }),
    prisma.workstream.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        initiatives: {
          where: { archivedAt: null },
          orderBy: { sortOrder: "asc" },
          include: {
            milestones: true,
            partnerLinks: { include: { partner: true } },
            subTasks: true,
          },
        },
      },
    }),
    prisma.person.findMany({ orderBy: { name: "asc" } }),
  ]);

  // Compute current % for each program
  const programsWithStats = programs.map((p) => {
    let totalPts = 0;
    let completedPts = 0;
    for (const ws of p.workstreams) {
      for (const init of ws.initiatives) {
        for (const st of init.subTasks) {
          totalPts += st.points;
          if (st.status === "DONE") completedPts += st.points;
        }
      }
    }
    const currentPct = totalPts > 0 ? Math.round((completedPts / totalPts) * 100) : 0;
    const lastSnapshot = p.burnSnapshots[0] || null;
    const savedPct = lastSnapshot ? Math.round(lastSnapshot.percentComplete) : 0;
    return {
      id: p.id,
      name: p.name,
      status: p.status,
      totalPts,
      completedPts,
      currentPct,
      savedPct,
      lastSnapshotDate: lastSnapshot?.date || null,
    };
  });

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
        programs={JSON.parse(JSON.stringify(programsWithStats))}
      />
    </div>
  );
}
