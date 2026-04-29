import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { getOpenAIClient } from "@/lib/openai";

const MODEL = "gpt-4o-mini";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function fallbackInsights(context: Record<string, unknown>) {
  const activePipeline = Number(context.activePipeline ?? 0);
  const totalValue = Number(context.totalValue ?? 0);
  return [
    {
      title: "Vaše performanse",
      text: "Vaš učinak je stabilan, ali najveći dobitak dolazi iz fokusiranja na tendere sa visokim fit skorom i jasnim dokumentacijskim zahtjevima.",
    },
    {
      title: "Stanje pipeline-a",
      text: `Trenutno imate ${activePipeline} aktivnih tendera u pipeline-u. Ukupna vrijednost aktivnog tržišta u uzorku je ${Math.round(totalValue)} KM.`,
    },
    {
      title: "Projekcija narednih 90 dana",
      text: "Na osnovu trenutne konverzije, očekujte umjeren rast ako smanjite broj neusklađenih prijava i ubrzate dokumentaciju klijenata.",
    },
  ];
}

async function generateInsights(context: Record<string, unknown>) {
  if (!process.env.OPENAI_API_KEY) return fallbackInsights(context);
  const openai = getOpenAIClient();
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "Ti si analitičar javnih nabavki u BiH. Vrati JSON objekat {insights:[{title,text}]} sa tačno 3 narativna insighta na bosanskom jeziku.",
      },
      { role: "user", content: JSON.stringify(context) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) return fallbackInsights(context);
  try {
    const parsed = JSON.parse(content) as { insights?: Array<{ title: string; text: string }> };
    return parsed.insights?.slice(0, 3) ?? fallbackInsights(context);
  } catch {
    return fallbackInsights(context);
  }
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id, name")
    .eq("user_id", user.id)
    .maybeSingle();

  const insightDate = today();
  const { data: cached } = await supabase
    .from("analytics_daily_insights")
    .select("insights")
    .eq("user_id", user.id)
    .eq("insight_date", insightDate)
    .maybeSingle();

  if (cached?.insights) {
    return NextResponse.json({ insights: cached.insights, cached: true });
  }

  const [{ count: activePipeline }, { data: tenders }] = await Promise.all([
    supabase
      .from("bids")
      .select("id", { count: "exact", head: true })
      .in("status", ["draft", "in_review", "submitted"]),
    supabase
      .from("tenders")
      .select("estimated_value, status")
      .limit(200),
  ]);

  const totalValue = (tenders ?? []).reduce(
    (sum, tender) => sum + (Number(tender.estimated_value) || 0),
    0,
  );
  const context = {
    companyName: company?.name ?? null,
    activePipeline: activePipeline ?? 0,
    totalValue,
    tenderSample: tenders?.length ?? 0,
  };
  const contextHash = createHash("sha256").update(JSON.stringify(context)).digest("hex");
  const insights = await generateInsights(context);

  await supabase.from("analytics_daily_insights").upsert(
    {
      user_id: user.id,
      company_id: company?.id ?? null,
      insight_date: insightDate,
      insights,
      context_hash: contextHash,
      model: MODEL,
    },
    { onConflict: "user_id,insight_date" },
  );

  return NextResponse.json({ insights, cached: false });
}
