import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { createClient } from "@/lib/supabase/server";
import {
  buildProfileCpvSeeds,
  buildProfileContextText,
  buildProfileKeywordSeeds,
  buildStrictRecommendationCpvCodes,
  buildStrictRecommendationKeywords,
  sanitizeSearchKeywords,
  type ParsedCompanyProfile,
} from "@/lib/company-profile";
import { generateProfileEnrichment } from "@/lib/ai-profile-enrichment";

export const maxDuration = 30;

const SYSTEM_PROMPT_VARIANT_NOTE = `
Dodatno:
- Ako se ista roba ili usluga u tenderima realno pojavljuje i pod domacim i pod engleskim nazivom, ukljuci obje varijante.
- Nemoj koristiti genericke pojmove tipa "oprema", "uredjaj", "materijal", "sistem", "odrzavanje" ili "podrska" kao samostalne keywords osim ako nisu dio precizne viserecne fraze.
- Prednost daj pojmovima koji opisuju predmet tendera, ne narucioca.`;

const SYSTEM_PROMPT = `Ti si ekspert za javne nabavke i CPV (Common Procurement Vocabulary) kodove.
Tvoj zadatak je da na osnovu kompletnog profila firme pripremiš profil za pretragu tendera.

Izlaz mora biti JSON objekat sa sljedećim poljima:
- cpv_codes: niz stringova (samo glavni kodovi, npr. "45000000-7")
- keywords: niz stringova za pretragu tendera, na bosanskom jeziku, idealno 12-24 pojma ako profil to podržava. Koristi kratke i precizne izraze koji se stvarno pojavljuju u tenderima. Prednost daj konkretnim frazama i nazivima robe/usluge, npr. "mrežna oprema", "server", "antivirus licence", "video nadzor", "rekonstrukcija krova".
- suggested_regions: niz stringova sa regijama koje imaju smisla za ovaj profil; ako korisnik već pošalje regije, vrati iste te regije
- summary: kratki sažetak profila firme za internu upotrebu, do 2 rečenice

Pravila za keywords:
- Nemoj vraćati opšte nazive onboarding kategorija kao što su "IT i digitalna rješenja", "Oprema i roba" ili "Konsalting, projektovanje i nadzor".
- Nemoj vraćati preširoke riječi koje vode do puno nebitnih rezultata.
- Vraćaj samo pojmove koji su direktno primjenjivi na ono što firma zaista prodaje, isporučuje ili izvodi.
- Uključi sinonime i usko povezane pojmove samo kada su zaista relevantni.
- Pokrij više relevantnih podvarijanti iste ponude ako se realno mogu pojaviti pod različitim nazivima u tenderima.
- Nemoj vraćati sirove korijene riječi ili nedovršene stemove kao što su "mrež", "oprem", "nabavk", "radov", "uslug".
- Nemoj vraćati jednu široku riječ ako bez dodatnog konteksta može značiti više različitih industrija.

Pravila za cpv_codes:
- Vrati što širi skup relevantnih CPV kodova koje profil realno pokriva, ali nemoj uključivati kodove za susjedne industrije koje firma vjerovatno ne radi.
- Ako je firma višesegmentna, uključi više komplementarnih CPV kodova.
- Prednost daj kodovima koji direktno pomažu da se ne propuste relevantni tenderi.
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
      specializationIds = [],
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
      specializationIds,
      preferredTenderTypes,
      regions,
    });
    const baseProfile: ParsedCompanyProfile = {
      primaryIndustry: primaryIndustry ?? null,
      offeringCategories,
      specializationIds,
      preferredTenderTypes,
      companyDescription: description,
      legacyIndustryText: null,
      manualKeywords: [],
    };
    const keywordSeeds = buildProfileKeywordSeeds(baseProfile);
    const cpvSeeds = buildProfileCpvSeeds(baseProfile);

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: `${SYSTEM_PROMPT}\n${SYSTEM_PROMPT_VARIANT_NOTE}` },
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

    const aiKeywords = Array.isArray(profile.keywords)
      ? profile.keywords.filter((item): item is string => typeof item === "string")
      : [];
    const aiCpvCodes = Array.isArray(profile.cpv_codes)
      ? profile.cpv_codes.filter((item): item is string => typeof item === "string")
      : [];
    const strictKeywords = buildStrictRecommendationKeywords({
      explicitKeywords: aiKeywords,
      profile: baseProfile,
    });
    const strictCpvCodes = buildStrictRecommendationCpvCodes({
      explicitCpvCodes: aiCpvCodes,
      profile: baseProfile,
    });
    const aiOnlyKeywords = sanitizeSearchKeywords(aiKeywords).slice(0, 18);
    const aiOnlyCpvCodes = [...new Set(aiCpvCodes.map((code) => code.trim()).filter((code) => code.length >= 5))].slice(0, 12);

    // Run enrichment in parallel (non-blocking if it fails)
    let enrichment: { core_keywords: string[]; broad_keywords: string[]; cpv_codes: string[]; negative_keywords: string[] } | null = null;
    try {
      enrichment = await generateProfileEnrichment(baseProfile);
    } catch (enrichmentError) {
      console.error("Profile enrichment error during onboarding:", enrichmentError);
    }

    return NextResponse.json({
      cpv_codes:
        strictCpvCodes.length > 0
          ? strictCpvCodes
          : aiOnlyCpvCodes.length > 0
            ? aiOnlyCpvCodes
            : cpvSeeds.slice(0, 8),
      keywords:
        strictKeywords.length > 0
          ? strictKeywords
          : aiOnlyKeywords.length > 0
            ? aiOnlyKeywords
            : keywordSeeds.slice(0, 12),
      suggested_regions: regions.length > 0 ? regions : [...new Set(profile.suggested_regions ?? [])],
      summary: profile.summary ?? null,
      enrichment: enrichment ?? null,
    });
  } catch (error) {
    console.error("Profile generation error:", error);
    return NextResponse.json(
      { error: "Greška prilikom generisanja profila." },
      { status: 500 }
    );
  }
}
