"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { saveMonthlySnapshot } from "@/lib/actions/snapshots";
import { getCurrentPeriod, getMonthlyPeriods, type BurnPeriod } from "@/lib/burn-periods";
import { buildTimeline, buildChartData, type ChartPoint as SharedChartPoint, type ProgramRef as SharedProgramRef } from "@/lib/burndown-chart-data";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";

/* ─── Types ───────────────────────────────────────────── */

interface SubTask {
  id: string; name: string; points: number; completionPercent: number; status: string; isAddedScope: boolean;
  assignedOrganization: "ECLIPSE" | "ACCENTURE" | null;
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

function stBasePoints(st: SubTask): number {
  return st.isAddedScope ? 0 : st.points;
}

function stScopePoints(st: SubTask): number {
  return st.points;
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

/* ─── Timeline: use shared buildTimeline; narrow to initiative window for subcharts ───────────────────────────── */

/** Narrow a global period timeline down to an initiative's planned start/end window. */
function slicePeriodsForInitiative(all: BurnPeriod[], init: Initiative): BurnPeriod[] {
  if (all.length === 0) return all;

  let startIdx = 0;
  let endIdx = all.length - 1;

  if (init.plannedStartMonth) {
    const key = init.plannedStartMonth;
    const idx = all.findIndex(p => p.dateKey >= key);
    if (idx >= 0) startIdx = idx;
  }
  if (init.plannedEndMonth) {
    const key = init.plannedEndMonth;
    let idx = -1;
    for (let i = all.length - 1; i >= 0; i--) {
      if (all[i].dateKey <= key) { idx = i; break; }
    }
    if (idx >= 0) endIdx = idx;
  }

  if (startIdx > endIdx) return all;
  return all.slice(startIdx, endIdx + 1);
}

type ChartPoint = SharedChartPoint;

/* ─── Main Component ──────────────────────────────────── */

export default function BurndownView({
  programs, workstreams, snapshots,
}: {
  programs: ProgramRef[]; workstreams: Workstream[]; snapshots: BurnSnapshotData[];
}) {
  const [selectedWs, setSelectedWs] = useState<string>("all");
  const [selectedProgram, setSelectedProgram] = useState<string>(programs[0]?.id || "all");
  const [orgFilter, setOrgFilter] = useState<"all" | "ECLIPSE" | "ACCENTURE">("all");
  const [hideIdeal, setHideIdeal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const currentPeriod = useMemo(() => getCurrentPeriod(), []);

  /** Subtask matches the assigned-organization filter */
  function matchesSubTaskOrg(st: SubTask): boolean {
    if (orgFilter === "all") return true;
    return (st.assignedOrganization ?? null) === orgFilter;
  }

  /** Initiative has at least one subtask matching the org filter (for including in snapshot and display) */
  const initiativeHasMatchingSubTasks = useMemo(() => {
    const set = new Set<string>();
    for (const ws of workstreams) {
      for (const init of ws.initiatives) {
        const hasMatch = init.subTasks.some(st => matchesSubTaskOrg(st));
        if (hasMatch) set.add(init.id);
      }
    }
    return set;
  }, [workstreams, orgFilter]);

  const activeProgram = programs.find(p => p.id === selectedProgram) || programs[0];
  const allPeriods = useMemo(
    () => (activeProgram ? buildTimeline(activeProgram as unknown as SharedProgramRef, workstreams) : []),
    [activeProgram, workstreams]
  );

  function refresh() { startTransition(() => router.refresh()); }

  /* ── Live totals (baseline vs added-scope) — only subtasks matching org filter ── */
  let programBasePts = 0;
  let programScopePts = 0;
  let programCompletedPts = 0;
  for (const ws of workstreams) {
    for (const init of ws.initiatives) {
      for (const t of init.subTasks) {
        if (!matchesSubTaskOrg(t)) continue;
        programBasePts += stBasePoints(t);
        programScopePts += stScopePoints(t);
        programCompletedPts += stCompletedPts(t);
      }
    }
  }
  const programPct = programScopePts > 0 ? Math.round((programCompletedPts / programScopePts) * 100) : 0;

  const wsLiveTotals = useMemo(() => {
    const map = new Map<string, { name: string; color: string; basePoints: number; scopePoints: number; completedPoints: number }>();
    for (const ws of workstreams) {
      let basePts = 0, scopePts = 0, completed = 0;
      for (const i of ws.initiatives) {
        for (const t of i.subTasks) {
          if (!matchesSubTaskOrg(t)) continue;
          basePts += stBasePoints(t);
          scopePts += stScopePoints(t);
          completed += stCompletedPts(t);
        }
      }
      map.set(ws.id, { name: ws.name, color: ws.color || "#888", basePoints: basePts, scopePoints: scopePts, completedPoints: completed });
    }
    return map;
  }, [workstreams, orgFilter]);

  const initLiveTotals = useMemo(() => {
    const map = new Map<string, { name: string; wsId: string; basePoints: number; scopePoints: number; completedPoints: number }>();
    for (const ws of workstreams) {
      for (const init of ws.initiatives) {
        let basePts = 0, scopePts = 0, completed = 0;
        for (const t of init.subTasks) {
          if (!matchesSubTaskOrg(t)) continue;
          basePts += stBasePoints(t);
          scopePts += stScopePoints(t);
          completed += stCompletedPts(t);
        }
        if (basePts > 0 || scopePts > 0 || completed > 0) {
          map.set(init.id, { name: init.name, wsId: ws.id, basePoints: basePts, scopePoints: scopePts, completedPoints: completed });
        }
      }
    }
    return map;
  }, [workstreams, orgFilter]);

  const filteredWs = useMemo(() => selectedWs === "all" ? workstreams : workstreams.filter(ws => ws.id === selectedWs), [selectedWs, workstreams]);

  /* ── Overall chart data ── */
  const chartData = useMemo(() => {
    const programFilter = selectedProgram !== "all" ? selectedProgram : null;
    const relevant = programFilter ? snapshots.filter(s => s.programId === programFilter) : snapshots;
    const byDate = new Map<string, { totalPoints: number; completedPoints: number }>();
    for (const snap of relevant) {
      if (snap.workstreamData) {
        const wsEntries = snap.workstreamData as Record<string, WsSnapshotEntry>;
        let total = 0;
        let completed = 0;
        for (const wsId of Object.keys(wsEntries)) {
          const entry = wsEntries[wsId];
          if (entry.subcomponents) {
            for (const [initId, sub] of Object.entries(entry.subcomponents)) {
              if (orgFilter !== "all" && !initiativeHasMatchingSubTasks.has(initId)) continue;
              total += sub.totalPoints;
              completed += sub.completedPoints;
            }
          } else if (orgFilter === "all") {
            total += entry.totalPoints;
            completed += entry.completedPoints;
          }
        }
        const existing = byDate.get(snap.date) || { totalPoints: 0, completedPoints: 0 };
        existing.totalPoints += total;
        existing.completedPoints += completed;
        byDate.set(snap.date, existing);
      } else if (orgFilter === "all") {
        const e = byDate.get(snap.date) || { totalPoints: 0, completedPoints: 0 };
        e.totalPoints += snap.totalPoints; e.completedPoints += snap.completedPoints;
        byDate.set(snap.date, e);
      }
    }
    return buildChartData(
      allPeriods,
      byDate,
      programBasePts,
      programScopePts - programCompletedPts,
      programScopePts,
      currentPeriod,
    );
  }, [snapshots, selectedProgram, allPeriods, currentPeriod, programBasePts, programScopePts, programCompletedPts, orgFilter, initiativeHasMatchingSubTasks]);

  /* ── Per-workstream chart data (each uses its own timeline) ── */
  const wsChartDataMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string; data: ChartPoint[]; periods: BurnPeriod[] }>();
    if (!activeProgram) return map;
    for (const ws of workstreams) {
      const live = wsLiveTotals.get(ws.id)!;

      // Workstream-specific timeline: earliest start → latest end across its initiatives
      let wsStartYear = allPeriods[0]?.year;
      let wsStartMonth = allPeriods[0]?.month;
      let wsEndYear = allPeriods[allPeriods.length - 1]?.year;
      let wsEndMonth = allPeriods[allPeriods.length - 1]?.month;
      let hasBounds = false;
      for (const init of ws.initiatives) {
        if (orgFilter !== "all" && !initiativeHasMatchingSubTasks.has(init.id)) continue;
        if (init.plannedStartMonth) {
          const [sy, sm] = init.plannedStartMonth.split("-").map(Number);
          if (!hasBounds || sy < wsStartYear || (sy === wsStartYear && sm < wsStartMonth)) {
            wsStartYear = sy;
            wsStartMonth = sm;
          }
          hasBounds = true;
        }
        if (init.plannedEndMonth) {
          const [ey, em] = init.plannedEndMonth.split("-").map(Number);
          if (!hasBounds || ey > wsEndYear || (ey === wsEndYear && em > wsEndMonth)) {
            wsEndYear = ey;
            wsEndMonth = em;
          }
          hasBounds = true;
        }
      }
      const wsPeriods = hasBounds && wsStartYear && wsStartMonth && wsEndYear && wsEndMonth
        ? getMonthlyPeriods(wsStartYear, wsStartMonth, wsEndYear, wsEndMonth)
        : allPeriods;

      const byDate = new Map<string, { totalPoints: number; completedPoints: number }>();
      for (const snap of snapshots) {
        if (!snap.workstreamData) continue;
        const wsEntry = (snap.workstreamData as Record<string, WsSnapshotEntry>)[ws.id];
        if (!wsEntry) continue;
        let total = 0;
        let completed = 0;
        if (wsEntry.subcomponents) {
          for (const [initId, sub] of Object.entries(wsEntry.subcomponents)) {
            if (orgFilter !== "all" && !initiativeHasMatchingSubTasks.has(initId)) continue;
            total += sub.totalPoints;
            completed += sub.completedPoints;
          }
        } else if (orgFilter === "all") {
          total = wsEntry.totalPoints;
          completed = wsEntry.completedPoints;
        }
        byDate.set(snap.date, { totalPoints: total, completedPoints: completed });
      }
      map.set(ws.id, {
        name: ws.name,
        color: live.color,
        periods: wsPeriods,
        data: buildChartData(
          wsPeriods,
          byDate,
          live.basePoints,
          live.scopePoints - live.completedPoints,
          live.scopePoints,
          currentPeriod,
        ),
      });
    }
    return map;
  }, [workstreams, wsLiveTotals, snapshots, allPeriods, currentPeriod, orgFilter, initiativeHasMatchingSubTasks]);

