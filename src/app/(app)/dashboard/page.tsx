import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import OverallBurndownChart from "./overall-burndown-chart";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: "bg-gray-100 text-gray-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  BLOCKED: "bg-red-100 text-red-700",
  DONE: "bg-green-100 text-green-700",
};

export default async function DashboardPage() {
  const [program, initiatives, milestones, partners, openIssues, burnPrograms, burnWorkstreams, burnSnapshots] = await Promise.all([
    prisma.program.findFirst({
      include: { workstreams: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.initiative.findMany({
      where: { archivedAt: null },
      include: {
        workstream: true,
        subTasks: {
          select: { id: true, points: true, completionPercent: true, estimatedDays: true, unknowns: true, integration: true, isAddedScope: true },
        },
      },
    }),
    prisma.milestone.findMany({
      orderBy: { date: "asc" },
    }),
    prisma.partner.findMany(),
    prisma.openIssue.findMany({
      where: { resolvedAt: null },
      select: { id: true, severity: true, workstreamId: true, title: true },
    }),
    prisma.program.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, fyStartYear: true, fyEndYear: true, startDate: true, targetDate: true },
    }),
    prisma.workstream.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true, targetCompletionDate: true,
        initiatives: {
          where: { archivedAt: null },
          select: { subTasks: { select: { points: true, completionPercent: true } } },
        },
      },
    }),
    prisma.burnSnapshot.findMany({
      orderBy: [{ programId: "asc" }, { date: "asc" }],
      select: { id: true, programId: true, date: true, totalPoints: true, completedPoints: true, percentComplete: true },
    }),
  ]);

  // Fix milestones query to use program id
  const programMilestones = milestones.filter((m) => m.programId === program?.id);

  // Issue counts
  const stoppingIssues = openIssues.filter((i) => i.severity === "STOPPING");
  const slowingIssues = openIssues.filter((i) => i.severity === "SLOWING");
  const totalOpenIssues = openIssues.length;

  // Workstreams blocked = those with at least one STOPPING issue
  const blockedWorkstreamIds = new Set(stoppingIssues.map((i) => i.workstreamId));

  // Stats — replace BLOCKED count with open issues STOPPING count
  const statusCounts = initiatives.reduce(
    (acc, i) => { acc[i.status] = (acc[i.status] || 0) + 1; return acc; },
    {} as Record<string, number>,
  );

  // Compute workstream-level completion based on subtask progress
  const workstreamStats = program?.workstreams.map((ws) => {
    const wsInits = initiatives.filter((i) => i.workstreamId === ws.id);
    const done = wsInits.filter((i) => i.status === "DONE").length;
    const total = wsInits.length;

    // Real weighted completion from subtasks
    let totalPts = 0;
    let completedPts = 0;
    let subtaskCount = 0;
    let subtaskCompletionSum = 0;

    for (const init of wsInits) {
      if (init.subTasks.length === 0) {
        // No subtasks — use initiative status as proxy
        if (init.status === "DONE") {
          totalPts += init.totalPoints || 1;
          completedPts += init.totalPoints || 1;
        } else if (init.status === "IN_PROGRESS") {
          totalPts += init.totalPoints || 1;
          completedPts += (init.totalPoints || 1) * 0.5;
        } else {
          totalPts += init.totalPoints || 1;
        }
      } else {
        for (const st of init.subTasks) {
          const pts = st.points || 1;
          totalPts += pts;
          completedPts += (pts * st.completionPercent) / 100;
          subtaskCount++;
          subtaskCompletionSum += st.completionPercent;
        }
      }
    }

    const pct = totalPts > 0 ? Math.round((completedPts / totalPts) * 100) : 0;
    const isBlocked = blockedWorkstreamIds.has(ws.id);
    const wsStoppingCount = stoppingIssues.filter((i) => i.workstreamId === ws.id).length;
    const wsSlowingCount = slowingIssues.filter((i) => i.workstreamId === ws.id).length;
    const wsIssueCount = openIssues.filter((i) => i.workstreamId === ws.id).length;

    return {
      ...ws,
      done,
      total,
      pct,
      isBlocked,
      wsStoppingCount,
      wsSlowingCount,
      wsIssueCount,
      subtaskCount,
    };
  }) || [];

  // Overall program completion
  const overallPct = workstreamStats.length > 0
    ? Math.round(workstreamStats.reduce((s, ws) => s + ws.pct, 0) / workstreamStats.length)
    : 0;

  // Upcoming milestones (next 12)
  const now = new Date().toISOString().slice(0, 7);
  const upcoming = programMilestones.filter((m) => m.date && m.date >= now).slice(0, 8);

  // Color helpers
  function pctColor(pct: number): string {
    if (pct >= 80) return "#22c55e"; // green
    if (pct >= 50) return "#3b82f6"; // blue
    if (pct >= 20) return "#f59e0b"; // amber
    return "#94a3b8"; // gray
  }

  function pctGradient(pct: number): string {
    if (pct >= 80) return "from-green-500 to-emerald-400";
    if (pct >= 50) return "from-blue-500 to-cyan-400";
    if (pct >= 20) return "from-amber-500 to-yellow-400";
    return "from-gray-400 to-gray-300";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">{program?.name || "Project Neuron"} — Program Overview</p>
      </div>

      {/* Mission summary */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm leading-relaxed text-muted-foreground">{program?.mission}</p>
          <p className="mt-3 text-sm font-semibold text-primary">⭐ GOAL: Design &amp; Build the Machine that Builds Machines</p>
        </CardContent>
      </Card>

      {/* Status overview — BLOCKED reflects open issues */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {["NOT_STARTED", "IN_PROGRESS", "DONE"].map((s) => (
          <Card key={s}>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">{s.replace(/_/g, " ")}</p>
              <p className="text-3xl font-bold mt-1">{statusCounts[s] || 0}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">initiatives</p>
            </CardContent>
          </Card>
        ))}

        {/* Blocked — from Open Issues STOPPING */}
        <Link href="/open-issues">
          <Card className={`h-full transition-colors ${stoppingIssues.length > 0 ? "border-red-300 bg-red-50/50 dark:bg-red-950/20" : ""}`}>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">🔴 BLOCKED</p>
              <p className="text-3xl font-bold mt-1 text-red-600 dark:text-red-400">{stoppingIssues.length}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">stopping issues</p>
              {blockedWorkstreamIds.size > 0 && (
                <p className="text-[10px] text-red-500 mt-1 font-medium">
                  {blockedWorkstreamIds.size} workstream{blockedWorkstreamIds.size !== 1 ? "s" : ""} affected
                </p>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* Slowing */}
        <Link href="/open-issues">
          <Card className={`h-full transition-colors ${slowingIssues.length > 0 ? "border-yellow-300 bg-yellow-50/50 dark:bg-yellow-950/20" : ""}`}>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">🟡 SLOWING</p>
              <p className="text-3xl font-bold mt-1 text-yellow-600 dark:text-yellow-400">{slowingIssues.length}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">slowing issues</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* ── Overall Program Completion ─────────────────── */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle>Program Completion</CardTitle>
            {totalOpenIssues > 0 && (
              <Link href="/open-issues" className="text-xs text-primary hover:underline">
                {totalOpenIssues} open issue{totalOpenIssues !== 1 ? "s" : ""} →
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall ring + stat */}
          <div className="flex items-center gap-8">
            <div className="relative flex-shrink-0">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#e5e7eb" strokeWidth="10" className="dark:stroke-gray-700" />
                <circle
                  cx="60" cy="60" r="52" fill="none"
                  stroke={pctColor(overallPct)}
                  strokeWidth="10"
                  strokeDasharray={`${(overallPct / 100) * 326.7} 326.7`}
                  strokeLinecap="round"
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold">{overallPct}%</span>
                <span className="text-[9px] text-muted-foreground">overall</span>
              </div>
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">{workstreamStats.length}</strong> workstreams ·{" "}
                <strong className="text-foreground">{initiatives.length}</strong> initiatives ·{" "}
                <strong className="text-foreground">{workstreamStats.reduce((s, w) => s + w.subtaskCount, 0)}</strong> sub-tasks
              </p>
              <p className="text-xs text-muted-foreground">
                Completion is calculated from sub-task progress weighted by story points.
              </p>
            </div>
          </div>

          {/* Per-workstream completion bars */}
          <div className="space-y-3">
            {workstreamStats.map((ws) => (
              <Link key={ws.id} href={`/workstreams/${ws.slug}`} className="block group">
                <div className="flex items-center gap-3">
                  {/* Color dot */}
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: ws.color || "#888" }} />

                  {/* Label */}
                  <div className="w-40 min-w-0 flex-shrink-0">
                    <span className="text-sm font-medium truncate block group-hover:text-primary transition-colors">
                      {ws.name}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">{ws.done}/{ws.total} initiatives</span>
                      {ws.isBlocked && (
                        <Badge variant="destructive" className="text-[9px] px-1 py-0">🔴 {ws.wsStoppingCount}</Badge>
                      )}
                      {ws.wsSlowingCount > 0 && (
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400">🟡 {ws.wsSlowingCount}</Badge>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="flex-1">
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-4 overflow-hidden">
                      <div
                        className={`h-4 rounded-full bg-gradient-to-r ${pctGradient(ws.pct)} transition-all duration-500 flex items-center justify-end`}
                        style={{ width: `${Math.max(ws.pct, 2)}%` }}
                      >
                        {ws.pct >= 15 && (
                          <span className="text-[10px] font-bold text-white pr-2 drop-shadow-sm">{ws.pct}%</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pct label (when bar too small) */}
                  {ws.pct < 15 && (
                    <span className="text-xs font-bold w-10 text-right flex-shrink-0" style={{ color: pctColor(ws.pct) }}>
                      {ws.pct}%
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Overall Burndown Chart ── */}
      <OverallBurndownChart
        programs={JSON.parse(JSON.stringify(burnPrograms))}
        workstreams={JSON.parse(JSON.stringify(burnWorkstreams))}
        snapshots={JSON.parse(JSON.stringify(burnSnapshots))}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Milestones */}
        <Card>
          <CardHeader><CardTitle>Upcoming Key Milestones</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {upcoming.map((m) => (
              <div key={m.id} className="flex items-start gap-3 text-sm">
                <Badge variant="outline" className="shrink-0 font-mono">{m.date}</Badge>
                <span>{m.name}</span>
              </div>
            ))}
            {upcoming.length === 0 && <p className="text-sm text-muted-foreground">No upcoming milestones.</p>}
          </CardContent>
        </Card>

        {/* Partners */}
        <Card>
          <CardHeader><CardTitle>Key Partners</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {partners.map((p) => (
                <Link key={p.id} href="/partners" className="text-center p-3 rounded-lg border hover:bg-accent transition-colors">
                  <p className="font-medium text-sm">{p.name}</p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recently updated initiatives */}
      <Card>
        <CardHeader><CardTitle>Recently Updated Initiatives</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {initiatives
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .slice(0, 8)
              .map((i) => (
                <div key={i.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge className={STATUS_COLORS[i.status] || ""} variant="secondary">{i.status.replace(/_/g, " ")}</Badge>
                    <span className="font-medium">{i.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{i.workstream.name}</span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
