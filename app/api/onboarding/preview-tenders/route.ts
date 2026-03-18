import { NextResponse } from "next/server";
import {
  buildProfileCpvSeeds,
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
  fetchRecommendedTenderCandidates,
  hasRecommendationSignals,
  rankTenderRecommendations,
  scoreTenderRecommendation,
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
  contracting_authority_jib: string | null;
  contract_type: string | null;
  raw_description: string | null;
  cpv_code: string | null;
  authority_city?: string | null;
  authority_municipality?: string | null;
  authority_canton?: string | null;
  authority_entity?: string | null;
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
  const cpvSeeds = buildProfileCpvSeeds(profile);

  if (!process.env.OPENAI_API_KEY) {
    return {
      keywords: keywordSeeds,
      cpvCodes: cpvSeeds,
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
        cpvCodes: cpvSeeds,
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
      cpvCodes: [...new Set([...cpvSeeds, ...aiCpvCodes.map((code) => code.trim())].filter((code) => code.length >= 5))].slice(0, 18),
    };
  } catch (error) {
    console.error("Preview signal mediation error:", error);
    return {
      keywords: keywordSeeds,
      cpvCodes: cpvSeeds,
    };
  }
}

function toPreviewTenders(
  candidates: PreviewTenderCandidate[],
  summary: string,
  recommendationContext: ReturnType<typeof buildRecommendationContext>
) {
  const rankedTenders = rankTenderRecommendations(candidates, recommendationContext);
  const fallbackContractGate = (candidate: ReturnType<typeof scoreTenderRecommendation>) =>
    recommendationContext.preferredContractTypes.length === 0 ||
    candidate.contractMatch ||
    !candidate.tender.contract_type;

  if (rankedTenders.length === 0 && candidates.length > 0) {
    const scoredCandidates = candidates
      .map((candidate) => scoreTenderRecommendation(candidate, recommendationContext))
      .filter((candidate) => fallbackContractGate(candidate));

    const broaderPreview = scoredCandidates
      .filter(
        (candidate) =>
          (candidate.score >= 3 ||
            candidate.cpvMatch ||
            candidate.titleMatches.length > 0 ||
            candidate.matchedKeywords.length > 0 ||
            candidate.regionMatch)
      )
      .sort((a, b) => {
        if (a.score !== b.score) {
          return b.score - a.score;
        }

        return (
          new Date(a.tender.deadline ?? 0).getTime() - new Date(b.tender.deadline ?? 0).getTime()
        );
      })
      .slice(0, 6);

    if (broaderPreview.length > 0) {
      return Promise.resolve({
        tenders: broaderPreview.map(
          ({ tender }) =>
            ({
              id: tender.id,
              title: tender.title,
              deadline: tender.deadline,
              estimated_value: tender.estimated_value,
              contracting_authority: tender.contracting_authority,
            }) satisfies PreviewTender
        ),
        summary:
          "Prikazujemo širi početni pregled tendera na osnovu djelatnosti, tipa tendera i regije. U sljedećem koraku dodajte još konteksta za preciznije preporuke.",
      });
    }

    const loosestPreview = scoredCandidates
      .filter(
        (candidate) =>
          candidate.regionMatch ||
          recommendationContext.regionTerms.length === 0 ||
          !candidate.tender.contracting_authority_jib
      )
      .sort((a, b) => {
        if (a.score !== b.score) {
          return b.score - a.score;
        }

        return (
          new Date(a.tender.deadline ?? 0).getTime() - new Date(b.tender.deadline ?? 0).getTime()
        );
      })
      .slice(0, 6);

    if (loosestPreview.length > 0) {
      return Promise.resolve({
        tenders: loosestPreview.map(
          ({ tender }) =>
            ({
              id: tender.id,
              title: tender.title,
              deadline: tender.deadline,
              estimated_value: tender.estimated_value,
              contracting_authority: tender.contracting_authority,
            }) satisfies PreviewTender
        ),
        summary:
          "Prikazujemo najširi početni pregled otvorenih tendera koji mogu biti primjenjivi na osnovu vašeg djelovanja, tipa tendera i dostupnih podataka o naručiocima.",
      });
    }
  }

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

    if (!hasRecommendationSignals(recommendationContext)) {
      return NextResponse.json({
        tenders: [],
        summary: "Odaberite barem jednu djelatnost da pokažemo prve tendere.",
      });
    }

    const candidateTenders = await fetchRecommendedTenderCandidates<PreviewTenderCandidate>(
      supabase,
      recommendationContext,
      {
        select: "id, title, deadline, estimated_value, contracting_authority, contracting_authority_jib, contract_type, raw_description, cpv_code",
        limit: 240,
      }
    );

    let mergedCandidates = candidateTenders;

    if (candidateTenders.length < 24) {
      const { data: broadPoolRows } = await supabase
        .from("tenders")
        .select(
          "id, title, deadline, estimated_value, contracting_authority, contracting_authority_jib, contract_type, raw_description, cpv_code"
        )
        .gt("deadline", new Date().toISOString())
        .order("deadline", { ascending: true, nullsFirst: false })
        .limit(600);

      const authorityJibs = [
        ...new Set(
          ((broadPoolRows ?? []) as PreviewTenderCandidate[])
            .map((tender) => tender.contracting_authority_jib)
            .filter(Boolean) as string[]
        ),
      ];

      const { data: authorityRows } = authorityJibs.length > 0
        ? await supabase
            .from("contracting_authorities")
            .select("jib, city, municipality, canton, entity")
            .in("jib", authorityJibs)
        : { data: [] };

      const authorityMap = new Map(
        (authorityRows ?? []).map((authority) => [authority.jib, authority])
      );

      const broaderCandidates = ((broadPoolRows ?? []) as PreviewTenderCandidate[]).map((tender) => {
        const authority = tender.contracting_authority_jib
          ? authorityMap.get(tender.contracting_authority_jib)
          : null;

        return {
          ...tender,
          authority_city: authority?.city ?? null,
          authority_municipality: authority?.municipality ?? null,
          authority_canton: authority?.canton ?? null,
          authority_entity: authority?.entity ?? null,
        } satisfies PreviewTenderCandidate;
      });

      mergedCandidates = [
        ...new Map(
          [...candidateTenders, ...broaderCandidates].map((candidate) => [candidate.id, candidate])
        ).values(),
      ];
    }

    return NextResponse.json(
      await toPreviewTenders(
        mergedCandidates,
        candidateTenders.length > 0
          ? `Na osnovu osnovnih podataka izdvojili smo ${Math.min(candidateTenders.length, 6)} tendera koji najviše liče na ono što radite.`
          : mergedCandidates.length > 0
            ? "Prikazujemo širi početni pregled tendera kako ne biste propustili relevantne prilike već u prvom koraku."
          : "Za ovaj osnovni unos još nema dovoljno jasnih poklapanja. U sljedećem koraku dopunite profil i dobit ćete preciznije preporuke.",
        recommendationContext
      )
    );
  } catch (error) {
    console.error("Preview tenders error:", error);
    return NextResponse.json({
      tenders: [],
      summary:
        "Početni pregled je trenutno ograničen za ovaj osnovni unos. Nastavite dalje i u sljedećem koraku ćemo izoštriti preporuke.",
    });
  }
}
