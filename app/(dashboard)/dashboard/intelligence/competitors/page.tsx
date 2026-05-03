import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { BarChart3, Building2, FileText, Info, Scale, Swords, Users } from "lucide-react";

import { AIInsightBox } from "@/components/ui/ai-insight-box";
import { Button } from "@/components/ui/button";
import { CircularProgressScore } from "@/components/ui/circular-progress-score";
import { DonutChart } from "@/components/ui/donut-chart";
import { EmptyState } from "@/components/ui/empty-state";
import { LineAreaChart } from "@/components/ui/line-area-chart";
import { StatCard } from "@/components/ui/stat-card";
import { ProGate } from "@/components/subscription/pro-gate";
import { getCompetitors, getSimilarTenders } from "@/lib/competitor-intelligence";
import { formatKm } from "@/lib/dashboard-trziste";
import { getCompetitorAnalysis } from "@/lib/market-intelligence";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription";
import { getUserBidStats } from "@/lib/user-bid-analytics";

export const dynamic = "force-dynamic";

export default async function CompetitorsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { isSubscribed } = await getSubscriptionStatus(user.id, user.email);
  if (!isSubscribed) {
    return <ProGate />;
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, jib, industry, keywords, operating_regions, cpv_codes")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!company) {
    return (
      <EmptyState
        icon={<Building2 className="size-7" aria-hidden="true" />}
        title="Firma nije podesena"
        description="Dodajte profil firme da bi konkurentska analiza koristila vas JIB, CPV i regije."
      />
    );
  }

  const primaryCpv = Array.isArray(company.cpv_codes) ? company.cpv_codes[0] : null;
  const [analysis, directCompetitors, similarTenders, userStats] = await Promise.all([
    getCompetitorAnalysis(supabase, company),
    getCompetitors({
      cpvCode: primaryCpv,
      authorityJib: null,
      excludeJib: company.jib,
      limit: 8,
    }).catch(() => []),
    getSimilarTenders({
      cpvCode: primaryCpv,
      authorityJib: null,
      limit: 8,
    }).catch(() => []),
    getUserBidStats(company.id).catch(() => null),
  ]);

  const competitors =
    analysis.competitors.length > 0
      ? analysis.competitors.map((competitor) => ({
          name: competitor.name,
          jib: competitor.jib,
          wins: competitor.wins,
          total_value: competitor.total_value,
          categories: competitor.categories,
          city: competitor.city,
          authority_count: competitor.authority_count,
          recent_wins_90d: competitor.recent_wins_90d,
          signal_score: competitor.signal_score,
        }))
      : directCompetitors.map((competitor) => ({
          name: competitor.name,
          jib: competitor.jib,
          wins: competitor.wins,
          total_value: Number(competitor.avg_winning_price ?? 0) * competitor.wins,
          categories: [] as string[],
          city: null as string | null,
          authority_count: competitor.appearances,
          recent_wins_90d: competitor.recent_wins.length,
          signal_score: Math.min(100, competitor.wins * 10),
        }));
  const competitionIndex = calculateCompetitionIndex(competitors);
  const categoryRows = buildCategoryRows(competitors);
  const categoryDonut = categoryRows.map((item, index) => ({
    name: item.category,
    value: item.count,
    color: ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)"][
      index % 6
    ],
  }));

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--surface-1)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
            <Swords className="h-3.5 w-3.5 text-[var(--primary)]" />
            Konkurentska inteligencija
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Konkurencija</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--text-secondary)]">
            Rangiranje firmi koje se najcesce pojavljuju u vasem javnom trzisnom kontekstu.
          </p>
        </div>
        <Button variant="outline" size="lg">
          <FileText className="h-4 w-4" />
          Izvoz pregleda
        </Button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Relevantni konkurenti"
          value={competitors.length}
          description={`${analysis.matchedCategories.length} prepoznatih kategorija`}
          iconName="Users"
          iconColor="blue"
        />
        <StatCard
          title="Pobjede konkurenata"
          value={analysis.totalCompetitorWins || competitors.reduce((sum, item) => sum + item.wins, 0)}
          description="U profilisanom javnom uzorku"
          iconName="Trophy"
          iconColor="amber"
        />
        <StatCard
          title="Vrijednost trzista"
          value={formatKm(analysis.totalCompetitorValue || competitors.reduce((sum, item) => sum + Number(item.total_value ?? 0), 0))}
          description="Dobijeni ugovori konkurenata"
          iconName="BarChart3"
          iconColor="green"
        />
        <StatCard
          title="Vasa stopa uspjeha"
          value={`${Math.round(userStats?.winRate ?? 0)}%`}
          description={userStats ? `${userStats.totalWins} pobjeda` : "Nema historije ponuda"}
          iconName="ShieldCheck"
          iconColor="purple"
        />
        <StatCard
          title="Javni tender uzorak"
          value={similarTenders.length}
          description={primaryCpv ? `CPV ${primaryCpv}` : "Bez CPV filtera"}
          iconName="Scale"
          iconColor="cyan"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Panel title="Konkurentni indeks" subtitle="0 = slab pritisak, 100 = visok pritisak">
          <div className="flex flex-col items-center gap-4 py-4">
            <CircularProgressScore score={competitionIndex} size="xl" label="Indeks" />
            <p className="max-w-xs text-center text-sm text-[var(--text-secondary)]">
              Indeks kombinuje broj relevantnih konkurenata, nedavne pobjede i signal podudaranja sa vasim profilom.
            </p>
          </div>
        </Panel>

        <Panel title="Top konkurenti" subtitle="Rangirano po relevantnosti i vrijednosti javnih dodjela">
          {competitors.length > 0 ? (
            <div className="divide-y divide-[var(--border-default)]">
              {competitors.slice(0, 8).map((competitor, index) => (
                <Link
                  key={competitor.jib}
                  href={`/dashboard/intelligence/company/${competitor.jib}`}
                  className="grid gap-3 py-3 hover:bg-[var(--surface-2)] md:grid-cols-[44px_minmax(0,1fr)_120px_120px]"
                  title="Podaci dostupni iz e-Nabavke registra javnih nabavki BiH."
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-2)] text-sm font-bold text-[var(--text-secondary)]">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{competitor.name}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      {competitor.city ?? "Lokacija nije navedena"} Â· {competitor.authority_count ?? 0} narucilaca
                    </p>
                  </div>
                  <div className="text-sm">
                    <p className="font-semibold text-[var(--text-primary)]">{competitor.wins} pobjeda</p>
                    <p className="text-xs text-[var(--text-tertiary)]">90d: {competitor.recent_wins_90d ?? 0}</p>
                  </div>
                  <div className="text-sm font-semibold text-[var(--primary)]">{formatKm(competitor.total_value)}</div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Users className="size-7" aria-hidden="true" />} title="Nema konkurenata" description="Nema dovoljno javnih podataka za profil firme." />
          )}
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Panel title="Vasa izvedba kroz vrijeme" subtitle="Postojeci podaci o vasim sacuvanim ponudama">
          {userStats?.monthlyTrend?.length ? (
            <LineAreaChart
              data={userStats.monthlyTrend}
              xKey="month"
              height={280}
              series={[
                { key: "bids", name: "Vase ponude", color: "var(--chart-1)" },
                { key: "wins", name: "Vase pobjede", color: "var(--chart-2)" },
              ]}
            />
          ) : (
            // TODO(C.2): Dodati konkurentski multi-line graf kada postoji mjesecna agregacija pobjeda po firmi.
            <EmptyState
              icon={<BarChart3 className="size-7" aria-hidden="true" />}
              title="Nema mjesecne historije"
              description="Top 3 konkurentske linije zahtijevaju novu agregaciju po mjesecu i firmi."
            />
          )}
        </Panel>

        <Panel title="Kategorije sa najvise konkurencije" subtitle="Kategorije iz javnih pobjeda top konkurenata">
          {categoryDonut.length > 0 ? (
            <DonutChart
              data={categoryDonut}
              height={280}
              centerLabel="Kategorije"
              centerValue={categoryDonut.length.toString()}
              valueSuffix="pojavljivanja"
            />
          ) : (
            <EmptyState icon={<Scale className="size-7" aria-hidden="true" />} title="Nema kategorija" description="Konkurenti nemaju dovoljno klasifikovanih kategorija." />
          )}
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title="Izgubljeni tenderi i gap" subtitle="Potrebna je veza izmedju vase ponude i pobjednicke cijene">
          {/* TODO(C.2): Povezati izgubljene bid zapise sa award_decisions da bi gap procenat bio stvaran. */}
          <EmptyState
            icon={<FileText className="size-7" aria-hidden="true" />}
            title="Nedovoljno podataka za gap"
            description="Postojeci helperi ne vracaju vase izgubljene tendere sa pobjednickom cijenom, pa se tabela ne prikazuje sa mock vrijednostima."
          />
        </Panel>

        <Panel title="Najaktivniji konkurenti" subtitle="Javni izvori o javnim nabavkama">
          {competitors.length > 0 ? (
            <div className="space-y-3">
              {competitors.slice(0, 6).map((competitor) => (
                <div
                  key={competitor.jib}
                  className="rounded-[var(--radius-input)] border border-[var(--border-default)] bg-[var(--surface-1)] p-3"
                  title="Podaci dostupni iz e-Nabavke registra javnih nabavki BiH."
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{competitor.name}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">{competitor.jib}</p>
                    </div>
                    <span className="rounded-full bg-[var(--primary-soft)] px-2 py-1 text-xs font-semibold text-[var(--primary-strong)]">
                      {competitor.signal_score}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">{formatKm(competitor.total_value)} Â· {competitor.wins} pobjeda</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Users className="size-7" aria-hidden="true" />} title="Nema liste" description="Nema dovoljno konkurenata za desni panel." />
          )}
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <AIInsightBox title="Velicina tendera" variant="default">
          <p>
            Win-rate bucketi po velicini tendera nisu dostupni bez dodatne agregacije vase historije ponuda i award odluka.
          </p>
        </AIInsightBox>
        <AIInsightBox title="Eticki okvir" variant="success">
          <p>Svi podaci su iz javnih izvora o javnim nabavkama.</p>
        </AIInsightBox>
        <AIInsightBox title="Najbolji naredni korak" variant="suggestion">
          <p>
            Otvorite profil najaktivnijeg konkurenta i uporedite narucioce gdje se ponavljaju njegove pobjede.
          </p>
        </AIInsightBox>
      </section>

      <div className="flex items-start gap-2 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-2)] p-4 text-xs text-[var(--text-secondary)]">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
        <p>Svi podaci su iz javnih izvora o javnim nabavkama. Podaci dostupni iz e-Nabavke registra javnih nabavki BiH.</p>
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-1)] p-5 shadow-[var(--shadow-card)]">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function calculateCompetitionIndex(competitors: Array<{ wins: number; total_value: number; recent_wins_90d?: number; signal_score?: number }>) {
  if (competitors.length === 0) return 0;

  const density = Math.min(40, competitors.length * 4);
  const recent = Math.min(25, competitors.reduce((sum, competitor) => sum + Number(competitor.recent_wins_90d ?? 0), 0));
  const signal = Math.min(
    35,
    competitors.reduce((sum, competitor) => sum + Number(competitor.signal_score ?? 0), 0) / competitors.length,
  );

  return Math.round(density + recent + signal);
}

function buildCategoryRows(competitors: Array<{ categories?: string[] }>) {
  const buckets = new Map<string, number>();

  for (const competitor of competitors) {
    for (const category of competitor.categories ?? []) {
      const key = category || "Ostalo";
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  }

  return Array.from(buckets.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}
