"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentPeriod, getMonthlyPeriods, parseTargetMonth, type BurnPeriod } from "@/lib/burn-periods";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";

/* ─── Types ─── */

interface SubTaskSlim { points: number; completionPercent: number; }
interface InitiativeSlim { id: string; name: string; subTasks: SubTaskSlim[]; }
interface WorkstreamData {
  id: string; name: string; slug: string; color: string | null; status: string;
  targetCompletionDate: string | null; programId: string;
  initiatives: InitiativeSlim[];
}
interface WsSnapshotEntry {
  name: string; totalPoints: number; completedPoints: number;
  subcomponents?: Record<string, { name: string; totalPoints: number; completedPoints: number }>;
}
interface SnapshotData {
  id: string; programId: string; date: string;
  totalPoints: number; completedPoints: number; percentComplete: number;
  workstreamData?: Record<string, WsSnapshotEntry> | null;
}
interface ProgramRef {
  id: string; name: string; fyStartYear: number; fyEndYear: number;
  startDate: string | null; targetDate: string | null;
}
interface ChartPoint {
  label: string; remaining: number | null; ideal: number; scopeLine: number; isCurrent: boolean;
}

/* ─── Helpers ─── */

function buildTimeline(program: ProgramRef, workstreams: WorkstreamData[]): BurnPeriod[] {
  let startYear = 2000 + program.fyStartYear, startMonth = 1;
  if (program.startDate) { const d = new Date(program.startDate); startYear = d.getFullYear(); startMonth = d.getMonth() + 1; }
  let endYear = 2000 + program.fyEndYear, endMonth = 11;
  for (const ws of workstreams) {
    const p = parseTargetMonth(ws.targetCompletionDate);
    if (p && (p.year > endYear || (p.year === endYear && p.month > endMonth))) { endYear = p.year; endMonth = p.month; }
  }
  if (program.targetDate) { const d = new Date(program.targetDate); endYear = d.getFullYear(); endMonth = d.getMonth() + 1; }
  return getMonthlyPeriods(startYear, startMonth, endYear, endMonth);
}

function buildChartData(
  allPeriods: BurnPeriod[],
  snapshotByDate: Map<string, { totalPoints: number; completedPoints: number }>,
  startTotal: number, liveRemaining: number, liveTotalPts: number,
  currentPeriod: BurnPeriod,
): ChartPoint[] {
  const n = allPeriods.length;
  const lastIdx = n - 1 || 1;
  const scopeRaw: number[] = [];
  let lastScope = startTotal;
  for (const p of allPeriods) {
    const snap = snapshotByDate.get(p.dateKey);
    if (snap) lastScope = snap.totalPoints;
    else if (p.dateKey === currentPeriod.dateKey) lastScope = liveTotalPts;
    scopeRaw.push(lastScope);
  }
  const peakScope = scopeRaw.length > 0 ? Math.max(...scopeRaw) : startTotal;
  return allPeriods.map((period, idx) => {
    const snap = snapshotByDate.get(period.dateKey);
    const isCurrent = period.dateKey === currentPeriod.dateKey;
    const ideal = Math.max(0, Math.round(startTotal * (1 - idx / lastIdx)));
    const scopeLine = Math.max(0, Math.round(peakScope * (1 - idx / lastIdx)));
    let remaining: number | null = null;
    if (idx === 0) remaining = peakScope;
    else if (snap) remaining = snap.totalPoints - snap.completedPoints;
    else if (isCurrent) remaining = liveRemaining;
    return { label: period.shortLabel, remaining, ideal, scopeLine, isCurrent };
  });
}

function MiniChart({ data, height }: { data: ChartPoint[]; height: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={{ fontSize: 7 }} interval={0} angle={-45} textAnchor="end" height={40} />
        <YAxis tick={{ fontSize: 8 }} width={30} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 9 }} />
        {data.some(d => d.isCurrent) && (
          <ReferenceLine x={data.find(d => d.isCurrent)?.label} stroke="#f97316" strokeDasharray="4 4" />
        )}
        <Line type="monotone" dataKey="scopeLine" stroke="#a855f7" strokeWidth={1.5} dot={false} name="Scope" />
        <Line type="monotone" dataKey="ideal" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="Ideal" strokeDasharray="4 4" />
        <Line type="monotone" dataKey="remaining" stroke="#f97316" strokeWidth={2.5} dot={(props: any) => {
          const { cx, cy, payload } = props;
          if (payload?.remaining === null || payload?.remaining === undefined) return <g />;
          return <circle cx={cx} cy={cy} r={2} fill="#f97316" />;
        }} name="Remaining" connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ─── Main ─── */

