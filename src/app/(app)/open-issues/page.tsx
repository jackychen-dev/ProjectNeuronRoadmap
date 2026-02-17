import { prisma } from "@/lib/prisma";
import { OpenIssuesView } from "./open-issues-view";

export const dynamic = "force-dynamic";

export default async function OpenIssuesPage() {
  const workstreams = await prisma.workstream.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      initiatives: {
        where: { archivedAt: null },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          subTasks: {
            orderBy: { sortOrder: "asc" },
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  const issues = await prisma.openIssue.findMany({
    include: {
      workstream: { select: { id: true, name: true, slug: true } },
      subTask: {
        select: {
          id: true,
          name: true,
          initiative: { select: { id: true, name: true } },
        },
      },
      comments: {
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Open Issues</h1>
        <p className="text-muted-foreground mt-1">
          Track issues that block or slow down workstream sub-tasks
        </p>
      </div>
      <OpenIssuesView
        workstreams={JSON.parse(JSON.stringify(workstreams))}
        issues={JSON.parse(JSON.stringify(issues))}
      />
    </div>
  );
}

