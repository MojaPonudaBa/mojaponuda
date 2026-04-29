"use client";

import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";

import { cn } from "@/lib/utils";

export interface StatTrend {
  value: number;
  label?: string;
  direction?: "up" | "down" | "neutral";
}

export interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  iconColor?: "blue" | "green" | "amber" | "purple" | "cyan" | "rose";
  trend?: StatTrend;
  chartData?: Array<{ value: number; label?: string }>;
  className?: string;
}

const iconColorConfig = {
  blue: "bg-[var(--primary-soft)] text-[var(--primary-strong)]",
  green: "bg-[var(--success-soft)] text-[var(--success-strong)]",
  amber: "bg-[var(--warning-soft)] text-[var(--warning-strong)]",
  purple: "bg-[var(--accent-ai-soft)] text-[var(--accent-ai-strong)]",
  cyan: "bg-[var(--info-soft)] text-[var(--info-strong)]",
  rose: "bg-[var(--danger-soft)] text-[var(--danger-strong)]",
};

function getTrendDirection(trend: StatTrend) {
  if (trend.direction) return trend.direction;
  if (trend.value > 0) return "up";
  if (trend.value < 0) return "down";
  return "neutral";
}

function getTrendClasses(direction: "up" | "down" | "neutral") {
  if (direction === "up") return "text-[var(--success-strong)]";
  if (direction === "down") return "text-[var(--danger-strong)]";
  return "text-[var(--text-secondary)]";
}

/**
 * Displays a dashboard KPI with optional trend metadata and a compact sparkline.
 */
export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  iconColor = "blue",
  trend,
  chartData,
  className,
}: StatCardProps) {
  const direction = trend ? getTrendDirection(trend) : "neutral";
  const TrendIcon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;
  const normalizedChartData = chartData?.map((point, index) => ({
    name: point.label ?? `${index + 1}`,
    value: point.value,
  }));

  return (
    <article
      className={cn(
        "rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-1)] p-5 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-[var(--text-secondary)]">{title}</p>
          <p className="truncate text-2xl font-semibold tracking-normal text-[var(--text-primary)]">
            {value}
          </p>
        </div>
        {Icon && (
          <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-input)]", iconColorConfig[iconColor])}>
            <Icon className="size-5" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div className="min-w-0 space-y-1">
          {trend && (
            <div className={cn("inline-flex items-center gap-1 text-sm font-medium", getTrendClasses(direction))}>
              <TrendIcon className="size-4" aria-hidden="true" />
              <span>{Math.abs(trend.value)}%</span>
              {trend.label && <span className="font-normal text-[var(--text-tertiary)]">{trend.label}</span>}
            </div>
          )}
          {description && <p className="text-xs text-[var(--text-tertiary)]">{description}</p>}
        </div>

        {normalizedChartData && normalizedChartData.length > 1 && (
          <div className="h-12 w-24 shrink-0" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={normalizedChartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={`stat-card-gradient-${title.replace(/\W+/g, "-")}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <RechartsTooltip cursor={false} content={() => null} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill={`url(#stat-card-gradient-${title.replace(/\W+/g, "-")})`}
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </article>
  );
}

