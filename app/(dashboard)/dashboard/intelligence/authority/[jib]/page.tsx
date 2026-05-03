import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  Clock,
  FileText,
  History,
  MapPin,
  Repeat,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";

import { AuthorityNarrativeBox } from "@/components/dashboard/authority-narrative-box";
import { ProGate } from "@/components/subscription/pro-gate";
import { Button } from "@/components/ui/button";
import { DonutChart } from "@/components/ui/donut-chart";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { WatchButton } from "@/components/watchlist/watch-button";
import { formatCurrencyKM } from "@/lib/currency";
import { getCompetitors, getSimilarTenders } from "@/lib/competitor-intelligence";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription";
import { isWatched } from "@/lib/watchlist";

const DOC_TYPE_LABELS: Record<string, string> = {
  registration: "Rjesenje o registraciji",
  tax: "Porezna uvjerenja",
  contributions: "Uvjerenja o doprinosima",
  guarantee: "Bankarska garancija",
  reference: "Reference",
  financial: "Finansijski izvjestaji",
  staff: "Kljucno osoblje",
  license: "Dozvole i licence",
  declaration: "Izjave",
  other: "Ostalo",
};

export const dynamic = "force-dynamic";

export default async function AuthorityProfilePage({
  params,
}: {
  params: Promise<{ jib: string }>;
}) {
  const { jib } = await params;
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

  const [{ data: authority }, { data: company }] = await Promise.all([
    supabase
      .from("contracting_authorities")
      .select("name, jib, city, entity, canton, municipality, authority_type")
      .eq("jib", jib)
      .maybeSingle(),
    supabase.from("companies").select("id, name, jib, cpv_codes").eq("user_id", user.id).maybeSingle(),
  ]);

  const authorityName = authority?.name ?? `Narucilac ${jib}`;
  const nowIso = new Date().toISOString();
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const [
    totalTenderResult,
    tender12mResult,
    awardsResult,
    patternsResult,
    activeTendersResult,
    statsResult,
    companyStatsResult,
    watched,
    competitors,
    similarTenders,
  ] = await Promise.all([
    supabase.from("tenders").select("id", { count: "exact", head: true }).eq("contracting_authority_jib", jib),
    supabase
      .from("tenders")
      .select("id", { count: "exact", head: true })
      .eq("contracting_authority_jib", jib)
      .gte("created_at", twelveMonthsAgo.toISOString()),
    supabase
      .from("award_decisions")
      .select("winner_name, winner_jib, winning_price, total_bidders_count, discount_pct, award_date, contract_type, procedure_name")
      .eq("contracting_authority_jib", jib)
      .order("award_date", { ascending: false })
      .limit(300),
    supabase
      .from("authority_requirement_patterns")
      .select("document_type, is_required")
      .eq("contracting_authority_jib", jib),
    supabase
      .from("tenders")
      .select("id, title, deadline, estimated_value, contract_type")
      .eq("contracting_authority_jib", jib)
      .gte("deadline", nowIso)
      .order("deadline", { ascending: true })
      .limit(10),
    supabase
      .from("authority_stats")
      .select("avg_contract_value, avg_bidders_count, avg_discount_pct, top_cpv_codes, tender_count, total_estimated_value, unique_winner_count")
      .eq("authority_jib", jib)
      .maybeSingle(),
    company?.jib
      ? supabase
          .from("company_authority_stats")
          .select("appearances, wins, win_rate")
          .eq("authority_jib", jib)
          .eq("company_jib", company.jib)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    isWatched(user.id, "authority", jib),
    getCompetitors({ authorityJib: jib, cpvCode: null, excludeJib: company?.jib ?? undefined, limit: 6 }).catch(() => []),
    getSimilarTenders({ authorityJib: jib, cpvCode: null, limit: 10 }).catch(() => []),
  ]);

  const awards = awardsResult.data ?? [];
  const activeTenders = activeTendersResult.data ?? [];
  const authorityStats = statsResult.data as {
    avg_contract_value: number | null;
    avg_bidders_count: number | null;
    avg_discount_pct: number | null;
    top_cpv_codes: string[] | null;
    tender_count: number;
    total_estimated_value: number;
    unique_winner_count: number;
  } | null;
  const companyAuthorityStats = companyStatsResult.data as {
    appearances: number;
    wins: number;
    win_rate: number | null;
  } | null;

  const totalValue = awards.reduce((sum, award) => sum + Number(award.winning_price ?? 0), 0);
  const avgBidders = average(awards.map((award) => Number(award.total_bidders_count)).filter((value) => value > 0));
  const categoryRows = buildCategoryRows(awards);
  const requirements = buildRequirements(patternsResult.data ?? []);
  const topWinners = buildTopWinners(awards);
  const topWinner = topWinners[0] ?? null;
  const topWinnerShare = topWinner && awards.length > 0 ? Math.round((topWinner.wins / awards.length) * 100) : null;

  return (
    <div className="space-y-6">
      <header className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-1)] p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <Button asChild variant="outline" size="icon-lg">
              <Link href="/dashboard/intelligence">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
                <Building2 className="h-7 w-7" />
              </div>
              <h1 className="max-w-4xl text-3xl font-bold tracking-tight text-[var(--text-primary)]">{authorityName}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
                <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 font-mono text-xs">{jib}</span>
                {authority?.city ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {authority.city}
                  </span>
                ) : null}
                {authority?.entity ? <span>{authority.entity}</span> : null}
                {authority?.authority_type ? <StatusBadge status={authority.authority_type} /> : null}
              </div>
            </div>
          </div>
          <WatchButton
            entityType="authority"
            entityKey={jib}
            entityLabel={authorityName}
            isWatched={watched}
            redirectTo={`/dashboard/intelligence/authority/${jib}`}
            size="sm"
          />
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Tenderi 12m"
          value={(tender12mResult.count ?? 0).toLocaleString("bs-BA")}
          description={`${(totalTenderResult.count ?? 0).toLocaleString("bs-BA")} ukupno u bazi`}
          iconName="FileText"
          iconColor="blue"
        />
        <StatCard
          title="Ukupna vrijednost"
          value={formatCurrencyKM(totalValue || authorityStats?.total_estimated_value || 0)}
          description="Poznate odluke o dodjeli"
          iconName="Trophy"
          iconColor="green"
        />
        <StatCard
          title="Vas uspjeh"
          value={companyAuthorityStats?.win_rate !== null && companyAuthorityStats?.win_rate !== undefined ? `${Math.round(companyAuthorityStats.win_rate)}%` : "N/A"}
          description={companyAuthorityStats ? `${companyAuthorityStats.wins}/${companyAuthorityStats.appearances} pojavljivanja` : "Nema historije sa vasom firmom"}
          iconName="CheckCircle2"
          iconColor="purple"
        />
        <StatCard
          title="Prosj. broj ponuda"
          value={(authorityStats?.avg_bidders_count ?? avgBidders)?.toFixed(1) ?? "N/A"}
          description="Na poznatim odlukama"
          iconName="Users"
          iconColor="cyan"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Panel title="Obrazac dodjele" subtitle="Koncentracija pobjednika i prosjecna vrijednost">
          {topWinner ? (
            <div className="space-y-4">
              <div className="rounded-[var(--radius-input)] bg-[var(--surface-2)] p-4">
                <p className="text-sm text-[var(--text-secondary)]">Najcesci pobjednik</p>
                <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{topWinner.name}</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {topWinner.wins} pobjeda Â· {topWinnerShare ?? 0}% poznatih dodjela Â· {formatCurrencyKM(topWinner.value)}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Metric label="Prosj. ugovor" value={formatCurrencyKM(authorityStats?.avg_contract_value ?? average(awards.map((award) => Number(award.winning_price)).filter((value) => value > 0)) ?? 0)} />
                <Metric label="Prosj. popust" value={authorityStats?.avg_discount_pct !== null && authorityStats?.avg_discount_pct !== undefined ? `${Number(authorityStats.avg_discount_pct).toFixed(1)}%` : "N/A"} />
              </div>
            </div>
          ) : (
            <EmptyState icon={<Trophy className="size-7" aria-hidden="true" />} title="Nedovoljno podataka" description="Nema dovoljno poznatih dodjela za obrazac pobjednika." />
          )}
        </Panel>

        <Panel title="Tipican vremenski okvir" subtitle="Rokovi i tempo objava">
          {activeTenders.length > 0 ? (
            <div className="space-y-3">
              {activeTenders.slice(0, 4).map((tender) => (
                <Link
                  key={tender.id}
                  href={`/dashboard/tenders/${tender.id}`}
                  className="block rounded-[var(--radius-input)] border border-[var(--border-default)] p-3 hover:bg-[var(--surface-2)]"
                >
                  <p className="line-clamp-1 text-sm font-semibold text-[var(--text-primary)]">{tender.title}</p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Rok: {tender.deadline ? new Date(tender.deadline).toLocaleDateString("bs-BA") : "Nije objavljen"}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            // TODO(C.2): Dodati agregaciju prosjecnog broja dana od objave do roka po naruciocu.
            <EmptyState icon={<CalendarClock className="size-7" aria-hidden="true" />} title="Nema aktivnih rokova" description="Za punu vremensku analizu treba dodatna agregacija historijskih rokova." />
          )}
        </Panel>

        <Panel title="Firme kao vasa pobijedjuju" subtitle="Benchmark prema company_authority_stats">
          {companyAuthorityStats ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label="Pojavljivanja" value={companyAuthorityStats.appearances.toString()} />
              <Metric label="Pobjede" value={companyAuthorityStats.wins.toString()} />
              <Metric label="Win rate" value={companyAuthorityStats.win_rate !== null ? `${Math.round(companyAuthorityStats.win_rate)}%` : "N/A"} />
            </div>
          ) : (
            <EmptyState icon={<Users className="size-7" aria-hidden="true" />} title="Nedovoljno podataka" description="Nema sacuvane historije vase firme kod ovog narucioca." />
          )}
        </Panel>

        <Panel title="Ponavljajuci obrasci tendera" subtitle="Dokumentacija i CPV koji se ponavljaju">
          {requirements.length > 0 || authorityStats?.top_cpv_codes?.length ? (
            <div className="space-y-4">
              {authorityStats?.top_cpv_codes?.length ? (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">Top CPV</p>
                  <div className="flex flex-wrap gap-2">
                    {authorityStats.top_cpv_codes.slice(0, 6).map((cpv) => (
                      <span key={cpv} className="rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--primary-strong)]">
                        CPV {cpv}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {requirements.slice(0, 5).map((requirement) => (
                <div key={requirement.type} className="flex items-center justify-between rounded-[var(--radius-input)] bg-[var(--surface-2)] px-3 py-2">
                  <span className="text-sm font-medium text-[var(--text-primary)]">{DOC_TYPE_LABELS[requirement.type] ?? requirement.type}</span>
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">{requirement.requiredShare}% obavezno</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Repeat className="size-7" aria-hidden="true" />} title="Nedovoljno podataka" description="Nisu pronadjeni ponavljajuci dokumentacijski obrasci." />
          )}
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title="Historija tendera" subtitle="Zadnje javne dodjele kod ovog narucioca">
          <div className="mb-4 flex justify-end">
            <select className="h-9 rounded-[var(--radius-input)] border border-[var(--border-default)] bg-[var(--surface-1)] px-3 text-sm text-[var(--text-secondary)]" defaultValue="all">
              <option value="all">Sve godine</option>
            </select>
          </div>
          {similarTenders.length > 0 ? (
            <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-default)]">
              <table className="w-full text-sm">
                <thead className="bg-[var(--surface-2)] text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                  <tr>
                    <th className="px-4 py-3 text-left">Tender</th>
                    <th className="px-4 py-3 text-left">Pobjednik</th>
                    <th className="px-4 py-3 text-right">Vrijednost</th>
                    <th className="px-4 py-3 text-right">Datum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {similarTenders.map((tender) => (
                    <tr key={`${tender.id}-${tender.award_date}`}>
                      <td className="max-w-[360px] px-4 py-3 font-medium text-[var(--text-primary)]">
                        <Link href={`/dashboard/tenders/${tender.id}`} className="line-clamp-1 hover:text-[var(--primary)]">
                          {tender.title || "Tender bez naziva"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{tender.winner_name ?? "Nije navedeno"}</td>
                      <td className="px-4 py-3 text-right font-semibold text-[var(--text-primary)]">{formatCurrencyKM(tender.winning_price ?? 0)}</td>
                      <td className="px-4 py-3 text-right text-[var(--text-secondary)]">
                        {tender.award_date ? new Date(tender.award_date).toLocaleDateString("bs-BA") : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={<History className="size-7" aria-hidden="true" />} title="Nema historije" description="Nisu pronadjene javne dodjele za ovog narucioca." />
          )}
        </Panel>

        <Panel title="Kategorije" subtitle="Raspodjela po vrstama ugovora">
          {categoryRows.length > 0 ? (
            <DonutChart
              data={categoryRows.map((item, index) => ({
                name: item.name,
                value: item.count,
                color: ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)"][
                  index % 6
                ],
              }))}
              height={280}
              centerLabel="Kategorije"
              centerValue={categoryRows.length.toString()}
              valueSuffix="dodjela"
            />
          ) : (
            <EmptyState icon={<FileText className="size-7" aria-hidden="true" />} title="Nema kategorija" description="Odluke nemaju dovoljno klasifikacije." />
          )}
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <AuthorityNarrativeBox jib={jib} />

        <Panel title="Aktivnost" subtitle="Zadnji signali za ovog narucioca">
          <div className="space-y-3">
            {activeTenders.slice(0, 3).map((tender) => (
              <ActivityItem
                key={tender.id}
                icon={<Clock className="h-4 w-4" aria-hidden="true" />}
                title="Aktivan tender"
                description={tender.title}
                meta={tender.deadline ? `Rok ${new Date(tender.deadline).toLocaleDateString("bs-BA")}` : "Rok nije objavljen"}
              />
            ))}
            {awards.slice(0, 3).map((award, index) => (
              <ActivityItem
                key={`${award.winner_jib}-${award.award_date}-${index}`}
                icon={<Trophy className="h-4 w-4" aria-hidden="true" />}
                title="Odluka o dodjeli"
                description={award.winner_name ?? "Pobjednik nije naveden"}
                meta={award.award_date ? new Date(award.award_date).toLocaleDateString("bs-BA") : "Datum nije poznat"}
              />
            ))}
            {activeTenders.length === 0 && awards.length === 0 ? (
              <EmptyState icon={<Sparkles className="size-7" aria-hidden="true" />} title="Nema aktivnosti" description="Nema novijih javnih zapisa za feed aktivnosti." />
            ) : null}
          </div>
        </Panel>
      </section>

      <Panel title="Najcesci konkurenti kod narucioca" subtitle="Iz javnih odluka o dodjeli">
        {competitors.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {competitors.map((competitor) => (
              <Link
                key={competitor.jib}
                href={`/dashboard/intelligence/company/${competitor.jib}`}
                className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-1)] p-4 hover:border-[var(--primary)]"
              >
                <p className="line-clamp-1 text-sm font-semibold text-[var(--text-primary)]">{competitor.name}</p>
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">{competitor.jib}</p>
                <p className="mt-3 text-sm font-semibold text-[var(--primary)]">
                  {competitor.wins} pobjeda Â· {competitor.avg_winning_price ? formatCurrencyKM(competitor.avg_winning_price) : "N/A"} prosjek
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState icon={<Users className="size-7" aria-hidden="true" />} title="Nema konkurenata" description="Nema dovoljno odluka za listu konkurenata." />
        )}
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-input)] bg-[var(--surface-2)] p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">{label}</p>
      <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

function ActivityItem({
  icon,
  title,
  description,
  meta,
}: {
  icon: ReactNode;
  title: string;
  description: string | null;
  meta: string;
}) {
  return (
    <div className="flex gap-3 rounded-[var(--radius-input)] bg-[var(--surface-2)] p-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-1)] text-[var(--primary)]">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">{title}</p>
        <p className="line-clamp-1 text-sm font-medium text-[var(--text-primary)]">{description ?? "Nije navedeno"}</p>
        <p className="text-xs text-[var(--text-secondary)]">{meta}</p>
      </div>
    </div>
  );
}

function average(values: number[]) {
  const clean = values.filter((value) => Number.isFinite(value) && value > 0);
  if (clean.length === 0) return null;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function buildCategoryRows(awards: Array<{ contract_type: string | null }>) {
  const buckets = new Map<string, number>();

  for (const award of awards) {
    const key = award.contract_type || "Nije navedeno";
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return Array.from(buckets.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

function buildRequirements(patterns: Array<{ document_type: string; is_required: boolean | null }>) {
  const buckets = new Map<string, { type: string; count: number; required: number }>();

  for (const pattern of patterns) {
    const bucket = buckets.get(pattern.document_type) ?? { type: pattern.document_type, count: 0, required: 0 };
    bucket.count += 1;
    if (pattern.is_required) bucket.required += 1;
    buckets.set(pattern.document_type, bucket);
  }

  return Array.from(buckets.values())
    .map((bucket) => ({
      type: bucket.type,
      count: bucket.count,
      requiredShare: Math.round((bucket.required / bucket.count) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

function buildTopWinners(awards: Array<{ winner_jib: string | null; winner_name: string | null; winning_price: number | null }>) {
  const buckets = new Map<string, { name: string; wins: number; value: number }>();

  for (const award of awards) {
    const key = award.winner_jib || award.winner_name || "unknown";
    const bucket = buckets.get(key) ?? { name: award.winner_name || key, wins: 0, value: 0 };
    bucket.wins += 1;
    bucket.value += Number(award.winning_price ?? 0);
    buckets.set(key, bucket);
  }

  return Array.from(buckets.values()).sort((a, b) => b.wins - a.wins || b.value - a.value);
}
