import Link from "next/link";
import {
  ArrowUpRight,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  CreditCard,
  FileText,
  Lock,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { BidStatus } from "@/types/database";

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
}

interface DashboardChecklistItem {
  id: string;
  title: string;
  description: string;
  href?: string;
  tone: "positive" | "critical" | "attention" | "opportunity";
}

const STATUS_CONFIG: Record<BidStatus, { label: string; colors: string }> = {
  draft: { label: "U pripremi", colors: "border-slate-600 bg-slate-800/80 text-slate-200" },
  in_review: { label: "U pregledu", colors: "border-amber-500/30 bg-amber-500/10 text-amber-200" },
  submitted: { label: "Predato", colors: "border-blue-500/30 bg-blue-500/10 text-blue-200" },
  won: { label: "Dobijeno", colors: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" },
  lost: { label: "Izgubljeno", colors: "border-rose-500/30 bg-rose-500/10 text-rose-200" },
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
  switch (icon) {
    case "briefcase":
      return Briefcase;
    case "search":
      return Search;
    case "bell":
      return CircleAlert;
    case "trend":
      return TrendingUp;
  }
}

function getChecklistToneClasses(tone: DashboardChecklistItem["tone"]): string {
  switch (tone) {
    case "positive":
      return "border-white/10 bg-white/5";
    case "critical":
      return "border-rose-500/45 bg-rose-500/10 shadow-[0_0_20px_rgba(244,63,94,0.12)]";
    case "attention":
      return "border-amber-500/35 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.08)]";
    case "opportunity":
      return "border-sky-500/30 bg-sky-500/10 shadow-[0_0_20px_rgba(56,189,248,0.08)]";
  }
}

function getChecklistTextClasses(tone: DashboardChecklistItem["tone"]): string {
  switch (tone) {
    case "positive":
      return "text-white";
    case "critical":
      return "text-rose-200";
    case "attention":
      return "text-amber-100";
    case "opportunity":
      return "text-sky-100";
  }
}

function getChecklistIcon(tone: DashboardChecklistItem["tone"]) {
  return tone === "positive" ? CheckCircle2 : CircleAlert;
}

function getChecklistIconColor(tone: DashboardChecklistItem["tone"]): string {
  switch (tone) {
    case "positive":
      return "text-emerald-400";
    case "critical":
      return "text-rose-400";
    case "attention":
      return "text-amber-400";
    case "opportunity":
      return "text-sky-400";
  }
}

function mapQueueToneToChecklistTone(
  tone: NextActionCard["tone"] | ActionQueueItem["tone"],
): DashboardChecklistItem["tone"] {
  if (tone === "critical") return "critical";
  if (tone === "attention") return "attention";
  if (tone === "opportunity") return "opportunity";
  return "opportunity";
}

function getTenderUrgencyTone(deadline: string | null): "critical" | "attention" | "positive" {
  if (!deadline) return "positive";
  const diffDays = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);
  if (diffDays <= 3) return "critical";
  if (diffDays <= 10) return "attention";
  return "positive";
}

function getTenderToneClasses(tone: "critical" | "attention" | "positive"): string {
  switch (tone) {
    case "critical":
      return "border-rose-500/45 bg-rose-500/10";
    case "attention":
      return "border-amber-500/35 bg-amber-500/10";
    case "positive":
      return "border-white/10 bg-white/5";
  }
}

