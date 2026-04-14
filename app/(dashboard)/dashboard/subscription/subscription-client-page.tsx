"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Building2,
  CreditCard,
  Loader2,
  Package2,
  Sparkles,
} from "lucide-react";
import { PricingTable } from "@/components/subscription/pricing-table";
import { SubscriptionCard } from "@/components/subscription/subscription-card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { isAgencyPlan } from "@/lib/agency";
import type { PreparationUsageSummary } from "@/lib/preparation-credits";
import type { PreparationPackId, PlanTier } from "@/lib/plans";
import type { SubscriptionStatus } from "@/lib/subscription";

interface PreparationAccountCard {
  companyId: string;
  companyName: string;
  agencyClientId: string | null;
  summary: PreparationUsageSummary;
}

interface SubscriptionClientPageProps {
  initialStatus: SubscriptionStatus;
  primaryPreparationSummary: PreparationAccountCard | null;
  agencyPreparationAccounts: PreparationAccountCard[];
  initialAgencyClientId?: string | null;
}

function formatCycleDate(dateValue: string | null | undefined) {
  if (!dateValue) return "Nije dostupno";

  return new Date(dateValue).toLocaleDateString("bs-Latn-BA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function buildPreparationIntro(summary: PreparationUsageSummary) {
  if (summary.planId === "starter") {
    return `Na Osnovnom paketu pripreme kupujete po potrebi. Svaka pojedinačna priprema košta ${
      summary.payAsYouGoPrice ?? 0
    } KM, a možete kupiti i veći paket unaprijed.`;
  }

  if (summary.planId === "agency") {
    return "Svaki klijent ima svoj mjesečni fond uključenih priprema. Kada ga potrošite, možete dodati novi paket baš za tog klijenta.";
  }

  return "Puni paket uključuje mjesečni fond priprema, a dodatne pakete kupujete samo kada vam stvarno zatrebaju.";
}

function PreparationUsagePanel({
  account,
  highlighted,
  loadingPackKey,
  onBuyPack,
}: {
  account: PreparationAccountCard;
  highlighted?: boolean;
  loadingPackKey: string | null;
  onBuyPack: (packId: PreparationPackId, agencyClientId?: string | null) => Promise<void>;
}) {
  const { companyName, agencyClientId, summary } = account;

  return (
    <article
      className={`rounded-[1.65rem] border p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.8)] transition-all ${
        highlighted
          ? "border-blue-400/40 bg-[linear-gradient(180deg,#172554_0%,#111827_100%)] text-white"
          : "border-slate-800 bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)] text-white"
      }`}
    >
      <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
            {agencyClientId ? (
              <Building2 className="size-3.5 text-sky-300" />
            ) : (
              <CreditCard className="size-3.5 text-sky-300" />
            )}
            {agencyClientId ? "Agency klijent" : "Vaš račun"}
          </div>
          <h3 className="mt-4 font-heading text-2xl font-bold text-white">{companyName}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">{buildPreparationIntro(summary)}</p>
        </div>

        <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-200">
            Trenutni ciklus
          </p>
          <p className="mt-2 text-sm font-semibold text-white">do {formatCycleDate(summary.cycle?.end)}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Uključeno
          </p>
          <p className="mt-2 font-heading text-3xl font-bold text-white">{summary.includedRemaining}</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {summary.includedUsed} iskorišteno od {summary.includedLimit || 0}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Kupljeno
          </p>
          <p className="mt-2 font-heading text-3xl font-bold text-white">{summary.purchasedRemaining}</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {summary.purchasedUsed} iskorišteno od {summary.purchasedTotal}
          </p>
        </div>

        <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-200">
            Ukupno dostupno
          </p>
          <p className="mt-2 font-heading text-3xl font-bold text-white">{summary.totalRemaining}</p>
          <p className="mt-2 text-sm leading-6 text-slate-200">{summary.monthlyLabel}</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Kupovina dodatnih priprema
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {summary.packs.map((pack) => {
            const loadingKey = `${account.companyId}:${pack.id}`;
            const loading = loadingPackKey === loadingKey;

            return (
              <div
                key={pack.id}
                className="rounded-2xl border border-white/10 bg-black/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300">
                    <Package2 className="size-5" />
                  </div>
                  <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-200">
                    {pack.credits}x
                  </span>
                </div>
                <p className="mt-4 text-lg font-semibold text-white">{pack.name}</p>
                <p className="mt-1 text-sm leading-6 text-slate-300">{pack.description}</p>
                <p className="mt-4 font-heading text-3xl font-bold text-white">{pack.price} KM</p>
                <Button
                  type="button"
                  onClick={() => onBuyPack(pack.id, agencyClientId)}
                  disabled={loading}
                  className="mt-4 h-11 w-full rounded-xl bg-white text-slate-950 hover:bg-slate-100"
                >
                  {loading ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <ArrowUpRight className="mr-2 size-4" />
                  )}
                  Kupi paket
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
}

export function SubscriptionClientPage({
  initialStatus,
  primaryPreparationSummary,
  agencyPreparationAccounts,
  initialAgencyClientId,
}: SubscriptionClientPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<PlanTier | null>(null);
  const [loadingPackKey, setLoadingPackKey] = useState<string | null>(null);
  const isAgencyAccount = isAgencyPlan(initialStatus.plan);

  const sortedAgencyAccounts = useMemo(() => {
    if (!initialAgencyClientId) return agencyPreparationAccounts;

    return [...agencyPreparationAccounts].sort((left, right) => {
      if (left.agencyClientId === initialAgencyClientId) return -1;
      if (right.agencyClientId === initialAgencyClientId) return 1;
      return left.companyName.localeCompare(right.companyName, "bs");
    });
  }, [agencyPreparationAccounts, initialAgencyClientId]);

  async function handleSelectPlan(planId: PlanTier) {
    setLoadingPlan(planId);

    try {
      const response = await fetch("/api/lemonsqueezy/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkoutType: "plan", planId }),
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

  async function handleBuyPack(packId: PreparationPackId, agencyClientId?: string | null) {
    const targetCompany =
      (agencyClientId
        ? agencyPreparationAccounts.find((item) => item.agencyClientId === agencyClientId)
        : primaryPreparationSummary)?.companyId ?? "global";

    const loadingKey = `${targetCompany}:${packId}`;
    setLoadingPackKey(loadingKey);

    try {
      const response = await fetch("/api/lemonsqueezy/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutType: "preparation_pack",
          packId,
          agencyClientId: agencyClientId ?? null,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Greška pri kreiranju kupovine.");

      if (data.url && data.url.startsWith("/")) {
        toast({
          title: "Pripreme dodane",
          description: "Demo nalog: paket priprema je odmah evidentiran.",
        });
        router.refresh();
      } else {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Greška",
        description: "Nismo uspjeli pokrenuti kupovinu paketa. Pokušajte ponovo.",
        variant: "destructive",
      });
    } finally {
      setLoadingPackKey(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_30%),linear-gradient(180deg,#111827_0%,#0f172a_58%,#0b1120_100%)] p-6 text-white shadow-[0_35px_90px_-45px_rgba(2,6,23,0.92)] sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:52px_52px] [mask-image:radial-gradient(circle_at_top_left,#000_15%,transparent_75%)]" />
        <div className="relative max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200">
            <Sparkles className="size-3.5 text-sky-300" />
            Paketi i pripreme ponuda
          </div>
          <h1 className="mt-4 font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Pretplata, potrošnja i dodatne pripreme na jednom mjestu
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
            Ovdje birate paket, pratite koliko je priprema ostalo i odmah dopunjujete račun ili klijenta bez napuštanja workflowa.
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
        preparationSummary={!isAgencyAccount ? primaryPreparationSummary?.summary ?? null : null}
      />

      <section id="pripreme" className="scroll-mt-24 space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-heading text-2xl font-bold text-slate-900">Pripreme ponuda</h2>
            <p className="mt-2 text-sm text-slate-600">
              {isAgencyAccount
                ? "Svaki klijent ima svoj pregled potrošnje i vlastite dodatne pakete priprema."
                : "Vidite koliko vam je priprema ostalo u ciklusu i dopunite ih kada vam zatreba."}
            </p>
          </div>
        </div>

        {isAgencyAccount ? (
          sortedAgencyAccounts.length > 0 ? (
            <div className="space-y-5">
              {sortedAgencyAccounts.map((account) => (
                <PreparationUsagePanel
                  key={account.agencyClientId ?? account.companyId}
                  account={account}
                  highlighted={account.agencyClientId === initialAgencyClientId}
                  loadingPackKey={loadingPackKey}
                  onBuyPack={handleBuyPack}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[1.65rem] border border-slate-800 bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)] p-6 text-white">
              Još nema klijenata na agencijskom računu. Dodajte klijenta i ovdje će se automatski pojaviti njegov fond priprema.
            </div>
          )
        ) : primaryPreparationSummary ? (
          <PreparationUsagePanel
            account={primaryPreparationSummary}
            loadingPackKey={loadingPackKey}
            onBuyPack={handleBuyPack}
          />
        ) : (
          <div className="rounded-[1.65rem] border border-slate-800 bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)] p-6 text-white">
            Čim završite onboarding firme, ovdje će se pojaviti pregled mjesečnih i kupljenih priprema.
          </div>
        )}
      </section>

      {isAgencyAccount ? (
        <section className="rounded-[1.85rem] border border-slate-800 bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)] p-6 text-white shadow-[0_28px_65px_-42px_rgba(2,6,23,0.88)]">
          <h2 className="font-heading text-2xl font-bold text-white">
            Agencijski pristup se vodi kroz admin provisioning
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
            Agencijski paket nije dostupan kao self-serve nadogradnja ili izmjena iz korisničkog dashboarda. Ako treba promjena pristupa, to se radi kroz admin panel.
          </p>
        </section>
      ) : (
        <section className="space-y-5">
          <div>
            <h2 className="font-heading text-2xl font-bold text-slate-900">Odaberite nivo kontrole koji vam treba</h2>
            <p className="mt-2 text-sm text-slate-600">
              Cijeli pricing pregled koristi isti premium vizuelni jezik kao ostatak dashboarda.
            </p>
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
