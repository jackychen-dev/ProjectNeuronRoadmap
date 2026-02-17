"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface BurndownChartProps {
  snapshots: Array<{
    date: string | Date;
    remainingWork: number;
    totalWork?: number | null;
  }>;
}

export function BurndownChart({ snapshots }: BurndownChartProps) {
  const data = snapshots.map((s) => ({
    date: new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    remaining: s.remainingWork,
    total: s.totalWork || undefined,
  }));

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" fontSize={12} />
          <YAxis fontSize={12} />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="remaining"
            stroke="hsl(222.2, 47.4%, 11.2%)"
            strokeWidth={2}
            name="Remaining Work"
          />
          {data.some((d) => d.total !== undefined) && (
            <Line
              type="monotone"
              dataKey="total"
              stroke="hsl(215.4, 16.3%, 76.9%)"
              strokeWidth={1}
              strokeDasharray="5 5"
              name="Total Work"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

