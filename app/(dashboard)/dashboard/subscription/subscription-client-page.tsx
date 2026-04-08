"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PricingTable } from "@/components/subscription/pricing-table";
import { SubscriptionCard } from "@/components/subscription/subscription-card";
import { useToast } from "@/components/ui/use-toast";
import { isAgencyPlan } from "@/lib/agency";
import { type PlanTier } from "@/lib/plans";
import type { SubscriptionStatus } from "@/lib/subscription";

export function SubscriptionClientPage({ initialStatus }: { initialStatus: SubscriptionStatus }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<PlanTier | null>(null);
  const isAgencyAccount = isAgencyPlan(initialStatus.plan);

  async function handleSelectPlan(planId: PlanTier) {
    setLoadingPlan(planId);
    try {
      const response = await fetch("/api/lemonsqueezy/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Greška pri kreiranju narudžbe.");

      if (data.url && data.url.startsWith("/")) {
        toast({
          title: "Pretplata ažurirana",
          description: "Demo nalog: uspješno ste promijenili paket.",
        });
        router.refresh();
      } else {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Greška",
        description: "Nismo uspjeli kreirati narudžbu. Pokušajte ponovo.",
        variant: "destructive",
      });
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_30%),linear-gradient(180deg,#111827_0%,#0f172a_58%,#0b1120_100%)] p-6 text-white shadow-[0_35px_90px_-45px_rgba(2,6,23,0.92)] sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:52px_52px] [mask-image:radial-gradient(circle_at_top_left,#000_15%,transparent_75%)]" />
        <div className="relative max-w-3xl">
          <h1 className="text-3xl font-heading font-bold tracking-tight text-white sm:text-4xl">Paketi i kontrola rizika</h1>
          <p className="mt-2 text-sm leading-7 text-slate-300 sm:text-base">
            Ovdje birate koliko kontrole želite prije slanja ponude i koliko tržišnih informacija želite imati prije odluke da aplicirate.
          </p>
        </div>
      </section>

      <SubscriptionCard
        isActive={initialStatus.isSubscribed}
        status={initialStatus.subscription?.status ?? "inactive"}
        currentPeriodEnd={initialStatus.subscription?.current_period_end ?? null}
        hasCustomerId={!!initialStatus.subscription?.lemonsqueezy_customer_id}
        plan={initialStatus.plan}
        showPortal={!isAgencyAccount}
      />

      {isAgencyAccount ? (
        <section className="rounded-[1.85rem] border border-slate-800 bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)] p-6 text-white shadow-[0_28px_65px_-42px_rgba(2,6,23,0.88)]">
          <h2 className="font-heading text-2xl font-bold text-white">Agencijski pristup se vodi kroz admin provisioning</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
            Agencijski paket nije dostupan kao self-serve nadogradnja ili izmjena iz korisničkog dashboarda. Ako treba promjena pristupa, to se radi kroz admin panel.
          </p>
        </section>
      ) : (
        <section className="space-y-5">
          <div>
            <h2 className="font-heading text-2xl font-bold text-white">Odaberite nivo kontrole koji vam treba</h2>
            <p className="mt-2 text-sm text-slate-400">Cijeli pricing pregled sada koristi isti premium vizuelni jezik kao ostatak dashboarda.</p>
          </div>
          <PricingTable
            currentPlanId={initialStatus.plan.id}
            onSelectPlan={handleSelectPlan}
            isLoading={loadingPlan !== null}
            visiblePlanIds={["basic", "starter", "pro"]}
          />
        </section>
      )}
    </div>
  );
}
