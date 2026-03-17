import { NextResponse } from "next/server";
import {
  buildProfileKeywordSeeds,
  derivePrimaryIndustry,
  getProfileOptionLabel,
  sanitizeSearchKeywords,
  type ParsedCompanyProfile,
} from "@/lib/company-profile";
import { getOpenAIClient } from "@/lib/openai";
import { createClient } from "@/lib/supabase/server";
import { maybeRerankTenderRecommendationsWithAI } from "@/lib/tender-recommendation-rerank";
import {
  buildRecommendationContext,
  buildRecommendationSearchCondition,
  rankTenderRecommendations,
} from "@/lib/tender-recommendations";

export const maxDuration = 30;

interface PreviewTender {
  id: string;
  title: string;
  deadline: string | null;
  estimated_value: number | null;
  contracting_authority: string | null;
}

interface PreviewTenderCandidate {
  id: string;
  title: string;
  deadline: string | null;
  estimated_value: number | null;
  contracting_authority: string | null;
  contract_type: string | null;
  raw_description: string | null;
}

interface PreviewSignalResponse {
  keywords?: string[];
  cpv_codes?: string[];
}

const PREVIEW_SIGNAL_SYSTEM_PROMPT = `Ti si ekspert za javne nabavke u Bosni i Hercegovini.
Tvoj zadatak je da iz vrlo ranog onboarding unosa izvedeš sigurne i precizne pojmove za početni pregled tendera.

Vrati isključivo JSON objekat sa poljima:
- keywords: niz kratkih i preciznih pojmova koji se stvarno pojavljuju u tenderima
- cpv_codes: niz CPV kodova kada ima dovoljno osnova da ih predložiš

Pravila:
- Nemoj vraćati opšte onboarding kategorije ni njihove nazive.
- Nemoj vraćati preširoke riječi kao što su oprema, mreže, usluge, radovi, sistemi.
- Prednost daj konkretnim frazama robe, usluge ili radova.
- Smiješ dodati bliske sinonime i povezane pojmove samo ako su vjerovatni za isti profil.
- Ako input nije dovoljno jasan, vrati manji broj sigurnih i užih pojmova.
- Ne izmišljaj CPV kodove ako nema dovoljno signala.`;

function buildPreviewProfileSummary(profile: ParsedCompanyProfile, regions: string[]): string {
  const focusIndustry = derivePrimaryIndustry(profile.offeringCategories, profile.primaryIndustry);

  return [
    focusIndustry ? `Fokus firme: ${getProfileOptionLabel(focusIndustry)}` : null,
    profile.offeringCategories.length > 0
      ? `Ponuda firme: ${profile.offeringCategories.map((item) => getProfileOptionLabel(item)).join(", ")}`
      : null,
    profile.preferredTenderTypes.length > 0
      ? `Vrste tendera: ${profile.preferredTenderTypes
          .map((item) => getProfileOptionLabel(item))
          .join(", ")}`
      : null,
    regions.length > 0 ? `Regije rada: ${regions.join(", ")}` : "Regije rada: cijela Bosna i Hercegovina",
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

async function mediatePreviewSignals(
  profile: ParsedCompanyProfile,
  regions: string[]
): Promise<{ keywords: string[]; cpvCodes: string[] }> {
  const keywordSeeds = buildProfileKeywordSeeds(profile);

  if (!process.env.OPENAI_API_KEY) {
    return {
      keywords: keywordSeeds,
      cpvCodes: [],
    };
  }

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: PREVIEW_SIGNAL_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            "Rani onboarding profil:",
            buildPreviewProfileSummary(profile, regions),
            "",
            `Početni sigurni seed pojmovi: ${keywordSeeds.join(", ") || "nema"}`,
          ].join("\n"),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      return {
        keywords: keywordSeeds,
        cpvCodes: [],
      };
    }

    const parsed = JSON.parse(content) as PreviewSignalResponse;
    const aiKeywords = Array.isArray(parsed.keywords)
      ? parsed.keywords.filter((item): item is string => typeof item === "string")
      : [];
    const aiCpvCodes = Array.isArray(parsed.cpv_codes)
      ? parsed.cpv_codes.filter((item): item is string => typeof item === "string")
      : [];

    return {
      keywords: sanitizeSearchKeywords([...keywordSeeds, ...aiKeywords]).slice(0, 18),
      cpvCodes: [...new Set(aiCpvCodes.map((code) => code.trim()).filter((code) => code.length >= 5))].slice(0, 12),
    };
  } catch (error) {
    console.error("Preview signal mediation error:", error);
    return {
      keywords: keywordSeeds,
      cpvCodes: [],
    };
  }
}

