import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { getOpenAIClient } from "@/lib/openai";

const MODEL = "gpt-4o-mini";

function cacheMonth() {
  const date = new Date();
  date.setDate(1);
  return date.toISOString().slice(0, 10);
}

function fallbackRecommendation(code: string, context: Record<string, unknown>) {
  const avgBidders = Number(context.avgBidders ?? 0);
  return {
    recommendation: avgBidders <= 5 ? "Da" : avgBidders >= 9 ? "Ne" : "Možda",
    reasoning: [
      "Kategorija je procijenjena na osnovu dostupnih tendera i javnih dodjela.",
      avgBidders <= 5
        ? "Niska konkurencija povećava šansu za ulazak."
        : "Konkurencija zahtijeva opreznu selekciju.",
    ],
    requirements: ["Reference", "Poresko uvjerenje", "Dokaz tehničke sposobnosti"],
    cpv: code,
  };
}

async function generateRecommendation(code: string, context: Record<string, unknown>) {
  if (!process.env.OPENAI_API_KEY) return fallbackRecommendation(code, context);
  const openai = getOpenAIClient();
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "Ti si tržišni analitičar za javne nabavke u BiH. Vrati JSON sa recommendation (Da/Možda/Ne), reasoning nizom i requirements nizom.",
      },
      {
        role: "user",
        content: `CPV: ${code}\nKontekst:\n${JSON.stringify(context)}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) return fallbackRecommendation(code, context);
  try {
    return { ...fallbackRecommendation(code, context), ...JSON.parse(content), cpv: code };
  } catch {
    return fallbackRecommendation(code, context);
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, jib")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!company) {
    return NextResponse.json({ error: "Firma nije pronađena." }, { status: 404 });
  }

  const month = cacheMonth();
  const { data: cached } = await supabase
    .from("cpv_opportunity_ai_cache")
    .select("recommendation")
    .eq("company_id", company.id)
    .eq("cpv_code", code)
    .eq("cache_month", month)
    .maybeSingle();

  if (cached?.recommendation) {
    return NextResponse.json({ recommendation: cached.recommendation, cached: true });
  }

  const [{ data: cpvStats }, { data: companyStats }] = await Promise.all([
    supabase
      .from("cpv_stats")
      .select("tender_count, avg_estimated_value, avg_bidders_count, avg_discount_pct, top_authorities")
      .eq("cpv_code", code)
      .maybeSingle(),
    supabase
      .from("company_cpv_stats")
      .select("appearances, wins, win_rate")
      .eq("company_jib", company.jib)
      .eq("cpv_code", code)
      .maybeSingle(),
  ]);

  const context = {
    tenderCount: cpvStats?.tender_count ?? null,
    avgValue: cpvStats?.avg_estimated_value ?? null,
    avgBidders: cpvStats?.avg_bidders_count ?? null,
    marketDiscount: cpvStats?.avg_discount_pct ?? null,
    companyAppearances: companyStats?.appearances ?? 0,
    companyWins: companyStats?.wins ?? 0,
    companyWinRate: companyStats?.win_rate ?? null,
  };
  const contextHash = createHash("sha256").update(JSON.stringify(context)).digest("hex");
  const recommendation = await generateRecommendation(code, context);

  await supabase.from("cpv_opportunity_ai_cache").upsert(
    {
      company_id: company.id,
      cpv_code: code,
      cache_month: month,
      recommendation,
      context_hash: contextHash,
      model: MODEL,
    },
    { onConflict: "company_id,cpv_code,cache_month" },
  );

  return NextResponse.json({ recommendation, cached: false });
}
