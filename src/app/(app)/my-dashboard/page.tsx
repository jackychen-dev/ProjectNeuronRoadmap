import { prisma } from "@/lib/prisma";
import { serializeForClient } from "@/lib/serialize";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import MySubtasksList from "./my-subtasks";
import MyBurndownCharts from "./my-burndown-charts";
import MyMentions from "./my-mentions";
import { DashboardOpenIssues } from "./dashboard-open-issues";
import { getMentionsForPerson } from "@/lib/actions/open-issues";

export const dynamic = "force-dynamic";

export default async function MyDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin");

  let userId = (session.user as { id?: string; role?: string }).id;
  if (!userId && (session.user as { email?: string }).email) {
    const u = await prisma.user.findUnique({
      where: { email: (session.user as { email: string }).email },
      select: { id: true },
    });
    if (u) userId = u.id;
  }
  const isAdmin = (session.user as { role?: string }).role === "ADMIN";
  if (!userId) redirect("/auth/signin");

  // Find the Person linked to this user (required for "assigned to me" to work)
  let person: { id: string; name: string; initials: string | null } | null = null;
  try {
    person = await prisma.person.findUnique({ where: { userId } });
    if (!person && (session.user.name || (session.user as { email?: string }).email)) {
      const displayName = (session.user.name || (session.user as { email?: string }).email || "").trim();
      if (displayName) {
        const byName = await prisma.person.findMany({
          where: { name: { equals: displayName, mode: "insensitive" } },
        });
        if (byName.length === 1) person = byName[0];
      }
    }
  } catch {
    // Person table or query failed; continue with null person
  }
  const personLinkedByAdmin = !!person;

  // ── Batch 1: initiatives, subtasks, mentions, people, seen (with fallback on error) ──
  let myInitiatives: Awaited<ReturnType<typeof loadBatch1>>[0] = [];
  let mySubTasks: Awaited<ReturnType<typeof loadBatch1>>[1] = [];
  let myMentions: Awaited<ReturnType<typeof loadBatch1>>[2] = [];
  let allPeople: Awaited<ReturnType<typeof loadBatch1>>[3] = [];
  let seen: Awaited<ReturnType<typeof loadBatch1>>[4] = [];
  try {
    [myInitiatives, mySubTasks, myMentions, allPeople, seen] = await loadBatch1(userId, person);
  } catch {
    // Use empty arrays so dashboard still renders
  }

  const myWsIds = [...new Set(mySubTasks.map((st: any) => st.initiative?.workstream?.id).filter(Boolean))];
  const myInitIds = [...new Set(mySubTasks.map((st: any) => st.initiative?.id).filter(Boolean))];
  const myProgramIds = [...new Set(mySubTasks.map((st: any) => st.initiative?.workstream?.programId).filter(Boolean))];

  // ── Batch 2: workstreams, snapshots, programs, issues (with fallback on error) ──
  let myWorkstreamsForBurn: Awaited<ReturnType<typeof loadBatch2>>[0] = [];
  let mySnapshots: Awaited<ReturnType<typeof loadBatch2>>[1] = [];
  let myPrograms: Awaited<ReturnType<typeof loadBatch2>>[2] = [];
  let myIssuesResult: Awaited<ReturnType<typeof loadBatch2>>[3] = [];
  try {
    [myWorkstreamsForBurn, mySnapshots, myPrograms, myIssuesResult] = await loadBatch2(userId, person, myWsIds, myProgramIds);
  } catch {
    // Use empty arrays
  }

  const myIssues = myIssuesResult;
  const seenMap = new Map(seen.map(s => [s.issueId, s.lastSeenAt]));
  const unseenMentionCount = myMentions.filter((m: any) => !m.seenAt).length;

  let newReplyCount = 0;
  for (const issue of myIssues) {
    const comments = (issue as { comments?: { createdAt: Date }[] }).comments;
    if (comments && comments.length > 0) {
      const lastComment = comments[comments.length - 1].createdAt;
      const lastSeen = seenMap.get(issue.id);
      if (!lastSeen || new Date(lastComment) > new Date(lastSeen)) {
        newReplyCount++;
      }
    }
  }

  // Compute stats from owned subcomponents
  let totalPts = 0;
  let completedPts = 0;
  for (const init of myInitiatives) {
    for (const st of init.subTasks || []) {
      totalPts += st.points;
      completedPts += Math.round(st.points * (st.completionPercent / 100));
    }
  }
  let assignedTotalPts = 0;
  let assignedCompletedPts = 0;
  for (const st of mySubTasks) {
    assignedTotalPts += st.points;
    assignedCompletedPts += Math.round(st.points * (st.completionPercent / 100));
  }
  const combinedTotal = totalPts + assignedTotalPts;
  const combinedCompleted = completedPts + assignedCompletedPts;
  const pct = combinedTotal > 0 ? Math.round((combinedCompleted / combinedTotal) * 100) : 0;
  const stoppingIssues = myIssues.filter((i: any) => i.severity === "STOPPING").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome, {session.user.name || session.user.email}
          {isAdmin && <Badge variant="secondary" className="ml-2 text-[10px]">Admin</Badge>}
        </p>
      </div>

      {!person && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="py-3">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Assigned tasks are hidden</strong> because your login is not linked to a team member. Ask an admin to link your account in <Link href="/admin" className="underline">Admin → Users</Link> (Linked Person) so subtasks assigned to you appear here.
            </p>
          </CardContent>
        </Card>
      )}

      {person && !personLinkedByAdmin && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
          <CardContent className="py-2">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              Showing tasks for <strong>{person.name}</strong> (matched by name). For reliable assignment, ask an admin to link your account in <Link href="/admin" className="underline">Admin → Users</Link>.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground">My Subcomponents</p>
            <p className="text-3xl font-bold">{myInitiatives.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground">Assigned Subtasks</p>
            <p className="text-3xl font-bold text-blue-600">{mySubTasks.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground">Total Points</p>
            <p className="text-3xl font-bold">{combinedTotal}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-3xl font-bold text-green-600">{combinedCompleted}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground">Progress</p>
            <p className="text-3xl font-bold">{pct}%</p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-green-500" style={{ width: `${pct}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card className={stoppingIssues > 0 ? "border-red-300" : ""}>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground">Open Issues</p>
            <p className="text-3xl font-bold text-red-500">{myIssues.length}</p>
            {newReplyCount > 0 && (
              <Badge variant="destructive" className="mt-1 text-[10px]">{newReplyCount} new replies</Badge>
            )}
          </CardContent>
        </Card>
        <Card className={unseenMentionCount > 0 ? "border-blue-300" : ""}>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground">Mentions</p>
            <p className="text-3xl font-bold text-blue-500">{myMentions.length}</p>
            {unseenMentionCount > 0 && (
              <Badge variant="destructive" className="mt-1 text-[10px]">{unseenMentionCount} unread</Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* My Initiatives */}
      <Card>
        <CardHeader>
          <CardTitle>My Initiatives</CardTitle>
          <p className="text-xs text-muted-foreground">Click any initiative to manage it in its workstream.</p>
        </CardHeader>
        <CardContent>
          {myInitiatives.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No initiatives assigned to you yet. Ask an admin to assign you as owner.
            </p>
          ) : (
            <div className="space-y-3">
              {myInitiatives.map((init) => {
                const pts = (init.subTasks || []).reduce((s: number, t: any) => s + t.points, 0);
                const completed = (init.subTasks || []).reduce((s: number, t: any) => s + Math.round(t.points * (t.completionPercent / 100)), 0);
                const initPct = pts > 0 ? Math.round((completed / pts) * 100) : 0;
                const assignees = new Map<string, { name: string; initials: string | null }>();
                for (const st of init.subTasks || []) {
                  const a = (st as any).assignee;
                  if (a) assignees.set(a.id, { name: a.name, initials: a.initials });
                }
                const assigneeList = [...assignees.values()];
                return (
                  <Link key={init.id} href={`/workstreams/${(init as any).workstream?.slug}`} className="block group">
                    <div className="border rounded-lg p-3 hover:bg-accent/30 transition-colors">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: (init as any).workstream?.color || "#888" }} />
                          <span className="font-semibold text-sm group-hover:text-primary transition-colors">{init.name}</span>
                          <Badge variant="secondary" className="text-[10px]">{(init as any).status?.replace(/_/g, " ") || "—"}</Badge>
                        </div>
                        <span className="font-bold text-sm">{initPct}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all" style={{ width: `${initPct}%` }} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <span>{(init as any).workstream?.name ?? "—"}</span>
                          <span>·</span>
                          <span>{completed}/{pts} pts · {(init.subTasks || []).length} subtasks</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {assigneeList.length > 0 ? (
                            assigneeList.map((a) => (
                              <span key={a.name} className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-[9px] font-bold" title={a.name}>
                                {a.initials || a.name.slice(0, 2).toUpperCase()}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">No assignees</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <MySubtasksList subtasks={serializeForClient(mySubTasks) as unknown as Parameters<typeof MySubtasksList>[0]["subtasks"]} />

      {myWsIds.length > 0 && (
        <MyBurndownCharts
          programs={serializeForClient(myPrograms) as unknown as Parameters<typeof MyBurndownCharts>[0]["programs"]}
          workstreams={serializeForClient(myWorkstreamsForBurn) as unknown as Parameters<typeof MyBurndownCharts>[0]["workstreams"]}
          snapshots={serializeForClient(mySnapshots) as unknown as Parameters<typeof MyBurndownCharts>[0]["snapshots"]}
          myWsIds={myWsIds}
          myInitIds={myInitIds}
        />
      )}

      <MyMentions
        mentions={serializeForClient(myMentions) as unknown as Parameters<typeof MyMentions>[0]["mentions"]}
        people={serializeForClient(allPeople) as unknown as Parameters<typeof MyMentions>[0]["people"]}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Open Issues</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Same list as the Open Issues tab — issues on your workstreams, assigned items, or where you’re mentioned. Expand an issue to comment here (or open in Open Issues to edit, assign, resolve).
              </p>
            </div>
            <Link href="/open-issues">
              <Button variant="outline" size="sm" className="text-xs shrink-0">
                View all in Open Issues →
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {myIssues.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No open issues on your items. <Link href="/open-issues" className="text-primary underline">Open Issues tab</Link> shows all workstream issues.
            </p>
          ) : (
            <DashboardOpenIssues
              issues={serializeForClient(myIssues) as unknown as Parameters<typeof DashboardOpenIssues>[0]["issues"]}
              people={serializeForClient(allPeople) as unknown as Parameters<typeof DashboardOpenIssues>[0]["people"]}
              seen={serializeForClient(seen) as unknown as Parameters<typeof DashboardOpenIssues>[0]["seen"]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

async function loadBatch1(userId: string, person: { id: string } | null) {
  return Promise.all([
    prisma.initiative.findMany({
      where: {
        archivedAt: null,
        OR: [
          { ownerId: userId },
          ...(person ? [{ subTasks: { some: { assigneeId: person.id } } }] : []),
        ],
      },
      include: {
        workstream: { select: { name: true, slug: true, color: true } },
        subTasks: {
          orderBy: { sortOrder: "asc" },
          include: {
            assignee: { select: { id: true, name: true, initials: true } },
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    }),
    person ? prisma.subTask.findMany({
      where: { assigneeId: person.id },
      include: {
        initiative: {
          select: {
            id: true,
            name: true,
            workstream: { select: { id: true, name: true, slug: true, color: true, programId: true, targetCompletionDate: true } },
          },
        },
        completionNotes: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      } as any,
      orderBy: [{ initiative: { workstream: { sortOrder: "asc" } } }, { initiative: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    }) : Promise.resolve([]),
    person ? getMentionsForPerson(person.id).catch(() => []) : Promise.resolve([]),
    prisma.person.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, initials: true },
    }),
    prisma.userIssueSeen.findMany({
      where: { userId },
      select: { issueId: true, lastSeenAt: true },
    }),
  ]);
}

async function loadBatch2(
  userId: string,
  person: { id: string } | null,
  myWsIds: string[],
  myProgramIds: string[]
) {
  return Promise.all([
    myWsIds.length > 0 ? prisma.workstream.findMany({
      where: { id: { in: myWsIds } },
      include: {
        initiatives: {
          where: { archivedAt: null },
          include: { subTasks: { select: { points: true, completionPercent: true } } },
        },
      },
    }) : Promise.resolve([]),
    myProgramIds.length > 0 ? prisma.burnSnapshot.findMany({
      where: { programId: { in: myProgramIds } },
      orderBy: { date: "asc" },
      select: { id: true, programId: true, date: true, totalPoints: true, completedPoints: true, percentComplete: true, workstreamData: true },
    }) : Promise.resolve([]),
    myProgramIds.length > 0 ? prisma.program.findMany({
      where: { id: { in: myProgramIds } },
      select: { id: true, name: true, fyStartYear: true, fyEndYear: true, startDate: true, targetDate: true },
    }) : Promise.resolve([]),
    (async () => {
      const where = {
        resolvedAt: null,
        OR: [
          { subTask: { initiative: { ownerId: userId } } },
          ...(person ? [{ subTask: { assigneeId: person.id } }] : []),
          ...(myWsIds.length > 0 ? [{ workstreamId: { in: myWsIds }, subTaskId: null }] : []),
          ...(person ? [{ assignees: { some: { personId: person.id } } }] : []),
          ...(person ? [{ comments: { some: { mentions: { some: { personId: person.id } } } } }] : []),
        ],
      };
      try {
        return await prisma.openIssue.findMany({
          where,
          include: {
            workstream: { select: { name: true } },
            subTask: { select: { name: true } },
            assignees: { include: { person: { select: { id: true, name: true, initials: true } } } },
            comments: {
              orderBy: { createdAt: "asc" },
              include: { mentions: { include: { person: { select: { id: true, name: true, initials: true } } } } },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        });
      } catch {
        try {
          return await prisma.openIssue.findMany({
            where: {
              resolvedAt: null,
              OR: [
                { subTask: { initiative: { ownerId: userId } } },
                ...(person ? [{ subTask: { assigneeId: person.id } }] : []),
                ...(myWsIds.length > 0 ? [{ workstreamId: { in: myWsIds }, subTaskId: null }] : []),
              ],
            },
            include: {
              workstream: { select: { name: true } },
              subTask: { select: { name: true } },
              assignees: { include: { person: { select: { id: true, name: true, initials: true } } } },
              comments: {
                orderBy: { createdAt: "asc" },
                include: { mentions: { include: { person: { select: { id: true, name: true, initials: true } } } } },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 20,
          });
        } catch {
          return await prisma.openIssue.findMany({
            where: {
              resolvedAt: null,
              OR: [
                { subTask: { initiative: { ownerId: userId } } },
                ...(person ? [{ subTask: { assigneeId: person.id } }] : []),
                ...(myWsIds.length > 0 ? [{ workstreamId: { in: myWsIds }, subTaskId: null }] : []),
              ],
            },
            include: {
              workstream: { select: { name: true } },
              subTask: { select: { name: true } },
              comments: { orderBy: { createdAt: "asc" } },
            },
            orderBy: { createdAt: "desc" },
            take: 20,
          }).then((rows) =>
            rows.map((r) => ({
              ...r,
              assignees: [] as { person: { id: string; name: string; initials: string | null } }[],
              comments: (r.comments as { id: string; parentId: string | null; body: string; authorName: string | null; createdAt: Date }[]).map((c) => ({ ...c, mentions: [] })),
            }))
          );
        }
      }
    })(),
  ]);
}
