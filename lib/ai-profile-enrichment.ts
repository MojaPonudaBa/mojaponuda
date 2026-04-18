import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getOpenAIClient } from "@/lib/openai";
import {
  derivePrimaryIndustry,
  getProfileOptionLabel,
  parseCompanyProfile,
  serializeCompanyProfile,
  type ParsedCompanyProfile,
} from "@/lib/company-profile";
import type { Database } from "@/types/database";

export interface ProfileEnrichmentResult {
  core_keywords: string[];
  broad_keywords: string[];
  cpv_codes: string[];
  negative_keywords: string[];
}

const ENRICHMENT_SYSTEM_PROMPT = `Ti si ekspert za javne nabavke u Bosni i Hercegovini (BiH) i za CPV klasifikaciju.
Na osnovu profila firme generiši 4 liste za sistem preporuke tendera:

1. core_keywords (10-20): Precizne višeričečne fraze na bosanskom jeziku koje se pojavljuju u naslovima i opisima tendera relevantnih za ovu firmu. Ovo su KLJUČNI pojmovi koji direktno opisuju šta firma prodaje, isporučuje ili izvodi. Primjeri: "medicinska oprema", "rekonstrukcija krova", "antivirusni softver", "laboratorijski reagensi".

2. broad_keywords (15-30): Kraći pojmovi i korijeni riječi (stemovi, minimum 4 karaktera) koji pokrivaju šire područje firme. Koristi skraćene oblike koji pokrivaju sve padeže — npr. "medicinsk" umjesto "medicinska" da pokrije "medicinskog", "medicinsku", "medicinske" itd. Uključi i domaće i engleske varijante ako se obje pojavljuju u tenderima u BiH.

3. cpv_codes (8-20): CPV kodovi (8 cifara, bez crtica) koji pokrivaju područje poslovanja firme. Uključi i specifične i šire roditeljske kodove. Npr. za medicinsku opremu: "33100000", "33190000", "33140000".

4. negative_keywords (10-25): Stemovi/korijeni riječi (minimum 4 karaktera) za industrije i proizvode koji su JASNO NEPOVEZANI sa ovom firmom. Ovo služi da se filtriraju lažno pozitivni rezultati.
   VAŽNO: Razmisli o institucijama koje objavljuju tendere iz područja firme — te iste institucije često nabavljaju i stvari potpuno nepovezane sa firmom.
   Npr. za medicinsku opremu: bolnice nabavljaju i gorivo, čišćenje, hranu, namještaj, vozila — sve to su negativni signali.
   Npr. za IT: škole i institucije nabavljaju i namještaj, hranu, građevinske radove — negativni signali.
   Npr. za građevinarstvo: općine nabavljaju i softver, kancelarijski materijal, medicinski materijal — negativni signali.

Izlaz mora biti JSON objekat sa tačno ova 4 polja.

Pravila:
- Svi pojmovi moraju biti na bosanskom/hrvatskom jeziku (osim engleskih varijanti u broad_keywords).
- Core keywords trebaju biti dovoljno specifični da minimiziraju lažno pozitivne rezultate.
- Broad keywords trebaju koristiti stemove (skraćene oblike) za pokrivanje svih padežnih oblika.
- CPV kodovi moraju biti validni 8-cifreni kodovi iz CPV klasifikacije.
- Negative keywords moraju biti specifični za kontekst ove firme — ne generički.
- Ne koristi preširoke pojmove kao samostalne ključne riječi (npr. "oprema", "materijal", "usluge").`;

const ENRICHMENT_RESPONSE_SCHEMA = {
  type: "json_schema" as const,
  json_schema: {
    name: "profile_enrichment",
    strict: true,
    schema: {
      type: "object",
      properties: {
        core_keywords: {
          type: "array",
          items: { type: "string" },
        },
        broad_keywords: {
          type: "array",
          items: { type: "string" },
        },
        cpv_codes: {
          type: "array",
          items: { type: "string" },
        },
        negative_keywords: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: ["core_keywords", "broad_keywords", "cpv_codes", "negative_keywords"],
      additionalProperties: false,
    },
  },
};

function buildEnrichmentProfileSummary(profile: ParsedCompanyProfile): string {
  const industry = derivePrimaryIndustry(
    profile.offeringCategories,
    profile.primaryIndustry
  );

  return [
    industry ? `Primarna industrija: ${getProfileOptionLabel(industry)}` : null,
    profile.offeringCategories.length > 0
      ? `Kategorije ponude: ${profile.offeringCategories.map(getProfileOptionLabel).join(", ")}`
      : null,
    profile.companyDescription
      ? `Opis firme: ${profile.companyDescription}`
      : null,
    profile.manualKeywords?.length
      ? `Ručno unesene ključne riječi: ${profile.manualKeywords.join(", ")}`
      : null,
    profile.preferredTenderTypes.length > 0
      ? `Preferira tendere za: ${profile.preferredTenderTypes.map(getProfileOptionLabel).join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function generateProfileEnrichment(
  profile: ParsedCompanyProfile
): Promise<ProfileEnrichmentResult> {
  const openai = getOpenAIClient();
  const profileSummary = buildEnrichmentProfileSummary(profile);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: ENRICHMENT_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Profil firme:\n${profileSummary}\n\nGeneriši enrichment za preporuke tendera.`,
      },
    ],
    response_format: ENRICHMENT_RESPONSE_SCHEMA,
    temperature: 0.2,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    return { core_keywords: [], broad_keywords: [], cpv_codes: [], negative_keywords: [] };
  }

  const parsed = JSON.parse(content) as ProfileEnrichmentResult;

  return {
    core_keywords: (parsed.core_keywords ?? [])
      .filter((k) => typeof k === "string" && k.length >= 3)
      .slice(0, 25),
    broad_keywords: (parsed.broad_keywords ?? [])
      .filter((k) => typeof k === "string" && k.length >= 3)
      .slice(0, 35),
    cpv_codes: (parsed.cpv_codes ?? [])
      .filter((c) => typeof c === "string" && c.replace(/[^0-9]/g, "").length >= 5)
      .map((c) => c.replace(/[^0-9]/g, "").slice(0, 8))
      .slice(0, 20),
    negative_keywords: (parsed.negative_keywords ?? [])
      .filter((k) => typeof k === "string" && k.length >= 4)
      .slice(0, 30),
  };
}

export async function ensureCompanyProfileEnrichment(
  supabase: SupabaseClient<Database>,
  companyId: string,
  industry: string | null
): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY) {
    return industry;
  }

  const profile = parseCompanyProfile(industry);

  if (profile.aiEnrichedAt) {
    return industry;
  }

  if (
    !profile.primaryIndustry &&
    profile.offeringCategories.length === 0 &&
    !profile.companyDescription
  ) {
    return industry;
  }

  try {
    const enrichment = await generateProfileEnrichment(profile);

    const enrichedIndustry = serializeCompanyProfile({
      ...profile,
      aiCoreKeywords: enrichment.core_keywords,
      aiBroadKeywords: enrichment.broad_keywords,
      aiCpvCodes: enrichment.cpv_codes,
      aiNegativeKeywords: enrichment.negative_keywords,
      aiEnrichedAt: new Date().toISOString(),
    });

    if (enrichedIndustry && companyId) {
      await supabase
        .from("companies")
        .update({ industry: enrichedIndustry })
        .eq("id", companyId);
    }

    return enrichedIndustry ?? industry;
  } catch (error) {
    console.error("Profile enrichment error:", error);
    return industry;
  }
}
