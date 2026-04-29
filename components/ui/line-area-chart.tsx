"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/utils";

export interface LineAreaChartSeries {
  key: string;
  name: string;
  color?: string;
}

export interface LineAreaChartProps {
  data: Array<Record<string, string | number | null | undefined>>;
  series: LineAreaChartSeries[];
  xKey?: string;
  height?: number;
  showLegend?: boolean;
  className?: string;
}

const defaultColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

function formatShortNumber(value: number) {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return `${value}`;
}

/**
 * Renders one or more dashboard time-series as filled line area charts.
 */
export function LineAreaChart({
  data,
  series,
  xKey = "name",
  height = 280,
  showLegend = true,
  className,
}: LineAreaChartProps) {
  if (data.length === 0 || series.length === 0) {
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
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 18, bottom: 0, left: 0 }}>
          <defs>
            {series.map((item, index) => {
              const color = item.color ?? defaultColors[index % defaultColors.length];
              return (
                <linearGradient key={item.key} id={`line-area-${item.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.26} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              );
            })}
          </defs>
          <CartesianGrid stroke="var(--border-default)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey={xKey}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--text-tertiary)", fontSize: 12 }}
            dy={8}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--text-tertiary)", fontSize: 12 }}
            width={44}
            tickFormatter={(value) => formatShortNumber(Number(value))}
          />
          <RechartsTooltip
            formatter={(value, name) => [formatShortNumber(Number(value)), name]}
            contentStyle={{
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-input)",
              boxShadow: "var(--shadow-card)",
              fontSize: 12,
            }}
          />
          {showLegend && (
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ fontSize: 12, color: "var(--text-secondary)" }}
            />
          )}
          {series.map((item, index) => {
            const color = item.color ?? defaultColors[index % defaultColors.length];
            return (
              <Area
                key={item.key}
                type="monotone"
                dataKey={item.key}
                name={item.name}
                stroke={color}
                strokeWidth={2}
                fill={`url(#line-area-${item.key})`}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

