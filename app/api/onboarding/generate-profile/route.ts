import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { createClient } from "@/lib/supabase/server";
import {
  buildProfileContextText,
  buildProfileKeywordSeeds,
  sanitizeSearchKeywords,
} from "@/lib/company-profile";

export const maxDuration = 30;

const SYSTEM_PROMPT = `Ti si ekspert za javne nabavke i CPV (Common Procurement Vocabulary) kodove.
Tvoj zadatak je da na osnovu kompletnog profila firme pripremiš profil za pretragu tendera.

Izlaz mora biti JSON objekat sa sljedećim poljima:
- cpv_codes: niz stringova (samo glavni kodovi, npr. "45000000-7")
- keywords: niz stringova za pretragu tendera, na bosanskom jeziku, max 20 pojmova. Koristi kratke i precizne izraze koji se stvarno pojavljuju u tenderima. Gdje ima smisla koristi korijen riječi da uhvati padeže i oblike, npr. "izgradnj", "rekonstrukcij", "održavanj", "mrež", "licenc".
- suggested_regions: niz stringova sa regijama koje imaju smisla za ovaj profil; ako korisnik već pošalje regije, vrati iste te regije
- summary: kratki sažetak profila firme za internu upotrebu, do 2 rečenice

Pravila za keywords:
- Nemoj vraćati opšte nazive onboarding kategorija kao što su "IT i digitalna rješenja", "Oprema i roba" ili "Konsalting, projektovanje i nadzor".
- Nemoj vraćati preširoke riječi koje vode do puno nebitnih rezultata.
- Vraćaj samo pojmove koji su direktno primjenjivi na ono što firma zaista prodaje, isporučuje ili izvodi.
- Uključi sinonime i usko povezane pojmove samo kada su zaista relevantni.

Budi precizan i fokusiraj se na ono što je najrelevantnije za javne nabavke.`;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const {
      description,
      primaryIndustry,
      offeringCategories = [],
      preferredTenderTypes = [],
      regions = [],
    } = await request.json();

    if (!description || description.length < 10) {
      return NextResponse.json(
        { error: "Opis djelatnosti je prekratak." },
        { status: 400 }
      );
    }

    const profileContext = buildProfileContextText({
      description,
      primaryIndustry: primaryIndustry ?? null,
      offeringCategories,
      preferredTenderTypes,
      regions,
    });
    const keywordSeeds = buildProfileKeywordSeeds({
      primaryIndustry: primaryIndustry ?? null,
      offeringCategories,
      preferredTenderTypes,
      companyDescription: description,
      legacyIndustryText: null,
    });

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Na osnovu sljedećeg profila firme generiši CPV kodove i ključne riječi za pretragu tendera:\n\n${profileContext}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("No content from AI");

    const profile = JSON.parse(content) as {
      cpv_codes?: string[];
      keywords?: string[];
      suggested_regions?: string[];
      summary?: string;
    };

    return NextResponse.json({
      cpv_codes: [...new Set((profile.cpv_codes ?? []).filter(Boolean))].slice(0, 12),
      keywords: sanitizeSearchKeywords([...(profile.keywords ?? []), ...keywordSeeds]),
      suggested_regions: regions.length > 0 ? regions : [...new Set(profile.suggested_regions ?? [])],
      summary: profile.summary ?? null,
    });
  } catch (error) {
    console.error("Profile generation error:", error);
    return NextResponse.json(
      { error: "Greška prilikom generisanja profila." },
      { status: 500 }
    );
  }
}
