import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jib: string }> }
) {
  const { jib } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  // Info o firmi
  const { data: company } = await supabase
    .from("market_companies")
    .select("name, jib, city, total_bids_count, total_wins_count, total_won_value, win_rate")
    .eq("jib", jib)
    .maybeSingle();

  // Sve odluke gdje je ova firma pobjednik
  const { data: allAwards } = await supabase
    .from("award_decisions")
    .select(
      "id, contracting_authority_jib, winning_price, estimated_value, discount_pct, contract_type, award_date, tender_id"
    )
    .eq("winner_jib", jib)
    .order("award_date", { ascending: false });

  const awards = allAwards ?? [];

  // 1. Top naručioci za ovu firmu
  const authorityMap = new Map<
    string,
    { jib: string; wins: number; total_value: number }
  >();
  for (const a of awards) {
    if (!a.contracting_authority_jib) continue;
    const key = a.contracting_authority_jib;
    const existing = authorityMap.get(key);
    const price = Number(a.winning_price) || 0;
    if (existing) {
      existing.wins++;
      existing.total_value += price;
    } else {
      authorityMap.set(key, { jib: key, wins: 1, total_value: price });
    }
  }
  const topAuthoritiesRaw = [...authorityMap.values()]
    .sort((a, b) => b.wins - a.wins)
    .slice(0, 10);

  // Dohvati imena naručilaca
  const authorityJibs = topAuthoritiesRaw.map((a) => a.jib);
  const { data: authorityNames } = authorityJibs.length > 0
    ? await supabase
        .from("contracting_authorities")
        .select("jib, name")
        .in("jib", authorityJibs)
    : { data: [] };

  const nameMap = new Map(
    (authorityNames ?? []).map((a) => [a.jib, a.name])
  );

  const topAuthorities = topAuthoritiesRaw.map((a) => ({
    ...a,
    name: nameMap.get(a.jib) ?? a.jib,
  }));

  // 2. Top kategorije (contract_type)
  const categoryMap = new Map<
    string,
    { category: string; count: number; total_value: number }
  >();
  for (const a of awards) {
    const cat = a.contract_type ?? "Nepoznato";
    const existing = categoryMap.get(cat);
    const price = Number(a.winning_price) || 0;
    if (existing) {
      existing.count++;
      existing.total_value += price;
    } else {
      categoryMap.set(cat, { category: cat, count: 1, total_value: price });
    }
  }
  const topCategories = [...categoryMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // 3. Zadnjih 10 učešća s ishodima
  const recentAwards = awards.slice(0, 10).map((a) => ({
    award_date: a.award_date,
    winning_price: a.winning_price,
    estimated_value: a.estimated_value,
    discount_pct: a.discount_pct,
    contract_type: a.contract_type,
    contracting_authority_jib: a.contracting_authority_jib,
  }));

  return NextResponse.json(
    {
      company: company ?? {
        name: null,
        jib,
        city: null,
        total_bids_count: 0,
        total_wins_count: 0,
        total_won_value: 0,
        win_rate: null,
      },
      top_authorities: topAuthorities,
      top_categories: topCategories,
      recent_awards: recentAwards,
    },
    { headers: CACHE_HEADERS }
  );
}
