import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Bell,
  Briefcase,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  Lock,
  Search,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import type { BidStatus } from "@/types/database";
import { BID_STATUS_LABELS } from "@/lib/bids/constants";
import { cn } from "@/lib/utils";

interface NextActionCard {
  title: string;
  description: string;
  href: string;
  cta: string;
  meta: string;
  tone: "critical" | "attention" | "opportunity" | "neutral";
}

interface FocusCard {
  title: string;
  value: string;
  meta: string;
  href: string;
  icon: "briefcase" | "search" | "bell" | "trend";
}

interface ActionQueueItem {
  id: string;
  title: string;
  description: string;
  href: string;
  badge: string;
  tone: "critical" | "attention" | "opportunity" | "neutral";
}

interface DashboardBidRow {
  id: string;
  status: BidStatus;
  created_at: string;
  tenders: {
    title: string;
    deadline: string | null;
    estimated_value: number | null;
    contracting_authority: string | null;
  };
}

interface DashboardTenderCard {
  id: string;
  title: string;
  deadline: string | null;
  estimated_value: number | null;
  contracting_authority: string | null;
  decisionLabel?: string | null;
  priorityScore?: number | null;
  matchScore?: number | null;
  riskLevel?: "low" | "medium" | "high" | null;
  nextStep?: string | null;
}

interface DashboardQuickLink {
  label: string;
  href: string;
  description: string;
}

interface PreparationStatusCard {
  label: string;
  value: string;
  description: string;
  href: string;
  cta: string;
}

interface DashboardHomeOverviewProps {
  companyName: string;
  currentPlanName: string;
  profileLabel: string | null;
  nextAction: NextActionCard;
  focusCards: FocusCard[];
  actionQueue: ActionQueueItem[];
  dashboardBidRows: DashboardBidRow[];
  recommendedTenders: DashboardTenderCard[];
  quickLinks: DashboardQuickLink[];
  preparationStatus?: PreparationStatusCard | null;
  subscriptionActive: boolean;
  isLocked: boolean;
  tenderHrefBase?: string;
  bidHrefBase?: string;
}

