import { prisma } from "@/lib/prisma";
import { serializeForClient } from "@/lib/serialize";
import { notFound } from "next/navigation";
import WorkstreamView from "./workstream-view";

export const dynamic = "force-dynamic";

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

  const users = await prisma.user.findMany({ 
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" }
  });

  // Fetch open issues for this workstream
  const openIssues = await prisma.openIssue.findMany({
    where: { workstreamId: ws.id, resolvedAt: null },
    include: {
      subTask: { select: { id: true, name: true, initiativeId: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch burn snapshots for this workstream's program
  const burnSnapshots = await prisma.burnSnapshot.findMany({
    where: { programId: ws.programId },
    orderBy: { date: "asc" },
    select: {
      id: true,
      date: true,
      totalPoints: true,
      completedPoints: true,
      workstreamData: true,
    },
  });

  // Serialize for client
  const serialized = serializeForClient(ws);
  const serializedPeople = serializeForClient(people);
  const serializedIssues = serializeForClient(openIssues);
  const serializedUsers = serializeForClient(users);
  const serializedSnapshots = serializeForClient(burnSnapshots);

  return (
    <WorkstreamView
      workstream={serialized}
      people={serializedPeople}
      openIssues={serializedIssues}
      users={serializedUsers}
      burnSnapshots={serializedSnapshots}
    />
  );
}
