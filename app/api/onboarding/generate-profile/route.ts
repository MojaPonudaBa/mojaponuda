import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

const SYSTEM_PROMPT = `Ti si ekspert za javne nabavke i CPV (Common Procurement Vocabulary) kodove. 
Tvoj zadatak je da na osnovu opisa djelatnosti firme generišeš profil za pretragu tendera.

Izlaz mora biti JSON objekat sa sljedećim poljima:
- cpv_codes: niz stringova (samo glavni kodovi, npr. "45000000-7")
- keywords: niz stringova (ključne riječi za pretragu, na bosanskom jeziku, max 10)
- suggested_regions: niz stringova (npr. "Sarajevo", "Banja Luka", ili "Cijela BiH" ako nije specifično)

Budi precizan i fokusiraj se na ono što je najrelevantnije za javne nabavke.`;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { description } = await request.json();

    if (!description || description.length < 10) {
      return NextResponse.json(
        { error: "Opis djelatnosti je prekratak." },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Opis djelatnosti: ${description}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("No content from AI");

    const profile = JSON.parse(content);

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Profile generation error:", error);
    return NextResponse.json(
      { error: "Greška prilikom generisanja profila." },
      { status: 500 }
    );
  }
}