const STATUS_CONFIG: Record<BidStatus, { label: string; className: string }> = {
  draft: { label: BID_STATUS_LABELS.draft, className: "border-slate-200 bg-slate-50 text-slate-700" },
  in_review: { label: BID_STATUS_LABELS.in_review, className: "border-amber-200 bg-amber-50 text-amber-700" },
  submitted: { label: BID_STATUS_LABELS.submitted, className: "border-blue-200 bg-blue-50 text-blue-700" },
  won: { label: BID_STATUS_LABELS.won, className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  lost: { label: BID_STATUS_LABELS.lost, className: "border-rose-200 bg-rose-50 text-rose-700" },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Rok nije objavljen";
  return new Date(dateStr).toLocaleDateString("bs-BA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatCompactCurrency(value: number | null | undefined): string {
  if (!value) return "Vrijednost nije objavljena";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M KM`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K KM`;
  return `${Math.round(value)} KM`;
}

function getFocusIcon(icon: FocusCard["icon"]) {
  if (icon === "briefcase") return Briefcase;
  if (icon === "search") return Search;
  if (icon === "bell") return Bell;
  return TrendingUp;
}

function toneClass(tone: NextActionCard["tone"] | ActionQueueItem["tone"]) {
  if (tone === "critical") return "border-rose-200 bg-rose-50 text-rose-700";
  if (tone === "attention") return "border-amber-200 bg-amber-50 text-amber-700";
  if (tone === "opportunity") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function decisionClass(label: string | null | undefined) {
  if (label === "Uđi") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (label === "Preskoči") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

export function DashboardHomeOverview({
  companyName,
  currentPlanName,
  profileLabel,
  nextAction,
  focusCards,
  actionQueue,
  dashboardBidRows,
  recommendedTenders,
  quickLinks,
  preparationStatus,
  subscriptionActive,
  isLocked,
  tenderHrefBase = "/dashboard/tenders",
  bidHrefBase = "/dashboard/bids",
}: DashboardHomeOverviewProps) {
  const bestTender = recommendedTenders[0] ?? null;
  const remainingRecommended = bestTender ? recommendedTenders.slice(1) : recommendedTenders;

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                  <ShieldCheck className="size-3.5" />
                  {currentPlanName}
                </span>
                {profileLabel ? (
                  <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">
                    {profileLabel}
                  </span>
                ) : null}
              </div>
              <h1 className="mt-5 text-3xl font-bold text-slate-950 sm:text-4xl">
                Dobro jutro, {companyName}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                Danas ne morate pregledati sve. Sistem je izdvojio šta prvo zaslužuje odluku, šta može sačekati i šta može blokirati predaju.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {quickLinks.slice(0, 2).map((link, index) => (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch
                  className={cn(
                    "inline-flex h-10 items-center rounded-lg px-4 text-sm font-bold transition-colors",
                    index === 0
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {focusCards.map((card) => {
              const Icon = getFocusIcon(card.icon);
              return (
                <Link
                  key={card.title}
                  href={card.href}
                  className="rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-blue-200 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <Icon className="size-5" />
                    </div>
                    <ArrowRight className="size-4 text-slate-400" />
                  </div>
                  <p className="mt-4 text-xs font-bold uppercase text-slate-500">{card.title}</p>
                  <p className="mt-1 text-3xl font-bold text-slate-950">{card.value}</p>
                  <p className="mt-1 text-sm leading-5 text-slate-600">{card.meta}</p>
                </Link>
              );
            })}
          </div>
        </div>

        <div className={cn("rounded-lg border p-5 shadow-sm", toneClass(nextAction.tone))}>
          <p className="text-xs font-bold uppercase opacity-80">Uraditi prvo</p>
          <h2 className="mt-3 text-2xl font-bold">{nextAction.title}</h2>
          <p className="mt-2 text-sm leading-6 opacity-90">{nextAction.description}</p>
          <p className="mt-4 text-xs font-bold uppercase opacity-80">{nextAction.meta}</p>
          <Link
            href={nextAction.href}
            className="mt-5 inline-flex h-10 w-full items-center justify-between rounded-lg bg-white px-4 text-sm font-bold text-slate-950 shadow-sm transition-colors hover:bg-slate-50"
          >
            {nextAction.cta}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title="Preporučeni tenderi za vas" icon={Search} href="/dashboard/tenders?tab=recommended">
          {bestTender && !isLocked ? (
            <Link
              href={`${tenderHrefBase}/${bestTender.id}`}
              className="mb-4 block rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-950 transition-colors hover:border-blue-300 hover:bg-blue-100/70"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-bold text-blue-700">
                      Najbolja prilika sada
                    </span>
                    {bestTender.decisionLabel ? (
                      <span className={cn("rounded-md border px-2 py-0.5 text-[11px] font-bold", decisionClass(bestTender.decisionLabel))}>
                        {bestTender.decisionLabel}
                      </span>
                    ) : null}
                    {bestTender.priorityScore !== null && bestTender.priorityScore !== undefined ? (
                      <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-bold text-slate-700">
                        Prioritet {bestTender.priorityScore}/100
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-3 line-clamp-2 text-lg font-bold">{bestTender.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-blue-800">
                    {bestTender.nextStep ?? "Otvori tender i donesi odluku prije nego sto udje u guzvu."}
                  </p>
                </div>
                <div className="shrink-0 text-sm font-bold">
                  Otvori odluku <ArrowRight className="ml-1 inline size-4" />
                </div>
              </div>
            </Link>
          ) : null}

          <div className="divide-y divide-slate-100">
            {recommendedTenders.length > 0 ? (
              remainingRecommended.map((tender) => (
                <Link
                  key={tender.id}
                  href={isLocked ? "/dashboard/subscription" : `${tenderHrefBase}/${tender.id}`}
                  className="flex items-center gap-4 py-3 transition-colors hover:bg-slate-50"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    {isLocked ? <Lock className="size-4" /> : <Search className="size-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("line-clamp-2 text-sm font-bold text-slate-950", isLocked && "select-none blur-sm")}>
                      {isLocked ? "Puni pregled tendera je zaključan" : tender.title}
                    </p>
                    <p className={cn("mt-1 truncate text-xs text-slate-500", isLocked && "select-none blur-sm")}>
                      {isLocked ? "Javni naručilac" : tender.contracting_authority ?? "Nepoznat naručilac"}
                    </p>
                    {!isLocked && tender.nextStep ? (
                      <p className="mt-2 line-clamp-2 text-xs font-medium leading-5 text-blue-700">
                        Sljedeći potez: {tender.nextStep}
                      </p>
                    ) : null}
                  </div>
                  <div className="hidden min-w-[120px] text-right text-xs text-slate-600 sm:block">
                    {!isLocked && tender.decisionLabel ? (
                      <span className={cn("inline-flex rounded-md border px-2 py-0.5 text-[11px] font-bold", decisionClass(tender.decisionLabel))}>
                        {tender.decisionLabel}
                      </span>
                    ) : null}
                    <p className="mt-2">{formatCompactCurrency(tender.estimated_value)}</p>
                    <p className="mt-1">{formatDate(tender.deadline)}</p>
                    {!isLocked && tender.priorityScore !== null && tender.priorityScore !== undefined ? (
                      <p className="mt-1 font-bold text-slate-900">Prioritet {tender.priorityScore}/100</p>
                    ) : null}
                  </div>
                  <ArrowRight className="size-4 text-slate-400" />
                </Link>
              ))
            ) : (
              <EmptyState text="Čim se pojave jače preporuke, biće prikazane ovdje." />
            )}
          </div>
        </Panel>

        <Panel title="Radna lista" icon={Clock3}>
          <div className="space-y-3">
            {actionQueue.length > 0 ? (
              actionQueue.slice(0, 5).map((item) => (
                <Link key={item.id} href={item.href} className={cn("block rounded-lg border p-3", toneClass(item.tone))}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-bold">{item.title}</p>
                    <span className="shrink-0 rounded-md bg-white/70 px-2 py-0.5 text-[11px] font-bold">
                      {item.badge}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 opacity-90">{item.description}</p>
                </Link>
              ))
            ) : (
              <EmptyState text={bestTender ? "Nema hitnih blokera. Danas je najbolji fokus otvoriti najbolju priliku iz preporuka." : "Nema hitnih blokera u ovom trenutku."} />
            )}
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title="Ponude u pripremi" icon={Briefcase} href={bidHrefBase}>
          <div className="divide-y divide-slate-100">
            {dashboardBidRows.length > 0 ? (
              dashboardBidRows.slice(0, 5).map((bid) => {
                const status = STATUS_CONFIG[bid.status];
                return (
                  <Link key={bid.id} href={`${bidHrefBase}/${bid.id}`} className="block py-3 transition-colors hover:bg-slate-50">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-bold text-slate-950">{bid.tenders.title}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {bid.tenders.contracting_authority ?? "Nepoznat naručilac"} · {formatDate(bid.tenders.deadline)} · {formatCompactCurrency(bid.tenders.estimated_value)}
                        </p>
                      </div>
                      <span className={cn("inline-flex w-fit rounded-md border px-2.5 py-1 text-xs font-bold", status.className)}>
                        {status.label}
                      </span>
                    </div>
                  </Link>
                );
              })
            ) : (
              <EmptyState text="Krenite iz preporuka i otvorite radni prostor za tender koji vrijedi pripremati." />
            )}
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel title="Moj paket" icon={CreditCard}>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-500">Paket</p>
              <p className="mt-1 text-lg font-bold text-slate-950">{currentPlanName}</p>
              <p className="mt-1 text-sm text-slate-600">
                {subscriptionActive ? "Aktivno za preporuke, pipeline i analitiku." : "Aktivirajte paket za puni operativni tok."}
              </p>
            </div>
            {preparationStatus ? (
              <Link href={preparationStatus.href} className="mt-3 block rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-800">
                <p className="text-xs font-bold uppercase">{preparationStatus.label}</p>
                <p className="mt-1 text-lg font-bold">{preparationStatus.value}</p>
                <p className="mt-1 text-sm leading-6">{preparationStatus.description}</p>
                <p className="mt-2 inline-flex items-center gap-2 text-sm font-bold">
                  {preparationStatus.cta}
                  <ArrowRight className="size-4" />
                </p>
              </Link>
            ) : null}
          </Panel>

          <Panel title="Brzi pristup" icon={FileText}>
            <div className="space-y-2">
              {quickLinks.map((link) => (
                <Link key={link.href} href={link.href} className="block rounded-lg border border-slate-200 bg-white p-3 transition-colors hover:bg-slate-50">
                  <p className="text-sm font-bold text-slate-950">{link.label}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{link.description}</p>
                </Link>
              ))}
            </div>
          </Panel>
        </div>
      </section>
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  href,
  children,
}: {
  title: string;
  icon: LucideIcon;
  href?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Icon className="size-4" />
          </div>
          <h2 className="text-lg font-bold text-slate-950">{title}</h2>
        </div>
        {href ? (
          <Link href={href} className="text-sm font-bold text-blue-700 hover:text-blue-800">
            Pogledaj sve
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-500">
      <div className="mb-2 flex items-center gap-2 font-bold text-slate-700">
        <CheckCircle2 className="size-4 text-blue-600" />
        Nema stavki
      </div>
      {text}
    </div>
  );
}