function buildOperationalChecklist({
  profileLabel,
  nextAction,
  actionQueue,
  recommendedTenders,
  dashboardBidRows,
  currentPlanName,
  subscriptionActive,
}: Pick<
  DashboardHomeOverviewProps,
  "profileLabel" | "nextAction" | "actionQueue" | "recommendedTenders" | "dashboardBidRows" | "currentPlanName" | "subscriptionActive"
>): DashboardChecklistItem[] {
  const positiveItems: DashboardChecklistItem[] = [
    {
      id: "workspace-live",
      title: "Tender feed i radni prostor su aktivni",
      description: `Paket ${currentPlanName} je spreman za dnevni operativni rad.`,
      tone: "positive",
    },
    ...(profileLabel
      ? [{
          id: "profile-focus",
          title: `Profil firme usklađen: ${profileLabel}`,
          description: "Preporuke i tender signal koriste isti profil kao i onboarding preview.",
          tone: "positive" as const,
        }]
      : []),
    ...(recommendedTenders.length > 0
      ? [{
          id: "recommended-ready",
          title: `${recommendedTenders.length} prilika je već izdvojeno za pregled`,
          description: "Najrelevantnije prilike su spremne za otvaranje bez dodatnog filtriranja.",
          tone: "positive" as const,
        }]
      : []),
    ...(dashboardBidRows.length > 0
      ? [{
          id: "bid-workspace",
          title: `${dashboardBidRows.length} ponuda je trenutno u radnom prostoru`,
          description: subscriptionActive
            ? "Možete odmah otvoriti status, dokumente i sljedeće korake."
            : "Ponude ostaju pregledne i bez dodatnog klikanja po više sekcija.",
          tone: "positive" as const,
        }]
      : []),
  ];

  const alertItems: DashboardChecklistItem[] = [
    {
      id: "next-action",
      title: nextAction.title,
      description: nextAction.description,
      href: nextAction.href,
      tone: mapQueueToneToChecklistTone(nextAction.tone),
    },
    ...actionQueue.slice(0, 3).map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      href: item.href,
      tone: mapQueueToneToChecklistTone(item.tone),
    })),
  ];

  const merged = [...alertItems, ...positiveItems];
  const seen = new Set<string>();
  return merged.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  }).slice(0, 6);
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
}: DashboardHomeOverviewProps) {
  const operationalChecklist = buildOperationalChecklist({
    profileLabel,
    nextAction,
    actionQueue,
    recommendedTenders,
    dashboardBidRows,
    currentPlanName,
    subscriptionActive,
  });

  return (
    <div className="space-y-6 xl:space-y-7">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_26%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_30%),linear-gradient(180deg,#111827_0%,#0f172a_55%,#0b1120_100%)] p-6 text-white shadow-[0_35px_90px_-45px_rgba(2,6,23,0.92)] sm:p-8 lg:p-9">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:52px_52px] [mask-image:radial-gradient(circle_at_top_left,#000_15%,transparent_75%)]" />
        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_420px] xl:items-start">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200">
                <ShieldCheck className="size-3.5 text-emerald-400" />
                Operativni dashboard
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                <CreditCard className="size-3.5 text-sky-300" />
                {currentPlanName}
              </span>
              {profileLabel ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                  <Sparkles className="size-3.5 text-sky-300" />
                  {profileLabel}
                </span>
              ) : null}
            </div>

            <div className="space-y-3">
              <h1 className="max-w-4xl font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[2.9rem]">
                Sve što je bitno za {companyName}, bez viška šuma.
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base lg:text-lg">
                Tenderi, ponude, rokovi i dokumenti sada koriste isti premium pregled kao i homepage preview, tako da odmah vidite šta je sigurno, šta je hitno i šta vrijedi otvoriti.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {quickLinks.map((link, index) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={
                    index === 0
                      ? "inline-flex h-11 items-center rounded-xl bg-white px-5 text-sm font-semibold text-slate-950 transition-all hover:bg-slate-100"
                      : "inline-flex h-11 items-center rounded-xl border border-white/10 bg-white/5 px-5 text-sm font-semibold text-white transition-all hover:bg-white/10"
                  }
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Fokus sada</p>
            <h2 className="mt-3 font-heading text-2xl font-bold text-white">{nextAction.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">{nextAction.description}</p>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{nextAction.meta}</p>
            <Link
              href={nextAction.href}
              className="mt-6 inline-flex h-11 w-full items-center justify-between rounded-xl bg-white px-4 text-sm font-semibold text-slate-950 transition-all hover:bg-slate-100"
            >
              {nextAction.cta}
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>

        <div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {focusCards.map((card) => {
            const Icon = getFocusIcon(card.icon);
            return (
              <Link
                key={card.title}
                href={card.href}
                className="rounded-[1.35rem] border border-white/10 bg-white/5 p-5 transition-all hover:-translate-y-0.5 hover:bg-white/8"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-100">
                    <Icon className="size-5" />
                  </div>
                  <ArrowUpRight className="size-4 text-slate-500" />
                </div>
                <p className="mt-5 text-sm font-medium text-slate-400">{card.title}</p>
                <p className="mt-2 font-heading text-3xl font-bold text-white">{card.value}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{card.meta}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="rounded-[1.85rem] border border-slate-800 bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)] p-6 text-white shadow-[0_28px_65px_-42px_rgba(2,6,23,0.88)] lg:p-7">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Kontrola</p>
              <h2 className="mt-2 font-heading text-2xl font-bold text-white">Operativni checklist</h2>
            </div>
            <Clock3 className="size-5 text-sky-300" />
          </div>

          <div className="mt-6 space-y-3">
            {operationalChecklist.map((item) => {
              const Icon = getChecklistIcon(item.tone);
              const content = (
                <div className={`flex items-center gap-3.5 rounded-xl p-4 transition-colors ${getChecklistToneClasses(item.tone)}`}>
                  <Icon className={`size-5 shrink-0 ${getChecklistIconColor(item.tone)}`} />
                  <div className="min-w-0">
                    <p className={`text-[15px] font-semibold sm:text-base ${getChecklistTextClasses(item.tone)}`}>
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{item.description}</p>
                  </div>
                  {item.href ? <ChevronRight className="ml-auto size-4 shrink-0 text-slate-500" /> : null}
                </div>
              );

              return item.href ? (
                <Link key={item.id} href={item.href} className="block">
                  {content}
                </Link>
              ) : (
                <div key={item.id}>{content}</div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[1.85rem] border border-slate-800 bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)] p-6 text-white shadow-[0_28px_65px_-42px_rgba(2,6,23,0.88)] lg:p-7">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Tenderi</p>
              <h2 className="mt-2 font-heading text-2xl font-bold text-white">Vrijedi otvoriti</h2>
            </div>
            <Search className="size-5 text-sky-300" />
          </div>

          <div className="mt-6 space-y-3">
            {isLocked && recommendedTenders.length > 0 ? (
              <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-4 text-sm leading-6 text-slate-200">
                Vidite signal da prilike postoje, ali su puni podaci zaključani na besplatnom paketu.
                <Link href="/dashboard/subscription" className="mt-3 inline-flex items-center gap-2 font-semibold text-sky-300">
                  Otključaj kompletan pregled
                  <ArrowUpRight className="size-4" />
                </Link>
              </div>
            ) : null}

            {recommendedTenders.length > 0 ? (
              recommendedTenders.map((tender) => {
                const tone = getTenderUrgencyTone(tender.deadline);
                return (
                  <Link
                    key={tender.id}
                    href={isLocked ? "/dashboard/subscription" : `${tenderHrefBase}/${tender.id}`}
                    className={`block rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:bg-white/8 ${getTenderToneClasses(tone)}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`line-clamp-2 text-[15px] font-semibold leading-6 text-white ${isLocked ? "blur-sm select-none" : ""}`}>
                          {isLocked ? "Premium tender pregled je zaključan" : tender.title}
                        </p>
                        <p className={`mt-1 text-xs text-slate-400 ${isLocked ? "blur-sm select-none" : ""}`}>
                          {isLocked ? "Javni naručilac" : (tender.contracting_authority ?? "Nepoznat naručilac")}
                        </p>
                      </div>
                      {isLocked ? <Lock className="size-4 shrink-0 text-slate-500" /> : <ArrowUpRight className="size-4 shrink-0 text-slate-500" />}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-medium">
                        Rok {formatDate(tender.deadline)}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 font-semibold ${isLocked ? "border border-white/10 bg-white/5 blur-sm select-none" : "border border-emerald-500/25 bg-emerald-500/10 text-emerald-200"}`}>
                        {isLocked ? "XXX.XXX KM" : formatCompactCurrency(tender.estimated_value)}
                      </span>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-300">
                Još nema dovoljno jakih preporuka. Čim sistem prepozna relevantne prilike, pojavit će se ovdje u istom preview stilu.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <div className="rounded-[1.85rem] border border-slate-800 bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)] p-6 text-white shadow-[0_28px_65px_-42px_rgba(2,6,23,0.88)] lg:p-7">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Ponude</p>
              <h2 className="mt-2 font-heading text-2xl font-bold text-white">Aktivni radni prostor</h2>
            </div>
            <Briefcase className="size-5 text-sky-300" />
          </div>

          <div className="mt-6 space-y-3">
            {dashboardBidRows.length > 0 ? (
              dashboardBidRows.slice(0, 5).map((bid) => {
                const status = STATUS_CONFIG[bid.status];
                return (
                  <div key={bid.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <Link href={`/dashboard/bids/${bid.id}`} className="line-clamp-2 text-[15px] font-semibold leading-6 text-white transition-colors hover:text-sky-200">
                          {bid.tenders.title}
                        </Link>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
                          <span>{bid.tenders.contracting_authority ?? "Nepoznat naručilac"}</span>
                          <span className="text-slate-600">•</span>
                          <span>Rok {formatDate(bid.tenders.deadline)}</span>
                          <span className="text-slate-600">•</span>
                          <span>{formatCompactCurrency(bid.tenders.estimated_value)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${status.colors}`}>
                          {status.label}
                        </span>
                        <Link
                          href={`/dashboard/bids/${bid.id}`}
                          className="inline-flex h-9 items-center rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-semibold text-white transition-all hover:bg-white/10"
                        >
                          Otvori
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm leading-6 text-slate-300">
                Još nema otvorenih ponuda. Krenite iz preporuka i čim procijenite da tender vrijedi, otvorite radni prostor za pripremu.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[1.85rem] border border-slate-800 bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)] p-6 text-white shadow-[0_28px_65px_-42px_rgba(2,6,23,0.88)] lg:p-7">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Brzi pristup</p>
                <h2 className="mt-2 font-heading text-2xl font-bold text-white">Otvorite ono što vam treba</h2>
              </div>
              <FileText className="size-5 text-sky-300" />
            </div>
            <div className="mt-6 space-y-3">
              {quickLinks.map((link, index) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block rounded-xl border p-4 transition-all hover:-translate-y-0.5 ${
                    index === 0
                      ? "border-sky-500/35 bg-sky-500/10"
                      : "border-white/10 bg-white/5 hover:bg-white/8"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[15px] font-semibold text-white">{link.label}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">{link.description}</p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-slate-500" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-[1.85rem] border border-slate-800 bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)] p-6 text-white shadow-[0_28px_65px_-42px_rgba(2,6,23,0.88)] lg:p-7">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Status</p>
                <h2 className="mt-2 font-heading text-2xl font-bold text-white">Radni signal</h2>
              </div>
              <ShieldCheck className="size-5 text-emerald-400" />
            </div>
            <div className="mt-6 space-y-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Paket</p>
                <p className="mt-2 text-lg font-semibold text-white">{currentPlanName}</p>
              </div>
              {preparationStatus ? (
                <Link
                  href={preparationStatus.href}
                  className="block rounded-xl border border-blue-400/20 bg-blue-500/10 p-4 transition-all hover:-translate-y-0.5 hover:bg-blue-500/15"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">
                        {preparationStatus.label}
                      </p>
                      <p className="mt-2 text-lg font-semibold text-white">{preparationStatus.value}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{preparationStatus.description}</p>
                    </div>
                    <ArrowUpRight className="size-4 shrink-0 text-sky-300" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-sky-300">{preparationStatus.cta}</p>
                </Link>
              ) : null}
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Preporuke</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {recommendedTenders.length > 0
                    ? "Dashboard i homepage preview sada koriste isti premium vizuelni jezik za preporuke i operativni pregled."
                    : "Čim se pojave nove prilike ili operativni signali, ovdje će biti vidljivi bez dodatnog kopanja po sekcijama."}
                </p>
              </div>
              {isLocked ? (
                <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-4 text-sm leading-6 text-slate-200">
                  Besplatni paket i dalje ima pregledan premium dashboard, ali puni sadržaj tendera ostaje zaključan dok ne aktivirate pretplatu.
                  <Link href="/dashboard/subscription" className="mt-3 inline-flex items-center gap-2 font-semibold text-sky-300">
                    Pregled paketa
                    <ArrowUpRight className="size-4" />
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
