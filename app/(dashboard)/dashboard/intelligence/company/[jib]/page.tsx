import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileSearch,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrencyKM } from "@/lib/currency";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription";
import { ProGate } from "@/components/subscription/pro-gate";

function formatDate(value: string | null): string {
  if (!value) {
    return "Bez datuma";
  }

  return new Intl.DateTimeFormat("bs-BA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatPercent(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  return `${Math.round(value * 10) / 10}%`;
}

export default async function CompanyIntelligencePage({
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

  const { data: company } = await supabase
    .from("market_companies")
    .select("name, jib, city, total_bids_count, total_wins_count, total_won_value, win_rate")
    .eq("jib", jib)
    .maybeSingle();

  const { data: awardsData } = await supabase
    .from("award_decisions")
    .select(
      "id, tender_id, contracting_authority_jib, winning_price, estimated_value, discount_pct, contract_type, award_date"
    )
    .eq("winner_jib", jib)
    .order("award_date", { ascending: false })
    .limit(100);

  const awards = awardsData ?? [];
  const tenderIds = [...new Set(awards.map((award) => award.tender_id).filter(Boolean))] as string[];
  const authorityJibs = [...new Set(awards.map((award) => award.contracting_authority_jib).filter(Boolean))] as string[];

  const { data: tenderRows } = tenderIds.length > 0
    ? await supabase
        .from("tenders")
        .select("id, title, deadline, estimated_value, contracting_authority, contract_type")
        .in("id", tenderIds)
    : { data: [] };

  const { data: authorityRows } = authorityJibs.length > 0
    ? await supabase
        .from("contracting_authorities")
        .select("jib, name, city")
        .in("jib", authorityJibs)
    : { data: [] };

  const tenderMap = new Map((tenderRows ?? []).map((tender) => [tender.id, tender]));
  const authorityMap = new Map((authorityRows ?? []).map((authority) => [authority.jib, authority]));

  const totalWins = company?.total_wins_count ?? awards.length;
  const totalWonValue = company?.total_won_value ?? awards.reduce((sum, award) => sum + (Number(award.winning_price) || 0), 0);
  const averageDiscount = awards.length > 0
    ? awards.reduce((sum, award) => sum + (Number(award.discount_pct) || 0), 0) / awards.filter((award) => award.discount_pct !== null).length || 0
    : 0;

  const topAuthoritiesMap = new Map<string, { jib: string; name: string; city: string | null; wins: number; totalValue: number }>();
  for (const award of awards) {
    if (!award.contracting_authority_jib) {
      continue;
    }

    const authority = authorityMap.get(award.contracting_authority_jib);
    const key = award.contracting_authority_jib;
    const existing = topAuthoritiesMap.get(key);
    const price = Number(award.winning_price) || 0;

    if (existing) {
      existing.wins += 1;
      existing.totalValue += price;
    } else {
      topAuthoritiesMap.set(key, {
        jib: key,
        name: authority?.name ?? key,
        city: authority?.city ?? null,
        wins: 1,
        totalValue: price,
      });
    }
  }

  const topAuthorities = [...topAuthoritiesMap.values()]
    .sort((a, b) => b.wins - a.wins || b.totalValue - a.totalValue)
    .slice(0, 8);

  const topCategoriesMap = new Map<string, { category: string; wins: number; totalValue: number }>();
  for (const award of awards) {
    const category = award.contract_type ?? "Nepoznato";
    const existing = topCategoriesMap.get(category);
    const price = Number(award.winning_price) || 0;

    if (existing) {
      existing.wins += 1;
      existing.totalValue += price;
    } else {
      topCategoriesMap.set(category, {
        category,
        wins: 1,
        totalValue: price,
      });
    }
  }

  const topCategories = [...topCategoriesMap.values()]
    .sort((a, b) => b.wins - a.wins || b.totalValue - a.totalValue)
    .slice(0, 6);

  const recentWins = awards.map((award) => {
    const tender = award.tender_id ? tenderMap.get(award.tender_id) ?? null : null;
    const authority = award.contracting_authority_jib
      ? authorityMap.get(award.contracting_authority_jib) ?? null
      : null;

    return {
      id: award.id,
      awardDate: award.award_date,
      winningPrice: Number(award.winning_price) || 0,
      estimatedValue: Number(award.estimated_value) || tender?.estimated_value || 0,
      discountPct: award.discount_pct,
      contractType: award.contract_type ?? tender?.contract_type ?? null,
      tenderId: tender?.id ?? null,
      tenderTitle: tender?.title ?? "Dodjela bez povezanog tendera",
      tenderDeadline: tender?.deadline ?? null,
      authorityJib: award.contracting_authority_jib,
      authorityName: authority?.name ?? tender?.contracting_authority ?? award.contracting_authority_jib ?? "Nepoznat naručilac",
      authorityCity: authority?.city ?? null,
    };
  });

  const pageTitle = company?.name ?? `Firma ${jib}`;

  return (
    <div className="max-w-[1280px] space-y-8">
      <div className="flex items-start gap-4">
        <Link href="/dashboard/intelligence#direct-rivals">
          <Button variant="outline" size="icon" className="rounded-xl">
            <ArrowLeft className="size-5 text-slate-600" />
          </Button>
        </Link>
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Building2 className="size-5" />
            </div>
            <h1 className="truncate text-2xl font-heading font-bold tracking-tight text-slate-900">
              {pageTitle}
            </h1>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm font-medium text-slate-500">
            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-slate-600">{jib}</span>
            {company?.city ? <span>{company.city}</span> : null}
            {typeof company?.total_bids_count === "number" ? (
              <span>{company.total_bids_count} ukupno ponuda</span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-bold uppercase tracking-wide text-slate-500">Ukupno pobjeda</p>
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Trophy className="size-5" />
            </div>
          </div>
          <p className="text-4xl font-heading font-extrabold text-slate-900">{totalWins}</p>
        </div>

        <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-bold uppercase tracking-wide text-slate-500">Osvojena vrijednost</p>
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <ArrowUpRight className="size-5" />
            </div>
          </div>
          <p className="text-4xl font-heading font-extrabold text-slate-900">{formatCurrencyKM(totalWonValue)}</p>
        </div>

        <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-bold uppercase tracking-wide text-slate-500">Uspješnost / popust</p>
            <div className="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <CheckCircle2 className="size-5" />
            </div>
          </div>
          <p className="text-2xl font-heading font-extrabold text-slate-900">
            {company?.win_rate !== null && company?.win_rate !== undefined
              ? formatPercent(company.win_rate)
              : formatPercent(averageDiscount)}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {company?.win_rate !== null && company?.win_rate !== undefined
              ? "Stopa uspješnosti firme"
              : "Prosječan ostvareni popust na dostupnim odlukama"}
          </p>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.65fr_1fr]">
        <div className="rounded-[1.5rem] border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-5">
            <h2 className="font-heading text-lg font-bold text-slate-900">Zadnje pobjede</h2>
            <p className="mt-1 text-xs font-medium text-slate-500">Osvojeni poslovi i povezni tenderi kada su dostupni.</p>
          </div>
          {recentWins.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <p className="text-sm font-medium">Nema evidentiranih pobjeda za ovu firmu.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recentWins.map((win) => (
                <div key={win.id} className="px-6 py-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="line-clamp-2 text-base font-bold text-slate-900">{win.tenderTitle}</p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="size-3.5" />
                          {formatDate(win.awardDate)}
                        </span>
                        <span>{win.authorityName}</span>
                        {win.authorityCity ? <span>{win.authorityCity}</span> : null}
                        {win.contractType ? (
                          <span className="rounded border border-slate-200 bg-white px-2 py-0.5 text-slate-600">
                            {win.contractType}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="text-left lg:text-right">
                      <p className="text-sm font-bold text-emerald-600">{formatCurrencyKM(win.winningPrice)}</p>
                      {win.discountPct !== null ? (
                        <p className="mt-1 text-xs text-slate-500">Popust {formatPercent(win.discountPct)}</p>
                      ) : win.estimatedValue > 0 ? (
                        <p className="mt-1 text-xs text-slate-500">Procjena {formatCurrencyKM(win.estimatedValue)}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {win.tenderId ? (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/tenders/${win.tenderId}`}>
                          <FileSearch className="size-4" />
                          Otvori tender
                        </Link>
                      </Button>
                    ) : null}
                    {win.authorityJib ? (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/intelligence/authority/${win.authorityJib}`}>
                          Naručilac
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-8">
          <div className="rounded-[1.5rem] border border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-5">
              <h2 className="font-heading text-lg font-bold text-slate-900">Najjači naručioci</h2>
              <p className="mt-1 text-xs font-medium text-slate-500">Gdje ova firma najčešće pobjeđuje.</p>
            </div>
            {topAuthorities.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">Nema podataka o naručiocima.</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {topAuthorities.map((authority) => (
                  <Link
                    key={authority.jib}
                    href={`/dashboard/intelligence/authority/${authority.jib}`}
                    className="flex items-center justify-between gap-3 px-6 py-4 transition-colors hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">{authority.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {authority.wins} pobjeda{authority.city ? ` · ${authority.city}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-emerald-700">
                      {formatCurrencyKM(authority.totalValue)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[1.5rem] border border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-5">
              <h2 className="font-heading text-lg font-bold text-slate-900">Kategorije pobjeda</h2>
              <p className="mt-1 text-xs font-medium text-slate-500">U kojim tipovima ugovora firma najčešće pobjeđuje.</p>
            </div>
            {topCategories.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">Nema podataka o kategorijama.</div>
            ) : (
              <div className="space-y-3 px-6 py-5">
                {topCategories.map((category) => (
                  <div key={category.category} className="rounded-xl border border-slate-200 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-slate-900">{category.category}</p>
                      <span className="text-xs font-bold text-slate-500">{category.wins} pobjeda</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Vrijednost {formatCurrencyKM(category.totalValue)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
