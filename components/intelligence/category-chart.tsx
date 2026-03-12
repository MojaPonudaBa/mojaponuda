"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface CategoryChartProps {
  data: { category: string; count: number; total_value: number }[];
}

const COLORS = ["#3b82f6", "#22d3ee", "#a78bfa", "#f59e0b", "#10b981"];

export function CategoryChart({ data }: CategoryChartProps) {
  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Nema podataka za prikaz.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <XAxis
          dataKey="category"
          tick={{ fill: "#94a3b8", fontSize: 12 }}
          axisLine={{ stroke: "#1e3a5f" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#111d33",
            border: "1px solid #1e3a5f",
            borderRadius: 6,
            fontSize: 12,
          }}
          labelStyle={{ color: "#e8ecf1" }}
          itemStyle={{ color: "#94a3b8" }}
          formatter={(value) => [String(value), "Tendera"]}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
