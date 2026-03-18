import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  demoCompetitors,
  demoTopAuthorities,
  demoTopWinners,
  demoUpcomingProcurements,
  isCompanyProfileComplete,
  isDemoUser,
} from "@/lib/demo";
import { generateMarketSummary } from "@/lib/ai/market-summary";
import { formatCurrencyKM } from "@/lib/currency";
import { getCompetitorAnalysis, getMarketOverview } from "@/lib/market-intelligence";
import {
  buildRecommendationContext,
  fetchRecommendedTenderCandidates,
  hasRecommendationSignals,
  rankTenderRecommendations,
} from "@/lib/tender-recommendations";
import { getSubscriptionStatus } from "@/lib/subscription";
import { ProGate } from "@/components/subscription/pro-gate";
import { CategoryChart } from "@/components/intelligence/category-chart";
import { CompetitorSignalChart } from "@/components/intelligence/competitor-signal-chart";
import { MonthlyAwardsChart } from "@/components/intelligence/monthly-awards-chart";
import { ProcedurePieChart } from "@/components/intelligence/procedure-pie-chart";
import type { Company } from "@/types/database";
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  FileText,
  Radar,
  Swords,
  Trophy,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

export default async function IntelligencePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const isDemoAccount = isDemoUser(user.email);
  const { isSubscribed } = await getSubscriptionStatus(user.id, user.email);
  if (!isSubscribed) return <ProGate />;

  const now = new Date();
  const { data: companyData } = await supabase
    .from("companies")
    .select("jib, industry, keywords, cpv_codes, operating_regions")
    .eq("user_id", user.id)
    .maybeSingle();

  const company = companyData as Pick<Company, "jib" | "industry" | "keywords" | "cpv_codes" | "operating_regions"> | null;
  const hasCompleteProfile = isCompanyProfileComplete(company ?? undefined);
  const marketOverview = await getMarketOverview(supabase, company ?? undefined);
  const competitorAnalysis = hasCompleteProfile && company
    ? await getCompetitorAnalysis(supabase, company)
    : null;

  let recommendedOpenCount: number | null = null;

  if (company) {
    const recommendationContext = buildRecommendationContext(company);
    if (hasRecommendationSignals(recommendationContext)) {
      const scopedRecommendationRows = await fetchRecommendedTenderCandidates(supabase, recommendationContext, {
        select: "id, title, deadline, estimated_value, contracting_authority, contracting_authority_jib, contract_type, raw_description, cpv_code",
        nowIso: now.toISOString(),
        limit: 240,
      });

      recommendedOpenCount = rankTenderRecommendations(
        scopedRecommendationRows,
        recommendationContext
      ).length;
    } else {
      recommendedOpenCount = 0;
    }
  }

  const recommendedScopedCount = recommendedOpenCount ?? marketOverview.activeTenderCount;
  const openTenderCardDescription = recommendedOpenCount !== null
    ? `U vašem prostoru je otvoreno ${marketOverview.activeTenderCount}, a ${recommendedScopedCount} trenutno jasno odgovara profilu.`
    : "Tenderi koji trenutno najviše odgovaraju vašem profilu i području rada.";
  const displayCategoryData = marketOverview.categoryData.length > 0
    ? marketOverview.categoryData
    : isDemoAccount
      ? [
          { category: "Robe", count: 8, total_value: 420000 },
          { category: "Usluge", count: 5, total_value: 275000 },
          { category: "Softver", count: 3, total_value: 180000 },
        ]
      : [];
  const displayTopAuthorities = marketOverview.topAuthorities.length > 0
    ? marketOverview.topAuthorities
    : isDemoAccount
      ? demoTopAuthorities.map((authority) => ({
          ...authority,
          total_value: 0,
          city: null,
          authority_type: null,
        }))
      : [];
  const displayTopWinners = marketOverview.topWinners.length > 0
    ? marketOverview.topWinners
    : isDemoAccount
      ? demoTopWinners.map((winner) => ({
          ...winner,
          win_rate: null,
          total_bids: null,
          city: null,
          municipality: null,
        }))
      : [];
  const displayUpcomingPlans = marketOverview.upcomingPlans.length > 0
    ? marketOverview.upcomingPlans
    : isDemoAccount
      ? demoUpcomingProcurements.slice(0, 4)
      : [];
  const displayProcedureData = marketOverview.procedureData.length > 0
    ? marketOverview.procedureData
    : isDemoAccount
      ? [
          { procedure_type: "Otvoreni postupak", count: 12, total_value: 880000, avg_bidders: 4.2, avg_discount: 7.5 },
          { procedure_type: "Konkurentski zahtjev", count: 6, total_value: 310000, avg_bidders: 3.1, avg_discount: 4.1 },
          { procedure_type: "Direktni sporazum", count: 4, total_value: 90000, avg_bidders: null, avg_discount: null },
        ]
      : [];
  const displayMonthlyAwards = marketOverview.monthlyAwards.length > 0
    ? marketOverview.monthlyAwards
    : isDemoAccount
      ? [
          { month_key: "2026-01", label: "jan 2026", count: 5, total_value: 180000 },
          { month_key: "2026-02", label: "feb 2026", count: 6, total_value: 245000 },
          { month_key: "2026-03", label: "mar 2026", count: 4, total_value: 210000 },
          { month_key: "2026-04", label: "apr 2026", count: 8, total_value: 390000 },
          { month_key: "2026-05", label: "maj 2026", count: 7, total_value: 320000 },
          { month_key: "2026-06", label: "jun 2026", count: 9, total_value: 470000 },
        ]
      : [];

  let displayCompetitors = competitorAnalysis?.competitors ?? [];
  let usingCompetitionDemoFallback = false;

  if (displayCompetitors.length === 0 && isDemoAccount) {
    usingCompetitionDemoFallback = true;
    displayCompetitors = demoCompetitors.map((competitor) => ({
      name: competitor.name,
      jib: competitor.jib,
      wins: competitor.wins,
      total_value: competitor.total_value,
      categories: competitor.categories,
      procedure_types: [],
      last_win_date: competitor.last_win_date,
      win_rate: competitor.win_rate,
      total_bids: null,
      total_market_wins: null,
      total_market_value: null,
      city: null,
      municipality: null,
      recent_wins_90d: 0,
      recent_value_90d: 0,
      avg_award_value: competitor.wins > 0 ? Math.round(competitor.total_value / competitor.wins) : null,
      avg_discount: null,
      avg_bidders: null,
      authority_count: 0,
      top_authorities: [],
      category_match_wins: 0,
      authority_match_wins: 0,
      signal_score: competitor.wins,
    }));
  }

  const competitionAuthorities = competitorAnalysis?.authorities ?? [];
  const displayTotalWins = usingCompetitionDemoFallback
    ? displayCompetitors.reduce((sum, competitor) => sum + competitor.wins, 0)
    : competitorAnalysis?.totalCompetitorWins ?? 0;
  const displayTotalValue = usingCompetitionDemoFallback
    ? displayCompetitors.reduce((sum, competitor) => sum + competitor.total_value, 0)
    : competitorAnalysis?.totalCompetitorValue ?? 0;
  const leadingCompetitor = displayCompetitors[0] ?? null;
  const hottestCompetitor = [...displayCompetitors].sort(
    (a, b) => b.recent_wins_90d - a.recent_wins_90d || b.wins - a.wins
  )[0] ?? null;

  const primaryCards = [
    {
      title: "Tenderi za vas",
      value: String(recommendedScopedCount),
      description: openTenderCardDescription,
      icon: FileText,
      tone: "bg-blue-50 text-blue-600",
    },
    ...(marketOverview.activeTenderValueKnownCount > 0
      ? [{
          title: "Otvorena vrijednost",
          value: formatCurrencyKM(marketOverview.activeTenderValue),
          description: `Objavljena vrijednost postoji za ${marketOverview.activeTenderValueKnownCount} od ${marketOverview.activeTenderCount} otvorenih tendera.`,
          icon: ArrowUpRight,
          tone: "bg-cyan-50 text-cyan-600",
        }]
      : []),
    ...(marketOverview.yearAwardValue > 0
      ? [{
          title: "Dodijeljeno ove godine",
          value: formatCurrencyKM(marketOverview.yearAwardValue),
          description: `Ukupna vrijednost ugovora u ${now.getFullYear()}. godini.`,
          icon: TrendingUp,
          tone: "bg-emerald-50 text-emerald-600",
        }]
      : []),
    ...(marketOverview.plannedCount90d > 0
      ? [{
          title: "Nadolazeći tenderi",
          value: String(marketOverview.plannedCount90d),
          description: marketOverview.plannedValueKnownCount > 0
            ? `${formatCurrencyKM(marketOverview.plannedValue90d)} poznate vrijednosti za ranije planiranje.`
            : "Vrijednost još nije objavljena za nadolazeće tendere.",
          icon: CalendarDays,
          tone: "bg-violet-50 text-violet-600",
        }]
      : []),
  ];

  const showCategorySection = displayCategoryData.length > 0;
  const showProcedureSection = displayProcedureData.length > 0;
  const showMonthlySection = displayMonthlyAwards.some(
    (item) => item.count > 0 || item.total_value > 0
  );
  const showAuthoritiesSection = displayTopAuthorities.length > 0;
  const showWinnersSection = displayTopWinners.length > 0;
  const showUpcomingSection = displayUpcomingPlans.length > 0;
  const showCompetitionSection = displayCompetitors.length > 0;

  const usingAnyDemoFallback =
    (displayCategoryData.length === 0 && isDemoAccount) ||
    (marketOverview.topAuthorities.length === 0 && displayTopAuthorities.length > 0) ||
    (marketOverview.topWinners.length === 0 && displayTopWinners.length > 0) ||
    (marketOverview.upcomingPlans.length === 0 && displayUpcomingPlans.length > 0) ||
    usingCompetitionDemoFallback;
  const marketSummary = await generateMarketSummary(marketOverview);

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-6 items-center rounded-full border border-blue-100 bg-blue-50 px-2 text-[10px] font-bold uppercase tracking-wider text-blue-600">
              Tržišni uvid
            </span>
          </div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">
            Analiza tržišta
          </h1>
          <p className="mt-1.5 max-w-3xl text-base text-slate-500">
            Ovdje vidite šta je trenutno otvoreno, gdje se dodjeljuju poslovi, šta dolazi uskoro i ko vam uzima poslove u prostoru koji pratite.
          </p>
        </div>
        <div className="hidden sm:block text-right">
          <p className={`inline-block rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${usingAnyDemoFallback ? "border-amber-100 bg-amber-50 text-amber-700" : "border-emerald-100 bg-emerald-50 text-emerald-600"}`}>
            {usingAnyDemoFallback ? "Demo primjer" : "Podaci uživo"}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {marketOverview.profileScoped
              ? `${marketOverview.matchedCategories.length} kategorija · ${marketOverview.matchedAuthorityCount} naručilaca iz vašeg profila`
              : "Dodajte djelatnost, vrste tendera ili regije da pregled bude sužen samo na vaše tržište"}
          </p>
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-sm lg:p-7">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Sažetak za odluku</p>
            <h2 className="mt-2 font-heading text-2xl font-bold text-slate-950">{marketSummary.title}</h2>
          </div>
          <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${marketSummary.source === "ai" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
            {marketSummary.source === "ai" ? "AI uvid" : "Sažetak iz podataka"}
          </span>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {marketSummary.sentences.map((sentence, index) => (
            <div key={`${index}-${sentence.slice(0, 24)}`} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm leading-6 text-slate-700">
              {sentence}
            </div>
          ))}
        </div>
        <div className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-500">
          {marketOverview.profileScoped
            ? `Pregled je sužen na ${marketOverview.matchedCategories.length} relevantnih kategorija i ${marketOverview.matchedAuthorityCount} naručilaca iz vašeg profila.`
            : "Kad dopunite profil, ovdje ćete vidjeti samo svoje tržište."}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          {primaryCards.map((card) => (
            <div key={card.title} className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-bold uppercase tracking-wider text-slate-500">{card.title}</p>
                <div className={`flex size-10 items-center justify-center rounded-xl ${card.tone}`}>
                  <card.icon className="size-5" />
                </div>
              </div>
              <p className="font-heading text-4xl font-extrabold text-slate-900">{card.value}</p>
              <p className="mt-3 text-xs text-slate-500">{card.description}</p>
            </div>
          ))}
        </div>

        {showAuthoritiesSection ? (
          <div className="rounded-[1.5rem] border border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/30 p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  <Building2 className="size-5" />
                </div>
                <div>
                  <h2 className="font-heading text-lg font-bold text-slate-900">Najaktivniji naručioci u vašem prostoru</h2>
                  <p className="text-xs font-medium text-slate-500">Po broju tendera i dostupnoj vrijednosti.</p>
                </div>
              </div>
            </div>
            <div className="flex-1 p-2">
              <div className="space-y-1">
                {displayTopAuthorities.map((authority, index) => (
                  <div key={`${authority.name}-${index}`} className="flex items-center justify-between rounded-xl px-4 py-3 transition-colors hover:bg-slate-50 group">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 transition-colors group-hover:bg-blue-100 group-hover:text-blue-600">
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        {authority.jib ? (
                          <Link href={`/dashboard/intelligence/authority/${authority.jib}`} className="truncate text-sm font-bold text-slate-700 transition-colors group-hover:text-primary">
                            {authority.name}
                          </Link>
                        ) : (
                          <span className="truncate text-sm font-bold text-slate-700">{authority.name}</span>
                        )}
                        <p className="text-xs text-slate-500">{[authority.city, authority.authority_type].filter(Boolean).join(" · ") || "Javni naručilac"}</p>
                      </div>
                    </div>
                    <div className="ml-4 shrink-0 text-right">
                      <p className="text-sm font-bold text-slate-900">{authority.count}</p>
                      {authority.total_value > 0 ? (
                        <p className="text-xs text-slate-400">{formatCurrencyKM(authority.total_value)}</p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {showCategorySection ? (
        <div className="rounded-[1.5rem] border border-slate-100 bg-white p-8 shadow-sm">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-heading text-xl font-bold text-slate-900">Ugovori po kategorijama</h2>
              <p className="mt-1 text-sm text-slate-500">Pregled broja i vrijednosti ugovora za {now.getFullYear()}. godinu.</p>
            </div>
            <div className="hidden sm:block rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500">
              Broj + vrijednost
            </div>
          </div>
          <div className="h-[350px] w-full">
            <CategoryChart data={displayCategoryData} />
          </div>
        </div>
      ) : null}

      {(showProcedureSection || showMonthlySection) ? (
        <div className="grid gap-8 lg:grid-cols-2">
          {showProcedureSection ? (
            <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm">
              <div className="border-b border-slate-100 pb-5">
                <h2 className="font-heading text-lg font-bold text-slate-900">Vrste postupaka</h2>
                <p className="mt-1 text-xs text-slate-500">Raspodjela po tipu postupka u vašem prostoru.</p>
              </div>
              <div className="mt-5 h-[320px] w-full">
                <ProcedurePieChart data={displayProcedureData} />
              </div>
            </div>
          ) : null}

          {showMonthlySection ? (
            <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm">
              <div className="border-b border-slate-100 pb-5">
                <h2 className="font-heading text-lg font-bold text-slate-900">Trend po mjesecima</h2>
                <p className="mt-1 text-xs text-slate-500">Broj i vrijednost dodijeljenih ugovora za sve mjesece ove godine.</p>
              </div>
              <div className="mt-5 h-[320px] w-full">
                <MonthlyAwardsChart data={displayMonthlyAwards} />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {showWinnersSection ? (
        <div className="rounded-[1.5rem] border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/30 p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <Trophy className="size-5" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold text-slate-900">Najaktivniji ponuđači u vašem prostoru</h2>
                <p className="text-xs font-medium text-slate-500">Po osvojenim poslovima u prostoru koji pratite.</p>
              </div>
            </div>
          </div>
          <div className="flex-1 p-2">
            <div className="space-y-1">
              {displayTopWinners.map((winner, index) => (
                <div key={winner.jib} className="flex items-center justify-between rounded-xl px-4 py-3 transition-colors hover:bg-slate-50 group">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 transition-colors group-hover:bg-emerald-100 group-hover:text-emerald-600">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-700 transition-colors group-hover:text-primary">{winner.name}</p>
                      <p className="text-xs text-slate-500">{winner.wins} ugovora{winner.win_rate !== null ? ` · ${winner.win_rate}% uspješnost` : ""}</p>
                    </div>
                  </div>
                  <div className="ml-4 shrink-0 text-right">
                    {winner.total_value > 0 ? (
                      <p className="text-sm font-bold text-emerald-600">{formatCurrencyKM(winner.total_value)}</p>
                    ) : null}
                    <p className="text-xs text-slate-400">{winner.total_bids !== null ? `${winner.total_bids} ponuda` : winner.city || winner.municipality || "—"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {showUpcomingSection ? (
        <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-5">
            <div>
              <h2 className="font-heading text-lg font-bold text-slate-900">Nadolazeći tenderi</h2>
              <p className="mt-1 text-xs text-slate-500">Planirane nabavke u vašem prostoru u narednih 90 dana.</p>
            </div>
            <CalendarDays className="size-5 text-violet-600" />
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {displayUpcomingPlans.map((plan) => (
              <div key={plan.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="line-clamp-2 text-sm font-semibold text-slate-900">{plan.description || "Bez opisa"}</p>
                <p className="mt-1 text-xs text-slate-500">{plan.contracting_authorities?.name ?? "Nepoznat naručilac"}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-white px-2.5 py-1 font-medium">
                    {plan.planned_date ? new Date(plan.planned_date).toLocaleDateString("bs-BA") : "—"}
                  </span>
                  {plan.contract_type ? (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium">
                      {plan.contract_type}
                    </span>
                  ) : null}
                  {plan.estimated_value ? (
                    <span className="rounded-full bg-violet-50 px-2.5 py-1 font-semibold text-violet-700">
                      {formatCurrencyKM(plan.estimated_value)}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div id="konkurencija" className="scroll-mt-24 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="font-heading text-2xl font-bold text-slate-950">Ko vam uzima poslove</h2>
            <p className="mt-1 text-sm text-slate-500">
              Firme koje pobjeđuju u istim kategorijama i kod istih naručilaca u prostoru koji pratite.
            </p>
          </div>
          <Swords className="size-5 text-rose-600" />
        </div>

        {showCompetitionSection ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Link href="#direct-rivals" className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-rose-200 hover:bg-rose-50/30">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-500">Direktni rivali</p>
                  <Swords className="size-5 text-rose-600" />
                </div>
                <p className="mt-4 font-heading text-3xl font-bold text-slate-950">{displayCompetitors.length}</p>
                <p className="mt-2 text-sm text-slate-500">Firmi koje vam izlaze na istom tržištu.</p>
              </Link>
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-500">Ukupne pobjede</p>
                  <Trophy className="size-5 text-amber-500" />
                </div>
                <p className="mt-4 font-heading text-3xl font-bold text-slate-950">{displayTotalWins}</p>
                <p className="mt-2 text-sm text-slate-500">Broj osvojenih ugovora u praćenom prostoru.</p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-500">Ugovorena vrijednost</p>
                  <TrendingUp className="size-5 text-blue-600" />
                </div>
                <p className="mt-4 font-heading text-3xl font-bold text-slate-950">{formatCurrencyKM(displayTotalValue)}</p>
                <p className="mt-2 text-sm text-slate-500">Vrijednost poslova koje uzima praćena konkurencija.</p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-500">Najjači rival</p>
                  <Radar className="size-5 text-violet-600" />
                </div>
                <p className="mt-4 text-lg font-bold text-slate-950">{leadingCompetitor?.name ?? "—"}</p>
                <p className="mt-2 text-sm text-slate-500">
                  {leadingCompetitor ? `${leadingCompetitor.wins} pobjeda · ${formatCurrencyKM(leadingCompetitor.total_value)}` : "Nema dovoljno podataka."}
                </p>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Signal konkurencije</p>
                    <h2 className="mt-2 font-heading text-2xl font-bold text-slate-950">Ko trenutno najjače pritiska vaš prostor</h2>
                  </div>
                  <Radar className="size-5 text-violet-600" />
                </div>
                <div className="mt-5 h-[320px] w-full">
                  <CompetitorSignalChart
                    data={displayCompetitors.slice(0, 8).map((competitor) => ({
                      name: competitor.name,
                      signal_score: competitor.signal_score,
                      wins: competitor.wins,
                      recent_wins_90d: competitor.recent_wins_90d,
                    }))}
                  />
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="border-b border-slate-100 pb-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Sažetak</p>
                  <h2 className="mt-2 font-heading text-2xl font-bold text-slate-950">Ko trenutno vuče poslove ispred vas</h2>
                </div>
                <div className="mt-5 grid gap-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Najjači rival</p>
                    <p className="mt-3 text-sm font-bold text-slate-900">{leadingCompetitor?.name ?? "—"}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {leadingCompetitor ? `${leadingCompetitor.wins} pobjeda · signal ${leadingCompetitor.signal_score}` : "—"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Najveća forma 90 dana</p>
                    <p className="mt-3 text-sm font-bold text-slate-900">{hottestCompetitor?.name ?? "—"}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {hottestCompetitor ? `${hottestCompetitor.recent_wins_90d} svježih pobjeda` : "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div id="direct-rivals" className="scroll-mt-24 rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Direktni rivali</p>
                  <h2 className="mt-2 font-heading text-2xl font-bold text-slate-950">Lista rivala koje trebate pratiti</h2>
                </div>
                <Swords className="size-5 text-rose-600" />
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {displayCompetitors.slice(0, 9).map((competitor) => (
                  <div key={`${competitor.jib}-card`} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{competitor.name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {competitor.recent_wins_90d} pobjeda u 90 dana · {competitor.authority_count} naručilaca
                        </p>
                      </div>
                      <span className="inline-flex rounded-md bg-violet-50 px-2 py-1 text-xs font-bold text-violet-700">
                        {competitor.signal_score}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-500">
                      <div className="rounded-xl bg-white px-3 py-2">
                        <p className="font-semibold text-slate-900">{competitor.wins}</p>
                        <p>Pobjede</p>
                      </div>
                      <div className="rounded-xl bg-white px-3 py-2">
                        <p className="font-semibold text-slate-900">{formatCurrencyKM(competitor.total_value)}</p>
                        <p>Vrijednost</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {competitor.categories.slice(0, 3).map((category) => (
                        <span key={`${competitor.jib}-${category}`} className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600">
                          {category}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {competitionAuthorities.length > 0 ? (
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Naručioci</p>
                    <h2 className="mt-2 font-heading text-2xl font-bold text-slate-950">Naručioci gdje konkurencija najčešće pobjeđuje</h2>
                  </div>
                  <Building2 className="size-5 text-blue-600" />
                </div>
                <div className="mt-5 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                  {competitionAuthorities.map((authority) => {
                    const content = (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{authority.name}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {[authority.city, authority.authority_type].filter(Boolean).join(" · ") || "Javni naručilac"}
                            </p>
                          </div>
                          <ArrowUpRight className="size-4 text-slate-300" />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                          <span className="rounded-full bg-white px-2.5 py-1 font-medium">{authority.awards} odluka</span>
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700">{authority.unique_winners} pobjednika</span>
                        </div>
                      </>
                    );

                    return authority.jib ? (
                      <Link
                        key={`${authority.jib}-${authority.name}`}
                        href={`/dashboard/intelligence/authority/${authority.jib}`}
                        className="block rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition-colors hover:border-blue-200 hover:bg-white"
                      >
                        {content}
                      </Link>
                    ) : (
                      <div key={authority.name} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        {content}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-8 text-sm text-slate-500">
            Za vaš trenutni profil još nema dovoljno javnih odluka da izdvojimo jasnu konkurenciju.
          </div>
        )}
      </div>
    </div>
  );
}