  /* ── Per-subcomponent chart data (each uses its own timeline) ── */
  const subChartDataMap = useMemo(() => {
    if (selectedWs === "all") return new Map<string, { name: string; data: ChartPoint[] }>();
    const map = new Map<string, { name: string; data: ChartPoint[] }>();
    const ws = workstreams.find(w => w.id === selectedWs);
    if (!ws || !activeProgram) return map;

    for (const init of ws.initiatives) {
      const live = initLiveTotals.get(init.id);
      if (!live) continue;
      const periods = slicePeriodsForInitiative(allPeriods, init);
      const byDate = new Map<string, { totalPoints: number; completedPoints: number }>();
      for (const snap of snapshots) {
        if (snap.workstreamData) {
          const wsEntry = (snap.workstreamData as Record<string, WsSnapshotEntry>)[ws.id];
          const sub = wsEntry?.subcomponents?.[init.id];
          if (sub) byDate.set(snap.date, { totalPoints: sub.totalPoints, completedPoints: sub.completedPoints });
        }
      }
      map.set(init.id, {
        name: init.name,
        data: buildChartData(
          periods,
          byDate,
          live.basePoints,
          live.scopePoints - live.completedPoints,
          live.scopePoints,
          currentPeriod,
        ),
      });
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
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold">Assigned organization:</span>
            <select
              className="h-7 text-xs border rounded px-1 bg-background"
              value={orgFilter}
              onChange={(e) => setOrgFilter(e.target.value as "all" | "ECLIPSE" | "ACCENTURE")}
            >
              <option value="all">All</option>
              <option value="ECLIPSE">Eclipse</option>
              <option value="ACCENTURE">Accenture</option>
            </select>
          </div>
          {currentPeriodSaved && <Badge variant="secondary" className="text-[10px]">Month saved</Badge>}
          <Button onClick={handlePushSnapshot} disabled={isPending} size="sm">
            {currentPeriodSaved ? "Update This Month" : "Save This Month"}
          </Button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-6 text-center"><p className="text-xs text-muted-foreground">Total Points</p><p className="text-3xl font-bold">{programScopePts}</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-xs text-muted-foreground">Completed</p><p className="text-3xl font-bold text-green-600">{programCompletedPts}</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-xs text-muted-foreground">Remaining</p><p className="text-3xl font-bold text-orange-500">{programScopePts - programCompletedPts}</p></CardContent></Card>
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
          const pct = live.scopePoints > 0 ? Math.round((live.completedPoints / live.scopePoints) * 100) : 0;
          return (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: wsChart.color }} />
                    <CardTitle>{wsChart.name} — Burndown</CardTitle>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-muted-foreground">{live.completedPoints}/{live.scopePoints} pts</span>
                    <Badge variant="secondary" className="text-[10px]">{pct}%</Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Purple = scope-adjusted ideal · Blue = original ideal · Orange = actual remaining · * = current (unsaved)
                </p>
              </CardHeader>
              <CardContent>
                {live.scopePoints > 0 ? renderChart(wsChart.data, 380) : (
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
              if (orgFilter !== "all" && live.scopePoints === 0) return null;
              const pct = live.scopePoints > 0 ? Math.round((live.completedPoints / live.scopePoints) * 100) : 0;
              return (
                <Card key={ws.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: wsChart.color }} />
                        <CardTitle className="text-sm">{wsChart.name}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono text-muted-foreground">{live.completedPoints}/{live.scopePoints} pts</span>
                        <Badge variant="secondary" className="text-[10px]">{pct}%</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {live.scopePoints > 0 ? renderChart(wsChart.data, 240) : (
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
                if (!subChart || !subLive || subLive.scopePoints === 0) return null;
                const subPct = subLive.scopePoints > 0 ? Math.round((subLive.completedPoints / subLive.scopePoints) * 100) : 0;
                return (
                  <Card key={init.id} className="border-dashed">
                    <CardHeader className="pb-1 pt-3 px-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-orange-500" />
                          <span className="text-xs font-semibold truncate max-w-[160px]" title={subChart.name}>{subChart.name}</span>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground">{subLive.completedPoints}/{subLive.scopePoints} ({subPct}%)</span>
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
