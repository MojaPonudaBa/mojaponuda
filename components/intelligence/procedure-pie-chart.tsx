"use client";

import { formatCurrencyKM } from "@/lib/currency";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { MarketProcedureInsight } from "@/lib/market-intelligence";

interface ProcedurePieChartProps {
  data: MarketProcedureInsight[];
}

const COLORS = ["#2563eb", "#0ea5e9", "#0f766e", "#7c3aed", "#d97706", "#14b8a6"];

export function ProcedurePieChart({ data }: ProcedurePieChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm font-medium text-slate-400">Nema podataka za prikaz.</p>
      </div>
    );
  }

  return (
    <div className="grid h-full gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
      <ResponsiveContainer width="100%" height="100%" minHeight={280}>
        <PieChart>
          <Pie
            data={data}
            dataKey="total_value"
            nameKey="procedure_type"
            innerRadius={68}
            outerRadius={104}
            paddingAngle={3}
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={entry.procedure_type} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, _name, item) => [
              formatCurrencyKM(Number(value) || 0),
              item?.payload?.procedure_type ?? "Postupak",
            ]}
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
          <div key={entry.procedure_type} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex size-2.5 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <p className="text-sm font-semibold text-slate-900">{entry.procedure_type}</p>
            </div>
            <p className="mt-1 text-xs text-slate-500">{entry.count} ugovora · {formatCurrencyKM(entry.total_value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
