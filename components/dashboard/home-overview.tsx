import Link from "next/link";
import {
  ArrowUpRight,
  BellRing,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock,
  CreditCard,
  FileText,
  Search,
  ShieldCheck,
  Sparkles,
  Swords,
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

interface DashboardHomeOverviewProps {
  companyName: string;
  currentPlanName: string;
  profileLabel: string | null;
  nextAction: NextActionCard;
  focusCards: FocusCard[];
  actionQueue: ActionQueueItem[];
  dashboardBidRows: DashboardBidRow[];
  recommendedTenders: DashboardTenderCard[];
  topRelevantAuthorities: Array<{ name: string; count: number; totalValue: number }>;
  topRelevantAuthoritiesSource: "live" | "empty";
  competitorSnapshot: Array<{
    name: string;
    jib: string;
    wins: number;
    total_value: number;
    win_rate: number | null;
  }>;
  competitorSnapshotSource: "live" | "demo" | "empty";
  displayUpcomingRows: Array<{
    id: string;
    description: string | null;
    planned_date: string | null;
    estimated_value: number | null;
    contracting_authorities?: { name: string; jib: string } | null;
  }>;
  subscriptionActive: boolean;
}

const STATUS_CONFIG: Record<
  BidStatus,
  { label: string; colors: string }
> = {
  draft: { label: "U pripremi", colors: "bg-slate-100 text-slate-700 border-slate-200" },
  in_review: { label: "U pregledu", colors: "bg-amber-50 text-amber-700 border-amber-200" },
  submitted: { label: "Predato", colors: "bg-blue-50 text-blue-700 border-blue-200" },
  won: { label: "Dobijeno", colors: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  lost: { label: "Izgubljeno", colors: "bg-red-50 text-red-700 border-red-200" },
};

const toneStyles: Record<NextActionCard["tone"], string> = {
  critical: "border-red-200 bg-red-50/80",
  attention: "border-amber-200 bg-amber-50/80",
  opportunity: "border-blue-200 bg-blue-50/80",
  neutral: "border-slate-200 bg-slate-50/80",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("bs-BA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatCompactCurrency(value: number | null | undefined): string {
  if (!value) return "—";
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
      return BellRing;
    case "trend":
      return TrendingUp;
  }
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
  topRelevantAuthorities,
  topRelevantAuthoritiesSource,
  competitorSnapshot,
  competitorSnapshotSource,
  displayUpcomingRows,
  subscriptionActive,
}: DashboardHomeOverviewProps) {
  return (
    <div className="space-y-8 lg:space-y-10">
      <section className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-[0_24px_55px_-32px_rgba(15,23,42,0.22)] backdrop-blur-sm sm:p-8 lg:p-9">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_400px] xl:items-start">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/80 px-3 py-1">
                <ShieldCheck className="size-4 text-blue-600" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">
                  Pregled
                </span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                <CreditCard className="size-3.5" />
                {currentPlanName}
              </div>
              {profileLabel ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                  <Sparkles className="size-3.5 text-blue-600" />
                  {profileLabel}
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl lg:text-[2.7rem]">
                Gdje je danas fokus za {companyName}
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-base lg:text-lg">
                Ovdje odmah vidite šta nosi rizik, šta vrijedi otvoriti i gdje imate realnu tržišnu prednost.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard/tenders?tab=recommended"
                className="inline-flex h-11 items-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition-all hover:bg-blue-700"
              >
                Otvori prilike
              </Link>
              <Link
                href="/dashboard/bids"
                className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50"
              >
                Ponude u radu
              </Link>
              <Link
                href="/dashboard/vault"
                className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50"
              >
                Provjeri dokumente
              </Link>
            </div>
          </div>

          <div className={`rounded-[1.75rem] border p-6 shadow-sm ${toneStyles[nextAction.tone]}`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Sada</p>
            <h2 className="mt-2 font-heading text-2xl font-bold text-slate-950">{nextAction.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{nextAction.description}</p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{nextAction.meta}</p>
            <Link
              href={nextAction.href}
              className="mt-6 inline-flex h-11 w-full items-center justify-between rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition-all hover:bg-blue-700"
            >
              {nextAction.cta}
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {focusCards.map((card) => {
          const Icon = getFocusIcon(card.icon);
          return (
            <Link
              key={card.title}
              href={card.href}
              className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_16px_40px_-28px_rgba(15,23,42,0.22)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-50 text-slate-700">
                  <Icon className="size-5" />
                </div>
                <ArrowUpRight className="size-4 text-slate-300" />
              </div>
              <p className="mt-5 text-sm font-medium text-slate-500">{card.title}</p>
              <p className="mt-2 font-heading text-3xl font-bold text-slate-950">{card.value}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{card.meta}</p>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] xl:gap-7">
        <div className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-sm lg:p-7">
          <div className="flex items-end justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Danas</p>
              <h2 className="mt-2 font-heading text-2xl font-bold text-slate-950">Prvi potezi</h2>
            </div>
            <Clock className="size-5 text-blue-600" />
          </div>

          <div className="mt-6 space-y-3">
            {actionQueue.length > 0 ? (
              actionQueue.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`block rounded-2xl border p-4 transition-all hover:-translate-y-0.5 ${toneStyles[item.tone]}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      {item.badge}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-6 text-slate-500">
                Trenutno nema hitnih blokera. Sljedeći logičan korak je pregled novih prilika.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-sm lg:p-7">
          <div className="flex items-end justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Tenderi</p>
              <h2 className="mt-2 font-heading text-2xl font-bold text-slate-950">Vrijedi otvoriti</h2>
            </div>
            <Search className="size-5 text-blue-600" />
          </div>

          <div className="mt-6 space-y-3">
            {recommendedTenders.length > 0 ? (
              recommendedTenders.map((tender) => (
                <Link
                  key={tender.id}
                  href={`/dashboard/tenders/${tender.id}`}
                  className="block rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition-all hover:border-blue-200 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="line-clamp-2 text-sm font-semibold text-slate-900">{tender.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{tender.contracting_authority ?? "Nepoznat naručilac"}</p>
                    </div>
                    <ArrowUpRight className="size-4 text-slate-300" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="rounded-full bg-white px-2.5 py-1 font-medium">Rok {formatDate(tender.deadline)}</span>
                    {tender.estimated_value ? (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                        {formatCompactCurrency(tender.estimated_value)}
                      </span>
                    ) : null}
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-6 text-slate-500">
                Još nema dovoljno jasnih prijedloga. Dopunite profil da sistem bolje razlikuje prave prilike od buke.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] xl:gap-7">
        <div className="rounded-[1.75rem] border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-7 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Aktivne ponude</p>
              <h2 className="mt-2 font-heading text-2xl font-bold text-slate-950">Ponude koje vam mogu donijeti posao</h2>
            </div>
            <Link
              href="/dashboard/bids"
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition-colors hover:text-blue-800"
            >
              Sve ponude
              <ArrowUpRight className="size-4" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {dashboardBidRows.length > 0 ? (
              dashboardBidRows.slice(0, 5).map((bid) => {
                const status = STATUS_CONFIG[bid.status];
                return (
                  <div key={bid.id} className="flex flex-col gap-4 px-7 py-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <Link href={`/dashboard/bids/${bid.id}`} className="line-clamp-2 text-sm font-semibold text-slate-950 transition-colors hover:text-blue-700">
                        {bid.tenders.title}
                      </Link>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span>{bid.tenders.contracting_authority ?? "Nepoznat naručilac"}</span>
                        <span>•</span>
                        <span>Rok {formatDate(bid.tenders.deadline)}</span>
                        <span>•</span>
                        <span>{formatCompactCurrency(bid.tenders.estimated_value)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${status.colors}`}>
                        {status.label}
                      </span>
                      <Link
                        href={`/dashboard/bids/${bid.id}`}
                        className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50"
                      >
                        Otvori
                      </Link>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-7 py-14 text-center">
                <Briefcase className="mx-auto mb-3 size-10 text-slate-300" />
                <p className="font-semibold text-slate-900">Još nemate otvorenih ponuda</p>
                <p className="mt-2 text-sm text-slate-500">Krenite iz preporuka, otvorite tender i uđite u pripremu kad procijenite da vrijedi.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Tržište</p>
                <h2 className="mt-2 font-heading text-2xl font-bold text-slate-950">Gdje se otvara prostor</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {topRelevantAuthoritiesSource === "live" ? "Podaci uživo iz tendera koji se uklapaju u vaš profil." : "Pojavit će se kada sistem nađe dovoljno relevantnih tendera."}
                </p>
              </div>
              <Swords className="size-5 text-rose-600" />
            </div>
            <div className="mt-5 space-y-3">
              {topRelevantAuthorities.length > 0 ? (
                topRelevantAuthorities.map((authority) => (
                  <div key={authority.name} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{authority.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{authority.count} relevantnih tendera</p>
                      </div>
                      <span className="text-xs font-semibold text-emerald-700">{formatCompactCurrency(authority.totalValue)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-6 text-slate-500">
                  Ovdje ćete vidjeti naručioce kod kojih se najčešće pojavljuju prilike slične vašem poslu.
                </div>
              )}
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Konkurencija</p>
                {competitorSnapshotSource === "live" ? (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                    Podaci uživo
                  </span>
                ) : competitorSnapshotSource === "demo" ? (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                    Demo primjer
                  </span>
                ) : null}
              </div>
              {subscriptionActive ? (
                competitorSnapshot.length > 0 ? (
                  competitorSnapshot.map((competitor) => (
                    <div key={competitor.jib} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-sm font-semibold text-slate-900">{competitor.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {competitor.wins} pobjeda · {competitor.win_rate !== null ? `${competitor.win_rate}% uspješnost` : "bez podatka"}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-6 text-slate-500">
                    Trenutno nema dovoljno stvarnih podataka za pregled konkurencije.
                  </div>
                )
              ) : (
                <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-sm leading-6 text-slate-600">
                  Pregled konkurencije je dostupan u pretplati kada želite odlučivati s više tržišnih informacija.
                  <Link href="/dashboard/subscription" className="mt-3 inline-flex items-center gap-2 font-semibold text-blue-700">
                    Pregled paketa
                    <ArrowUpRight className="size-4" />
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Planirano</p>
                <h2 className="mt-2 font-heading text-2xl font-bold text-slate-950">Šta dolazi uskoro</h2>
              </div>
              <CalendarDays className="size-5 text-violet-600" />
            </div>
            <div className="mt-5 space-y-3">
              {subscriptionActive ? (
                displayUpcomingRows.length > 0 ? (
                  displayUpcomingRows.slice(0, 3).map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <p className="line-clamp-2 text-sm font-semibold text-slate-900">{item.description || "Bez opisa"}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.contracting_authorities?.name ?? "Nepoznat naručilac"}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="rounded-full bg-white px-2.5 py-1 font-medium">{formatDate(item.planned_date)}</span>
                        {item.estimated_value ? (
                          <span className="rounded-full bg-violet-50 px-2.5 py-1 font-semibold text-violet-700">
                            {formatCompactCurrency(item.estimated_value)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-6 text-slate-500">
                    Trenutno nema planiranih nabavki za prikaz.
                  </div>
                )
              ) : (
                <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4 text-sm leading-6 text-slate-600">
                  Ovdje vidite nabavke prije objave, kada želite ranije planirati kapacitete i dokumente.
                  <Link href="/dashboard/subscription" className="mt-3 inline-flex items-center gap-2 font-semibold text-violet-700">
                    Otključaj planirano
                    <ArrowUpRight className="size-4" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
