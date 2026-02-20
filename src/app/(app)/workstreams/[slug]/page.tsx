import { prisma } from "@/lib/prisma";
import { serializeForClient } from "@/lib/serialize";
import { notFound } from "next/navigation";
import WorkstreamView from "./workstream-view";

export const dynamic = "force-dynamic";

const fullWorkstreamInclude = {
  initiatives: {
    where: { archivedAt: null },
    orderBy: { sortOrder: "asc" },
    include: {
      milestones: { orderBy: { date: "asc" } },
      partnerLinks: { include: { partner: true } },
      subTasks: {
        orderBy: { sortOrder: "asc" },
        include: {
          completionNotes: {
            orderBy: { createdAt: "desc" },
            take: 20,
            include: { user: { select: { id: true, name: true, email: true } } },
          },
        },
      },
      dependsOn: { include: { dependsOn: { include: { workstream: true } } } },
    },
  },
  partnerLinks: { include: { partner: true } },
};

/** Fallback when completionNotes (or other new relations) are missing in DB */
const minimalWorkstreamInclude = {
  initiatives: {
    where: { archivedAt: null },
    orderBy: { sortOrder: "asc" },
    include: {
      milestones: { orderBy: { date: "asc" } },
      partnerLinks: { include: { partner: true } },
      subTasks: {
        orderBy: { sortOrder: "asc" },
      },
    },
  },
  partnerLinks: { include: { partner: true } },
};

export default async function WorkstreamDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const slug = params.slug;
  type WsResult = { id: string; programId: string; initiatives: unknown[]; partnerLinks: unknown[] };
  let ws: WsResult | null = null;

  try {
    ws = await prisma.workstream.findFirst({
      where: { slug },
      include: fullWorkstreamInclude as any,
    }) as WsResult | null;
  } catch {
    const minimal = await prisma.workstream.findFirst({
      where: { slug },
      include: minimalWorkstreamInclude as any,
    });
    if (minimal && "initiatives" in minimal && Array.isArray(minimal.initiatives)) {
      ws = {
        ...minimal,
        initiatives: (minimal.initiatives as unknown as { subTasks: object[] }[]).map((init) => ({
          ...init,
          subTasks: init.subTasks.map((st) => ({ ...st, completionNotes: [] })),
        })),
      } as unknown as WsResult;
    }
  }

  if (!ws) return notFound();

  const people = await prisma.person.findMany({ orderBy: { name: "asc" } });

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  const openIssues = await prisma.openIssue.findMany({
    where: { workstreamId: ws.id, resolvedAt: null },
    include: {
      subTask: { select: { id: true, name: true, initiativeId: true } },
    },
    orderBy: { createdAt: "desc" },
  });

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

  type P = Parameters<typeof WorkstreamView>[0];
  return (
    <WorkstreamView
      workstream={serializeForClient(ws) as unknown as P["workstream"]}
      people={serializeForClient(people) as unknown as P["people"]}
      openIssues={serializeForClient(openIssues) as unknown as P["openIssues"]}
      users={serializeForClient(users) as unknown as P["users"]}
      burnSnapshots={serializeForClient(burnSnapshots) as unknown as P["burnSnapshots"]}
    />
  );
}
