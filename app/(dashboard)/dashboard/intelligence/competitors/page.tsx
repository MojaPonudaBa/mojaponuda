import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription";
import { ProGate } from "@/components/subscription/pro-gate";
import type { Company } from "@/types/database";
import { Swords } from "lucide-react";

function formatKM(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M KM`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K KM`;
  return `${value.toFixed(0)} KM`;
}

export default async function CompetitorsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { isSubscribed } = await getSubscriptionStatus(user.id);
  if (!isSubscribed) return <ProGate />;

  const { data: companyData } = await supabase
    .from("companies")
    .select("id, jib")
    .eq("user_id", user.id)
    .single();

  const company = companyData as Company | null;
  if (!company) redirect("/onboarding");

  // Naše kategorije
  const { data: ourAwards } = await supabase
    .from("award_decisions")
    .select("contract_type")
    .eq("winner_jib", company.jib)
    .not("contract_type", "is", null);

  const ourCategories = [...new Set((ourAwards ?? []).map((a) => a.contract_type!))];

  // Konkurenti u istim kategorijama
  let competitors: {
    name: string;
    jib: string;
    wins: number;
    total_value: number;
    categories: string[];
    last_win_date: string | null;
    win_rate: number | null;
  }[] = [];

  if (ourCategories.length > 0) {
    const { data: catAwards } = await supabase
      .from("award_decisions")
      .select("winner_name, winner_jib, winning_price, contract_type, award_date")
      .in("contract_type", ourCategories)
      .not("winner_jib", "is", null)
      .order("award_date", { ascending: false });

    const cMap = new Map<string, {
      name: string; jib: string; wins: number; total_value: number;
      categories: Set<string>; last_win_date: string | null;
    }>();

    for (const a of catAwards ?? []) {
      if (a.winner_jib === company.jib) continue;
      const key = a.winner_jib!;
      const price = Number(a.winning_price) || 0;
      const cat = a.contract_type ?? "";
      const e = cMap.get(key);
      if (e) {
        e.wins++;
        e.total_value += price;
        if (cat) e.categories.add(cat);
        if (a.award_date && (!e.last_win_date || a.award_date > e.last_win_date))
          e.last_win_date = a.award_date;
      } else {
        const cats = new Set<string>();
        if (cat) cats.add(cat);
        cMap.set(key, {
          name: a.winner_name ?? key, jib: key, wins: 1,
          total_value: price, categories: cats, last_win_date: a.award_date,
        });
      }
    }

    const jibs = [...cMap.keys()].slice(0, 50);
    const { data: marketData } = jibs.length > 0
      ? await supabase.from("market_companies").select("jib, win_rate").in("jib", jibs)
      : { data: [] };
    const wrMap = new Map((marketData ?? []).map((m) => [m.jib, m.win_rate]));

    competitors = [...cMap.values()]
      .map((c) => ({
        name: c.name, jib: c.jib, wins: c.wins, total_value: c.total_value,
        categories: [...c.categories], last_win_date: c.last_win_date,
        win_rate: wrMap.get(c.jib) ?? null,
      }))
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 20);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Konkurenti</h1>
        <p className="text-sm text-muted-foreground">
          Firme koje se takmiče u istim kategorijama kao vi
          {ourCategories.length > 0 && (
            <span className="ml-1 font-mono">
              ({ourCategories.join(", ")})
            </span>
          )}
        </p>
      </div>

      {competitors.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-border bg-card py-16">
          <Swords className="size-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            {ourCategories.length === 0
              ? "Nema podataka o vašim učešćima za identifikaciju konkurenata."
              : "Nema pronađenih konkurenata u vašim kategorijama."}
          </p>
        </div>
      ) : (
        <div className="rounded-md border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">#</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Firma</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-right">Pobjede</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-right">Win rate</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-right">Vrijednost</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Kategorije</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-right">Zadnja pobjeda</th>
                </tr>
              </thead>
              <tbody>
                {competitors.map((c, i) => (
                  <tr key={c.jib} className="border-b border-border/50 hover:bg-secondary/30">
                    <td className="px-4 py-3 font-mono text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{c.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{c.jib}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{c.wins}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {c.win_rate !== null ? `${c.win_rate}%` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-primary">
                      {formatKM(c.total_value)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.categories.map((cat) => (
                          <span
                            key={cat}
                            className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs text-secondary-foreground"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                      {c.last_win_date
                        ? new Date(c.last_win_date).toLocaleDateString("bs-BA")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
