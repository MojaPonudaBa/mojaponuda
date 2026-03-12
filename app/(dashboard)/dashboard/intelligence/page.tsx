import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription";
import { ProGate } from "@/components/subscription/pro-gate";
import { CategoryChart } from "@/components/intelligence/category-chart";
import { TrendingUp, FileText, BarChart3 } from "lucide-react";
import Link from "next/link";

function formatKM(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M KM`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K KM`;
  return `${value.toFixed(0)} KM`;
}

export default async function IntelligencePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { isSubscribed } = await getSubscriptionStatus(user.id);
  if (!isSubscribed) return <ProGate />;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];

  // Aktivni tenderi
  const { count: activeCount } = await supabase
    .from("tenders")
    .select("id", { count: "exact", head: true })
    .gte("deadline", now.toISOString());

  // Ukupna godišnja vrijednost dodijeljenih ugovora
  const { data: yearAwards } = await supabase
    .from("award_decisions")
    .select("winning_price, contract_type")
    .gte("award_date", startOfYear)
    .not("winning_price", "is", null);

  const yearTotalValue = (yearAwards ?? []).reduce(
    (sum, a) => sum + (Number(a.winning_price) || 0),
    0
  );

  // Tenderi po kategoriji
  const categoryMap = new Map<string, { category: string; count: number; total_value: number }>();
  for (const a of yearAwards ?? []) {
    const cat = a.contract_type ?? "Ostalo";
    const existing = categoryMap.get(cat);
    const price = Number(a.winning_price) || 0;
    if (existing) {
      existing.count++;
      existing.total_value += price;
    } else {
      categoryMap.set(cat, { category: cat, count: 1, total_value: price });
    }
  }
  const categoryData = [...categoryMap.values()].sort((a, b) => b.count - a.count);

  // Top 10 naručilaca ovog mjeseca
  const { data: monthTenders } = await supabase
    .from("tenders")
    .select("contracting_authority, contracting_authority_jib")
    .gte("created_at", startOfMonth)
    .not("contracting_authority", "is", null);

  const authMap = new Map<string, { name: string; jib: string | null; count: number }>();
  for (const t of monthTenders ?? []) {
    const key = t.contracting_authority!;
    const e = authMap.get(key);
    if (e) e.count++;
    else authMap.set(key, { name: key, jib: t.contracting_authority_jib, count: 1 });
  }
  const topAuthorities = [...authMap.values()].sort((a, b) => b.count - a.count).slice(0, 10);

  // Top 10 pobjednika ove godine
  const winnerMap = new Map<string, { name: string; jib: string; wins: number; total_value: number }>();
  for (const a of yearAwards ?? []) {
    // need winner info — refetch with winner fields
  }
  const { data: winnerAwards } = await supabase
    .from("award_decisions")
    .select("winner_name, winner_jib, winning_price")
    .gte("award_date", startOfYear)
    .not("winner_jib", "is", null)
    .not("winning_price", "is", null);

  for (const a of winnerAwards ?? []) {
    const key = a.winner_jib!;
    const e = winnerMap.get(key);
    const price = Number(a.winning_price) || 0;
    if (e) { e.wins++; e.total_value += price; }
    else winnerMap.set(key, { name: a.winner_name ?? key, jib: key, wins: 1, total_value: price });
  }
  const topWinners = [...winnerMap.values()].sort((a, b) => b.total_value - a.total_value).slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tržišna inteligencija</h1>
        <p className="text-sm text-muted-foreground">
          Pregled BiH tržišta javnih nabavki — podaci iz e-Procurement portala
        </p>
      </div>

      {/* Kartice */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Aktivni tenderi</p>
            <FileText className="size-4 text-muted-foreground" />
          </div>
          <p className="mt-2 font-mono text-3xl font-bold">{activeCount ?? 0}</p>
          <p className="mt-1 text-xs text-muted-foreground">S otvorenim rokom</p>
        </div>

        <div className="rounded-md border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Godišnja vrijednost</p>
            <TrendingUp className="size-4 text-muted-foreground" />
          </div>
          <p className="mt-2 font-mono text-3xl font-bold">{formatKM(yearTotalValue)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Dodijeljeni ugovori {now.getFullYear()}</p>
        </div>

        <div className="rounded-md border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Prosječni popust</p>
            <BarChart3 className="size-4 text-muted-foreground" />
          </div>
          <p className="mt-2 font-mono text-3xl font-bold">
            {yearAwards && yearAwards.length > 0 ? "—" : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Od procijenjene vrijednosti</p>
        </div>
      </div>

      {/* Bar chart: tenderi po kategoriji */}
      <div className="rounded-md border border-border bg-card p-5">
        <h2 className="font-serif text-lg font-bold">Ugovori po kategoriji</h2>
        <p className="mb-4 text-xs text-muted-foreground">Raspodjela dodijeljenih ugovora u {now.getFullYear()}</p>
        <CategoryChart data={categoryData} />
      </div>

      {/* Dva panela */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top naručioci */}
        <div className="rounded-md border border-border bg-card p-5">
          <h2 className="font-serif text-lg font-bold">Top naručioci ovog mjeseca</h2>
          <p className="mb-3 text-xs text-muted-foreground">Po broju raspisanih tendera</p>
          {topAuthorities.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Nema podataka.</p>
          ) : (
            <div className="space-y-2">
              {topAuthorities.map((a, i) => (
                <div key={a.name} className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-xs">
                      {i + 1}
                    </span>
                    {a.jib ? (
                      <Link href={`/dashboard/intelligence/authority/${a.jib}`} className="truncate text-sm hover:text-primary transition-colors">
                        {a.name}
                      </Link>
                    ) : (
                      <span className="truncate text-sm">{a.name}</span>
                    )}
                  </div>
                  <span className="shrink-0 font-mono text-sm text-muted-foreground">{a.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top pobjednici */}
        <div className="rounded-md border border-border bg-card p-5">
          <h2 className="font-serif text-lg font-bold">Top pobjednici ove godine</h2>
          <p className="mb-3 text-xs text-muted-foreground">Po ukupnoj vrijednosti dobijenih ugovora</p>
          {topWinners.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Nema podataka.</p>
          ) : (
            <div className="space-y-2">
              {topWinners.map((w, i) => (
                <div key={w.jib} className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-xs">
                      {i + 1}
                    </span>
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
      </div>
    </div>
  );
}
