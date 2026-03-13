import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { demoCompetitors, isCompanyProfileComplete, isDemoUser } from "@/lib/demo";
import { getSubscriptionStatus } from "@/lib/subscription";
import { ProGate } from "@/components/subscription/pro-gate";
import type { Company } from "@/types/database";
import { Swords, Trophy, Percent, TrendingUp, Search } from "lucide-react";

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

  const isDemoAccount = isDemoUser(user.email);
  const { isSubscribed } = await getSubscriptionStatus(user.id, user.email);
  if (!isSubscribed) return <ProGate />;

  const { data: companyData } = await supabase
    .from("companies")
    .select("id, jib")
    .eq("user_id", user.id)
    .maybeSingle();

  const company = companyData as Company | null;
  if (!isCompanyProfileComplete(company)) redirect("/onboarding");

  const resolvedCompany = company as Company;

  // Naše kategorije
  const { data: ourAwards } = await supabase
    .from("award_decisions")
    .select("contract_type")
    .eq("winner_jib", resolvedCompany.jib)
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
      if (a.winner_jib === resolvedCompany.jib) continue;
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

  const displayCompetitors = competitors.length > 0 ? competitors : isDemoAccount ? demoCompetitors : [];

  return (
    <div className="space-y-8 max-w-[1200px]">
      <div>
        <h1 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">Analiza Konkurencije</h1>
        <p className="mt-2 text-base text-slate-500">
          Uvid u firme koje se takmiče u istim kategorijama kao vi
          {ourCategories.length > 0 && (
            <span className="ml-1 font-mono text-xs font-bold text-slate-400">
              ({ourCategories.join(", ")})
            </span>
          )}
        </p>
      </div>

      {displayCompetitors.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 py-24 text-center">
          <div className="size-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
             <Swords className="size-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Nema dovoljno podataka</h3>
          <p className="mt-2 text-sm text-slate-500 max-w-sm">
            {ourCategories.length === 0
              ? "Potrebno je da osvojite bar jedan ugovor kako bismo identifikovali vašu konkurenciju."
              : "Trenutno nema drugih firmi sa pobjedama u vašim kategorijama."}
          </p>
        </div>
      ) : (
        <div className="rounded-[1.5rem] border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-left">
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">#</th>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Firma</th>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs text-right">Pobjede</th>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs text-right">Win rate</th>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs text-right">Vrijednost</th>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Kategorije</th>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs text-right">Zadnja pobjeda</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {displayCompetitors.map((c, i) => (
                  <tr key={c.jib} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4 font-mono text-slate-400 font-medium">
                      {i + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <p className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{c.name}</p>
                        <p className="font-mono text-[10px] text-slate-400 mt-0.5">ID: {c.jib}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-1.5 font-mono font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md">
                        <Trophy className="size-3 text-amber-500" />
                        {c.wins}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end">
                        <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md ${
                          (c.win_rate || 0) > 50 ? "text-emerald-700 bg-emerald-50" : "text-slate-600 bg-slate-50"
                        }`}>
                          <Percent className="size-3" />
                          {c.win_rate !== null ? `${c.win_rate}%` : "—"}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-blue-600">
                      {formatKM(c.total_value)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {c.categories.slice(0, 3).map((cat) => (
                          <span
                            key={cat}
                            className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-medium text-[10px] text-slate-600"
                          >
                            {cat}
                          </span>
                        ))}
                        {c.categories.length > 3 && (
                          <span className="text-[10px] text-slate-400 pl-1">+{c.categories.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-xs text-slate-500">
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
