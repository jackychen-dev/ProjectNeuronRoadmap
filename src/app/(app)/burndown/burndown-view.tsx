"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { saveMonthlySnapshot } from "@/lib/actions/snapshots";
import { getCurrentPeriod, getMonthlyPeriods, parseTargetMonth, type BurnPeriod } from "@/lib/burn-periods";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";

/* ─── Types ───────────────────────────────────────────── */

interface SubTask {
  id: string; name: string; points: number; completionPercent: number; status: string; isAddedScope: boolean;
}
interface Initiative {
  id: string; name: string; description: string | null; category: string;
  plannedStartMonth: string | null; plannedEndMonth: string | null;
  status: string; ownerInitials: string | null; totalPoints: number; subTasks: SubTask[];
}
interface Workstream {
  id: string; name: string; slug: string; color: string | null; status: string;
  targetCompletionDate: string | null; programId: string; initiatives: Initiative[];
}
interface SubcomponentSnap { name: string; totalPoints: number; completedPoints: number; }
interface WsSnapshotEntry {
  name: string; totalPoints: number; completedPoints: number;
  subcomponents?: Record<string, SubcomponentSnap>;
}
interface BurnSnapshotData {
  id: string; programId: string; date: string;
  totalPoints: number; completedPoints: number; percentComplete: number;
  workstreamData?: Record<string, WsSnapshotEntry> | null;
}
interface ProgramRef {
  id: string; name: string; fyStartYear: number; fyEndYear: number;
  startDate: string | null; targetDate: string | null;
}

/* ─── Helpers ─────────────────────────────────────────── */

function stCompletedPts(st: SubTask): number {
  return Math.round(st.points * (st.completionPercent / 100));
}

const STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: "#9ca3af", IN_PROGRESS: "#3b82f6", BLOCKED: "#ef4444", DONE: "#22c55e",
};
/* All remaining lines use orange #f97316, purple #a855f7 for scope */

/* ─── Tooltip ─────────────────────────────────────────── */

function BurndownTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  return (
    <div className="bg-white border rounded-lg shadow-lg p-3 text-sm max-w-xs">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.stroke }} />
          <span className="text-muted-foreground truncate">{p.name}:</span>
          <span className="font-semibold">{p.value !== null && p.value !== undefined ? `${p.value} pts` : "—"}</span>
        </div>
      ))}
      {data?.isCurrent && <p className="text-[10px] text-orange-500 mt-1 border-t pt-1">Current month</p>}
      {data?.scopeChanged && <Badge variant="destructive" className="text-[9px] mt-1">Scope Changed</Badge>}
    </div>
  );
}

/* ─── Timeline builder ────────────────────────────────── */

/** Get the program start year/month */
function getProgramStart(program: ProgramRef): { year: number; month: number } {
  if (program.startDate) {
    const d = new Date(program.startDate);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }
  return { year: 2000 + program.fyStartYear, month: 1 };
}

/** Build overall timeline (uses latest workstream end or program target) */
function buildTimeline(program: ProgramRef, workstreams: Workstream[]): BurnPeriod[] {
  const start = getProgramStart(program);

  // End: latest workstream targetCompletionDate, or FY end year
  let endYear = 2000 + program.fyEndYear;
  let endMonth = 11;

  for (const ws of workstreams) {
    const parsed = parseTargetMonth(ws.targetCompletionDate);
    if (parsed) {
      if (parsed.year > endYear || (parsed.year === endYear && parsed.month > endMonth)) {
        endYear = parsed.year;
        endMonth = parsed.month;
      }
    }
  }

  if (program.targetDate) {
    const d = new Date(program.targetDate);
    endYear = d.getFullYear();
    endMonth = d.getMonth() + 1;
  }

  return getMonthlyPeriods(start.year, start.month, endYear, endMonth);
}

/** Build timeline for a single workstream (ends at its targetCompletionDate) */
function buildWsTimeline(program: ProgramRef, ws: Workstream): BurnPeriod[] {
  const start = getProgramStart(program);

  // End at the workstream's own target, or fall back to the latest initiative end, or FY end
  const parsed = parseTargetMonth(ws.targetCompletionDate);
  let endYear: number, endMonth: number;

  if (parsed) {
    endYear = parsed.year;
    endMonth = parsed.month;
  } else {
    // Try to find the latest initiative plannedEndMonth in this workstream
    let latestEnd: { year: number; month: number } | null = null;
    for (const init of ws.initiatives) {
      if (init.plannedEndMonth) {
        const [y, m] = init.plannedEndMonth.split("-").map(Number);
        if (!latestEnd || y > latestEnd.year || (y === latestEnd.year && m > latestEnd.month)) {
          latestEnd = { year: y, month: m };
        }
      }
    }
    if (latestEnd) {
      endYear = latestEnd.year;
      endMonth = latestEnd.month;
    } else {
      endYear = 2000 + program.fyEndYear;
      endMonth = 11;
    }
  }

  return getMonthlyPeriods(start.year, start.month, endYear, endMonth);
}