export default function MyBurndownCharts({
  programs, workstreams, snapshots, myWsIds, myInitIds,
}: {
  programs: ProgramRef[];
  workstreams: WorkstreamData[];
  snapshots: SnapshotData[];
  myWsIds: string[];
  myInitIds: string[];
}) {
  const currentPeriod = useMemo(() => getCurrentPeriod(), []);
  const program = programs[0];
  const allPeriods = useMemo(() => program ? buildTimeline(program, workstreams) : [], [program, workstreams]);

  // Per-workstream chart data
  const wsCharts = useMemo(() => {
    return workstreams.filter(ws => myWsIds.includes(ws.id)).map(ws => {
      let total = 0, completed = 0;
      for (const i of ws.initiatives) for (const t of i.subTasks) { total += t.points; completed += Math.round(t.points * (t.completionPercent / 100)); }
      const byDate = new Map<string, { totalPoints: number; completedPoints: number }>();
      for (const snap of snapshots) {
        if (snap.workstreamData) {
          const entry = (snap.workstreamData as Record<string, WsSnapshotEntry>)[ws.id];
          if (entry) byDate.set(snap.date, { totalPoints: entry.totalPoints, completedPoints: entry.completedPoints });
        }
      }
      const data = buildChartData(allPeriods, byDate, total, total - completed, total, currentPeriod);
      return { id: ws.id, name: ws.name, color: ws.color, total, completed, data };
    });
  }, [workstreams, myWsIds, snapshots, allPeriods, currentPeriod]);

  // Per-subcomponent chart data for ALL initiatives in the user's workstreams
  const initCharts = useMemo(() => {
    const results: { id: string; name: string; wsName: string; wsColor: string | null; total: number; completed: number; isMine: boolean; data: ChartPoint[] }[] = [];
    for (const ws of workstreams) {
      if (!myWsIds.includes(ws.id)) continue;
      for (const init of ws.initiatives) {
        let total = 0, completed = 0;
        for (const t of init.subTasks) { total += t.points; completed += Math.round(t.points * (t.completionPercent / 100)); }
        if (total === 0) continue;
        const isMine = myInitIds.includes(init.id);
        const byDate = new Map<string, { totalPoints: number; completedPoints: number }>();
        for (const snap of snapshots) {
          if (snap.workstreamData) {
            const wsEntry = (snap.workstreamData as Record<string, WsSnapshotEntry>)[ws.id];
            const sub = wsEntry?.subcomponents?.[init.id];
            if (sub) byDate.set(snap.date, { totalPoints: sub.totalPoints, completedPoints: sub.completedPoints });
          }
        }
        const data = buildChartData(allPeriods, byDate, total, total - completed, total, currentPeriod);
        results.push({ id: init.id, name: init.name, wsName: ws.name, wsColor: ws.color, total, completed, isMine, data });
      }
    }
    return results;
  }, [workstreams, myWsIds, myInitIds, snapshots, allPeriods, currentPeriod]);

  if (wsCharts.length === 0 && initCharts.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">My Burndown Charts</h2>
      <p className="text-xs text-muted-foreground -mt-2">Burndown for workstreams and subcomponents you are assigned to.</p>

      {/* Workstream-level charts */}
      {wsCharts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {wsCharts.map(ws => {
            const pct = ws.total > 0 ? Math.round((ws.completed / ws.total) * 100) : 0;
            return (
              <Card key={ws.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ws.color || "#888" }} />
                      <CardTitle className="text-sm">{ws.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-muted-foreground">{ws.completed}/{ws.total} pts</span>
                      <Badge variant="secondary" className="text-[10px]">{pct}%</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <MiniChart data={ws.data} height={220} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Subcomponent-level charts */}
      {initCharts.length > 0 && (
        <>
          <h3 className="text-sm font-bold text-muted-foreground mt-2">Subcomponent Burndowns</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {initCharts.map(init => {
              const pct = init.total > 0 ? Math.round((init.completed / init.total) * 100) : 0;
              return (
                <Card key={init.id} className={init.isMine ? "border-solid" : "border-dashed opacity-70"}>
                  <CardHeader className="pb-1 pt-3 px-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: init.wsColor || "#888" }} />
                        <span className="text-xs font-semibold truncate max-w-[160px]" title={init.name}>{init.name}</span>
                        {init.isMine && <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5">Mine</Badge>}
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">{init.completed}/{init.total} ({pct}%)</span>
                    </div>
                    <span className="text-[9px] text-muted-foreground">{init.wsName}</span>
                  </CardHeader>
                  <CardContent className="px-2 pb-2">
                    <MiniChart data={init.data} height={150} />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
