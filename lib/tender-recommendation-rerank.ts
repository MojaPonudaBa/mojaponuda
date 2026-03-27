import "server-only";

import {
  derivePrimaryIndustry,
  getProfileOptionLabel,
} from "@/lib/company-profile";
import { getOpenAIClient } from "@/lib/openai";
import type {
  RecommendationContext,
  RecommendationTenderInput,
  ScoredTenderRecommendation,
} from "@/lib/tender-recommendations";

const SYSTEM_PROMPT = `Ti si ekspert za javne nabavke u Bosni i Hercegovini.
Tvoj zadatak je da preurediš mali shortlist tendera prema stvarnoj relevantnosti za profil firme.

Pravila:
- Gledaj šta firma zaista prodaje, isporučuje ili izvodi.
- Pozitivno vrednuj precizna poklapanja po robi/usluzi, CPV fokusu, tipu tendera i lokaciji firme.
- Negativno vrednuj tendere koji liče na drugu industriju, posebno ako nose jasne negativne signale.
- Nemoj favorizovati tender samo zato što ima raniji rok ili veću vrijednost.
- Ako su dva tendera vrlo slična po relevantnosti, prednost daj onome koji je bliži lokaciji firme.
- Vraćaj isključivo ID-eve tendera iz dostavljene liste, od najrelevantnijeg ka najmanje relevantnom.
- Ako su dva tendera vrlo slična, prednost daj onome koji je preciznije usklađen s profilom firme.`;

const RESPONSE_SCHEMA = {
  type: "json_schema" as const,
  json_schema: {
    name: "tender_recommendation_rerank",
    strict: true,
    schema: {
      type: "object",
      properties: {
        ordered_ids: {
          type: "array",
          items: {
            type: "string",
          },
        },
      },
      required: ["ordered_ids"],
      additionalProperties: false,
    },
  },
};

interface RerankResponse {
  ordered_ids: string[];
}

interface RerankOptions {
  limit?: number;
  shortlistSize?: number;
}

function applyLimit<T>(items: T[], limit?: number): T[] {
  return typeof limit === "number" ? items.slice(0, limit) : items;
}

