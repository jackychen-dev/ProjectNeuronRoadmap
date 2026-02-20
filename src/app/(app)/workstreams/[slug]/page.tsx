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
      subTasks: { orderBy: { sortOrder: "asc" } },
    },
  },
  partnerLinks: { include: { partner: true } },
};

/** Last resort: only workstream + initiatives + subTasks (no milestones, partnerLinks, dependsOn) */
const bareWorkstreamInclude = {
  initiatives: {
    where: { archivedAt: null },
    orderBy: { sortOrder: "asc" },
    include: {
      subTasks: { orderBy: { sortOrder: "asc" } },
    },
  },
};

export default async function WorkstreamDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const slug = params.slug;
  type WsResult = { id: string; programId: string; initiatives: unknown[]; partnerLinks: unknown[] };
  let ws: WsResult | null = null;

  // Try bare first (only workstream + initiatives + subTasks). Never touches SubTaskCompletionNote, milestones, partnerLinks, dependsOn.
  try {
    const bare = await prisma.workstream.findFirst({
      where: { slug },
      include: bareWorkstreamInclude as any,
    });
    if (bare && "initiatives" in bare && Array.isArray(bare.initiatives)) {
      ws = {
        ...bare,
        partnerLinks: [],
        initiatives: (bare.initiatives as unknown as { subTasks: object[] }[]).map((init) => ({
          ...init,
          milestones: [],
          partnerLinks: [],
          dependsOn: [],
          subTasks: (init.subTasks || []).map((st) => ({ ...st, completionNotes: [] })),
        })),
      } as unknown as WsResult;
    }
  } catch {
    try {
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
    } catch {
      // Both failed
    }
  }

  // Do not run full query here — it requires SubTaskCompletionNote.userId. Run migrations in production instead.
  if (!ws) return notFound();

  let people: { id: string; name: string; initials: string | null }[] = [];
  let users: { id: string; name: string | null; email: string | null }[] = [];
  let openIssues: unknown[] = [];
  let burnSnapshots: unknown[] = [];

  try {
    people = await prisma.person.findMany({ orderBy: { name: "asc" } });
  } catch {
    // Person table or query may fail on older DB
  }
  try {
    users = await prisma.user.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
  } catch {
    // User query may fail
  }
  try {
    openIssues = await prisma.openIssue.findMany({
      where: { workstreamId: ws.id, resolvedAt: null },
      include: {
        subTask: { select: { id: true, name: true, initiativeId: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    // OpenIssue or relations may be missing in production
  }
  try {
    burnSnapshots = await prisma.burnSnapshot.findMany({
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
  } catch {
    // BurnSnapshot may be missing
  }

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
