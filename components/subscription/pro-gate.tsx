import Link from "next/link";
import { Lock, CreditCard } from "lucide-react";

export function ProGate() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="mx-4 max-w-md rounded-lg border border-border bg-card p-8 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10">
          <Lock className="size-7 text-primary" />
        </div>

        <h2 className="mt-5 font-serif text-xl font-bold tracking-tight">
          Tržišna inteligencija
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          Ova funkcionalnost je dostupna samo Pro pretplatnicima. Vidite ko
          pobjeđuje, po kojim cijenama i koji tenderi dolaze — prije
          konkurencije.
        </p>

        <div className="mt-4 flex items-baseline justify-center gap-1">
          <span className="text-2xl font-bold">80 EUR</span>
          <span className="text-sm text-muted-foreground">/ mjesečno</span>
        </div>

        <Link
          href="/dashboard/subscription"
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <CreditCard className="size-4" />
          Pretplatite se
        </Link>
      </div>
    </div>
  );
}
