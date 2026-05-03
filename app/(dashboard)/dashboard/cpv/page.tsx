import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  Download,
  FileDown,
  FolderTree,
  LineChart,
  Search,
  Tags,
  TrendingUp,
} from "lucide-react";

import { AIInsightBox } from "@/components/ui/ai-insight-box";
import { Button } from "@/components/ui/button";
import { DonutChart } from "@/components/ui/donut-chart";
import { EmptyState } from "@/components/ui/empty-state";
import { LineAreaChart } from "@/components/ui/line-area-chart";
import { StatCard } from "@/components/ui/stat-card";
import { createClient } from "@/lib/supabase/server";
import {
  cpvLabel,
  formatKm,
  getCpvDashboardData,
  type CpvTreeNode,
} from "@/lib/dashboard-c2";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ code?: string }>;
};

export default async function CpvPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const data = await getCpvDashboardData(supabase, user.id, resolvedSearchParams.code);
  const selected = data.selected;
  const recommendation = data.recommendation;
  const donutData = data.topByTenderCount.slice(0, 6).map((node, index) => ({
    name: node.code,
    value: node.tenderCount,
    color: `var(--chart-${(index % 6) + 1})`,
  }));

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--surface-1)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
            <Tags className="size-3.5 text-[var(--primary)]" aria-hidden="true" />
            Market opportunity explorer
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            CPV klasifikacija - Trzisne prilike
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            Pregled CPV kategorija iz javnih statistika, vase pokrivenosti i konkurentskih signala po kategoriji.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="lg">
            <Download className="size-4" aria-hidden="true" />
            CSV izvoz
          </Button>
          <Button variant="outline" size="lg">
            <FileDown className="size-4" aria-hidden="true" />
            Mapping alat
          </Button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Vrijednost trzista"
          value={formatKm(data.marketValue)}
          description="Procjena iz CPV statistika"
          iconName="BarChart3"
          iconColor="blue"
        />
        <StatCard
          title="Aktivne CPV grupe"
          value={data.activeCpvCount.toLocaleString("bs-BA")}
          description={`${data.statsCount} statistickih redova`}
          iconName="FolderTree"
          iconColor="green"
        />
        <StatCard
          title="Vasa pokrivenost"
          value={`${data.coveragePercent}%`}
          description={data.company ? data.company.name : "Nema povezane firme"}
          iconName="ShieldCheck"
          iconColor="purple"
        />
        <StatCard
          title="Odabrana kategorija"
          value={selected?.code ?? "N/A"}
          description={selected ? `${selected.tenderCount} poznatih tendera` : "Odaberite CPV"}
          iconName="Target"
          iconColor="cyan"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.9fr)]">
        <Panel title="Hijerarhijsko CPV stablo" subtitle="Klikom odaberite kategoriju za detaljnu analizu">
          {data.tree.length > 0 ? (
            <div className="space-y-3">
              {data.tree.map((node) => (
                <CpvNodeLink key={node.code} node={node} selectedCode={data.selectedCode} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<FolderTree className="size-7" aria-hidden="true" />}
              title="Nema CPV statistika"
              description="Tabela cpv_stats trenutno nema redove za prikaz."
            />
          )}
        </Panel>

        <Panel
          title={selected ? cpvLabel(selected.code) : "Detalj kategorije"}
          subtitle={selected ? `${selected.tenderCount.toLocaleString("bs-BA")} poznatih tendera` : "Odaberite CPV kod iz stabla"}
        >
          {selected ? (
            <div className="space-y-4">
              <MetricCard
                title="Market overview"
                rows={[
                  ["Procijenjena vrijednost", formatKm(selected.marketValue)],
                  ["Prosj. ponudjaca", selected.avgBidders !== null ? selected.avgBidders.toFixed(1) : "N/A"],
                  ["Tenderi u uzorku", selected.tenderCount.toLocaleString("bs-BA")],
                ]}
              />
              <MetricCard
                title="Vasa pozicija"
                rows={[
                  ["Pojavljivanja", selected.companyAppearances.toLocaleString("bs-BA")],
                  ["Pobjede", selected.companyWins.toLocaleString("bs-BA")],
                  [
                    "Stopa uspjeha",
                    selected.companyAppearances > 0
                      ? `${Math.round((selected.companyWins / selected.companyAppearances) * 100)}%`
                      : "Nema historije",
                  ],
                ]}
              />
              <MetricCard
                title="Konkurentski pejzaz"
                rows={
                  data.competitors.length > 0
                    ? data.competitors.slice(0, 3).map((competitor) => [
                        competitor.name,
                        `${competitor.appearances} pojavljivanja / ${competitor.wins} pobjeda`,
                      ])
                    : [["Status", "Nema dovoljno konkurentskih redova"]]
                }
              />
              <AIInsightBox title="Trebate li ulaziti?" variant={recommendation?.recommendation === "Da" ? "success" : "default"}>
                {recommendation ? (
                  <div className="space-y-2">
                    <p>
                      Preporuka: <strong>{recommendation.recommendation}</strong>{" "}
                      {recommendation.source === "heuristic" ? "(heuristika iz statistika)" : "(AI cache)"}
                    </p>
                    <ul className="list-disc space-y-1 pl-4">
                      {recommendation.reasoning.slice(0, 3).map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p>Nema dovoljno podataka za preporuku.</p>
                )}
              </AIInsightBox>
              <Button asChild variant={data.selectedWatched ? "secondary" : "outline"} className="w-full">
                <Link href="/dashboard/watchlist">
                  <Search className="size-4" aria-hidden="true" />
                  {data.selectedWatched ? "CPV je vec u pracenju" : "Dodaj u pracenje kroz watchlist"}
                </Link>
              </Button>
            </div>
          ) : (
            <EmptyState icon={<Tags className="size-7" aria-hidden="true" />} title="Odaberite CPV" />
          )}
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Panel title="Top 10 CPV po vrijednosti" subtitle="Procjena = prosjecna vrijednost x broj tendera">
          <RankedNodes nodes={data.topByValue} valueKind="value" />
        </Panel>
        <Panel title="Najvece kategorije po broju" subtitle="Distribucija tendera po CPV prefiksu">
          {donutData.length > 0 ? (
            <DonutChart data={donutData} centerLabel="CPV grupe" centerValue={donutData.length} valueSuffix="tendera" />
          ) : (
            <EmptyState icon={<Tags className="size-7" aria-hidden="true" />} title="Nema raspodjele" />
          )}
        </Panel>
        <Panel title="Najveci rast" subtitle="Vremenski trend nije dostupan u trenutnoj shemi">
          {/* TODO(C.2): Dodati rast CPV kategorija kada postoji historijska/time-series tabela za cpv_stats. */}
          <EmptyState
            icon={<TrendingUp className="size-7" aria-hidden="true" />}
            title="Nedovoljno vremenskih podataka"
            description="cpv_stats sadrzi trenutni agregat, ali ne i historiju promjena po mjesecima."
          />
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel title="Trend kategorije" subtitle="Spremno za buduci time-series izvor">
          {/* TODO(C.2): Zamijeniti prazno stanje stvarnom serijom kada se doda CPV historija. */}
          <LineAreaChart data={[]} series={[{ key: "value", name: "Vrijednost" }]} height={260} />
        </Panel>
        <Panel title="Aktivni tenderi u odabranoj kategoriji" subtitle={selected?.code ? `CPV ${selected.code}` : undefined}>
          {data.activeTenders.length > 0 ? (
            <div className="divide-y divide-[var(--border-default)]">
              {data.activeTenders.map((tender) => (
                <Link key={tender.id} href={`/dashboard/tenders/${tender.id}`} className="block py-3 hover:bg-[var(--surface-2)]">
                  <p className="line-clamp-2 text-sm font-semibold text-[var(--text-primary)]">{tender.title}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <span>{tender.contracting_authority ?? "Nepoznat narucilac"}</span>
                    <span>{formatKm(tender.estimated_value)}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<LineChart className="size-7" aria-hidden="true" />}
              title="Nema aktivnih tendera"
              description="Za odabranu CPV kategoriju trenutno nema otvorenih tendera u uzorku."
            />
          )}
        </Panel>
      </section>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
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

function CpvNodeLink({ node, selectedCode }: { node: CpvTreeNode; selectedCode: string | null }) {
  const active = selectedCode === node.code;

  return (
    <div className="space-y-2">
      <Link
        href={`/dashboard/cpv?code=${node.code}`}
        className={cn(
          "block rounded-[var(--radius-input)] border px-3 py-3 transition-colors",
          active
            ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-strong)]"
            : "border-[var(--border-default)] bg-[var(--surface-2)] text-[var(--text-primary)] hover:border-[var(--border-hover)]",
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{node.label}</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {node.tenderCount.toLocaleString("bs-BA")} tendera Â· {formatKm(node.marketValue)}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-[var(--surface-1)] px-2 py-1 text-xs font-bold">{node.code}</span>
        </div>
      </Link>
      {node.children.length > 0 ? (
        <div className="ml-4 space-y-2 border-l border-[var(--border-default)] pl-3">
          {node.children.slice(0, 4).map((child) => (
            <CpvNodeLink key={child.code} node={child} selectedCode={selectedCode} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <div className="rounded-[var(--radius-input)] border border-[var(--border-default)] bg-[var(--surface-2)] p-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
      <dl className="mt-3 space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 text-sm">
            <dt className="text-[var(--text-secondary)]">{label}</dt>
            <dd className="text-right font-semibold text-[var(--text-primary)]">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function RankedNodes({ nodes, valueKind }: { nodes: CpvTreeNode[]; valueKind: "value" | "count" }) {
  if (nodes.length === 0) {
    return <EmptyState icon={<Tags className="size-7" aria-hidden="true" />} title="Nema CPV redova" />;
  }

  return (
    <div className="space-y-2">
      {nodes.slice(0, 10).map((node, index) => (
        <Link
          key={node.code}
          href={`/dashboard/cpv?code=${node.code}`}
          className="flex items-center justify-between gap-3 rounded-[var(--radius-input)] border border-[var(--border-default)] px-3 py-2 text-sm hover:bg-[var(--surface-2)]"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] text-xs font-bold text-[var(--text-secondary)]">
              {index + 1}
            </span>
            <span className="truncate font-medium text-[var(--text-primary)]">{node.label}</span>
          </div>
          <span className="shrink-0 font-semibold text-[var(--primary)]">
            {valueKind === "value" ? formatKm(node.marketValue) : node.tenderCount}
          </span>
        </Link>
      ))}
    </div>
  );
}
