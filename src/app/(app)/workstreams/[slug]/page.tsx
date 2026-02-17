import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import WorkstreamView from "./workstream-view";

export default async function WorkstreamDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const ws = await prisma.workstream.findFirst({
    where: { slug: params.slug },
    include: {
      initiatives: {
        where: { archivedAt: null },
        orderBy: { sortOrder: "asc" },
        include: {
          milestones: { orderBy: { date: "asc" } },
          partnerLinks: { include: { partner: true } },
          subTasks: { orderBy: { sortOrder: "asc" } },
          dependsOn: { include: { dependsOn: { include: { workstream: true } } } },
        },
      },
      partnerLinks: { include: { partner: true } },
    },
  });

  if (!ws) return notFound();

  const people = await prisma.person.findMany({ orderBy: { name: "asc" } });

  // Fetch open issues for this workstream
  const openIssues = await prisma.openIssue.findMany({
    where: { workstreamId: ws.id, resolvedAt: null },
    include: {
      subTask: { select: { id: true, name: true, initiativeId: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Serialize for client
  const serialized = JSON.parse(JSON.stringify(ws));
  const serializedPeople = JSON.parse(JSON.stringify(people));
  const serializedIssues = JSON.parse(JSON.stringify(openIssues));

  return <WorkstreamView workstream={serialized} people={serializedPeople} openIssues={serializedIssues} />;
}