function toPreviewTenders(
  candidates: PreviewTenderCandidate[],
  summary: string,
  recommendationContext: ReturnType<typeof buildRecommendationContext>
) {
  const rankedTenders = rankTenderRecommendations(candidates, recommendationContext);

  return maybeRerankTenderRecommendationsWithAI(rankedTenders, recommendationContext, {
    limit: 6,
    shortlistSize: 8,
  }).then((rerankedTenders) => ({
    tenders: rerankedTenders.map(
      ({ tender }) =>
        ({
          id: tender.id,
          title: tender.title,
          deadline: tender.deadline,
          estimated_value: tender.estimated_value,
          contracting_authority: tender.contracting_authority,
        }) satisfies PreviewTender
    ),
    summary,
  }));
}

export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    const body = (await request.json()) as {
      offeringCategories?: unknown[];
      preferredTenderTypes?: unknown[];
      regions?: unknown[];
    };
    const offeringCategories = Array.isArray(body.offeringCategories)
      ? body.offeringCategories.filter((item: unknown): item is string => typeof item === "string")
      : [];
    const preferredTenderTypes = Array.isArray(body.preferredTenderTypes)
      ? body.preferredTenderTypes.filter((item: unknown): item is string => typeof item === "string")
      : [];
    const regions = Array.isArray(body.regions)
      ? body.regions.filter((item: unknown): item is string => typeof item === "string")
      : [];

    const previewProfile: ParsedCompanyProfile = {
      primaryIndustry: derivePrimaryIndustry(offeringCategories, null),
      offeringCategories,
      preferredTenderTypes,
      companyDescription: null,
      legacyIndustryText: null,
    };

    const mediatedSignals = await mediatePreviewSignals(previewProfile, regions);

    const recommendationContext = buildRecommendationContext({
      industry: JSON.stringify({
        version: 1,
        primaryIndustry: previewProfile.primaryIndustry,
        offeringCategories,
        preferredTenderTypes,
        companyDescription: null,
      }),
      keywords: mediatedSignals.keywords,
      cpv_codes: mediatedSignals.cpvCodes,
      operating_regions: regions,
    });
    const searchCondition = buildRecommendationSearchCondition(recommendationContext);

    if (!searchCondition) {
      return NextResponse.json({
        tenders: [],
        summary: "Odaberite barem jednu djelatnost da pokažemo prve tendere.",
      });
    }

    const createBaseQuery = () =>
      supabase
        .from("tenders")
        .select("id, title, deadline, estimated_value, contracting_authority, contract_type, raw_description")
        .gt("deadline", new Date().toISOString());

    let query = createBaseQuery();

    if (
      recommendationContext.preferredContractTypes.length > 0 &&
      recommendationContext.preferredContractTypes.length < 3
    ) {
      query = query.in("contract_type", recommendationContext.preferredContractTypes);
    }

    query = query.or(searchCondition);

    const { data, error } = await query.order("deadline", { ascending: true }).limit(72);

    if (!error) {
      const candidateTenders = (data ?? []) as PreviewTenderCandidate[];
      const preciseResult = await toPreviewTenders(
        candidateTenders,
        candidateTenders.length > 0
          ? `Na osnovu osnovnih podataka izdvojili smo ${Math.min(candidateTenders.length, 6)} tendera koji najviše liče na ono što radite.`
          : "Za ovaj osnovni unos još nema dovoljno jasnih poklapanja. U sljedećem koraku dopunite profil i dobit ćete preciznije preporuke.",
        recommendationContext
      );

      if (preciseResult.tenders.length > 0) {
        return NextResponse.json(preciseResult);
      }
    }

    if (error) {
      console.error("Preview tenders precise query error:", error);
    }

    let fallbackQuery = createBaseQuery();

    if (
      recommendationContext.preferredContractTypes.length > 0 &&
      recommendationContext.preferredContractTypes.length < 3
    ) {
      fallbackQuery = fallbackQuery.in(
        "contract_type",
        recommendationContext.preferredContractTypes
      );
    }

    const { data: fallbackData, error: fallbackError } = await fallbackQuery
      .order("deadline", { ascending: true })
      .limit(240);

    if (fallbackError) {
      console.error("Preview tenders fallback query error:", fallbackError);

      return NextResponse.json({
        tenders: [],
        summary:
          "Početni pregled je trenutno ograničen za ovaj osnovni unos. Nastavite dalje i u sljedećem koraku ćemo izoštriti preporuke.",
      });
    }

    const fallbackCandidates = (fallbackData ?? []) as PreviewTenderCandidate[];
    const fallbackResult = await toPreviewTenders(
      fallbackCandidates,
      fallbackCandidates.length > 0
        ? "Prikazujemo širi početni pregled tendera dok izoštravamo preporuke za vaš profil."
        : "Za ovaj osnovni unos još nema dovoljno jasnih poklapanja. U sljedećem koraku dopunite profil i dobit ćete preciznije preporuke.",
      recommendationContext
    );

    return NextResponse.json(fallbackResult);
  } catch (error) {
    console.error("Preview tenders error:", error);
    return NextResponse.json({
      tenders: [],
      summary:
        "Početni pregled je trenutno ograničen za ovaj osnovni unos. Nastavite dalje i u sljedećem koraku ćemo izoštriti preporuke.",
    });
  }
}