function truncateText(value: string | null | undefined, maxLength: number): string | null {
  if (!value?.trim()) {
    return null;
  }

  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}…`;
}

function buildProfileSummary(context: RecommendationContext): string {
  const focusIndustry = derivePrimaryIndustry(
    context.profile.offeringCategories,
    context.profile.primaryIndustry
  );

  return [
    focusIndustry ? `Fokus firme: ${getProfileOptionLabel(focusIndustry)}` : null,
    context.profile.offeringCategories.length > 0
      ? `Ponuda firme: ${context.profile.offeringCategories
          .map((item) => getProfileOptionLabel(item))
          .join(", ")}`
      : null,
    context.profile.preferredTenderTypes.length > 0
      ? `Vrste tendera: ${context.profile.preferredTenderTypes
          .map((item) => getProfileOptionLabel(item))
          .join(", ")}`
      : null,
    context.regionLabels.length > 0
      ? `Lokacija firme / poslovnica: ${context.regionLabels.join(", ")}`
      : "Lokacija firme / poslovnica: cijela Bosna i Hercegovina",
    context.keywords.length > 0
      ? `Pozitivni pojmovi: ${context.keywords.slice(0, 10).join(", ")}`
      : null,
    context.negativeSignals.length > 0
      ? `Negativni signali: ${context.negativeSignals.slice(0, 10).join(", ")}`
      : null,
    context.cpvPrefixes.length > 0
      ? `CPV fokus: ${context.cpvPrefixes.slice(0, 6).join(", ")}`
      : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

function buildCandidateSummary<TTender extends RecommendationTenderInput>(
  candidate: ScoredTenderRecommendation<TTender>
): string {
  return [
    `ID: ${candidate.tender.id}`,
    `Naslov: ${candidate.tender.title}`,
    candidate.tender.contracting_authority
      ? `Naručilac: ${candidate.tender.contracting_authority}`
      : null,
    candidate.tender.contract_type
      ? `Tip tendera: ${candidate.tender.contract_type}`
      : null,
    candidate.tender.cpv_code ? `CPV: ${candidate.tender.cpv_code}` : null,
    `Deterministički score: ${candidate.score}`,
    candidate.matchedKeywords.length > 0
      ? `Pozitivna poklapanja: ${candidate.matchedKeywords.slice(0, 6).join(", ")}`
      : null,
    candidate.negativeMatches.length > 0
      ? `Negativna poklapanja: ${candidate.negativeMatches.slice(0, 6).join(", ")}`
      : null,
    candidate.reasons.length > 0 ? `Razlozi: ${candidate.reasons.join(" | ")}` : null,
    candidate.tender.raw_description
      ? `Opis: ${truncateText(candidate.tender.raw_description, 600)}`
      : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

export async function maybeRerankTenderRecommendationsWithAI<
  TTender extends RecommendationTenderInput,
>(
  ranked: Array<ScoredTenderRecommendation<TTender>>,
  context: RecommendationContext,
  options: RerankOptions = {}
): Promise<Array<ScoredTenderRecommendation<TTender>>> {
  const limit = options.limit;

  if (!process.env.OPENAI_API_KEY) {
    return applyLimit(ranked, limit);
  }

  const shortlistSize = Math.min(
    options.shortlistSize ?? Math.max(limit ?? 8, 8),
    ranked.length
  );

  if (shortlistSize < 2) {
    return applyLimit(ranked, limit);
  }

  const shortlist = ranked.slice(0, shortlistSize);

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            "Profil firme:",
            buildProfileSummary(context),
            "",
            "Shortlist tendera:",
            ...shortlist.map((candidate, index) => [
              `Kandidat ${index + 1}`,
              buildCandidateSummary(candidate),
            ]).flat(),
          ].join("\n\n"),
        },
      ],
      response_format: RESPONSE_SCHEMA,
      temperature: 0.1,
    });

    const rawContent = completion.choices[0]?.message?.content;

    if (!rawContent) {
      return applyLimit(ranked, limit);
    }

    const parsed = JSON.parse(rawContent) as RerankResponse;
    const shortlistIds = new Set(shortlist.map((item) => item.tender.id));
    const orderedIds = Array.isArray(parsed.ordered_ids)
      ? parsed.ordered_ids.filter((id) => shortlistIds.has(id))
      : [];

    if (orderedIds.length === 0) {
      return applyLimit(ranked, limit);
    }

    const byId = new Map(shortlist.map((item) => [item.tender.id, item]));
    const seen = new Set<string>();
    const rerankedShortlist = orderedIds
      .map((id) => {
        seen.add(id);
        return byId.get(id) ?? null;
      })
      .filter((item): item is ScoredTenderRecommendation<TTender> => Boolean(item));

    const finalRanked = [
      ...rerankedShortlist,
      ...shortlist.filter((item) => !seen.has(item.tender.id)),
      ...ranked.slice(shortlistSize),
    ];

    // After AI reranking for relevance, re-sort by distance (locationPriority = km).
    // Tenders with unknown location (9999) go last.
    // Within the same distance bucket (±30km), preserve AI relevance order.
    const DISTANCE_BUCKET_KM = 30;
    const withBucket = finalRanked.map((item) => ({
      item,
      bucket: Math.floor((item.locationPriority as number) / DISTANCE_BUCKET_KM),
    }));
    withBucket.sort((a, b) => {
      if (a.bucket !== b.bucket) return a.bucket - b.bucket;
      // Same bucket: preserve AI order (already sorted by index)
      return 0;
    });
    const distanceSorted = withBucket.map(({ item }) => item);

    return applyLimit(distanceSorted, limit);
  } catch (error) {
    console.error("Tender recommendation AI rerank error:", error);
    return applyLimit(ranked, limit);
  }
}
