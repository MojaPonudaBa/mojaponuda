import Link from "next/link";
import { CreditCard, Sparkles } from "lucide-react";

export function ProGate() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="relative mx-4 max-w-md overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-2xl">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-400 via-primary to-blue-600" />

        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-blue-50 text-primary">
          <Sparkles className="size-8" />
        </div>

        <h2 className="font-heading text-2xl font-bold tracking-tight text-slate-900">
          Uđite u tender s više informacija od konkurencije
        </h2>

        <p className="mt-3 text-base leading-relaxed text-slate-600">
          Vidite ko pobjeđuje, gdje se tržište otvara i koji tenderi dolaze prije objave. To vam daje jaču odluku prije nego što uopće krenete u pripremu.
        </p>

        <div className="mt-8 flex items-baseline justify-center gap-1">
          <span className="font-heading text-4xl font-extrabold text-slate-900">99 KM</span>
          <span className="text-sm font-bold uppercase tracking-wide text-slate-500">/ mjesečno</span>
        </div>

        <div className="mt-8 space-y-3">
          <Link
            href="/dashboard/subscription"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-blue-500/40"
          >
            <CreditCard className="size-4" />
            Pogledaj kako Puni paket smanjuje rizik
          </Link>
          <p className="text-xs text-slate-400">Bez ugovorne obaveze. Otkazite bilo kada.</p>
        </div>
      </div>
    </div>
  );
}
