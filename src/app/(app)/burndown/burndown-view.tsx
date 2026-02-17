"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

/* ─── Types ───────────────────────────────────────────── */

interface SubTask {
  id: string;
  name: string;
  points: number;
  completionPercent: number;
  status: string;
  isAddedScope: boolean;
}

interface Initiative {
  id: string;
  name: string;
  description: string | null;
  category: string;
  plannedStartMonth: string | null;
  plannedEndMonth: string | null;
  status: string;
  ownerInitials: string | null;
  totalPoints: number;
  subTasks: SubTask[];
}

interface Workstream {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  status: string;
  targetCompletionDate: string | null;
  initiatives: Initiative[];
}

/* ─── Helpers ─────────────────────────────────────────── */

function getInitiativePoints(init: Initiative): number {
  if (init.subTasks.length === 0) return init.totalPoints;
  return init.subTasks.reduce((s, t) => s + t.points, 0);
}

/** Original scope points only (non-added subtasks) */
function getOriginalPoints(init: Initiative): number {
  if (init.subTasks.length === 0) return init.totalPoints;
  return init.subTasks.filter(t => !t.isAddedScope).reduce((s, t) => s + t.points, 0);
}

/** Added scope points only */
function getAddedPoints(init: Initiative): number {
  if (init.subTasks.length === 0) return 0;
  return init.subTasks.filter(t => t.isAddedScope).reduce((s, t) => s + t.points, 0);
}

function getCompletedPoints(init: Initiative): number {
  if (init.subTasks.length === 0) {
    const pts = getInitiativePoints(init);
    if (init.status === "DONE") return pts;
    if (init.status === "IN_PROGRESS") return Math.round(pts * 0.5);
    return 0;
  }
  return Math.round(
    init.subTasks.reduce((s, t) => s + (t.points * t.completionPercent) / 100, 0)
  );
}

/** Completed points from original scope only */
function getCompletedOriginalPoints(init: Initiative): number {
  if (init.subTasks.length === 0) {
    const pts = getOriginalPoints(init);
    if (init.status === "DONE") return pts;
    if (init.status === "IN_PROGRESS") return Math.round(pts * 0.5);
    return 0;
  }
  return Math.round(
    init.subTasks.filter(t => !t.isAddedScope).reduce((s, t) => s + (t.points * t.completionPercent) / 100, 0)
  );
}

/** Completed points from added scope only */
function getCompletedAddedPoints(init: Initiative): number {
  if (init.subTasks.length === 0) return 0;
  return Math.round(
    init.subTasks.filter(t => t.isAddedScope).reduce((s, t) => s + (t.points * t.completionPercent) / 100, 0)
  );
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthToNum(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  return y * 12 + m;
}

function getMonthRange(start: string, end: string): string[] {
  const months: string[] = [];
  let [y, m] = start.split("-").map(Number);
  const endNum = monthToNum(end);
  while (y * 12 + m <= endNum) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months;
}

function fmtMonth(ym: string): string {
  const [y, m] = ym.split("-");
  const names = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[parseInt(m)]} '${y.slice(2)}`;
}

function parseTargetDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const map: Record<string, string> = {
    january: "01", february: "02", march: "03", april: "04",
    may: "05", june: "06", july: "07", august: "08",
    september: "09", october: "10", november: "11", december: "12",
  };
  const parts = dateStr.trim().split(/\s+/);
  if (parts.length !== 2) return null;
  const m = map[parts[0].toLowerCase()];
  return m ? `${parts[1]}-${m}` : null;
}

const STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: "#9ca3af",
  IN_PROGRESS: "#3b82f6",
  BLOCKED: "#ef4444",
  DONE: "#22c55e",
};

/* ─── Burndown Data Builder (3-line) ─────────────────── */