/** Build timeline for a single initiative (ends at its plannedEndMonth) */
function buildInitTimeline(program: ProgramRef, ws: Workstream, init: Initiative): BurnPeriod[] {
  const start = getProgramStart(program);

  let endYear: number, endMonth: number;

  if (init.plannedEndMonth) {
    const [y, m] = init.plannedEndMonth.split("-").map(Number);
    endYear = y;
    endMonth = m;
  } else {
    // Fall back to workstream target
    const parsed = parseTargetMonth(ws.targetCompletionDate);
    if (parsed) {
      endYear = parsed.year;
      endMonth = parsed.month;
    } else {
      endYear = 2000 + program.fyEndYear;
      endMonth = 11;
    }
  }

  return getMonthlyPeriods(start.year, start.month, endYear, endMonth);
}

/* ─── Chart data builder ──────────────────────────────── */

interface ChartPoint {
  label: string; date: string;
  remaining: number | null; ideal: number; scopeLine: number;
  isCurrent: boolean; scopeChanged: boolean;
}

/**
 * Build chart data for a burndown.
 *
 * Purple "Scope" line: a declining line like ideal, but recalculated from the
 * actual scope at each point. If scope stays constant it mirrors ideal exactly.
 * If scope grows (added work), the purple line is ABOVE ideal — steeper burn
 * is needed. It always declines from scopeValue → 0 over the remaining months.
 *
 * Orange "Remaining" line: starts at the same origin as purple.
 * Only has data where snapshots exist or for the current period (live).
 *
 * Blue "Ideal" line: linear decline from startTotal → 0.
 */
function buildChartData(
  allPeriods: BurnPeriod[],
  snapshotByDate: Map<string, { totalPoints: number; completedPoints: number }>,
  startTotal: number,
  liveRemaining: number,
  liveTotalPts: number,
  currentPeriod: BurnPeriod,
): ChartPoint[] {
  const totalPeriods = allPeriods.length;
  const lastIdx = totalPeriods - 1 || 1;

  // First pass: track actual scope with carry-forward
  const scopeRaw: number[] = [];
  let lastKnownScope = startTotal;
  for (let i = 0; i < allPeriods.length; i++) {
    const snap = snapshotByDate.get(allPeriods[i].dateKey);
    const isCurrent = allPeriods[i].dateKey === currentPeriod.dateKey;
    if (snap) {
      lastKnownScope = snap.totalPoints;
    } else if (isCurrent) {
      lastKnownScope = liveTotalPts;
    }
    scopeRaw.push(lastKnownScope);
  }

  return allPeriods.map((period, idx) => {
    const snap = snapshotByDate.get(period.dateKey);
    const isCurrent = period.dateKey === currentPeriod.dateKey;

    // Blue ideal: linear from startTotal → 0
    const idealRemaining = Math.max(0, Math.round(startTotal * (1 - idx / lastIdx)));

    // Purple scope line: linear from scopeRaw[idx] → 0 over the remaining months
    // This means at each point it shows "where you'd need to be" given actual scope
    const scopeVal = scopeRaw[idx];
    const scopeLine = Math.max(0, Math.round(scopeVal * (1 - idx / lastIdx)));

    let scopeChanged = false;
    if (idx > 0 && scopeRaw[idx] !== scopeRaw[idx - 1]) {
      scopeChanged = true;
    }

    // Orange remaining: only where we have data
    let remaining: number | null = null;
    let label = period.shortLabel;

    if (idx === 0) {
      remaining = snap ? snap.totalPoints - snap.completedPoints : scopeVal;
    } else if (snap) {
      remaining = snap.totalPoints - snap.completedPoints;
    } else if (isCurrent) {
      remaining = liveRemaining;
      label = `${period.shortLabel} *`;
    }

    return { label, date: period.dateKey, remaining, ideal: idealRemaining, scopeLine, isCurrent, scopeChanged };
  });
}

