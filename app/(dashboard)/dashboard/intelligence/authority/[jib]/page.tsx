import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription";
import { ProGate } from "@/components/subscription/pro-gate";
import Link from "next/link";
import { ArrowLeft, Building2, FileCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

function formatKM(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M KM`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K KM`;
  return `${value.toFixed(0)} KM`;
}

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
};

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

  const { isSubscribed } = await getSubscriptionStatus(user.id);
  if (!isSubscribed) return <ProGate />;

  // Info o naručiocu
  const { data: authority } = await supabase
    .from("contracting_authorities")
    .select("name, jib, city, entity, canton, authority_type")
    .eq("jib", jib)
    .maybeSingle();

  const authorityName = authority?.name ?? `Naručilac ${jib}`;

  // Tenderi
  const { data: tenders } = await supabase
    .from("tenders")
    .select("id, estimated_value")
    .eq("contracting_authority_jib", jib);

  const totalTenders = tenders?.length ?? 0;
  const totalValue = (tenders ?? []).reduce(
    (sum, t) => sum + (Number(t.estimated_value) || 0),
    0
  );

  // Odluke
  const { data: awards } = await supabase
    .from("award_decisions")
    .select("winner_name, winner_jib, winning_price")
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
  const now = new Date().toISOString();
  const { data: activeTenders } = await supabase
    .from("tenders")
    .select("id, title, deadline, estimated_value, contract_type")
    .eq("contracting_authority_jib", jib)
    .gte("deadline", now)
    .order("deadline", { ascending: true })
    .limit(20);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/dashboard/intelligence">
          <Button variant="ghost" size="icon-xs">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{authorityName}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="font-mono">{jib}</span>
            {authority?.city && <span>{authority.city}</span>}
            {authority?.entity && <span>{authority.entity}</span>}
            {authority?.authority_type && (
              <span className="rounded bg-secondary px-1.5 py-0.5 text-xs">{authority.authority_type}</span>
            )}
          </div>
        </div>
      </div>

      {/* Kartice */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Ukupno tendera</p>
            <FileCheck className="size-4 text-muted-foreground" />
          </div>
          <p className="mt-2 font-mono text-3xl font-bold">{totalTenders}</p>
        </div>
        <div className="rounded-md border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Ukupna vrijednost</p>
            <Building2 className="size-4 text-muted-foreground" />
          </div>
          <p className="mt-2 font-mono text-3xl font-bold">{formatKM(totalValue)}</p>
        </div>
        <div className="rounded-md border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Odluke o dodjeli</p>
            <Clock className="size-4 text-muted-foreground" />
          </div>
          <p className="mt-2 font-mono text-3xl font-bold">{awards?.length ?? 0}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Najčešći pobjednici */}
        <div className="rounded-md border border-border bg-card p-5">
          <h2 className="font-serif text-lg font-bold">Najčešći pobjednici</h2>
          <p className="mb-3 text-xs text-muted-foreground">Ko najčešće dobija ugovore od ovog naručioca</p>
          {topWinners.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Nema podataka.</p>
          ) : (
            <div className="space-y-2">
              {topWinners.map((w, i) => (
                <div key={w.jib} className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-xs">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm">{w.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{w.wins} pobjeda</p>
                    </div>
                  </div>
                  <span className="shrink-0 font-mono text-sm text-primary">{formatKM(w.total_value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tipični dokumentacijski zahtjevi */}
        <div className="rounded-md border border-border bg-card p-5">
          <h2 className="font-serif text-lg font-bold">Tipični zahtjevi</h2>
          <p className="mb-3 text-xs text-muted-foreground">Dokumenti koje ovaj naručilac najčešće traži</p>
          {typicalRequirements.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nema AI analiza za ovog naručioca.
            </p>
          ) : (
            <div className="space-y-2">
              {typicalRequirements.map((r) => (
                <div key={r.type} className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2">
                  <span className="text-sm">{DOC_TYPE_LABELS[r.type] ?? r.type}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {r.required}/{r.count} obavezno
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Aktivni tenderi */}
      <div className="rounded-md border border-border bg-card p-5">
        <h2 className="font-serif text-lg font-bold">Aktivni tenderi</h2>
        <p className="mb-3 text-xs text-muted-foreground">Tenderi s otvorenim rokom za dostavljanje ponuda</p>
        {(activeTenders ?? []).length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Nema aktivnih tendera.</p>
        ) : (
          <div className="space-y-2">
            {(activeTenders ?? []).map((t) => (
              <Link
                key={t.id}
                href={`/dashboard/tenders/${t.id}`}
                className="block rounded-md border border-border/50 px-4 py-3 transition-colors hover:bg-secondary/30"
              >
                <p className="text-sm font-medium">{t.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {t.deadline && (
                    <span className="font-mono">
                      Rok: {new Date(t.deadline).toLocaleDateString("bs-BA")}
                    </span>
                  )}
                  {t.estimated_value && (
                    <span className="font-mono">{formatKM(Number(t.estimated_value))}</span>
                  )}
                  {t.contract_type && (
                    <span className="rounded bg-secondary px-1.5 py-0.5">{t.contract_type}</span>
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
