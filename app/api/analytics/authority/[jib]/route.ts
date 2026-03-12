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

  // Info o naručiocu
  const { data: authority } = await supabase
    .from("contracting_authorities")
    .select("name, jib, city, entity, canton, authority_type")
    .eq("jib", jib)
    .maybeSingle();

  // 1. Ukupno raspisanih tendera i ukupna vrijednost
  const { data: tenders } = await supabase
    .from("tenders")
    .select("id, estimated_value")
    .eq("contracting_authority_jib", jib);

  const totalTenders = tenders?.length ?? 0;
  const totalValue = (tenders ?? []).reduce(
    (sum, t) => sum + (Number(t.estimated_value) || 0),
    0
  );

  // 2. Najčešći pobjednici
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
    const existing = winnerMap.get(key);
    const price = Number(a.winning_price) || 0;
    if (existing) {
      existing.wins++;
      existing.total_value += price;
    } else {
      winnerMap.set(key, {
        name: a.winner_name ?? key,
        jib: key,
        wins: 1,
        total_value: price,
      });
    }
  }
  const topWinners = [...winnerMap.values()]
    .sort((a, b) => b.wins - a.wins)
    .slice(0, 10);

  // 3. Tipični zahtjevi iz authority_requirement_patterns
  const { data: patterns } = await supabase
    .from("authority_requirement_patterns")
    .select("document_type, is_required")
    .eq("contracting_authority_jib", jib);

  const patternMap = new Map<
    string,
    { document_type: string; count: number; required_count: number }
  >();
  for (const p of patterns ?? []) {
    const existing = patternMap.get(p.document_type);
    if (existing) {
      existing.count++;
      if (p.is_required) existing.required_count++;
    } else {
      patternMap.set(p.document_type, {
        document_type: p.document_type,
        count: 1,
        required_count: p.is_required ? 1 : 0,
      });
    }
  }
  const typicalRequirements = [...patternMap.values()].sort(
    (a, b) => b.count - a.count
  );

  // 4. Aktivni tenderi trenutno
  const now = new Date().toISOString();
  const { data: activeTenders } = await supabase
    .from("tenders")
    .select("id, title, deadline, estimated_value, contract_type")
    .eq("contracting_authority_jib", jib)
    .gte("deadline", now)
    .order("deadline", { ascending: true })
    .limit(20);

  return NextResponse.json(
    {
      authority: authority ?? { name: null, jib, city: null },
      summary: {
        total_tenders: totalTenders,
        total_value: totalValue,
        total_awards: awards?.length ?? 0,
      },
      top_winners: topWinners,
      typical_requirements: typicalRequirements,
      active_tenders: activeTenders ?? [],
    },
    { headers: CACHE_HEADERS }
  );
}
