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
  let person = await prisma.person.findUnique({ where: { userId } });
  const personLinkedByAdmin = !!person;
  if (!person && (session.user.name || (session.user as { email?: string }).email)) {
    const displayName = (session.user.name || (session.user as { email?: string }).email || "").trim();
    if (displayName) {
      const byName = await prisma.person.findMany({
        where: { name: { equals: displayName, mode: "insensitive" } },
      });
      if (byName.length === 1) person = byName[0];
    }
  }

  try {
  // ── Batch 1: initiatives, subtasks, mentions, people, seen ──
  const [myInitiatives, mySubTasks, myMentions, allPeople, seen] = await Promise.all([
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
      },
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

  const myWsIds = [...new Set(mySubTasks.map((st: any) => st.initiative.workstream.id))];
  const myInitIds = [...new Set(mySubTasks.map((st: any) => st.initiative.id))];
  const myProgramIds = [...new Set(mySubTasks.map((st: any) => st.initiative.workstream.programId))];

  const [myWorkstreamsForBurn, mySnapshots, myPrograms, myIssuesResult] = await Promise.all([
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
      try {
        return await prisma.openIssue.findMany({
          where: {
            resolvedAt: null,
            OR: [
              { subTask: { initiative: { ownerId: userId } } },
              ...(person ? [{ subTask: { assigneeId: person.id } }] : []),
              ...(myWsIds.length > 0 ? [{ workstreamId: { in: myWsIds }, subTaskId: null }] : []),
              ...(person ? [{ assignees: { some: { personId: person.id } } }] : []),
              ...(person ? [{ comments: { some: { mentions: { some: { personId: person.id } } } } }] : []),
            ],
          },
          include: {
            workstream: { select: { name: true } },
            subTask: { select: { name: true } },
            assignees: { include: { person: { select: { name: true, initials: true } } } },
            comments: { orderBy: { createdAt: "desc" }, take: 1 },
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
            comments: { orderBy: { createdAt: "desc" }, take: 1 },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        });
      }
    })(),
  ]);

  const myIssues = myIssuesResult;
  const seenMap = new Map(seen.map(s => [s.issueId, s.lastSeenAt]));
  const unseenMentionCount = myMentions.filter((m: any) => !m.seenAt).length;

  let newReplyCount = 0;
  for (const issue of myIssues) {
    if (issue.comments.length > 0) {
      const lastComment = issue.comments[0].createdAt;
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
    for (const st of init.subTasks) {
      totalPts += st.points;
      completedPts += Math.round(st.points * (st.completionPercent / 100));
    }
  }
  // Also count assigned subtasks
  let assignedTotalPts = 0;
  let assignedCompletedPts = 0;
  for (const st of mySubTasks) {
    assignedTotalPts += st.points;
    assignedCompletedPts += Math.round(st.points * (st.completionPercent / 100));
  }
  const combinedTotal = totalPts + assignedTotalPts;
  const combinedCompleted = completedPts + assignedCompletedPts;
  const pct = combinedTotal > 0 ? Math.round((combinedCompleted / combinedTotal) * 100) : 0;
  
  const stoppingIssues = myIssues.filter(i => i.severity === "STOPPING").length;
  
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
                const pts = init.subTasks.reduce((s: number, t: any) => s + t.points, 0);
                const completed = init.subTasks.reduce((s: number, t: any) => s + Math.round(t.points * (t.completionPercent / 100)), 0);
                const initPct = pts > 0 ? Math.round((completed / pts) * 100) : 0;
                const assignees = new Map<string, { name: string; initials: string | null }>();
                for (const st of init.subTasks) {
                  const a = (st as any).assignee;
                  if (a) assignees.set(a.id, { name: a.name, initials: a.initials });
                }
                const assigneeList = [...assignees.values()];
                return (
                  <Link key={init.id} href={`/workstreams/${init.workstream.slug}`} className="block group">
                    <div className="border rounded-lg p-3 hover:bg-accent/30 transition-colors">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: init.workstream.color || "#888" }} />
                          <span className="font-semibold text-sm group-hover:text-primary transition-colors">{init.name}</span>
                          <Badge variant="secondary" className="text-[10px]">{init.status.replace(/_/g, " ")}</Badge>
                        </div>
                        <span className="font-bold text-sm">{initPct}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all" style={{ width: `${initPct}%` }} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <span>{init.workstream.name}</span>
                          <span>·</span>
                          <span>{completed}/{pts} pts · {init.subTasks.length} subtasks</span>
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
      
      {/* My Assigned Subtasks — editable inline */}
      <MySubtasksList subtasks={serializeForClient(mySubTasks)} />

      {/* Burndown charts for my assigned workstreams/subcomponents */}
      {myWsIds.length > 0 && (
        <MyBurndownCharts
          programs={serializeForClient(myPrograms) as unknown as Parameters<typeof MyBurndownCharts>[0]["programs"]}
          workstreams={serializeForClient(myWorkstreamsForBurn) as unknown as Parameters<typeof MyBurndownCharts>[0]["workstreams"]}
          snapshots={serializeForClient(mySnapshots) as unknown as Parameters<typeof MyBurndownCharts>[0]["snapshots"]}
          myWsIds={myWsIds}
          myInitIds={myInitIds}
        />
      )}

      {/* Mentions tab */}
      <MyMentions
        mentions={serializeForClient(myMentions) as unknown as Parameters<typeof MyMentions>[0]["mentions"]}
        people={serializeForClient(allPeople) as unknown as Parameters<typeof MyMentions>[0]["people"]}
      />

      {/* Recent Issues */}
      {myIssues.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Open Issues on My Items</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {myIssues.map((issue) => {
                const lastSeen = seenMap.get(issue.id);
                const hasNewReply = issue.comments.length > 0 && (!lastSeen || new Date(issue.comments[0].createdAt) > new Date(lastSeen));
                return (
                  <Link key={issue.id} href="/open-issues" className="block">
                    <div className={`border rounded-lg p-3 hover:bg-accent/30 transition-colors ${hasNewReply ? "border-orange-300 bg-orange-50/50" : ""}`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${issue.severity === "STOPPING" ? "bg-red-500" : issue.severity === "SLOWING" ? "bg-yellow-500" : "bg-green-500"}`} />
                        <span className="font-medium text-sm">{issue.title}</span>
                        {hasNewReply && <Badge variant="destructive" className="text-[9px]">New Reply</Badge>}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {issue.workstream.name} {issue.subTask && `· ${issue.subTask.name}`}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
  } catch (_err) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">My Dashboard</h1>
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="text-amber-800 dark:text-amber-200">Could not load your dashboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-amber-700 dark:text-amber-300">
              A temporary error occurred loading your initiatives and tasks. This can happen if the database is still being set up or a migration is pending.
            </p>
            <div className="flex gap-2">
              <Link href="/my-dashboard">
                <Button variant="default">Try again</Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline">Go to main Dashboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}