function buildBurndownData(
  originalPts: number,
  addedPts: number,
  completedOriginal: number,
  completedAdded: number,
  startMonth: string,
  endMonth: string,
) {
  const today = getCurrentMonth();
  const months = getMonthRange(startMonth, endMonth);
  if (months.length < 2) return [];

  const totalPts = originalPts + addedPts;
  const remainingActual = (originalPts - completedOriginal) + (addedPts - completedAdded);
  const lastIdx = months.length - 1;

  const todayIdx = months.indexOf(today);
  const beforeStart = today < startMonth;
  const pastEnd = today > endMonth;

  return months.map((month, idx) => {
    // Ideal: straight line from originalPts → 0
    const ideal = Math.round(originalPts * (1 - idx / lastIdx));

    // Total Points: straight line from totalPts → 0 (steeper than ideal)
    const totalRemaining = Math.round(totalPts * (1 - idx / lastIdx));

    // Remaining Effort: actual progress, starts at totalPts, only drawn up to today
    let remainingEffort: number | null = null;

    if (beforeStart) {
      if (idx === 0) {
        remainingEffort = totalPts;
      }
    } else if (pastEnd) {
      // Spread actual progress across the full range
      remainingEffort = Math.round(totalPts - ((totalPts - remainingActual) * idx / lastIdx));
    } else {
      const ti = todayIdx >= 0 ? todayIdx : 0;
      if (idx <= ti) {
        if (ti === 0) {
          remainingEffort = remainingActual;
        } else {
          remainingEffort = Math.round(totalPts - ((totalPts - remainingActual) * idx / ti));
        }
      }
    }

    return {
      month: fmtMonth(month),
      fullMonth: month,
      ideal,
      remainingEffort,
      totalRemaining,
      isToday: month === today,
    };
  });
}

/* ─── Custom Tooltip ──────────────────────────────────── */

function BurndownTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  const keyLabels: Record<string, string> = {
    ideal: "Ideal Remaining",
    remainingEffort: "Remaining Effort",
    totalRemaining: "Total Points",
  };
  const keyColors: Record<string, string> = {
    ideal: "#3b82f6",
    remainingEffort: "#f97316",
    totalRemaining: "#a855f7",
  };
  return (
    <div className="bg-white border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: keyColors[p.dataKey] || p.stroke }} />
          <span className="text-muted-foreground">
            {keyLabels[p.dataKey] || p.dataKey}:
          </span>
          <span className="font-semibold">{p.value} pts</span>
        </div>
      ))}
      {data?.isToday && (
        <p className="text-[10px] text-muted-foreground mt-1 border-t pt-1">← Today</p>
      )}
    </div>
  );
}

/* ─── Legend Label Formatter ──────────────────────────── */

function legendFormatter(v: string) {
  if (v === "ideal") return "Ideal Remaining";
  if (v === "remainingEffort") return "Remaining Effort";
  if (v === "totalRemaining") return "Total Points";
  return v;
}

/* ─── Main Component ──────────────────────────────────── */

