import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Company } from "@/types/database";

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

  // Dohvati firmu korisnika
  const { data: companyData } = await supabase
    .from("companies")
    .select("id, jib")
    .eq("user_id", user.id)
    .single();

  const company = companyData as Company | null;
  if (!company) {
    return NextResponse.json(
      { error: "Firma nije pronađena." },
      { status: 404 }
    );
  }

  // Pronađi CPV kategorije (contract_type) u kojima naša firma učestvuje
  // Gledamo award_decisions gdje je winner_jib = naš JIB
  const { data: ourAwards } = await supabase
    .from("award_decisions")
    .select("contract_type")
    .eq("winner_jib", company.jib)
    .not("contract_type", "is", null);

  const ourCategories = [
    ...new Set((ourAwards ?? []).map((a) => a.contract_type!)),
  ];

  if (ourCategories.length === 0) {
    return NextResponse.json(
      {
        our_categories: [],
        competitors: [],
        message:
          "Nema dovoljno podataka o vašim učešćima za identifikaciju konkurenata.",
      },
      { headers: CACHE_HEADERS }
    );
  }

  // Pronađi sve award_decisions u istim kategorijama
  const { data: categoryAwards } = await supabase
    .from("award_decisions")
    .select(
      "winner_name, winner_jib, winning_price, contract_type, award_date"
    )
    .in("contract_type", ourCategories)
    .not("winner_jib", "is", null)
    .order("award_date", { ascending: false });

  // Agregiraj po firmi (isključi nas)
  const competitorMap = new Map<
    string,
    {
      name: string;
      jib: string;
      wins: number;
      total_value: number;
      categories: Set<string>;
      last_win_date: string | null;
    }
  >();

  for (const a of categoryAwards ?? []) {
    if (a.winner_jib === company.jib) continue;
    const key = a.winner_jib!;
    const existing = competitorMap.get(key);
    const price = Number(a.winning_price) || 0;
    const cat = a.contract_type ?? "";

    if (existing) {
      existing.wins++;
      existing.total_value += price;
      if (cat) existing.categories.add(cat);
      if (
        a.award_date &&
        (!existing.last_win_date || a.award_date > existing.last_win_date)
      ) {
        existing.last_win_date = a.award_date;
      }
    } else {
      const cats = new Set<string>();
      if (cat) cats.add(cat);
      competitorMap.set(key, {
        name: a.winner_name ?? key,
        jib: key,
        wins: 1,
        total_value: price,
        categories: cats,
        last_win_date: a.award_date,
      });
    }
  }

  // Dohvati win_rate iz market_companies
  const competitorJibs = [...competitorMap.keys()].slice(0, 50);
  const { data: marketData } =
    competitorJibs.length > 0
      ? await supabase
          .from("market_companies")
          .select("jib, win_rate, total_bids_count")
          .in("jib", competitorJibs)
      : { data: [] };

  const winRateMap = new Map(
    (marketData ?? []).map((m) => [
      m.jib,
      { win_rate: m.win_rate, total_bids: m.total_bids_count },
    ])
  );

  const competitors = [...competitorMap.values()]
    .map((c) => ({
      name: c.name,
      jib: c.jib,
      wins_in_our_categories: c.wins,
      total_value: c.total_value,
      categories: [...c.categories],
      last_win_date: c.last_win_date,
      win_rate: winRateMap.get(c.jib)?.win_rate ?? null,
      total_bids: winRateMap.get(c.jib)?.total_bids ?? null,
    }))
    .sort((a, b) => b.wins_in_our_categories - a.wins_in_our_categories)
    .slice(0, 20);

  return NextResponse.json(
    {
      our_categories: ourCategories,
      competitors,
    },
    { headers: CACHE_HEADERS }
  );
}
