"use client";

import { useRouter } from "next/navigation";
import { Lock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaywallOverlayProps {
  usedBids: number;
  maxFreeBids: number;
}

export function PaywallOverlay({ usedBids, maxFreeBids }: PaywallOverlayProps) {
  const router = useRouter();

  return (
    <div className="relative min-h-[400px] w-full overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50">
      <div
        className="pointer-events-none absolute inset-0 select-none p-6 opacity-30 blur-sm"
        aria-hidden="true"
      >
        <div className="mb-6 h-8 w-1/3 rounded-lg bg-slate-200" />
        <div className="space-y-4">
          <div className="h-24 w-full rounded-xl border border-slate-200 bg-white" />
          <div className="h-24 w-full rounded-xl border border-slate-200 bg-white" />
          <div className="h-24 w-full rounded-xl border border-slate-200 bg-white" />
        </div>
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-white/95 backdrop-blur-[2px]" />

      <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-2xl ring-1 ring-slate-900/5">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Lock className="size-7" />
          </div>

          <h3 className="font-heading text-xl font-bold tracking-tight text-slate-900">
            Dostigli ste limit besplatnih ponuda
          </h3>

          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Iskoristili ste <span className="font-bold text-slate-900">{usedBids}</span> od{" "}
            <span className="font-bold text-slate-900">{maxFreeBids}</span> besplatnih ponuda.
            Pređite na Puni paket kada želite više kontrole, pripremu ponude i jasniji pregled šta nedostaje prije slanja.
          </p>

          <div className="mt-6 flex items-baseline justify-center gap-1">
            <span className="font-heading text-3xl font-extrabold text-slate-900">99 KM</span>
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">/ mjesečno</span>
          </div>

          <Button
            className="mt-6 h-12 w-full rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20"
            onClick={() => router.push("/dashboard/subscription")}
          >
            <Star className="mr-2 size-4 fill-current" />
            Pogledaj Puni paket
          </Button>

          <p className="mt-4 text-xs text-slate-400">
            Sigurno plaćanje. Otkazivanje u bilo kojem trenutku.
          </p>
        </div>
      </div>
    </div>
  );
}
