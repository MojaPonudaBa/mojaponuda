"use client";

import { formatCurrencyKM } from "@/lib/currency";
import {
  Cell,
  Pie,
  PieChart,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface CategoryChartProps {
  data: { category: string; count: number; total_value: number }[];
}

const COLORS = ["#3b82f6", "#06b6d4", "#8b5cf6", "#f59e0b", "#10b981"];

export function CategoryChart({ data }: CategoryChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm font-medium text-slate-400">
          Nema podataka za prikaz.
        </p>
      </div>
    );
  }

  return (
    <div className="grid h-full gap-4 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-center">
      <ResponsiveContainer width="100%" height="100%" minHeight={280}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="category"
            innerRadius={72}
            outerRadius={112}
            paddingAngle={3}
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, _name, item) => {
              const payload = item?.payload as { category: string; count: number; total_value: number } | undefined;

              return [`${String(value ?? "0")} ugovora · ${formatCurrencyKM(payload?.total_value ?? 0)}`, payload?.category ?? "Kategorija"];
            }}
            contentStyle={{
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              fontSize: "12px",
              boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-2">
        {data.map((entry, index) => (
          <div key={entry.category} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex size-2.5 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <p className="text-sm font-semibold text-slate-900">{entry.category}</p>
            </div>
            <p className="mt-1 text-xs text-slate-500">{entry.count} ugovora · {formatCurrencyKM(entry.total_value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
