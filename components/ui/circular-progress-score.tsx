import { cn } from "@/lib/utils";

export interface CircularProgressScoreProps {
  score: number;
  size?: "sm" | "md" | "lg" | "xl";
  showLabel?: boolean;
  label?: string;
  className?: string;
}

const sizeConfig = {
  sm: { wrapper: "h-14 w-14", radius: 22, stroke: 4, font: "text-sm" },
  md: { wrapper: "h-20 w-20", radius: 32, stroke: 6, font: "text-xl" },
  lg: { wrapper: "h-28 w-28", radius: 44, stroke: 8, font: "text-3xl" },
  xl: { wrapper: "h-36 w-36", radius: 56, stroke: 10, font: "text-4xl" },
};

function getScoreColor(score: number) {
  if (score >= 80) return "var(--success)";
  if (score >= 60) return "var(--primary)";
  if (score >= 40) return "var(--warning)";
  return "var(--danger)";
}

function getScoreLabel(score: number) {
  if (score >= 80) return "Odlicno";
  if (score >= 60) return "Dobro";
  if (score >= 40) return "Srednje";
  return "Nisko";
}

/**
 * Displays a numeric AI or tender fit score as a circular progress indicator.
 */
export function CircularProgressScore({
  score,
  size = "md",
  showLabel = true,
  label,
  className,
}: CircularProgressScoreProps) {
  const config = sizeConfig[size];
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
  const circumference = 2 * Math.PI * config.radius;
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;
  const svgSize = config.radius * 2 + config.stroke * 2;

  return (
    <div className={cn("inline-flex flex-col items-center gap-2", className)}>
      <div className={cn("relative", config.wrapper)} aria-label={`Ocjena ${normalizedScore}%`}>
        <svg className="h-full w-full -rotate-90" viewBox={`0 0 ${svgSize} ${svgSize}`}>
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={config.radius}
            fill="none"
            stroke="var(--border-default)"
            strokeWidth={config.stroke}
          />
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={config.radius}
            fill="none"
            stroke={getScoreColor(normalizedScore)}
            strokeWidth={config.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("font-semibold text-[var(--text-primary)]", config.font)}>
            {normalizedScore}
          </span>
        </div>
      </div>
      {showLabel && (
        <span className="text-center text-xs font-medium text-[var(--text-secondary)]">
          {label ?? getScoreLabel(normalizedScore)}
        </span>
      )}
    </div>
  );
}

