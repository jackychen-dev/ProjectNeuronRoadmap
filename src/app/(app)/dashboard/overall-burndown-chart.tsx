"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentPeriod, getMonthlyPeriods, parseTargetMonth, type BurnPeriod } from "@/lib/burn-periods";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";

interface BurnSnapshotData {
  id: string; programId: string; date: string;
  totalPoints: number; completedPoints: number; percentComplete: number;
}

interface ProgramRef {
  id: string; name: string; fyStartYear: number; fyEndYear: number;
  startDate: string | null; targetDate: string | null;
}

interface WorkstreamRef {
  id: string; targetCompletionDate: string | null;
  initiatives: { subTasks: { points: number; completionPercent: number }[] }[];
}

interface ChartPoint {
  label: string; remaining: number | null; ideal: number; scopeLine: number; isCurrent: boolean;
}

function buildTimeline(program: ProgramRef, workstreams: WorkstreamRef[]): BurnPeriod[] {
  let startYear = 2000 + program.fyStartYear;
  let startMonth = 1;
  if (program.startDate) {
    const d = new Date(program.startDate);
    startYear = d.getFullYear();
    startMonth = d.getMonth() + 1;
  }
  let endYear = 2000 + program.fyEndYear;
  let endMonth = 11;
  for (const ws of workstreams) {
    const parsed = parseTargetMonth(ws.targetCompletionDate);
    if (parsed && (parsed.year > endYear || (parsed.year === endYear && parsed.month > endMonth))) {
      endYear = parsed.year;
      endMonth = parsed.month;
    }
  }
  if (program.targetDate) {
    const d = new Date(program.targetDate);
    endYear = d.getFullYear();
    endMonth = d.getMonth() + 1;
  }
  return getMonthlyPeriods(startYear, startMonth, endYear, endMonth);
}

export default function OverallBurndownChart({
  programs, workstreams, snapshots,
}: {
  programs: ProgramRef[];
  workstreams: WorkstreamRef[];
  snapshots: BurnSnapshotData[];
}) {
  const currentPeriod = useMemo(() => getCurrentPeriod(), []);
  const activeProgram = programs[0];

  const programTotalPts = workstreams.reduce(
    (s, ws) => s + ws.initiatives.reduce(
      (si, i) => si + i.subTasks.reduce((st, t) => st + t.points, 0), 0), 0);
  const programCompletedPts = workstreams.reduce(
    (s, ws) => s + ws.initiatives.reduce(
      (si, i) => si + i.subTasks.reduce((st, t) => st + Math.round(t.points * (t.completionPercent / 100)), 0), 0), 0);

  const chartData = useMemo(() => {
    if (!activeProgram) return [];
    const allPeriods = buildTimeline(activeProgram, workstreams);
    const totalPeriods = allPeriods.length;
    const lastIdx = totalPeriods - 1 || 1;
    const startTotal = programTotalPts;

    const byDate = new Map<string, { totalPoints: number; completedPoints: number }>();
    for (const snap of snapshots.filter(s => s.programId === activeProgram.id)) {
      const e = byDate.get(snap.date) || { totalPoints: 0, completedPoints: 0 };
      e.totalPoints += snap.totalPoints;
      e.completedPoints += snap.completedPoints;
      byDate.set(snap.date, e);
    }

    const scopeRaw: number[] = [];
    let lastScope = startTotal;
    for (const p of allPeriods) {
      const snap = byDate.get(p.dateKey);
      const isCurrent = p.dateKey === currentPeriod.dateKey;
      if (snap) lastScope = snap.totalPoints;
      else if (isCurrent) lastScope = programTotalPts;
      scopeRaw.push(lastScope);
    }

    return allPeriods.map((period, idx): ChartPoint => {
      const snap = byDate.get(period.dateKey);
      const isCurrent = period.dateKey === currentPeriod.dateKey;
      const ideal = Math.max(0, Math.round(startTotal * (1 - idx / lastIdx)));
      const scopeLine = Math.max(0, Math.round(scopeRaw[idx] * (1 - idx / lastIdx)));

      let remaining: number | null = null;
      if (idx === 0) remaining = snap ? snap.totalPoints - snap.completedPoints : scopeRaw[idx];
      else if (snap) remaining = snap.totalPoints - snap.completedPoints;
      else if (isCurrent) remaining = programTotalPts - programCompletedPts;

      return { label: period.shortLabel, remaining, ideal, scopeLine, isCurrent };
    });
  }, [activeProgram, workstreams, snapshots, currentPeriod, programTotalPts, programCompletedPts]);

  if (chartData.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Overall Burndown</CardTitle>
        <p className="text-xs text-muted-foreground">
          Purple = scope-adjusted · Blue = ideal · Orange = remaining
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 10, right: 15, left: 5, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={0} angle={-45} textAnchor="end" height={55} />
            <YAxis tick={{ fontSize: 10 }} width={35} />
            <Tooltip />
            <Legend />
            {chartData.some(d => d.isCurrent) && (
              <ReferenceLine x={chartData.find(d => d.isCurrent)?.label} stroke="#f97316" strokeDasharray="4 4" label={{ value: "Now", position: "top", fontSize: 9, fill: "#f97316" }} />
            )}
            <Line type="monotone" dataKey="scopeLine" stroke="#a855f7" strokeWidth={2} dot={{ r: 1.5, fill: "#a855f7", strokeWidth: 0 }} name="Scope Adjusted" />
            <Line type="monotone" dataKey="ideal" stroke="#3b82f6" strokeWidth={2} dot={{ r: 1.5, fill: "#3b82f6", strokeWidth: 0 }} name="Ideal" strokeDasharray="5 5" />
            <Line type="monotone" dataKey="remaining" stroke="#f97316" strokeWidth={3} dot={(props: any) => {
              const { cx, cy, payload } = props;
              if (payload?.remaining === null || payload?.remaining === undefined) return <g />;
              return <circle cx={cx} cy={cy} r={2.5} fill="#f97316" />;
            }} name="Remaining" connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
