"use client";

import type React from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Bell, FileText, Home, Search, Settings, Workflow } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
}

const shortcutGroups = [
  {
    title: "Navigacija",
    shortcuts: [
      { keys: ["G", "D"], label: "Dashboard", href: "/dashboard", icon: Home },
      { keys: ["G", "T"], label: "Tenderi", href: "/dashboard/tenders", icon: Search },
      { keys: ["G", "P"], label: "Pipeline", href: "/dashboard/pipeline", icon: Workflow },
      { keys: ["G", "B"], label: "Ponude", href: "/dashboard/bids", icon: FileText },
    ],
  },
  {
    title: "Radni tok",
    shortcuts: [
      { keys: ["G", "A"], label: "Analitika", href: "/dashboard/analytics", icon: BarChart3 },
      { keys: ["G", "L"], label: "Alerti", href: "/dashboard/alerts", icon: Bell },
      { keys: ["G", "S"], label: "Postavke", href: "/dashboard/settings", icon: Settings },
    ],
  },
];

function ShortcutKey({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-7 items-center justify-center rounded border border-[var(--border-default)] bg-[var(--surface-2)] px-2 py-1 text-xs font-semibold text-[var(--text-primary)] shadow-sm">
      {children}
    </kbd>
  );
}

/**
 * Shows Bosnian keyboard shortcut labels and navigates with Next.js router when a shortcut row is selected.
 */
export function KeyboardShortcutsModal({ open, onOpenChange, className }: KeyboardShortcutsModalProps) {
  const router = useRouter();

  const navigate = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-2xl rounded-[var(--radius-modal)] border-[var(--border-default)] bg-[var(--surface-1)] p-0 shadow-[var(--shadow-modal)]",
          className,
        )}
      >
        <DialogHeader className="border-b border-[var(--border-default)] px-6 py-5">
          <DialogTitle className="text-lg font-semibold text-[var(--text-primary)]">
            Precice na tastaturi
          </DialogTitle>
          <DialogDescription className="text-sm text-[var(--text-secondary)]">
            Brz pristup kljucnim dashboard sekcijama.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 p-6 sm:grid-cols-2">
          {shortcutGroups.map((group) => (
            <section key={group.title} className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-normal text-[var(--text-tertiary)]">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut) => {
                  const Icon = shortcut.icon;
                  return (
                    <button
                      key={shortcut.href}
                      type="button"
                      className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-input)] border border-[var(--border-default)] bg-[var(--surface-1)] px-3 py-2 text-left transition-colors hover:border-[var(--border-hover)] hover:bg-[var(--surface-2)]"
                      onClick={() => navigate(shortcut.href)}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Icon className="size-4 shrink-0 text-[var(--primary)]" aria-hidden="true" />
                        <span className="truncate text-sm font-medium text-[var(--text-primary)]">
                          {shortcut.label}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1">
                        {shortcut.keys.map((key) => (
                          <ShortcutKey key={key}>{key}</ShortcutKey>
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
