"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CircularProgressScore } from "@/components/ui/circular-progress-score";
import { DeadlineCountdown } from "@/components/ui/deadline-countdown";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { markDashboardDecisionPositiveAction, skipDashboardDecisionAction } from "@/app/actions/dashboard";
import { formatDate, formatKM } from "@/lib/formatting";

export interface DecisionQueueItem {
  id: string;
  title: string;
  buyer: string | null;
  value: number | null;
  deadline: string | null;
  score: number | null;
  why: string;
}

interface DecisionQueueClientProps {
  items: DecisionQueueItem[];
  processed?: boolean;
}

const skipReasons = ["nije relevantno", "preniska vrijednost", "prevelik rizik", "nemamo kapacitet", "drugo"];

export function DecisionQueueClient({ items, processed = false }: DecisionQueueClientProps) {
  const router = useRouter();
  const [visibleItems, setVisibleItems] = useState(items);
  const [skipTarget, setSkipTarget] = useState<DecisionQueueItem | null>(null);
  const [skipReason, setSkipReason] = useState(skipReasons[0]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (visibleItems.length === 0 && !processed) return null;

  if (visibleItems.length === 0) {
    return (
      <section className="rounded-[var(--radius-card)] border border-[var(--success-soft)] bg-[var(--success-soft)] p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-1)] text-[var(--success)]">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-h2 text-[var(--text-primary)]">Sve obrađeno za danas</h2>
            <p className="text-sm text-[var(--success-strong)]">Dobar posao. Sljedeći signal stiže kada se pojavi nova relevantna odluka.</p>
          </div>
        </div>
      </section>
    );
  }

  function addToPipeline(item: DecisionQueueItem) {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/bids", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tender_id: item.id, auto_generate_checklist: true }),
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          setError(body?.error ?? "Nije moguće dodati tender u pipeline.");
          return;
        }
        await markDashboardDecisionPositiveAction(item.id);
        setVisibleItems((current) => current.filter((entry) => entry.id !== item.id));
        if (body?.bid?.id) router.push(`/dashboard/bids/${body.bid.id}`);
        else router.refresh();
      } catch {
        setError("Greška pri dodavanju tendera u pipeline.");
      }
    });
  }

  function confirmSkip() {
    if (!skipTarget) return;
    setError(null);
    startTransition(async () => {
      const result = await skipDashboardDecisionAction({ tenderId: skipTarget.id, reason: skipReason });
      if (!result.ok) {
        setError(result.error ?? "Nije moguće preskočiti tender.");
        return;
      }
      setVisibleItems((current) => current.filter((entry) => entry.id !== skipTarget.id));
      setSkipTarget(null);
      setSkipReason(skipReasons[0]);
    });
  }

  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-1)] p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-h2 text-[var(--text-primary)]">Današnje odluke</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Tenderi koji zahtijevaju vašu pažnju danas</p>
        </div>
        <span className="rounded-full bg-[var(--warning-soft)] px-3 py-1 text-sm font-semibold text-[var(--warning-strong)]">{visibleItems.length} odluka</span>
      </div>

      {error ? <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-600">{error}</div> : null}

      <div className="mt-4 divide-y divide-[var(--border-default)]">
        {visibleItems.slice(0, 5).map((item) => (
          <article key={item.id} className="flex flex-wrap items-center gap-4 py-4 first:pt-0 last:pb-0">
            <CircularProgressScore score={item.score ?? 0} showLabel={false} size="md" />
            <div className="min-w-[260px] flex-1">
              <h3 className="line-clamp-1 text-h3 text-[var(--text-primary)]">{item.title}</h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{item.buyer ?? "Nepoznat naručilac"}</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{item.why}</p>
            </div>
            <div className="grid min-w-[280px] grid-cols-3 gap-3 text-sm">
              <div><p className="text-[10px] uppercase tracking-[0.05em] text-[var(--text-tertiary)]">Vrijednost</p><p className="font-semibold text-[var(--text-primary)]">{formatKM(item.value)}</p></div>
              <div><p className="text-[10px] uppercase tracking-[0.05em] text-[var(--text-tertiary)]">Win prob</p><p className="font-semibold text-[var(--success)]">{item.score ?? 0}%</p></div>
              <div><p className="text-[10px] uppercase tracking-[0.05em] text-[var(--text-tertiary)]">Rok</p>{item.deadline ? <DeadlineCountdown compact deadline={item.deadline} /> : <p className="font-semibold text-[var(--text-primary)]">{formatDate(item.deadline)}</p>}</div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button type="button" onClick={() => addToPipeline(item)} disabled={isPending} size="sm">
                {isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Dodaj u pipeline
              </Button>
              <Button type="button" variant="ghost" onClick={() => setSkipTarget(item)} disabled={isPending} size="sm">
                Preskoči
              </Button>
            </div>
          </article>
        ))}
      </div>

      <Dialog open={!!skipTarget} onOpenChange={(open) => !open && setSkipTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zašto preskačete ovaj tender?</DialogTitle>
            <DialogDescription>Razlog se čuva u AI feedback i koristi za bolje preporuke.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {skipReasons.map((reason) => (
              <label key={reason} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <input type="radio" checked={skipReason === reason} onChange={() => setSkipReason(reason)} className="size-4 text-blue-600 focus-visible:outline-2 focus-visible:outline-primary" />
                {reason}
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setSkipTarget(null)}><X className="size-4" />Odustani</Button>
            <Button type="button" onClick={confirmSkip} disabled={isPending}>{isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}Sačuvaj razlog</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
