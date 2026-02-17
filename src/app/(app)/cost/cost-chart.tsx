"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface CostChartProps {
  entries: Array<{ date: string | Date; amount: number; costType: string }>;
  laborCosts: Array<{ date: string | Date; amount: number }>;
}

export function CostChart({ entries, laborCosts }: CostChartProps) {
  // Group by month
  const monthMap: Record<string, { direct: number; labor: number }> = {};

  entries.forEach((e) => {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthMap[key]) monthMap[key] = { direct: 0, labor: 0 };
    monthMap[key].direct += e.amount;
  });

  laborCosts.forEach((e) => {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthMap[key]) monthMap[key] = { direct: 0, labor: 0 };
    monthMap[key].labor += e.amount;
  });

  const data = Object.entries(monthMap)
    .sort()
    .map(([month, vals]) => ({
      month,
      direct: Math.round(vals.direct),
      labor: Math.round(vals.labor),
    }));

  if (data.length === 0) return null;

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" fontSize={12} />
          <YAxis fontSize={12} />
          <Tooltip />
          <Legend />
          <Bar dataKey="direct" fill="hsl(222.2, 47.4%, 11.2%)" name="Direct Costs" />
          <Bar dataKey="labor" fill="hsl(215.4, 16.3%, 66.9%)" name="Labor Costs" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