export default function BurndownView({ workstreams }: { workstreams: Workstream[] }) {
  const [selectedWs, setSelectedWs] = useState<string>("all");
  const [selectedInit, setSelectedInit] = useState<string>("all");
  const [hideIdeal, setHideIdeal] = useState(false);
  const today = getCurrentMonth();

  /* ── Workstream delivery metrics ── */
  const wsDeliveryData = useMemo(() => {
    return workstreams.map((ws) => {
      const totalPts = ws.initiatives.reduce((s, i) => s + getInitiativePoints(i), 0);
      const completedPts = ws.initiatives.reduce((s, i) => s + getCompletedPoints(i), 0);
      const actualPct = totalPts > 0 ? Math.round((completedPts / totalPts) * 100) : 0;

      const starts = ws.initiatives.map(i => i.plannedStartMonth).filter(Boolean) as string[];
      const ends = ws.initiatives.map(i => i.plannedEndMonth).filter(Boolean) as string[];
      const endDate = parseTargetDate(ws.targetCompletionDate) ||
        (ends.length > 0 ? ends.sort().pop()! : "2027-11");
      const earliestStart = starts.length > 0 ? starts.sort()[0] : "2025-12";

      const totalDuration = monthToNum(endDate) - monthToNum(earliestStart);
      const elapsed = monthToNum(today) - monthToNum(earliestStart);
      const expectedPct = totalDuration > 0
        ? Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)))
        : 0;

      return {
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        color: ws.color || "#888",
        totalPts,
        completedPts,
        actualPct,
        expectedPct,
        delta: actualPct - expectedPct,
        startMonth: earliestStart,
        endMonth: endDate,
      };
    });
  }, [workstreams, today]);

  /* ── Filtered data ── */
  const filteredWs = useMemo(() => {
    if (selectedWs === "all") return workstreams;
    return workstreams.filter(ws => ws.id === selectedWs);
  }, [selectedWs, workstreams]);

  const filteredInits = useMemo(() => {
    const inits = filteredWs.flatMap(ws =>
      ws.initiatives.map(i => ({ ...i, wsName: ws.name, wsColor: ws.color, wsSlug: ws.slug }))
    );
    if (selectedInit === "all") return inits;
    return inits.filter(i => i.id === selectedInit);
  }, [filteredWs, selectedInit]);

  const availableInits = useMemo(() => {
    return filteredWs.flatMap(ws =>
      ws.initiatives.map(i => ({ id: i.id, name: i.name, wsName: ws.name }))
    );
  }, [filteredWs]);

  /* ── Main burndown chart data (3-line: ideal, remainingEffort, totalRemaining) ── */
  const burndownChart = useMemo(() => {
    if (selectedInit !== "all" && filteredInits.length === 1) {
      const init = filteredInits[0];
      const origPts = getOriginalPoints(init);
      const addedPts = getAddedPoints(init);
      const completedOrig = getCompletedOriginalPoints(init);
      const completedAdd = getCompletedAddedPoints(init);
      return {
        title: init.name,
        data: buildBurndownData(origPts, addedPts, completedOrig, completedAdd, init.plannedStartMonth || "2025-12", init.plannedEndMonth || "2028-11"),
        totalPts: origPts + addedPts,
        originalPts: origPts,
        addedPts,
        completedPts: completedOrig + completedAdd,
        remaining: (origPts + addedPts) - (completedOrig + completedAdd),
      };
    }

    if (selectedWs !== "all" && filteredWs.length === 1) {
      const ws = filteredWs[0];
      const origPts = ws.initiatives.reduce((s, i) => s + getOriginalPoints(i), 0);
      const addedPts = ws.initiatives.reduce((s, i) => s + getAddedPoints(i), 0);
      const completedOrig = ws.initiatives.reduce((s, i) => s + getCompletedOriginalPoints(i), 0);
      const completedAdd = ws.initiatives.reduce((s, i) => s + getCompletedAddedPoints(i), 0);
      const d = wsDeliveryData.find(x => x.slug === ws.slug);
      return {
        title: ws.name,
        data: buildBurndownData(origPts, addedPts, completedOrig, completedAdd, d?.startMonth || "2025-12", d?.endMonth || "2027-11"),
        totalPts: origPts + addedPts,
        originalPts: origPts,
        addedPts,
        completedPts: completedOrig + completedAdd,
        remaining: (origPts + addedPts) - (completedOrig + completedAdd),
      };
    }

    const origPts = workstreams.reduce((s, ws) => s + ws.initiatives.reduce((si, i) => si + getOriginalPoints(i), 0), 0);
    const addedPts = workstreams.reduce((s, ws) => s + ws.initiatives.reduce((si, i) => si + getAddedPoints(i), 0), 0);
    const completedOrig = workstreams.reduce((s, ws) => s + ws.initiatives.reduce((si, i) => si + getCompletedOriginalPoints(i), 0), 0);
    const completedAdd = workstreams.reduce((s, ws) => s + ws.initiatives.reduce((si, i) => si + getCompletedAddedPoints(i), 0), 0);
    return {
      title: "Project Neuron — All Workstreams",
      data: buildBurndownData(origPts, addedPts, completedOrig, completedAdd, "2025-12", "2028-11"),
      totalPts: origPts + addedPts,
      originalPts: origPts,
      addedPts,
      completedPts: completedOrig + completedAdd,
      remaining: (origPts + addedPts) - (completedOrig + completedAdd),
    };
  }, [selectedInit, selectedWs, filteredInits, filteredWs, workstreams, wsDeliveryData]);

  /* ── Program totals ── */
  const programTotalPts = workstreams.reduce(
    (s, ws) => s + ws.initiatives.reduce((si, i) => si + getInitiativePoints(i), 0), 0
  );
  const programCompletedPts = workstreams.reduce(
    (s, ws) => s + ws.initiatives.reduce((si, i) => si + getCompletedPoints(i), 0), 0
  );
  const programPct = programTotalPts > 0 ? Math.round((programCompletedPts / programTotalPts) * 100) : 0;

  /* ── Schedule status ── */
  const todayData = burndownChart.data.find(d => d.isToday);
  const scheduleStatus = todayData && todayData.remainingEffort !== null
    ? {
        ahead: todayData.remainingEffort <= todayData.ideal,
        diff: Math.abs(todayData.remainingEffort - todayData.ideal),
        actual: todayData.remainingEffort,
        ideal: todayData.ideal,
      }
    : null;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-3xl font-bold">📉 Burndown</h1>
        <p className="text-muted-foreground mt-1">
          Ideal vs actual remaining effort — track schedule adherence
        </p>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground">Total Points</p>
            <p className="text-3xl font-bold">{programTotalPts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-3xl font-bold text-green-600">{programCompletedPts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground">Remaining</p>
            <p className="text-3xl font-bold text-orange-500">{programTotalPts - programCompletedPts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground">Added Scope</p>
            <p className="text-3xl font-bold text-purple-600">{burndownChart.addedPts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground">Overall Progress</p>
            <p className="text-3xl font-bold">{programPct}%</p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-green-500"
                style={{ width: `${programPct}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Workstream Expected vs Actual Delivery ── */}
      <Card>
        <CardHeader>
          <CardTitle>Workstream Delivery — Expected vs Actual %</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Expected % based on linear time elapsed from start to target end date
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {wsDeliveryData.map((ws) => (
            <div key={ws.slug} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ws.color }} />
                  <span className="font-medium">{ws.name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground font-mono">{ws.completedPts}/{ws.totalPts} pts</span>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] ${ws.delta >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                  >
                    {ws.delta >= 0 ? "Ahead" : "Behind"} ({ws.delta > 0 ? "+" : ""}{ws.delta}%)
                  </Badge>
                </div>
              </div>
              <div className="relative h-7 bg-gray-100 rounded-full overflow-hidden">
                {/* Expected (grey background) */}
                <div
                  className="absolute inset-y-0 left-0 bg-gray-300/60 rounded-full"
                  style={{ width: `${Math.max(ws.expectedPct, 1)}%` }}
                />
                {/* Actual (colored) */}
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ width: `${Math.max(ws.actualPct, 0.5)}%`, backgroundColor: ws.color, opacity: 0.85 }}
                />
                {/* Expected marker line */}
                {ws.expectedPct > 0 && ws.expectedPct < 100 && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-gray-700 z-10"
                    style={{ left: `${ws.expectedPct}%` }}
                  >
                    <span className="absolute -top-5 -translate-x-1/2 text-[9px] text-gray-500 whitespace-nowrap">
                      {ws.expectedPct}% expected
                    </span>
                  </div>
                )}
                {/* Labels inside bar */}
                <div className="absolute inset-0 flex items-center px-3 text-[10px] font-bold z-20">
                  <span className={ws.actualPct > 8 ? "text-white drop-shadow" : "text-gray-700"}>
                    {ws.actualPct}% delivered
                  </span>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── Main Burndown Chart ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle>{burndownChart.title} — Burndown</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Blue = ideal · Orange = remaining effort · Purple = total points
              </p>
            </div>
            <div className="flex gap-3 items-center flex-wrap">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Workstream</label>
                <Select
                  className="h-9 text-sm w-52"
                  value={selectedWs}
                  onChange={(e) => { setSelectedWs(e.target.value); setSelectedInit("all"); }}
                >
                  <option value="all">All Workstreams</option>
                  {workstreams.map(ws => (
                    <option key={ws.id} value={ws.id}>{ws.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Initiative</label>
                <Select
                  className="h-9 text-sm w-52"
                  value={selectedInit}
                  onChange={(e) => setSelectedInit(e.target.value)}
                >
                  <option value="all">All ({availableInits.length})</option>
                  {availableInits.map(i => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </Select>
              </div>
              <div className="flex items-end pb-0.5">
                <Button
                  variant={hideIdeal ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-9"
                  onClick={() => setHideIdeal(!hideIdeal)}
                >
                  {hideIdeal ? "Show" : "Hide"} Ideal Line
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats row */}
          <div className="mb-4 flex items-center gap-6 text-sm flex-wrap">
            <div>
              <span className="text-muted-foreground">Original: </span>
              <span className="font-bold">{burndownChart.originalPts} pts</span>
            </div>
            <div>
              <span className="text-purple-600">Added: </span>
              <span className="font-bold text-purple-600">{burndownChart.addedPts} pts</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total: </span>
              <span className="font-bold">{burndownChart.totalPts} pts</span>
            </div>
            <div>
              <span className="text-muted-foreground">Completed: </span>
              <span className="font-bold text-green-600">{burndownChart.completedPts} pts</span>
            </div>
            <div>
              <span className="text-muted-foreground">Remaining: </span>
              <span className="font-bold text-orange-500">{burndownChart.remaining} pts</span>
            </div>
          </div>

          {/* Line Chart */}
          {burndownChart.data.length >= 2 ? (
            <ResponsiveContainer width="100%" height={420}>
              <LineChart data={burndownChart.data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11 }}
                  interval={Math.max(0, Math.floor(burndownChart.data.length / 14))}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  label={{ value: "Remaining Effort (pts)", angle: -90, position: "insideLeft", offset: -5, style: { fontSize: 12 } }}
                />
                <Tooltip content={<BurndownTooltip />} />
                <Legend formatter={legendFormatter} />
                {/* Today marker */}
                {burndownChart.data.some(d => d.isToday) && (
                  <ReferenceLine
                    x={burndownChart.data.find(d => d.isToday)?.month}
                    stroke="#666"
                    strokeDasharray="4 4"
                    label={{ value: "Today", position: "top", fontSize: 11, fill: "#666" }}
                  />
                )}
                {!hideIdeal && (
                  <Line
                    type="monotone"
                    dataKey="ideal"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ r: 3, fill: "#3b82f6", strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                    name="ideal"
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="remainingEffort"
                  stroke="#f97316"
                  strokeWidth={3}
                  dot={{ r: 3, fill: "#f97316", strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  name="remainingEffort"
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="totalRemaining"
                  stroke="#a855f7"
                  strokeWidth={3}
                  dot={{ r: 3, fill: "#a855f7", strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  name="totalRemaining"
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-12">
              Insufficient date range for burndown chart.
            </p>
          )}

          {/* Behind/Ahead banner */}
          {scheduleStatus && (
            <div className={`mt-4 p-4 rounded-lg border ${
              scheduleStatus.ahead
                ? "bg-green-50 border-green-200"
                : "bg-orange-50 border-orange-200"
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-xl">{scheduleStatus.ahead ? "✅" : "⚠️"}</span>
                <div>
                  <p className={`font-semibold ${scheduleStatus.ahead ? "text-green-700" : "text-orange-700"}`}>
                    {scheduleStatus.ahead ? "Ahead of Schedule" : "Behind Schedule"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {scheduleStatus.diff} pts {scheduleStatus.ahead ? "ahead of" : "behind"} ideal
                    {" "}({scheduleStatus.actual} actual vs {scheduleStatus.ideal} ideal remaining)
                    {burndownChart.addedPts > 0 && (
                      <span className="text-purple-600 ml-1">
                        · {burndownChart.addedPts} pts of added scope
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Per-Initiative Mini Burndowns (when workstream selected) ── */}
      {selectedWs !== "all" && selectedInit === "all" && filteredInits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Initiative Burndowns</CardTitle>
            <p className="text-xs text-muted-foreground">
              Individual burndown for each initiative — purple line = total points (original + added)
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredInits.map((init) => {
                const origPts = getOriginalPoints(init);
                const addedPts = getAddedPoints(init);
                const completedOrig = getCompletedOriginalPoints(init);
                const completedAdd = getCompletedAddedPoints(init);
                const totalPts = origPts + addedPts;
                const completedAll = completedOrig + completedAdd;
                const start = init.plannedStartMonth || "2025-12";
                const end = init.plannedEndMonth || "2028-11";
                const data = buildBurndownData(origPts, addedPts, completedOrig, completedAdd, start, end);
                const pct = totalPts > 0 ? Math.round((completedAll / totalPts) * 100) : 0;

                const td = data.find(d => d.isToday);
                const isAhead = td && td.remainingEffort !== null ? td.remainingEffort <= td.ideal : true;

                return (
                  <div key={init.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-sm">{init.name}</h4>
                        <p className="text-[10px] text-muted-foreground">
                          {start} → {end} · {init.ownerInitials || "—"} · {totalPts} pts
                          {addedPts > 0 && <span className="text-purple-600"> (+{addedPts} added)</span>}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{pct}%</p>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] ${isAhead ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}
                        >
                          {isAhead ? "Ahead" : "Behind"}
                        </Badge>
                      </div>
                    </div>

                    {data.length >= 2 ? (
                      <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="month"
                            tick={{ fontSize: 9 }}
                            interval={Math.max(0, Math.floor(data.length / 6))}
                          />
                          <YAxis tick={{ fontSize: 9 }} />
                          {data.some(d => d.isToday) && (
                            <ReferenceLine
                              x={data.find(d => d.isToday)?.month}
                              stroke="#999"
                              strokeDasharray="3 3"
                            />
                          )}
                          {!hideIdeal && <Line type="monotone" dataKey="ideal" stroke="#3b82f6" strokeWidth={2} dot={false} />}
                          <Line type="monotone" dataKey="remainingEffort" stroke="#f97316" strokeWidth={2} dot={false} connectNulls={false} />
                          <Line type="monotone" dataKey="totalRemaining" stroke="#a855f7" strokeWidth={2} dot={false} connectNulls={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-8">
                        Insufficient date range
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Initiative Details Table ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Initiative Details ({filteredInits.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-semibold">Initiative</th>
                  <th className="pb-2 font-semibold text-center">Points</th>
                  <th className="pb-2 font-semibold text-center">Added</th>
                  <th className="pb-2 font-semibold text-center">Done</th>
                  <th className="pb-2 font-semibold text-center">%</th>
                  <th className="pb-2 font-semibold text-center">Owner</th>
                  <th className="pb-2 font-semibold">Status</th>
                  <th className="pb-2 font-semibold text-center">Schedule</th>
                  <th className="pb-2 font-semibold">Progress</th>
                </tr>
              </thead>
              <tbody>
                {filteredInits.map((init) => {
                  const pts = getInitiativePoints(init);
                  const completed = getCompletedPoints(init);
                  const added = getAddedPoints(init);
                  const pct = pts > 0 ? Math.round((completed / pts) * 100) : 0;

                  const start = init.plannedStartMonth || "2025-12";
                  const end = init.plannedEndMonth || "2028-11";
                  const totalDuration = monthToNum(end) - monthToNum(start);
                  const elapsed = monthToNum(today) - monthToNum(start);
                  const expectedPct = totalDuration > 0
                    ? Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)))
                    : 0;
                  const delta = pct - expectedPct;

                  return (
                    <tr key={init.id} className="border-b last:border-0 hover:bg-accent/30">
                      <td className="py-2.5 pr-2">
                        <div className="font-medium">{init.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {(init as any).wsName}
                          {init.subTasks.length > 0 && ` · ${init.subTasks.length} sub-tasks`}
                        </div>
                      </td>
                      <td className="py-2.5 text-center font-mono">{pts}</td>
                      <td className="py-2.5 text-center font-mono text-purple-600">{added > 0 ? `+${added}` : "—"}</td>
                      <td className="py-2.5 text-center font-mono text-green-600">{completed}</td>
                      <td className="py-2.5 text-center font-bold">{pct}%</td>
                      <td className="py-2.5 text-center text-xs font-medium">{init.ownerInitials || "—"}</td>
                      <td className="py-2.5">
                        <Badge
                          variant="secondary"
                          className="text-[10px]"
                          style={{ backgroundColor: STATUS_COLORS[init.status] + "20", color: STATUS_COLORS[init.status] }}
                        >
                          {init.status.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-center">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] ${delta >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                        >
                          {delta >= 0 ? "+" : ""}{delta}%
                        </Badge>
                      </td>
                      <td className="py-2.5 w-32">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#22c55e" : "#3b82f6" }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
