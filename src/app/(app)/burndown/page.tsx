import { prisma } from "@/lib/prisma";
import BurndownView from "./burndown-view";

export const dynamic = "force-dynamic";

export default async function BurndownPage() {
  const [programs, workstreams, snapshots] = await Promise.all([
    prisma.program.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        fyStartYear: true,
        fyEndYear: true,
        startDate: true,
        targetDate: true,
      },
    }),
    prisma.workstream.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        initiatives: {
          where: { archivedAt: null },
          orderBy: { sortOrder: "asc" },
          include: {
            subTasks: { orderBy: { sortOrder: "asc" } },
          },
        },
      },
    }),
    prisma.burnSnapshot.findMany({
      orderBy: [{ programId: "asc" }, { date: "asc" }],
      select: {
        id: true,
        programId: true,
        date: true,
        totalPoints: true,
        completedPoints: true,
        percentComplete: true,
        workstreamData: true,
      },
    }),
  ]);

  return (
    <BurndownView
      programs={JSON.parse(JSON.stringify(programs))}
      workstreams={JSON.parse(JSON.stringify(workstreams))}
      snapshots={JSON.parse(JSON.stringify(snapshots))}
    />
  );
}
