import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { getOpenAIClient } from "@/lib/openai";

const MODEL = "gpt-4o-mini";

function fallbackParse(input: string) {
  const text = input.toLowerCase();
  const location =
    ["sarajevo", "mostar", "banja luka", "zenica", "tuzla", "bihać", "brčko"].find((city) =>
      text.includes(city),
    ) ?? "";
  const valueMatch = input.match(/(\d+[\d\.\s]*)\s*(km|bam|eur)?/i);
  const deadlineMatch = text.match(/(\d+)\s*dana/);

  return {
    cpv: text.includes("građ") || text.includes("grad")
      ? "45*"
      : text.includes("računar") || text.includes("it")
        ? "30*"
        : text.includes("medic")
          ? "33*"
          : "",
    location: location ? location[0].toUpperCase() + location.slice(1) : "",
    minValueKm: valueMatch ? Number(valueMatch[1].replace(/[^\d]/g, "")) || 0 : 0,
    minDeadlineDays: deadlineMatch ? Number(deadlineMatch[1]) : 0,
    keywords: input
      .split(/\s+/)
      .map((word) => word.replace(/[^\p{L}\p{N}-]/gu, ""))
      .filter((word) => word.length > 4)
      .slice(0, 8),
  };
}

async function parseWithOpenAI(input: string) {
  if (!process.env.OPENAI_API_KEY) return fallbackParse(input);
  const openai = getOpenAIClient();
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "Pretvori opis alerta za javne nabavke u BiH u JSON. Vrati samo JSON sa poljima cpv, location, minValueKm, minDeadlineDays, keywords.",
      },
      { role: "user", content: input },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) return fallbackParse(input);
  try {
    return { ...fallbackParse(input), ...JSON.parse(content) };
  } catch {
    return fallbackParse(input);
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const input = typeof body.input === "string" ? body.input.trim() : "";
  if (!input) {
    return NextResponse.json({ error: "Opis alerta je obavezan." }, { status: 400 });
  }

  const inputHash = createHash("sha256").update(input).digest("hex");
  const { data: cached } = await supabase
    .from("alert_parse_cache")
    .select("parsed_query")
    .eq("user_id", user.id)
    .eq("input_hash", inputHash)
    .maybeSingle();

  if (cached?.parsed_query) {
    return NextResponse.json({ parsed: cached.parsed_query, cached: true });
  }

  const parsed = await parseWithOpenAI(input);
  await supabase.from("alert_parse_cache").upsert(
    {
      user_id: user.id,
      input_hash: inputHash,
      input_text: input,
      parsed_query: parsed,
      model: MODEL,
    },
    { onConflict: "user_id,input_hash" },
  );

  return NextResponse.json({ parsed, cached: false });
}
