"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";

import { cn } from "@/lib/utils";

export interface DonutChartDatum {
  name: string;
  value: number;
  color?: string;
}

export interface DonutChartProps {
  data: DonutChartDatum[];
  centerLabel?: string;
  centerValue?: string | number;
  height?: number;
  showLegend?: boolean;
  className?: string;
  valueSuffix?: string;
}

const defaultColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

/**
 * Renders a responsive dashboard donut chart with optional center summary text.
 */
export function DonutChart({
  data,
  centerLabel,
  centerValue,
  height = 260,
  showLegend = true,
  className,
  valueSuffix,
}: DonutChartProps) {
  const chartData = data.map((item, index) => ({
    ...item,
    fill: item.color ?? defaultColors[index % defaultColors.length],
  }));

  if (chartData.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-1)] text-sm text-[var(--text-secondary)]",
          className,
        )}
        style={{ height }}
      >
        Nema podataka
      </div>
    );
  }

  return (
    <div className={cn("relative w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius="58%"
            outerRadius="82%"
            paddingAngle={3}
            stroke="var(--surface-1)"
            strokeWidth={3}
            isAnimationActive={false}
          >
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Pie>
          <RechartsTooltip
            cursor={false}
            formatter={(value) => [
              `${Number(value).toLocaleString("bs-BA")}${valueSuffix ? ` ${valueSuffix}` : ""}`,
              "Vrijednost",
            ]}
            contentStyle={{
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-input)",
              boxShadow: "var(--shadow-card)",
              fontSize: 12,
            }}
          />
          {showLegend && (
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              wrapperStyle={{ fontSize: 12, color: "var(--text-secondary)" }}
            />
          )}
        </PieChart>
      </ResponsiveContainer>

      {(centerValue !== undefined || centerLabel) && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            {centerValue !== undefined && (
              <div className="text-2xl font-semibold text-[var(--text-primary)]">{centerValue}</div>
            )}
            {centerLabel && <div className="text-xs font-medium text-[var(--text-tertiary)]">{centerLabel}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
