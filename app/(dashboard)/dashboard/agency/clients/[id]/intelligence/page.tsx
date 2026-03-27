import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateMarketSummary } from "@/lib/ai/market-summary";
import { formatCurrencyKM } from "@/lib/currency";
import { getCompetitorAnalysis, getMarketOverview } from "@/lib/market-intelligence";
import {
  buildRecommendationContext,
  fetchRecommendedTenderCandidates,
  hasRecommendationSignals,
  selectTenderRecommendations,
} from "@/lib/tender-recommendations";
import { getSubscriptionStatus } from "@/lib/subscription";
import { CategoryChart } from "@/components/intelligence/category-chart";
import { CompetitorSignalChart } from "@/components/intelligence/competitor-signal-chart";
import { MonthlyAwardsChart } from "@/components/intelligence/monthly-awards-chart";
import { ProcedurePieChart } from "@/components/intelligence/procedure-pie-chart";
import {
  ArrowUpRight, Building2, CalendarDays, FileText, Radar, Swords, Trophy, TrendingUp,
} from "lucide-react";
import Link from "next/link";

export default async function AgencyClientIntelligencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: agencyClientId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { plan } = await getSubscriptionStatus(user.id, user.email, supabase);
  if (plan.id !== "agency") redirect("/dashboard");

  const { data: agencyClient } = await supabase
    .from("agency_clients")
    .select("id, company_id, companies ( id, name, jib, industry, keywords, cpv_codes, operating_regions )")
    .eq("id", agencyClientId)
    .eq("agency_user_id", user.id)
    .maybeSingle();
  if (!agencyClient) notFound();

  const company = agencyClient.companies as {
    id: string; name: string; jib: string;
    industry: string | null; keywords: string[] | null;
    cpv_codes: string[] | null; operating_regions: string[] | null;
  } | null;
  if (!company) notFound();

  const now = new Date();
  const base = `/dashboard/agency/clients/${agencyClientId}`;

  const marketOverview = await getMarketOverview(supabase, {
    jib: company.jib, industry: company.industry,
    keywords: company.keywords, cpv_codes: company.cpv_codes,
    operating_regions: company.operating_regions,
  });

  const hasJib = Boolean(company.jib);
  const competitorAnalysis = hasJib
    ? await getCompetitorAnalysis(supabase, {
        jib: company.jib, industry: company.industry,
        keywords: company.keywords || [], operating_regions: company.operating_regions || [],
      })
    : null;

  // Fetch existing bids so we exclude already-bid tenders (same as tenders page)
  const { data: existingBids } = await supabase.from("bids").select("tender_id").eq("company_id", company.id);
  const existingBidTenderIds = new Set((existingBids ?? []).map((b) => b.tender_id));

  let recommendedOpenCount: number | null = null;
  const recCtx = buildRecommendationContext(company);
  if (hasRecommendationSignals(recCtx)) {
    const rows = await fetchRecommendedTenderCandidates(supabase, recCtx, {
      select: "id, title, deadline, estimated_value, contracting_authority, contracting_authority_jib, contract_type, raw_description",
      nowIso: now.toISOString(), limit: 240,
    });
    const availableRows = rows.filter((r) => !existingBidTenderIds.has(r.id));
    recommendedOpenCount = selectTenderRecommendations(availableRows, recCtx, { minimumResults: 4 }).length;
  } else {
    recommendedOpenCount = 0;
  }

  const scopedCount = recommendedOpenCount ?? marketOverview.activeTenderCount;
  const openDesc = scopedCount > 0
    ? `${scopedCount} otvorenih tendera trenutno odgovara profilu i lokaciji klijenta.`
    : "Trenutno nema otvorenih tendera koji dovoljno odgovaraju profilu klijenta.";

  const competitors = competitorAnalysis?.competitors ?? [];
  const compAuthorities = competitorAnalysis?.authorities ?? [];
  const totalWins = competitorAnalysis?.totalCompetitorWins ?? 0;
  const totalValue = competitorAnalysis?.totalCompetitorValue ?? 0;
  const leader = competitors[0] ?? null;
  const hottest = [...competitors].sort((a, b) => b.recent_wins_90d - a.recent_wins_90d || b.wins - a.wins)[0] ?? null;

  const cards = [
    { title: "Tenderi za klijenta", value: String(scopedCount), description: openDesc, icon: FileText, tone: "bg-blue-50 text-blue-600", href: `${base}/tenders`, cta: "Otvori preporuke" },
    ...(marketOverview.activeTenderValueKnownCount > 0 ? [{ title: "Otvorena vrijednost", value: formatCurrencyKM(marketOverview.activeTenderValue), description: `Objavljena vrijednost za ${marketOverview.activeTenderValueKnownCount} od ${marketOverview.activeTenderCount} otvorenih tendera.`, icon: ArrowUpRight, tone: "bg-cyan-50 text-cyan-600", href: null as string | null, cta: null as string | null }] : []),
    ...(marketOverview.yearAwardValue > 0 ? [{ title: "Dodijeljeno ove godine", value: formatCurrencyKM(marketOverview.yearAwardValue), description: `Ukupna vrijednost ugovora u ${now.getFullYear()}. godini.`, icon: TrendingUp, tone: "bg-emerald-50 text-emerald-600", href: null as string | null, cta: null as string | null }] : []),
    ...(marketOverview.plannedCount90d > 0 ? [{ title: "Nadolazeći tenderi", value: String(marketOverview.plannedCount90d), description: marketOverview.plannedValueKnownCount > 0 ? `${formatCurrencyKM(marketOverview.plannedValue90d)} poznate vrijednosti.` : "Vrijednost još nije objavljena.", icon: CalendarDays, tone: "bg-violet-50 text-violet-600", href: `${base}/intelligence/upcoming`, cta: "Otvori planirane" }] : []),
  ];

  const hasCat = marketOverview.categoryData.length > 0;
  const hasProc = marketOverview.procedureData.length > 0;
  const hasMonthly = marketOverview.monthlyAwards.some((m) => m.count > 0 || m.total_value > 0);
  const hasAuth = marketOverview.topAuthorities.length > 0;
  const hasWinners = marketOverview.topWinners.length > 0;
  const hasUpcoming = marketOverview.upcomingPlans.length > 0;
  const hasComp = competitors.length > 0;

  const summary = await generateMarketSummary(marketOverview);

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2"><span className="flex h-6 items-center rounded-full border border-blue-100 bg-blue-50 px-2 text-[10px] font-bold uppercase tracking-wider text-blue-600">Tržišni uvid</span></div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">Analiza tržišta — {company.name}</h1>
          <p className="mt-1.5 max-w-3xl text-base text-slate-500">Ovdje vidite šta je trenutno otvoreno, gdje se dodjeljuju poslovi, šta dolazi uskoro i ko uzima poslove u prostoru koji klijent prati.</p>
        </div>
        <div className="hidden sm:block text-right">
          <p className="inline-block rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-600">Podaci uživo</p>
          <p className="mt-2 text-xs text-slate-500">{marketOverview.profileScoped ? `${marketOverview.matchedCategories.length} kategorija · ${marketOverview.matchedAuthorityCount} naručilaca iz profila klijenta` : "Dopunite profil klijenta za preciznije rezultate"}</p>
        </div>
      </div>

      {/* Market Summary */}
      <div className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-sm lg:p-7">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Sažetak za odluku</p>
            <h2 className="mt-2 font-heading text-2xl font-bold text-slate-950">{summary.title}</h2>
          </div>
          <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${summary.source === "ai" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
            {summary.source === "ai" ? "AI uvid" : "Sažetak iz podataka"}
          </span>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {summary.sentences.map((s, i) => (
            <div key={`${i}-${s.slice(0, 24)}`} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm leading-6 text-slate-700">{s}</div>
          ))}
        </div>
        <div className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-500">
          {marketOverview.profileScoped ? `Pregled sužen na ${marketOverview.matchedCategories.length} kategorija i ${marketOverview.matchedAuthorityCount} naručilaca.` : "Dopunite profil klijenta za preciznije rezultate."}
        </div>
      </div>

      {/* Primary Cards + Authorities */}
      <div className="grid gap-6 xl:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          {cards.map((c) => c.href ? (
            <Link key={c.title} href={c.href} className="group rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_40px_-28px_rgba(15,23,42,0.22)]">
              <div className="mb-4 flex items-center justify-between"><p className="text-sm font-bold uppercase tracking-wider text-slate-500">{c.title}</p><div className={`flex size-10 items-center justify-center rounded-xl ${c.tone}`}><c.icon className="size-5" /></div></div>
              <p className="font-heading text-4xl font-extrabold text-slate-900">{c.value}</p>
              <p className="mt-3 text-xs text-slate-500">{c.description}</p>
              <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 group-hover:text-primary">{c.cta}<ArrowUpRight className="size-3.5" /></div>
            </Link>
          ) : (
            <div key={c.title} className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between"><p className="text-sm font-bold uppercase tracking-wider text-slate-500">{c.title}</p><div className={`flex size-10 items-center justify-center rounded-xl ${c.tone}`}><c.icon className="size-5" /></div></div>
              <p className="font-heading text-4xl font-extrabold text-slate-900">{c.value}</p>
              <p className="mt-3 text-xs text-slate-500">{c.description}</p>
            </div>
          ))}
        </div>
        {hasAuth && (
          <div className="rounded-[1.5rem] border border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/30 p-6"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600"><Building2 className="size-5" /></div><div><h2 className="font-heading text-lg font-bold text-slate-900">Najaktivniji naručioci u prostoru klijenta</h2><p className="text-xs font-medium text-slate-500">Po broju tendera i dostupnoj vrijednosti.</p></div></div></div>
            <div className="flex-1 p-2"><div className="space-y-1">
              {marketOverview.topAuthorities.map((a, i) => (
                <div key={`${a.name}-${i}`} className="flex items-center justify-between rounded-xl px-4 py-3 hover:bg-slate-50 group">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600">{i + 1}</div>
                    <div className="min-w-0">
                      {a.jib ? <Link href={`/dashboard/intelligence/authority/${a.jib}`} className="truncate text-sm font-bold text-slate-700 group-hover:text-primary">{a.name}</Link> : <span className="truncate text-sm font-bold text-slate-700">{a.name}</span>}
                      <p className="text-xs text-slate-500">{[a.city, a.authority_type].filter(Boolean).join(" · ") || "Javni naručilac"}</p>
                    </div>
                  </div>
                  <div className="ml-4 shrink-0 text-right"><p className="text-sm font-bold text-slate-900">{a.count}</p>{a.total_value > 0 && <p className="text-xs text-slate-400">{formatCurrencyKM(a.total_value)}</p>}</div>
                </div>
              ))}
            </div></div>
          </div>
        )}
      </div>

      {/* Category Chart */}
      {hasCat && (
        <div className="rounded-[1.5rem] border border-slate-100 bg-white p-8 shadow-sm">
          <div className="mb-8 flex items-center justify-between gap-4"><div><h2 className="font-heading text-xl font-bold text-slate-900">Ugovori po kategorijama</h2><p className="mt-1 text-sm text-slate-500">Pregled broja i vrijednosti ugovora za {now.getFullYear()}. godinu.</p></div></div>
          <div className="h-[350px] w-full"><CategoryChart data={marketOverview.categoryData} /></div>
        </div>
      )}

      {/* Procedure + Monthly */}
      {(hasProc || hasMonthly) && (
        <div className="grid gap-8 lg:grid-cols-2">
          {hasProc && (
            <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm">
              <div className="border-b border-slate-100 pb-5"><h2 className="font-heading text-lg font-bold text-slate-900">Vrste postupaka</h2><p className="mt-1 text-xs text-slate-500">Raspodjela po tipu postupka u prostoru klijenta.</p></div>
              <div className="mt-5 h-[320px] w-full"><ProcedurePieChart data={marketOverview.procedureData} /></div>
            </div>
          )}
          {hasMonthly && (
            <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm">
              <div className="border-b border-slate-100 pb-5"><h2 className="font-heading text-lg font-bold text-slate-900">Trend po mjesecima</h2><p className="mt-1 text-xs text-slate-500">Broj i vrijednost dodijeljenih ugovora za sve mjesece ove godine.</p></div>
              <div className="mt-5 h-[320px] w-full"><MonthlyAwardsChart data={marketOverview.monthlyAwards} /></div>
            </div>
          )}
        </div>
      )}

      {/* Top Winners */}
      {hasWinners && (
        <div className="rounded-[1.5rem] border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/30 p-6"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600"><Trophy className="size-5" /></div><div><h2 className="font-heading text-lg font-bold text-slate-900">Najaktivniji ponuđači u prostoru klijenta</h2><p className="text-xs font-medium text-slate-500">Po osvojenim poslovima.</p></div></div></div>
          <div className="flex-1 p-2"><div className="space-y-1">
            {marketOverview.topWinners.map((w, i) => (
              <Link href={`/dashboard/intelligence/company/${w.jib}`} key={w.jib} className="flex items-center justify-between rounded-xl px-4 py-3 hover:bg-slate-50 group">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-600">{i + 1}</div>
                  <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-700 group-hover:text-primary">{w.name}</p><p className="text-xs text-slate-500">{w.wins} ugovora{w.win_rate !== null ? ` · ${w.win_rate}% uspješnost` : ""}</p></div>
                </div>
                <div className="ml-4 shrink-0 text-right">{w.total_value > 0 && <p className="text-sm font-bold text-emerald-600">{formatCurrencyKM(w.total_value)}</p>}<p className="text-xs text-slate-400">{w.total_bids !== null ? `${w.total_bids} ponuda` : w.city || w.municipality || "—"}</p></div>
              </Link>
            ))}
          </div></div>
        </div>
      )}

      {/* Upcoming */}
      {hasUpcoming && (
        <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-5"><div><h2 className="font-heading text-lg font-bold text-slate-900">Nadolazeći tenderi</h2><p className="mt-1 text-xs text-slate-500">Planirane nabavke u prostoru klijenta u narednih 90 dana.</p></div><CalendarDays className="size-5 text-violet-600" /></div>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {marketOverview.upcomingPlans.slice(0, 5).map((p) => (
              <div key={p.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="line-clamp-2 text-sm font-semibold text-slate-900">{p.description || "Bez opisa"}</p>
                <p className="mt-1 text-xs text-slate-500">{p.contracting_authorities?.name ?? "—"}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-white px-2.5 py-1 font-medium">{p.planned_date ? new Date(p.planned_date).toLocaleDateString("bs-Latn-BA", { day: "numeric", month: "long", year: "numeric" }) : "—"}</span>
                  {p.contract_type && <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium">{p.contract_type}</span>}
                  {p.estimated_value && <span className="rounded-full bg-violet-50 px-2.5 py-1 font-semibold text-violet-700">{formatCurrencyKM(p.estimated_value)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Competition */}
      <div id="konkurencija" className="scroll-mt-24 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div><h2 className="font-heading text-2xl font-bold text-slate-950">Ko uzima poslove klijentu</h2><p className="mt-1 text-sm text-slate-500">Firme koje pobjeđuju u istim kategorijama i kod istih naručilaca u prostoru koji klijent prati.</p></div>
          <Swords className="size-5 text-rose-600" />
        </div>

        {hasComp ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Link href="#direct-rivals" className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm hover:border-rose-200 hover:bg-rose-50/30">
                <div className="flex items-center justify-between"><p className="text-sm font-semibold text-slate-500">Direktni rivali</p><Swords className="size-5 text-rose-600" /></div>
                <p className="mt-4 font-heading text-3xl font-bold text-slate-950">{competitors.length}</p>
                <p className="mt-2 text-sm text-slate-500">Firmi koje izlaze na istom tržištu.</p>
              </Link>
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between"><p className="text-sm font-semibold text-slate-500">Ukupne pobjede</p><Trophy className="size-5 text-amber-500" /></div>
                <p className="mt-4 font-heading text-3xl font-bold text-slate-950">{totalWins}</p>
                <p className="mt-2 text-sm text-slate-500">Osvojenih ugovora u praćenom prostoru.</p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between"><p className="text-sm font-semibold text-slate-500">Ugovorena vrijednost</p><TrendingUp className="size-5 text-blue-600" /></div>
                <p className="mt-4 font-heading text-3xl font-bold text-slate-950">{formatCurrencyKM(totalValue)}</p>
                <p className="mt-2 text-sm text-slate-500">Vrijednost poslova praćene konkurencije.</p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between"><p className="text-sm font-semibold text-slate-500">Najjači rival</p><Radar className="size-5 text-violet-600" /></div>
                <p className="mt-4 text-lg font-bold text-slate-950">{leader?.name ?? "—"}</p>
                <p className="mt-2 text-sm text-slate-500">{leader ? `${leader.wins} pobjeda · ${formatCurrencyKM(leader.total_value)}` : "Nema podataka."}</p>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-5"><div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Signal konkurencije</p><h2 className="mt-2 font-heading text-2xl font-bold text-slate-950">Ko najjače pritiska prostor klijenta</h2></div><Radar className="size-5 text-violet-600" /></div>
                <div className="mt-5 h-[320px] w-full">
                  <CompetitorSignalChart data={competitors.slice(0, 8).map((c) => ({ name: c.name, signal_score: c.signal_score, wins: c.wins, recent_wins_90d: c.recent_wins_90d }))} />
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="border-b border-slate-100 pb-5"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Sažetak</p><h2 className="mt-2 font-heading text-2xl font-bold text-slate-950">Ko vuče poslove ispred klijenta</h2></div>
                <div className="mt-5 grid gap-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Najjači rival</p><p className="mt-3 text-sm font-bold text-slate-900">{leader?.name ?? "—"}</p><p className="mt-1 text-xs text-slate-500">{leader ? `${leader.wins} pobjeda · signal ${leader.signal_score}` : "—"}</p></div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Najveća forma 90 dana</p><p className="mt-3 text-sm font-bold text-slate-900">{hottest?.name ?? "—"}</p><p className="mt-1 text-xs text-slate-500">{hottest ? `${hottest.recent_wins_90d} svježih pobjeda` : "—"}</p></div>
                </div>
              </div>
            </div>

            <div id="direct-rivals" className="scroll-mt-24 rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-5"><div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Direktni rivali</p><h2 className="mt-2 font-heading text-2xl font-bold text-slate-950">Lista rivala koje trebate pratiti</h2></div><Swords className="size-5 text-rose-600" /></div>
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {competitors.slice(0, 9).map((c) => (
                  <Link href={`/dashboard/intelligence/company/${c.jib}`} key={`${c.jib}-card`} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 hover:border-rose-200 hover:bg-white">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="text-sm font-bold text-slate-900">{c.name}</p><p className="mt-1 text-xs text-slate-500">{c.recent_wins_90d} pobjeda u 90 dana · {c.authority_count} naručilaca</p></div>
                      <span className="inline-flex rounded-md bg-violet-50 px-2 py-1 text-xs font-bold text-violet-700">{c.signal_score}</span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-500">
                      <div className="rounded-xl bg-white px-3 py-2"><p className="font-semibold text-slate-900">{c.wins}</p><p>Pobjede</p></div>
                      <div className="rounded-xl bg-white px-3 py-2"><p className="font-semibold text-slate-900">{formatCurrencyKM(c.total_value)}</p><p>Vrijednost</p></div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-1.5">{c.categories.slice(0, 3).map((cat) => (<span key={`${c.jib}-${cat}`} className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600">{cat}</span>))}</div>
                  </Link>
                ))}
              </div>
            </div>

            {compAuthorities.length > 0 && (
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-5"><div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Naručioci</p><h2 className="mt-2 font-heading text-2xl font-bold text-slate-950">Naručioci gdje konkurencija najčešće pobjeđuje</h2></div><Building2 className="size-5 text-blue-600" /></div>
                <div className="mt-5 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                  {compAuthorities.map((a) => {
                    const content = (<><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-900">{a.name}</p><p className="mt-1 text-xs text-slate-500">{[a.city, a.authority_type].filter(Boolean).join(" · ") || "Javni naručilac"}</p></div><ArrowUpRight className="size-4 text-slate-300" /></div><div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500"><span className="rounded-full bg-white px-2.5 py-1 font-medium">{a.awards} odluka</span><span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700">{a.unique_winners} pobjednika</span></div></>);
                    return a.jib ? (
                      <Link key={`${a.jib}-${a.name}`} href={`/dashboard/intelligence/authority/${a.jib}`} className="block rounded-2xl border border-slate-200 bg-slate-50/70 p-4 hover:border-blue-200 hover:bg-white">{content}</Link>
                    ) : (
                      <div key={a.name} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">{content}</div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-8 text-sm text-slate-500">
            Za trenutni profil klijenta još nema dovoljno javnih odluka da izdvojimo jasnu konkurenciju.
          </div>
        )}
      </div>
    </div>
  );
}
