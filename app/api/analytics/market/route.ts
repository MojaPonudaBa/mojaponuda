import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800",
};

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const startOfYear = new Date(now.getFullYear(), 0, 1)
    .toISOString()
    .split("T")[0];

  // 1. Ukupno aktivnih tendera i ukupna vrijednost
  const { count: activeTendersCount } = await supabase
    .from("tenders")
    .select("id", { count: "exact", head: true })
    .gte("deadline", now.toISOString());

  const { data: activeValueData } = await supabase
    .from("tenders")
    .select("estimated_value")
    .gte("deadline", now.toISOString())
    .not("estimated_value", "is", null);

  const activeTotalValue = (activeValueData ?? []).reduce(
    (sum, t) => sum + (Number(t.estimated_value) || 0),
    0
  );

  // 2. Top 10 naručilaca ovog mjeseca po broju tendera
  const { data: monthTenders } = await supabase
    .from("tenders")
    .select("contracting_authority, contracting_authority_jib")
    .gte("created_at", startOfMonth)
    .not("contracting_authority", "is", null);

  const authorityCountMap = new Map<
    string,
    { name: string; jib: string | null; count: number }
  >();
  for (const t of monthTenders ?? []) {
    const key = t.contracting_authority!;
    const existing = authorityCountMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      authorityCountMap.set(key, {
        name: key,
        jib: t.contracting_authority_jib,
        count: 1,
      });
    }
  }
  const topAuthorities = [...authorityCountMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // 3. Top 10 firmi po vrijednosti dobijenih ugovora ove godine
  const { data: yearAwards } = await supabase
    .from("award_decisions")
    .select("winner_name, winner_jib, winning_price")
    .gte("award_date", startOfYear)
    .not("winner_jib", "is", null)
    .not("winning_price", "is", null);

  const companyValueMap = new Map<
    string,
    { name: string; jib: string; total_value: number; wins: number }
  >();
  for (const a of yearAwards ?? []) {
    const key = a.winner_jib!;
    const existing = companyValueMap.get(key);
    const price = Number(a.winning_price) || 0;
    if (existing) {
      existing.total_value += price;
      existing.wins++;
    } else {
      companyValueMap.set(key, {
        name: a.winner_name ?? key,
        jib: key,
        total_value: price,
        wins: 1,
      });
    }
  }
  const topCompanies = [...companyValueMap.values()]
    .sort((a, b) => b.total_value - a.total_value)
    .slice(0, 10);

  // 4. Prosječni popust u posljednjih 90 dana
  const { data: recentAwards } = await supabase
    .from("award_decisions")
    .select("discount_pct")
    .gte("award_date", ninetyDaysAgo)
    .not("discount_pct", "is", null);

  const discounts = (recentAwards ?? []).map((a) => Number(a.discount_pct));
  const avgDiscount =
    discounts.length > 0
      ? Math.round(
          (discounts.reduce((s, d) => s + d, 0) / discounts.length) * 100
        ) / 100
      : null;

  return NextResponse.json(
    {
      active_tenders: {
        count: activeTendersCount ?? 0,
        total_value: activeTotalValue,
      },
      top_authorities_this_month: topAuthorities,
      top_companies_this_year: topCompanies,
      avg_discount_90d: avgDiscount,
    },
    { headers: CACHE_HEADERS }
  );
}
