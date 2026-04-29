import type React from "react";

import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "text" | "circle" | "card" | "button";
}

const skeletonVariants = {
  default: "rounded-md",
  text: "h-4 rounded",
  circle: "rounded-full",
  card: "min-h-32 rounded-[var(--radius-card)]",
  button: "h-9 rounded-[var(--radius-input)]",
};

/**
 * Provides dashboard-ready loading placeholders for text, cards, circles, and buttons.
 */
export function Skeleton({ className, variant = "default", ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-[linear-gradient(90deg,var(--surface-2)_25%,var(--border-default)_37%,var(--surface-2)_63%)] bg-[length:400%_100%]",
        skeletonVariants[variant],
        className,
      )}
      {...props}
    />
  );
}
