"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentPeriod } from "@/lib/burn-periods";
import {
  buildTimeline,
  buildChartData,
  buildOverallSnapshotByDate,
  type ProgramRef,
  type ChartPoint,
  type BurnSnapshotForChart,
} from "@/lib/burndown-chart-data";
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

interface SubTaskRef {
  points: number;
  completionPercent: number;
  isAddedScope?: boolean;
  assignedOrganization?: string | null;
}

interface WorkstreamRef {
  id: string;
  targetCompletionDate: string | null;
  initiatives: { subTasks: SubTaskRef[] }[];
}

function stBasePoints(st: SubTaskRef): number {
  return st.isAddedScope ? 0 : st.points;
}

function stScopePoints(st: SubTaskRef): number {
  return st.points;
}

function stCompletedPts(st: SubTaskRef): number {
  return Math.round(st.points * (st.completionPercent / 100));
}

export default function OverallBurndownChart({
  programs,
  workstreams,
  snapshots,
}: {
  programs: ProgramRef[];
  workstreams: WorkstreamRef[];
  snapshots: BurnSnapshotForChart[];
}) {
  const currentPeriod = useMemo(() => getCurrentPeriod(), []);
  const activeProgram = programs[0];

  // Same live totals as Burndown page (orgFilter "all" = no filtering)
  const { programBasePts, programScopePts, programCompletedPts } = useMemo(() => {
    let base = 0,
      scope = 0,
      completed = 0;
    for (const ws of workstreams) {
      for (const init of ws.initiatives) {
        for (const t of init.subTasks) {
          base += stBasePoints(t);
          scope += stScopePoints(t);
          completed += stCompletedPts(t);
        }
      }
    }
    return { programBasePts: base, programScopePts: scope, programCompletedPts: completed };
  }, [workstreams]);

  const chartData = useMemo((): ChartPoint[] => {
    if (!activeProgram) return [];
    const allPeriods = buildTimeline(activeProgram, workstreams);
    const byDate = buildOverallSnapshotByDate(snapshots, activeProgram.id);
    return buildChartData(
      allPeriods,
      byDate,
      programBasePts,
      programScopePts - programCompletedPts,
      programScopePts,
      currentPeriod
    );
  }, [
    activeProgram,
    workstreams,
    snapshots,
    currentPeriod,
    programBasePts,
    programScopePts,
    programCompletedPts,
  ]);

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
            {chartData.some((d) => d.isCurrent) && (
              <ReferenceLine
                x={chartData.find((d) => d.isCurrent)?.label}
                stroke="#f97316"
                strokeDasharray="4 4"
                label={{ value: "Now", position: "top", fontSize: 9, fill: "#f97316" }}
              />
            )}
            <Line
              type="monotone"
              dataKey="scopeLine"
              stroke="#a855f7"
              strokeWidth={2}
              dot={{ r: 1.5, fill: "#a855f7", strokeWidth: 0 }}
              name="Scope Adjusted"
            />
            <Line
              type="monotone"
              dataKey="ideal"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 1.5, fill: "#3b82f6", strokeWidth: 0 }}
              name="Ideal"
              strokeDasharray="5 5"
            />
            <Line
              type="monotone"
              dataKey="remaining"
              stroke="#f97316"
              strokeWidth={3}
              dot={(props: { cx?: number; cy?: number; payload?: ChartPoint }) => {
                const { cx, cy, payload } = props;
                if (payload?.remaining === null || payload?.remaining === undefined) return <g />;
                return <circle cx={cx} cy={cy} r={2.5} fill="#f97316" />;
              }}
              name="Remaining"
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