/* ─── Main Component ──────────────────────────────────── */

export default function BurndownView({
  programs, workstreams, snapshots,
}: {
  programs: ProgramRef[]; workstreams: Workstream[]; snapshots: BurnSnapshotData[];
}) {
  const [selectedWs, setSelectedWs] = useState<string>("all");
  const [selectedProgram, setSelectedProgram] = useState<string>(programs[0]?.id || "all");
  const [hideIdeal, setHideIdeal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const currentPeriod = useMemo(() => getCurrentPeriod(), []);

  const activeProgram = programs.find(p => p.id === selectedProgram) || programs[0];
  const allPeriods = useMemo(
    () => activeProgram ? buildTimeline(activeProgram, workstreams) : [],
    [activeProgram, workstreams]
  );

  function refresh() { startTransition(() => router.refresh()); }

  /* ── Live totals (completionPercent) ── */
  const programTotalPts = workstreams.reduce((s, ws) => s + ws.initiatives.reduce((si, i) => si + i.subTasks.reduce((st, t) => st + t.points, 0), 0), 0);
  const programCompletedPts = workstreams.reduce((s, ws) => s + ws.initiatives.reduce((si, i) => si + i.subTasks.reduce((st, t) => st + stCompletedPts(t), 0), 0), 0);
  const programPct = programTotalPts > 0 ? Math.round((programCompletedPts / programTotalPts) * 100) : 0;

  const wsLiveTotals = useMemo(() => {
    const map = new Map<string, { name: string; color: string; totalPoints: number; completedPoints: number }>();
    for (const ws of workstreams) {
      let total = 0, completed = 0;
      for (const i of ws.initiatives) for (const t of i.subTasks) { total += t.points; completed += stCompletedPts(t); }
      map.set(ws.id, { name: ws.name, color: ws.color || "#888", totalPoints: total, completedPoints: completed });
    }
    return map;
  }, [workstreams]);

  const initLiveTotals = useMemo(() => {
    const map = new Map<string, { name: string; wsId: string; totalPoints: number; completedPoints: number }>();
    for (const ws of workstreams) {
      for (const init of ws.initiatives) {
        let total = 0, completed = 0;
        for (const t of init.subTasks) { total += t.points; completed += stCompletedPts(t); }
        map.set(init.id, { name: init.name, wsId: ws.id, totalPoints: total, completedPoints: completed });
      }
    }
    return map;
  }, [workstreams]);

  const filteredWs = useMemo(() => selectedWs === "all" ? workstreams : workstreams.filter(ws => ws.id === selectedWs), [selectedWs, workstreams]);

  /* ── Overall chart data ── */
  const chartData = useMemo(() => {
    const programFilter = selectedProgram !== "all" ? selectedProgram : null;
    const relevant = programFilter ? snapshots.filter(s => s.programId === programFilter) : snapshots;
    const byDate = new Map<string, { totalPoints: number; completedPoints: number }>();
    for (const snap of relevant) {
      const e = byDate.get(snap.date) || { totalPoints: 0, completedPoints: 0 };
      e.totalPoints += snap.totalPoints; e.completedPoints += snap.completedPoints;
      byDate.set(snap.date, e);
    }
    return buildChartData(allPeriods, byDate, programTotalPts, programTotalPts - programCompletedPts, programTotalPts, currentPeriod);
  }, [snapshots, selectedProgram, allPeriods, currentPeriod, programTotalPts, programCompletedPts]);

  /* ── Per-workstream chart data (each uses its own timeline) ── */
  const wsChartDataMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string; data: ChartPoint[]; periods: BurnPeriod[] }>();
    if (!activeProgram) return map;
    for (const ws of workstreams) {
      const live = wsLiveTotals.get(ws.id)!;
      const wsPeriods = buildWsTimeline(activeProgram, ws);
      const byDate = new Map<string, { totalPoints: number; completedPoints: number }>();
      for (const snap of snapshots) {
        if (snap.workstreamData) {
          const entry = (snap.workstreamData as Record<string, WsSnapshotEntry>)[ws.id];
          if (entry) byDate.set(snap.date, { totalPoints: entry.totalPoints, completedPoints: entry.completedPoints });
        }
      }
      map.set(ws.id, { name: ws.name, color: live.color, periods: wsPeriods, data: buildChartData(wsPeriods, byDate, live.totalPoints, live.totalPoints - live.completedPoints, live.totalPoints, currentPeriod) });
    }
    return map;
  }, [workstreams, wsLiveTotals, snapshots, activeProgram, currentPeriod]);

  /* ── Per-subcomponent chart data (each uses its own timeline) ── */
  const subChartDataMap = useMemo(() => {
    if (selectedWs === "all") return new Map<string, { name: string; data: ChartPoint[] }>();
    const map = new Map<string, { name: string; data: ChartPoint[] }>();
    const ws = workstreams.find(w => w.id === selectedWs);
    if (!ws || !activeProgram) return map;

    for (const init of ws.initiatives) {
      const live = initLiveTotals.get(init.id)!;
      const initPeriods = buildInitTimeline(activeProgram, ws, init);
      const byDate = new Map<string, { totalPoints: number; completedPoints: number }>();
      for (const snap of snapshots) {
        if (snap.workstreamData) {
          const wsEntry = (snap.workstreamData as Record<string, WsSnapshotEntry>)[ws.id];
          const sub = wsEntry?.subcomponents?.[init.id];
          if (sub) byDate.set(snap.date, { totalPoints: sub.totalPoints, completedPoints: sub.completedPoints });
        }
      }
      map.set(init.id, { name: init.name, data: buildChartData(initPeriods, byDate, live.totalPoints, live.totalPoints - live.completedPoints, live.totalPoints, currentPeriod) });
    }
    return map;
  }, [selectedWs, workstreams, initLiveTotals, snapshots, activeProgram, currentPeriod]);

  /* ── Handlers ── */
  function handlePushSnapshot() {
    const pid = selectedProgram !== "all" ? selectedProgram : programs[0]?.id;
    if (!pid) return;
    startTransition(async () => { await saveMonthlySnapshot(pid); refresh(); });
  }

  const currentPeriodSaved = snapshots.some(s => s.date === currentPeriod.dateKey);
  const lastSnapshotDate = snapshots.length > 0 ? snapshots[snapshots.length - 1]?.date : null;

  /* ── Render helpers ── */
  function renderChart(data: ChartPoint[], height: number) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 15, right: 20, left: 10, bottom: 25 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={0} angle={-45} textAnchor="end" height={60} />
          <YAxis tick={{ fontSize: 11 }} width={40} />
          <Tooltip content={<BurndownTooltip />} />
          <Legend />
          {data.some(d => d.isCurrent) && (
            <ReferenceLine x={data.find(d => d.isCurrent)?.label} stroke="#f97316" strokeDasharray="4 4" label={{ value: "Now", position: "top", fontSize: 10, fill: "#f97316" }} />
          )}
          {/* Purple scope line — declines like ideal but steeper when scope grows */}
          <Line type="monotone" dataKey="scopeLine" stroke="#a855f7" strokeWidth={2} dot={{ r: 2, fill: "#a855f7", strokeWidth: 0 }} name="Scope Adjusted" />
          {/* Blue ideal line — linear decline */}
          {!hideIdeal && (
            <Line type="monotone" dataKey="ideal" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2, fill: "#3b82f6", strokeWidth: 0 }} name="Ideal" strokeDasharray="5 5" />
          )}
          {/* Orange remaining line — always orange, connects across gaps */}
          <Line type="monotone" dataKey="remaining" stroke="#f97316" strokeWidth={3} dot={(props: any) => {
            const { cx, cy, payload } = props;
            if (payload?.remaining === null || payload?.remaining === undefined) return <g />;
            if (payload?.isCurrent && !currentPeriodSaved) return <circle cx={cx} cy={cy} r={5} fill="#f97316" stroke="#fff" strokeWidth={2} />;
            return <circle cx={cx} cy={cy} r={3} fill="#f97316" />;
          }} name="Remaining" connectNulls />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Burndown</h1>
          <p className="text-muted-foreground mt-1">
            Monthly snapshots — current: <strong>{currentPeriod.label}</strong>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {currentPeriodSaved && <Badge variant="secondary" className="text-[10px]">Month saved</Badge>}
          <Button onClick={handlePushSnapshot} disabled={isPending} size="sm">
            {currentPeriodSaved ? "Update This Month" : "Save This Month"}
          </Button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-6 text-center"><p className="text-xs text-muted-foreground">Total Points</p><p className="text-3xl font-bold">{programTotalPts}</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-xs text-muted-foreground">Completed</p><p className="text-3xl font-bold text-green-600">{programCompletedPts}</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-xs text-muted-foreground">Remaining</p><p className="text-3xl font-bold text-orange-500">{programTotalPts - programCompletedPts}</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-xs text-muted-foreground">Snapshots</p><p className="text-3xl font-bold text-purple-600">{snapshots.length}</p>{lastSnapshotDate && <p className="text-[10px] text-muted-foreground mt-0.5">Last: {lastSnapshotDate}</p>}</CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-xs text-muted-foreground">Overall</p><p className="text-3xl font-bold">{programPct}%</p><div className="mt-2 w-full bg-gray-200 rounded-full h-2"><div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-green-500" style={{ width: `${programPct}%` }} /></div></CardContent></Card>
      </div>

      {/* ── Filters ── */}
      <div className="flex gap-3 items-center flex-wrap">
        {programs.length > 1 && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Initiative</label>
            <Select className="h-9 text-sm w-52" value={selectedProgram} onChange={(e) => setSelectedProgram(e.target.value)}>
              <option value="all">All Initiatives</option>
              {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </div>
        )}
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">Workstream</label>
          <Select className="h-9 text-sm w-52" value={selectedWs} onChange={(e) => setSelectedWs(e.target.value)}>
            <option value="all">All Workstreams</option>
            {workstreams.map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
          </Select>
        </div>
        <div className="flex items-end pb-0.5">
          <Button variant={hideIdeal ? "default" : "outline"} size="sm" className="text-xs h-9" onClick={() => setHideIdeal(!hideIdeal)}>
            {hideIdeal ? "Show" : "Hide"} Ideal
          </Button>
        </div>
        {selectedWs !== "all" && (
          <Badge variant="outline" className="text-xs mt-5">Showing subcomponent burndowns for selected workstream</Badge>
        )}
      </div>

      {/* ── Main Burndown (overall when "all", or selected workstream's chart) ── */}
      {(() => {
        if (selectedWs === "all") {
          // Show overall burndown as the big chart
          return (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Overall Burndown</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Purple = scope-adjusted ideal · Blue = original ideal · Orange = actual remaining · * = current (unsaved)
                </p>
              </CardHeader>
              <CardContent>
                {chartData.length >= 1 ? renderChart(chartData, 380) : (
                  <div className="py-16 text-center">
                    <p className="text-muted-foreground mb-4">No snapshots yet. Save progress for {currentPeriod.label}.</p>
                    <Button onClick={handlePushSnapshot} disabled={isPending}>Save This Month</Button>
                  </div>
                )}
                {chartData.some(d => d.scopeChanged) && (
                  <div className="mt-3 p-3 rounded-lg border border-amber-300 bg-amber-50">
                    <p className="text-sm text-amber-700 font-medium">Scope Changed</p>
                    <p className="text-xs text-amber-600">Total points changed between consecutive snapshots.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        } else {
          // Show the selected workstream as the big chart
          const ws = workstreams.find(w => w.id === selectedWs);
          const wsChart = ws ? wsChartDataMap.get(ws.id) : null;
          const live = ws ? wsLiveTotals.get(ws.id) : null;
          if (!ws || !wsChart || !live) return null;
          const pct = live.totalPoints > 0 ? Math.round((live.completedPoints / live.totalPoints) * 100) : 0;
          return (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: wsChart.color }} />
                    <CardTitle>{wsChart.name} — Burndown</CardTitle>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-muted-foreground">{live.completedPoints}/{live.totalPoints} pts</span>
                    <Badge variant="secondary" className="text-[10px]">{pct}%</Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Purple = scope-adjusted ideal · Blue = original ideal · Orange = actual remaining · * = current (unsaved)
                </p>
              </CardHeader>
              <CardContent>
                {live.totalPoints > 0 ? renderChart(wsChart.data, 380) : (
                  <div className="py-16 text-center text-xs text-muted-foreground">No subtask points yet</div>
                )}
              </CardContent>
            </Card>
          );
        }
      })()}

      {/* ── Workstream Burndowns (only when "all" is selected) ── */}
      {selectedWs === "all" && (
        <div>
          <h2 className="text-xl font-bold mb-4">Workstream Burndowns</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {workstreams.map((ws) => {
              const wsChart = wsChartDataMap.get(ws.id);
              if (!wsChart) return null;
              const live = wsLiveTotals.get(ws.id)!;
              const pct = live.totalPoints > 0 ? Math.round((live.completedPoints / live.totalPoints) * 100) : 0;
              return (
                <Card key={ws.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: wsChart.color }} />
                        <CardTitle className="text-sm">{wsChart.name}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono text-muted-foreground">{live.completedPoints}/{live.totalPoints} pts</span>
                        <Badge variant="secondary" className="text-[10px]">{pct}%</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {live.totalPoints > 0 ? renderChart(wsChart.data, 240) : (
                      <div className="py-8 text-center text-xs text-muted-foreground">No subtask points yet</div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Subcomponent Burndowns (only when a specific workstream is selected) ── */}
      {selectedWs !== "all" && (() => {
        const ws = workstreams.find(w => w.id === selectedWs);
        if (!ws || ws.initiatives.length === 0) return null;
        return (
          <div>
            <h2 className="text-xl font-bold mb-4">Subcomponent Burndowns — {ws.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {ws.initiatives.map((init) => {
                const subChart = subChartDataMap.get(init.id);
                const subLive = initLiveTotals.get(init.id);
                if (!subChart || !subLive || subLive.totalPoints === 0) return null;
                const subPct = subLive.totalPoints > 0 ? Math.round((subLive.completedPoints / subLive.totalPoints) * 100) : 0;
                return (
                  <Card key={init.id} className="border-dashed">
                    <CardHeader className="pb-1 pt-3 px-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-orange-500" />
                          <span className="text-xs font-semibold truncate max-w-[160px]" title={subChart.name}>{subChart.name}</span>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground">{subLive.completedPoints}/{subLive.totalPoints} ({subPct}%)</span>
                      </div>
                    </CardHeader>
                    <CardContent className="px-2 pb-2">
                      <ResponsiveContainer width="100%" height={150}>
                        <LineChart data={subChart.data} margin={{ top: 5, right: 5, left: 0, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="label" tick={{ fontSize: 6 }} interval={0} angle={-45} textAnchor="end" height={45} />
                          <YAxis tick={{ fontSize: 8 }} width={25} />
                          <Tooltip content={<BurndownTooltip />} />
                          <Line type="monotone" dataKey="scopeLine" stroke="#a855f7" strokeWidth={1.5} dot={false} name="Scope Adjusted" />
                          {!hideIdeal && <Line type="monotone" dataKey="ideal" stroke="#3b82f6" strokeWidth={1} dot={false} strokeDasharray="3 3" />}
                          <Line type="monotone" dataKey="remaining" stroke="#f97316" strokeWidth={2} dot={(props: any) => {
                            const { cx, cy, payload } = props;
                            if (payload?.remaining === null || payload?.remaining === undefined) return <g />;
                            return <circle cx={cx} cy={cy} r={2.5} fill="#f97316" />;
                          }} connectNulls />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── Subcomponent Details Table ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Subcomponent Details ({filteredWs.flatMap(ws => ws.initiatives).length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-semibold">Subcomponent</th>
                  <th className="pb-2 font-semibold text-center">Points</th>
                  <th className="pb-2 font-semibold text-center">Completed</th>
                  <th className="pb-2 font-semibold text-center">%</th>
                  <th className="pb-2 font-semibold text-center">Owner</th>
                  <th className="pb-2 font-semibold">Status</th>
                  <th className="pb-2 font-semibold">Progress</th>
                </tr>
              </thead>
              <tbody>
                {filteredWs.flatMap(ws => ws.initiatives.map(init => {
                  const pts = init.subTasks.reduce((s, t) => s + t.points, 0);
                  const completed = init.subTasks.reduce((s, t) => s + stCompletedPts(t), 0);
                  const pct = pts > 0 ? Math.round((completed / pts) * 100) : 0;
                  return (
                    <tr key={init.id} className="border-b last:border-0 hover:bg-accent/30">
                      <td className="py-2.5 pr-2"><div className="font-medium">{init.name}</div><div className="text-[10px] text-muted-foreground">{ws.name} · {init.subTasks.length} subtasks</div></td>
                      <td className="py-2.5 text-center font-mono">{pts}</td>
                      <td className="py-2.5 text-center font-mono text-green-600">{completed}</td>
                      <td className="py-2.5 text-center font-bold">{pct}%</td>
                      <td className="py-2.5 text-center text-xs font-medium">{init.ownerInitials || "—"}</td>
                      <td className="py-2.5"><Badge variant="secondary" className="text-[10px]" style={{ backgroundColor: STATUS_COLORS[init.status] + "20", color: STATUS_COLORS[init.status] }}>{init.status.replace(/_/g, " ")}</Badge></td>
                      <td className="py-2.5 w-32"><div className="w-full bg-gray-200 rounded-full h-2"><div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#22c55e" : "#3b82f6" }} /></div></td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
