"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Check, ChevronDown, PartyPopper } from "lucide-react";
import { persistOnboardingCompletionAction } from "@/app/actions/dashboard";
import { cn } from "@/lib/utils";
import type { Json } from "@/types/database";

export interface OnboardingSection {
  title: string;
  completed: number;
  total: number;
  items: Array<{ id: string; label: string; href: string; done: boolean }>;
}

interface OnboardingChecklistProps {
  sections: OnboardingSection[];
  percent: number;
  completedItems: string[];
  computedCompletion: Json;
  confettiAlreadyShown: boolean;
}

export function OnboardingChecklist({
  sections,
  percent,
  completedItems,
  computedCompletion,
  confettiAlreadyShown,
}: OnboardingChecklistProps) {
  const [open, setOpen] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const result = await persistOnboardingCompletionAction({ completedItems, computedCompletion, percent });
      if (result.ok && result.showConfetti && !confettiAlreadyShown) setShowConfetti(true);
    });
  }, [completedItems, computedCompletion, confettiAlreadyShown, percent]);

  if (percent >= 100) {
    return showConfetti ? (
      <section className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 text-emerald-900 shadow-sm">
        <div className="flex items-center gap-3">
          <PartyPopper className="size-5" />
          <div>
            <h2 className="font-bold">Onboarding završen</h2>
            <p className="text-sm text-emerald-700">Sve osnovne stavke su spremne.</p>
          </div>
        </div>
      </section>
    ) : null;
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-3 text-left focus-visible:outline-2 focus-visible:outline-primary">
        <div>
          <h2 className="font-heading text-xl font-bold text-slate-950">Brzi start</h2>
          <p className="mt-1 text-sm text-slate-500">{percent}% završeno</p>
        </div>
        <ChevronDown className={cn("size-5 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${percent}%` }} />
      </div>
      {open ? (
        <div className="mt-5 space-y-5">
          {sections.map((section) => (
            <div key={section.title}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{section.title}</h3>
                <span className="text-xs font-bold text-slate-500">{section.completed}/{section.total}</span>
              </div>
              <div className="space-y-2">
                {section.items.map((item) => (
                  <Link key={item.id} href={item.href} className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-primary">
                    <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full border", item.done ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-slate-200 text-slate-300")}>
                      {item.done ? <Check className="size-3.5" /> : null}
                    </span>
                    <span className={cn("min-w-0 flex-1", item.done ? "text-slate-400 line-through" : "text-slate-700")}>{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
