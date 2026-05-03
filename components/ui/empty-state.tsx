"use client";

import type { ComponentType, ReactNode } from "react";
import {
  AlertCircle,
  BarChart3,
  FileText,
  Inbox,
  Plus,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LegacyIconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

export type EmptyStateIcon = "inbox" | "search" | "file" | "chart" | "alert" | ReactNode | LegacyIconComponent;

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: EmptyStateIcon;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

function EmptyStateIconGraphic({ icon }: { icon?: EmptyStateIcon }) {
  const iconClassName = "size-7";

  if (typeof icon === "string" || icon === undefined) {
    if (icon === "search") return <Search className={iconClassName} aria-hidden="true" />;
    if (icon === "file") return <FileText className={iconClassName} aria-hidden="true" />;
    if (icon === "chart") return <BarChart3 className={iconClassName} aria-hidden="true" />;
    if (icon === "alert") return <AlertCircle className={iconClassName} aria-hidden="true" />;
    return <Inbox className={iconClassName} aria-hidden="true" />;
  }

  if (typeof icon === "function") {
    const Icon = icon;
    return <Icon className={iconClassName} aria-hidden={true} />;
  }

  return icon;
}

/**
 * Renders an empty dashboard state with optional primary and secondary actions.
 */
export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-64 flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--border-default)] bg-[var(--surface-1)] px-6 py-10 text-center",
        className,
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-[var(--surface-subtle)] text-[var(--primary)]">
        <EmptyStateIconGraphic icon={icon} />
      </div>
      <h3 className="mt-4 text-base font-semibold text-[var(--text-primary)]">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
      )}
      {(actionLabel || secondaryActionLabel) && (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {actionLabel && (
            <Button type="button" onClick={onAction} className="bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]">
              <Plus className="size-4" aria-hidden="true" />
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && (
            <Button type="button" variant="outline" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
