import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  BarChart3,
  CalendarDays,
  Download,
  FileText,
  Globe2,
  LineChart,
  MapPinned,
  Target,
} from "lucide-react";

import { AnalyticsInsightsCards } from "@/components/dashboard/analytics-insights-cards";
import { AIInsightBox } from "@/components/ui/ai-insight-box";
import { Button } from "@/components/ui/button";
import { DonutChart } from "@/components/ui/donut-chart";
import { EmptyState } from "@/components/ui/empty-state";
import { LineAreaChart } from "@/components/ui/line-area-chart";
import { StatCard } from "@/components/ui/stat-card";
import { createClient } from "@/lib/supabase/server";
import { formatKm, formatPercent, getDashboardTrzisteData } from "@/lib/dashboard-trziste";

export const dynamic = "force-dynamic";

export default async function TrzistePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id, jib, industry, keywords, operating_regions, cpv_codes")
    .eq("user_id", user.id)
    .maybeSingle();

  const data = await getDashboardTrzisteData(supabase, company);
  const winRate = data.userStats?.winRate ?? 0;
  const topCategory = data.categoryData[0];
  const chartPalette = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
    "var(--chart-6)",
  ];

  const donutData = data.categoryData.map((item, index) => ({
    name: item.name,
    value: item.count,
    color: chartPalette[index % chartPalette.length],
  }));
  const procedureData = data.procedureData.map((item, index) => ({
    name: item.name,
    value: item.count,
    color: chartPalette[index % chartPalette.length],
  }));

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--surface-1)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
            <Globe2 className="h-3.5 w-3.5 text-[var(--primary)]" />
            Analitika javnih nabavki BiH
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Trziste</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
            Pregled aktivnih prilika, dodjela i konkurentskih signala iz realnih javnih podataka.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="lg">
            <CalendarDays className="h-4 w-4" />
            Zadnjih 12 mjeseci
          </Button>
          <Button variant="outline" size="lg">
            <Download className="h-4 w-4" />
            Izvoz
          </Button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Aktivni tenderi"
          value={data.activeTenderCount.toLocaleString("bs-BA")}
          description="Objave koje su trenutno otvorene"
          iconName="FileText"
          iconColor="blue"
        />
        <StatCard
          title="Vrijednost aktivnih"
          value={formatKm(data.activeTenderValue)}
          description="Procijenjena vrijednost sa dostupnim iznosima"
          iconName="BarChart3"
          iconColor="green"
        />
        <StatCard
          title="Dodjele 12m"
          value={data.awards12mCount.toLocaleString("bs-BA")}
          description={formatKm(data.awards12mValue)}
          iconName="Trophy"
          iconColor="amber"
        />
        <StatCard
          title="Vasa stopa uspjeha"
          value={formatPercent(winRate)}
          description={data.userStats ? `${data.userStats.totalWins} dobijenih od ${data.userStats.totalBids}` : "Nema povezanih ponuda"}
          iconName="Target"
          iconColor="purple"
        />
        <StatCard
          title="Prosj. konkurencija"
          value={data.avgBidders !== null ? data.avgBidders.toFixed(1) : "N/A"}
          description="Ponudjaca po poznatoj dodjeli"
          iconName="Users"
          iconColor="cyan"
        />
      </section>

      <AnalyticsInsightsCards />

      <section className="grid gap-4 xl:grid-cols-2">
        <Panel title="Trend dodjela" subtitle="Broj i vrijednost dodjela po mjesecima">
          {data.monthlyAwards.some((month) => month.count > 0 || month.valueMillions > 0) ? (
            <LineAreaChart
              data={data.monthlyAwards}
              xKey="label"
              height={280}
              series={[
                { key: "count", name: "Broj dodjela", color: "var(--chart-1)" },
                { key: "valueMillions", name: "Vrijednost (M KM)", color: "var(--chart-2)" },
              ]}
            />
          ) : (
            <EmptyState icon={<LineChart className="size-7" aria-hidden="true" />} title="Nema vremenskog trenda" description="Dodjele za zadnjih 12 mjeseci nisu dostupne." />
          )}
        </Panel>

        <Panel title="Kategorije aktivnih tendera" subtitle="Top CPV grupe po broju otvorenih tendera">
          {donutData.length > 0 ? (
            <DonutChart
              data={donutData}
              height={280}
              centerLabel="Top grupa"
              centerValue={topCategory?.name ?? "N/A"}
              valueSuffix="tendera"
            />
          ) : (
            <EmptyState icon={<Target className="size-7" aria-hidden="true" />} title="Nema CPV raspodjele" description="Aktivni tenderi nemaju dovoljno CPV podataka." />
          )}
        </Panel>

        <Panel title="Vrste postupaka" subtitle="Struktura poznatih odluka o dodjeli">
          {procedureData.length > 0 ? (
            <DonutChart
              data={procedureData}
              height={280}
              centerLabel="Postupci"
              centerValue={data.procedureData.length.toString()}
              valueSuffix="odluka"
            />
          ) : (
            <EmptyState icon={<BarChart3 className="size-7" aria-hidden="true" />} title="Nema strukture postupaka" description="Odluke nemaju popunjene vrste postupka." />
          )}
        </Panel>

        <Panel title="Vasa izvedba kroz vrijeme" subtitle="Trend iz vasih sacuvanih ponuda">
          {data.userStats?.monthlyTrend?.length ? (
            <LineAreaChart
              data={data.userStats.monthlyTrend}
              xKey="month"
              height={280}
              series={[
                { key: "bids", name: "Ponude", color: "var(--chart-1)" },
                { key: "wins", name: "Pobjede", color: "var(--chart-2)" },
              ]}
            />
          ) : (
            <EmptyState
              icon={<LineChart className="size-7" aria-hidden="true" />}
              title="Nema historije vasih ponuda"
              description="Trend ce se prikazati kada bude dovoljno sacuvanih ponuda."
            />
          )}
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title="Performanse po kategoriji" subtitle="Aktivne CPV grupe i koncentracija vrijednosti">
          {data.categoryData.length > 0 ? (
            <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-default)]">
              <table className="w-full text-sm">
                <thead className="bg-[var(--surface-2)] text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                  <tr>
                    <th className="px-4 py-3 text-left">Kategorija</th>
                    <th className="px-4 py-3 text-right">Tenderi</th>
                    <th className="px-4 py-3 text-right">Vrijednost</th>
                    <th className="px-4 py-3 text-left">Signal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)] bg-[var(--surface-1)]">
                  {data.categoryData.map((category) => {
                    const maxValue = Math.max(...data.categoryData.map((item) => item.value), 1);
                    const width = Math.max(8, Math.round((category.value / maxValue) * 100));

                    return (
                      <tr key={category.name}>
                        <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{category.name}</td>
                        <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{category.count}</td>
                        <td className="px-4 py-3 text-right font-medium text-[var(--text-primary)]">{formatKm(category.value)}</td>
                        <td className="px-4 py-3">
                          <div className="h-2 rounded-full bg-[var(--surface-2)]">
                            <div className="h-2 rounded-full bg-[var(--primary)]" style={{ width: `${width}%` }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={<BarChart3 className="size-7" aria-hidden="true" />} title="Nema kategorija" description="Nisu pronadjeni aktivni tenderi sa kategorijom." />
          )}
        </Panel>

        <Panel title="Mapa BiH" subtitle="Regionalni jaz iz tender-area izvjestaja">
          {data.areaReport?.items?.length ? (
            <SimpleBihMap items={data.areaReport.items.slice(0, 5)} />
          ) : (
            // TODO(C.2): Dodati stvarni geo prikaz kada bude uvedena biblioteka ili geokodirani kantoni.
            <EmptyState icon={<MapPinned className="size-7" aria-hidden="true" />} title="Nedovoljno geo podataka" description="Mapa ce se prikazati kada tenderi imaju pouzdanu regionalnu klasifikaciju." />
          )}
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <AIInsightBox title="Vremenska analiza" variant="default">
          <p>
            Najveci obim objava i dodjela pratite kroz mjesecni graf. Prosjecna konkurencija je{" "}
            <strong>{data.avgBidders !== null ? data.avgBidders.toFixed(1) : "nepoznata"}</strong> ponudjaca po poznatoj dodjeli.
          </p>
        </AIInsightBox>
        <AIInsightBox title="Cjenovni signal" variant="suggestion">
          <p>
            Prosjecni poznati popust je{" "}
            <strong>{data.avgDiscount !== null ? `${data.avgDiscount.toFixed(1)}%` : "nedostupan"}</strong>. Koristite ga samo kao trzisni okvir.
          </p>
        </AIInsightBox>
        <AIInsightBox title="Najaktivniji narucioci" variant="success">
          <p>
            {data.topAuthorities[0]
              ? `${data.topAuthorities[0].name} ima najvecu poznatu vrijednost dodjela u uzorku.`
              : "Nema dovoljno historije narucilaca za pouzdan signal."}
          </p>
        </AIInsightBox>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title="Najaktivniji narucioci" subtitle="Po vrijednosti poznatih dodjela">
          <RankedList
            emptyTitle="Nema narucilaca"
            items={data.topAuthorities.map((authority) => ({
              href: authority.jib ? `/dashboard/intelligence/authority/${authority.jib}` : undefined,
              title: authority.name,
              meta: `${authority.count} dodjela`,
              value: formatKm(authority.value),
            }))}
          />
        </Panel>
        <Panel title="Najaktivnije firme" subtitle="Javni pobjednici u posmatranom periodu">
          <RankedList
            emptyTitle="Nema firmi"
            items={data.topCompanies.map((company) => ({
              href: company.jib ? `/dashboard/intelligence/company/${company.jib}` : undefined,
              title: company.name,
              meta: `${company.wins} pobjeda`,
              value: formatKm(company.value),
            }))}
          />
        </Panel>
      </section>

      <Panel title="Biblioteka izvjestaja" subtitle="Exportable analize ce se vezati u sljedecoj fazi">
        {/* TODO(C.2): Povezati biblioteku izvjestaja kada se uvede tabela ili storage indeks za generisane market report fajlove. */}
        <EmptyState
          icon={<Download className="size-7" aria-hidden="true" />}
          title="Nema generisanih izvjestaja"
          description="Trenutno se prikazuju zivi podaci. Biblioteka PDF/CSV izvjestaja nema postojece skladiste u bazi."
        />
      </Panel>
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

function RankedList({
  items,
  emptyTitle,
}: {
  items: Array<{ title: string; meta: string; value: string; href?: string }>;
  emptyTitle: string;
}) {
  if (items.length === 0) {
    return <EmptyState icon={<FileText className="size-7" aria-hidden="true" />} title={emptyTitle} description="Nema dovoljno realnih podataka za ovu listu." />;
  }

  return (
    <div className="divide-y divide-[var(--border-default)]">
      {items.map((item, index) => {
        const content = (
          <div className="flex items-center justify-between gap-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] text-xs font-bold text-[var(--text-secondary)]">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
                <p className="text-xs text-[var(--text-tertiary)]">{item.meta}</p>
              </div>
            </div>
            <span className="shrink-0 text-sm font-semibold text-[var(--primary)]">{item.value}</span>
          </div>
        );

        return item.href ? (
          <Link key={`${item.title}-${index}`} href={item.href} className="block hover:bg-[var(--surface-2)]">
            {content}
          </Link>
        ) : (
          <div key={`${item.title}-${index}`}>{content}</div>
        );
      })}
    </div>
  );
}

function SimpleBihMap({
  items,
}: {
  items: Array<{
    id: string;
    title: string;
    suggested_next_area_label: string | null;
    authority_registry_label: string | null;
    likely_reason_label: string;
  }>;
}) {
  return (
    <div className="space-y-4">
      <svg viewBox="0 0 260 180" role="img" aria-label="Pojednostavljena mapa BiH" className="h-48 w-full">
        <path
          d="M54 40 112 18l52 20 34 43-18 54-55 24-58-17-27-45Z"
          fill="var(--surface-subtle)"
          stroke="var(--primary)"
          strokeWidth="3"
        />
        {items.map((item, index) => {
          const x = 78 + (index % 3) * 48;
          const y = 58 + Math.floor(index / 3) * 44;
          const radius = 12 + index * 2;

          return (
            <circle
              key={item.id}
              cx={x}
              cy={y}
              r={radius}
              fill="var(--primary)"
              opacity={0.18 + index * 0.1}
              stroke="var(--primary)"
            />
          );
        })}
      </svg>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-lg bg-[var(--surface-2)] px-3 py-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate font-medium text-[var(--text-primary)]">
                {item.suggested_next_area_label ?? item.authority_registry_label ?? "Rucna provjera"}
              </span>
              <span className="shrink-0 text-xs text-[var(--text-secondary)]">{item.likely_reason_label}</span>
            </div>
            <p className="mt-1 line-clamp-1 text-xs text-[var(--text-tertiary)]">{item.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
