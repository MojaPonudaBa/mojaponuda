import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCurrencyKM } from "@/lib/currency";
import { getSubscriptionStatus } from "@/lib/subscription";
import { ProGate } from "@/components/subscription/pro-gate";
import { WatchButton } from "@/components/watchlist/watch-button";
import { isWatched } from "@/lib/watchlist";
import Link from "next/link";
import { ArrowLeft, Building2, FileCheck, Clock, CheckCircle, TrendingUp, Users2, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";

const DOC_TYPE_LABELS: Record<string, string> = {
  registration: "Rješenje o registraciji",
  tax: "Porezna uvjerenja",
  contributions: "Uvjerenja o doprinosima",
  guarantee: "Bankarska garancija",
  reference: "Reference",
  financial: "Finansijski izvještaji",
  staff: "Ključno osoblje",
  license: "Dozvole i licence",
  declaration: "Izjave",
  other: "Ostalo",
  // Add fallback for database values that might match keys but different case
  "Rješenje o registraciji": "Rješenje o registraciji",
  "Porezna uvjerenja": "Porezna uvjerenja",
  "Uvjerenja o doprinosima": "Uvjerenja o doprinosima",
  "Bankarska garancija": "Bankarska garancija",
  "Reference": "Reference",
  "Finansijski izvještaji": "Finansijski izvještaji",
  "Ključno osoblje": "Ključno osoblje",
  "Dozvole i licence": "Dozvole i licence",
  "Izjave": "Izjave",
  "Ostalo": "Ostalo"
};

function median(values: number[]): number | null {
  const sorted = values.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function share(count: number, total: number): number | null {
  return total > 0 ? Math.round((count / total) * 100) : null;
}

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
  if (!user) redirect("/login");

  const { isSubscribed } = await getSubscriptionStatus(user.id, user.email);
  if (!isSubscribed) return <ProGate />;

  // Info o naručiocu
  const { data: authority } = await supabase
    .from("contracting_authorities")
    .select("name, jib, city, entity, canton, authority_type")
    .eq("jib", jib)
    .maybeSingle();

  const authorityName = authority?.name ?? `Naručilac ${jib}`;

  // Tenderi
  const { count: totalTenderCount } = await supabase
    .from("tenders")
    .select("id", { count: "exact", head: true })
    .eq("contracting_authority_jib", jib);

  const totalTenders = totalTenderCount ?? 0;

  // Odluke
  const { data: awards } = await supabase
    .from("award_decisions")
    .select("winner_name, winner_jib, winning_price, total_bidders_count, discount_pct, award_date, contract_type")
    .eq("contracting_authority_jib", jib)
    .not("winner_jib", "is", null);

  const winnerMap = new Map<
    string,
    { name: string; jib: string; wins: number; total_value: number }
  >();
  for (const a of awards ?? []) {
    const key = a.winner_jib!;
    const price = Number(a.winning_price) || 0;
    const e = winnerMap.get(key);
    if (e) { e.wins++; e.total_value += price; }
    else winnerMap.set(key, { name: a.winner_name ?? key, jib: key, wins: 1, total_value: price });
  }
  const topWinners = [...winnerMap.values()].sort((a, b) => b.wins - a.wins).slice(0, 10);
  const awardCount = awards?.length ?? 0;
  const totalValue = (awards ?? []).reduce((sum, award) => sum + (Number(award.winning_price) || 0), 0);
  const topWinner = topWinners[0] ?? null;
  const topWinnerShare = topWinner ? share(topWinner.wins, awardCount) : null;
  const priceSamples = (awards ?? []).map((award) => Number(award.winning_price)).filter((value) => value > 0);
  const medianAwardValue = median(priceSamples);
  const bidderSamples = (awards ?? [])
    .map((award) => Number(award.total_bidders_count))
    .filter((value) => Number.isFinite(value) && value > 0);
  const avgBidders = bidderSamples.length > 0
    ? bidderSamples.reduce((sum, value) => sum + value, 0) / bidderSamples.length
    : null;
  const discountSamples = (awards ?? [])
    .map((award) => Number(award.discount_pct))
    .filter((value) => Number.isFinite(value) && value > 0);
  const avgDiscount = discountSamples.length > 0
    ? discountSamples.reduce((sum, value) => sum + value, 0) / discountSamples.length
    : null;

  // Tipični zahtjevi
  const { data: patterns } = await supabase
    .from("authority_requirement_patterns")
    .select("document_type, is_required")
    .eq("contracting_authority_jib", jib);

  const patternMap = new Map<string, { type: string; count: number; required: number }>();
  for (const p of patterns ?? []) {
    const e = patternMap.get(p.document_type);
    if (e) { e.count++; if (p.is_required) e.required++; }
    else patternMap.set(p.document_type, { type: p.document_type, count: 1, required: p.is_required ? 1 : 0 });
  }
  const typicalRequirements = [...patternMap.values()].sort((a, b) => b.count - a.count);

  // Aktivni tenderi
  const nowIso = new Date().toISOString();
  const { data: activeTenders } = await supabase
    .from("tenders")
    .select("id, title, deadline, estimated_value, contract_type")
    .eq("contracting_authority_jib", jib)
    .gte("deadline", nowIso)
    .order("deadline", { ascending: true })
    .limit(20);

  // Agregati iz analytics tablice + watch status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anySupabase = supabase as any;
  const [statsResult, alreadyWatched] = await Promise.all([
    anySupabase
      .from("authority_stats")
      .select("avg_contract_value, avg_bidders_count, avg_discount_pct, top_cpv_codes")
      .eq("authority_jib", jib)
      .maybeSingle(),
    isWatched(user.id, "authority", jib),
  ]);
  const authorityStats = (statsResult?.data ?? null) as {
    avg_contract_value: number | null;
    avg_bidders_count: number | null;
    avg_discount_pct: number | null;
    top_cpv_codes: string[] | null;
  } | null;

  const authorityConclusions = [
    {
      title: topWinnerShare !== null && topWinnerShare >= 35 ? "Koncentrisana dodjela" : "Otvoreniji obrazac dodjele",
      value: topWinnerShare !== null && topWinner ? `${topWinnerShare}% kod ${topWinner.name}` : "Nema dovoljno pobjednika",
      body: topWinnerShare !== null && topWinnerShare >= 35
        ? "Jedan dobavljac uzima veliki dio poznatih dodjela. Prije ulaska provjerite da li imate jasnu diferencijaciju ili bolju cijenu."
        : "Poznate dodjele nisu vezane za jednog dominantnog dobavljaca, pa je prostor za nove ponude realniji.",
      tone: "border-blue-100 bg-blue-50 text-blue-800",
    },
    {
      title: "Cjenovni kontekst",
      value: medianAwardValue !== null ? formatCurrencyKM(medianAwardValue) : "Niska pouzdanost",
      body: priceSamples.length >= 5
        ? `Medijan poznatih pobjednickih cijena je izracunat iz ${priceSamples.length} dodjela. Koristite ga kao okvir, ne kao tacnu procjenu budzeta.`
        : "Premalo poznatih cijena kod ovog narucioca. Cijenu osloniti na slicne CPV dodjele i vlastitu kalkulaciju.",
      tone: "border-emerald-100 bg-emerald-50 text-emerald-800",
    },
    {
      title: "Konkurencija",
      value: avgBidders !== null ? `${avgBidders.toFixed(1)} ponudjaca` : `${winnerMap.size} poznatih pobjednika`,
      body: avgBidders !== null
        ? `Broj ponudjaca je zasnovan na ${bidderSamples.length} dodjela gdje je taj podatak objavljen.`
        : "Broj ponudjaca nije dovoljno popunjen, pa sistem koristi sirinu poznatih pobjednika kao indirektan signal.",
      tone: "border-amber-100 bg-amber-50 text-amber-800",
    },
    {
      title: "Akcija",
      value: (activeTenders ?? []).length > 0 ? `${(activeTenders ?? []).length} aktivnih tendera` : "Pratiti naredne objave",
      body: (activeTenders ?? []).length > 0
        ? "Postoje otvoreni rokovi kod ovog narucioca. Otvorite aktivne tendere i odmah provjerite uskladjenost, rizik i potrebne dokumente."
        : "Nema otvorenih rokova, ali pracenje ovog narucioca je korisno ako se pojavljuje u vasim CPV kategorijama.",
      tone: "border-slate-200 bg-white text-slate-800",
    },
  ];

  return (
    <div className="space-y-8 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/dashboard/intelligence">
          <Button variant="outline" size="icon" className="rounded-xl">
            <ArrowLeft className="size-5 text-slate-600" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Building2 className="size-5" />
            </div>
            <h1 className="text-2xl font-heading font-bold text-slate-900 tracking-tight leading-tight">{authorityName}</h1>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm font-medium text-slate-500 ml-1">
            <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">{jib}</span>
            {authority?.city && <span className="flex items-center gap-1"><span className="size-1 rounded-full bg-slate-300"></span>{authority.city}</span>}
            {authority?.entity && <span className="flex items-center gap-1"><span className="size-1 rounded-full bg-slate-300"></span>{authority.entity}</span>}
            {authority?.authority_type && (
              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-600 border border-blue-100">{authority.authority_type}</span>
            )}
          </div>
        </div>
        <div className="ml-auto">
          <WatchButton
            entityType="authority"
            entityKey={jib}
            entityLabel={authorityName}
            isWatched={alreadyWatched}
            redirectTo={`/dashboard/intelligence/authority/${jib}`}
            size="sm"
          />
        </div>
      </div>

      {/* Kartice */}
      <div className="grid gap-6 sm:grid-cols-3">
        <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm flex flex-col justify-between group hover:border-blue-200 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Ukupno tendera</p>
            <div className="size-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
              <FileCheck className="size-4" />
            </div>
          </div>
          <p className="font-heading text-4xl font-extrabold text-slate-900">{totalTenders}</p>
        </div>
        <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm flex flex-col justify-between group hover:border-emerald-200 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Vrijednost dodjela</p>
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="size-4" />
            </div>
          </div>
          <p className="font-heading text-4xl font-extrabold text-slate-900 tracking-tight">{formatCurrencyKM(totalValue)}</p>
        </div>
        <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm flex flex-col justify-between group hover:border-amber-200 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Odluke o dodjeli</p>
            <div className="size-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors">
              <Clock className="size-4" />
            </div>
          </div>
          <p className="font-heading text-4xl font-extrabold text-slate-900">{awards?.length ?? 0}</p>
        </div>
      </div>

      {/* Analytics iz agregata */}
      {authorityStats && (
        <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-heading text-lg font-bold text-slate-900">Profil naručioca</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <TrendingUp className="size-3.5" />
                Prosječna vrijednost ugovora
              </div>
              <div className="text-2xl font-heading font-bold text-slate-900">
                {authorityStats.avg_contract_value !== null
                  ? formatCurrencyKM(Number(authorityStats.avg_contract_value))
                  : "—"}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Users2 className="size-3.5" />
                Prosj. broj ponuđača
              </div>
              <div className="text-2xl font-heading font-bold text-slate-900">
                {authorityStats.avg_bidders_count !== null
                  ? Number(authorityStats.avg_bidders_count).toFixed(1)
                  : "—"}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Percent className="size-3.5" />
                Prosj. popust pobjednika
              </div>
              <div className="text-2xl font-heading font-bold text-slate-900">
                {authorityStats.avg_discount_pct !== null
                  ? `${Number(authorityStats.avg_discount_pct).toFixed(1)}%`
                  : "—"}
              </div>
            </div>
          </div>
          {authorityStats.top_cpv_codes && authorityStats.top_cpv_codes.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Top CPV kategorije
              </div>
              <div className="flex flex-wrap gap-2">
                {authorityStats.top_cpv_codes.slice(0, 5).map((cpv) => (
                  <span key={cpv} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 border border-blue-100">
                    CPV {cpv}*
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-heading text-lg font-bold text-slate-900">Zakljucci za odluku</h2>
            <p className="mt-1 text-sm text-slate-500">
              Kratak prevod dostupnih historijskih podataka u prakticne poteze za sljedecu ponudu.
            </p>
          </div>
          {avgDiscount !== null ? (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
              Prosj. poznati popust {avgDiscount.toFixed(1)}%
            </span>
          ) : null}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {authorityConclusions.map((item) => (
            <div key={item.title} className={`rounded-2xl border p-4 ${item.tone}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold">{item.title}</p>
                  <p className="mt-1 text-lg font-heading font-extrabold">{item.value}</p>
                </div>
                <CheckCircle className="mt-1 size-4 shrink-0 opacity-70" />
              </div>
              <p className="mt-3 text-sm leading-6 opacity-90">{item.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Najčešći pobjednici */}
        <div className="rounded-[1.5rem] border border-slate-100 bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-heading text-lg font-bold text-slate-900">Najčešći pobjednici</h2>
            <p className="mt-1 text-xs font-medium text-slate-500">Ko najčešće dobija ugovore od ovog naručioca</p>
          </div>
          <div className="p-0 flex-1">
            {topWinners.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <p className="text-sm font-medium">Nema podataka o pobjednicima.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {topWinners.map((w, i) => (
                  <div key={w.jib} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold ${
                        i === 0 ? "bg-amber-100 text-amber-700" :
                        i === 1 ? "bg-slate-200 text-slate-700" :
                        i === 2 ? "bg-orange-100 text-orange-800" :
                        "bg-slate-50 text-slate-500"
                      }`}>
                        {i + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">{w.name}</p>
                        <p className="font-mono text-xs text-slate-500">{w.wins} pobjeda</p>
                      </div>
                    </div>
                    <span className="shrink-0 font-mono text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">{formatCurrencyKM(w.total_value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tipični dokumentacijski zahtjevi */}
        <div className="rounded-[1.5rem] border border-slate-100 bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-heading text-lg font-bold text-slate-900">Tipični zahtjevi</h2>
            <p className="mt-1 text-xs font-medium text-slate-500">Dokumenti koje ovaj naručilac najčešće traži</p>
          </div>
          <div className="p-0 flex-1">
            {typicalRequirements.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <p className="text-sm font-medium">Nema automatskih analiza za ovog naručioca.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {typicalRequirements.map((r) => (
                  <div key={r.type} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="size-4 text-emerald-500" />
                      <span className="text-sm font-medium text-slate-700">{DOC_TYPE_LABELS[r.type] ?? r.type}</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                      {Math.round((r.required / r.count) * 100)}% obavezno
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Aktivni tenderi */}
      <div className="rounded-[1.5rem] border border-slate-100 bg-white shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-heading text-lg font-bold text-slate-900">Aktivni tenderi</h2>
          <p className="mt-1 text-xs font-medium text-slate-500">Tenderi s otvorenim rokom za dostavljanje ponuda</p>
        </div>
        {(activeTenders ?? []).length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <p className="text-sm font-medium">Nema aktivnih tendera.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {(activeTenders ?? []).map((t) => (
              <Link
                key={t.id}
                href={`/dashboard/tenders/${t.id}`}
                className="block p-4 transition-colors hover:bg-slate-50 group"
              >
                <div className="flex justify-between gap-4">
                  <p className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-1">{t.title}</p>
                  {t.estimated_value && (
                    <span className="font-mono text-sm font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md whitespace-nowrap">{formatCurrencyKM(Number(t.estimated_value))}</span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  {t.deadline && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="size-3.5" />
                      <span className="font-medium text-slate-700">
                        Rok: {new Date(t.deadline).toLocaleDateString("bs-BA")}
                      </span>
                    </div>
                  )}
                  {t.contract_type && (
                    <span className="rounded bg-white border border-slate-200 px-1.5 py-0.5 font-medium">{t.contract_type}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
