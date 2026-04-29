import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { getOpenAIClient } from "@/lib/openai";

const MODEL = "gpt-4o-mini";

function startOfWeek() {
  const now = new Date();
  const day = now.getDay() || 7;
  now.setDate(now.getDate() - day + 1);
  now.setHours(0, 0, 0, 0);
  return now.toISOString().slice(0, 10);
}

function fallbackNarrative(authorityName: string, context: string[]) {
  return [
    `${authorityName} ima dovoljno historijskih signala za početnu procjenu, ali AI narativ nije generisan jer OpenAI ključ nije dostupan ili je cache prazan.`,
    `Sljedeća akcija je provjeriti kategorije u kojima imate najveći win rate i uporediti ih sa obrascem dodjele ovog naručioca prije odluke o ulasku u ponudu.`,
  ];
}

async function generateNarrative(authorityName: string, context: string[]) {
  if (!process.env.OPENAI_API_KEY) {
    return fallbackNarrative(authorityName, context);
  }

  const openai = getOpenAIClient();
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "Ti si B2B analitičar javnih nabavki u Bosni i Hercegovini. Piši na bosanskom jeziku, jasno i bez spekulacija. Vrati tačno 2 kratka paragrafa kao JSON niz stringova.",
      },
      {
        role: "user",
        content: `Naručilac: ${authorityName}\n\nKontekst:\n${context.join("\n")}\n\nObjasni zašto korisnik pobjeđuje ili gubi kod ovog naručioca i koja je sljedeća akcija.`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) return fallbackNarrative(authorityName, context);

  try {
    const parsed = JSON.parse(content) as { paragraphs?: string[]; narrative?: string[] };
    const paragraphs = parsed.paragraphs ?? parsed.narrative ?? [];
    return paragraphs.filter((item) => typeof item === "string").slice(0, 3);
  } catch {
    return fallbackNarrative(authorityName, context);
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jib: string }> },
) {
  const { jib } = await params;
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
    .single();

  if (!company) {
    return NextResponse.json({ error: "Firma nije pronađena." }, { status: 404 });
  }

  const cacheWeek = startOfWeek();
  const { data: cached } = await supabase
    .from("buyer_ai_narratives")
    .select("narrative, generated_at")
    .eq("company_id", company.id)
    .eq("authority_jib", jib)
    .eq("cache_week", cacheWeek)
    .maybeSingle();

  if (cached?.narrative) {
    return NextResponse.json({ narrative: cached.narrative, cached: true });
  }

  const [{ data: authority }, { data: authorityStats }, { data: companyAuthority }] =
    await Promise.all([
      supabase
        .from("contracting_authorities")
        .select("name, jib, city, authority_type")
        .eq("jib", jib)
        .maybeSingle(),
      supabase
        .from("authority_stats")
        .select("tender_count, total_estimated_value, avg_bidders_count, top_cpv_codes")
        .eq("authority_jib", jib)
        .maybeSingle(),
      supabase
        .from("company_authority_stats")
        .select("appearances, wins, win_rate")
        .eq("company_jib", company.jib)
        .eq("authority_jib", jib)
        .maybeSingle(),
    ]);

  const authorityName = authority?.name ?? jib;
  const context = [
    `Firma: ${company.name ?? company.jib}`,
    `Tenderi naručioca: ${authorityStats?.tender_count ?? "n/a"}`,
    `Ukupna vrijednost: ${authorityStats?.total_estimated_value ?? "n/a"}`,
    `Prosječan broj ponuđača: ${authorityStats?.avg_bidders_count ?? "n/a"}`,
    `Vaš win rate kod naručioca: ${companyAuthority?.win_rate ?? "n/a"}`,
    `Vaša učešća/pobjede: ${companyAuthority?.appearances ?? 0}/${companyAuthority?.wins ?? 0}`,
  ];
  const contextHash = createHash("sha256").update(context.join("|")).digest("hex");
  const narrative = await generateNarrative(authorityName, context);

  await supabase.from("buyer_ai_narratives").upsert(
    {
      company_id: company.id,
      authority_jib: jib,
      authority_name: authorityName,
      cache_week: cacheWeek,
      narrative,
      model: MODEL,
      context_hash: contextHash,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "company_id,authority_jib,cache_week" },
  );

  return NextResponse.json({ narrative, cached: false });
}
