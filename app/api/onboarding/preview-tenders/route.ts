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
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildNeighboringGroupRegionFallback,
  buildRegionSearchTerms,
  buildSameGroupRegionFallback,
} from "@/lib/constants/regions";
import {
  buildRecommendationContext,
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
    console.error("[PREVIEW] Signal mediation error:", error);
    return {
      keywords: keywordSeeds,
      cpvCodes: cpvSeeds,
    };
  }
}

function toPreviewTender(candidate: PreviewTenderCandidate): PreviewTender {
  return {
    id: candidate.id,
    title: candidate.title,
    deadline: candidate.deadline,
    estimated_value: candidate.estimated_value,
    contracting_authority: candidate.contracting_authority,
  };
}

function normalizePreviewText(value: string | null | undefined): string {
  return value?.toLowerCase() ?? "";
}

function matchesPreviewRegionTerms(
  candidate: PreviewTenderCandidate,
  regionTerms: string[]
): boolean {
  if (regionTerms.length === 0) {
    return false;
  }

  const values = [
    normalizePreviewText(candidate.title),
    normalizePreviewText(candidate.raw_description),
    normalizePreviewText(candidate.contracting_authority),
    normalizePreviewText(candidate.authority_city),
    normalizePreviewText(candidate.authority_municipality),
    normalizePreviewText(candidate.authority_canton),
    normalizePreviewText(candidate.authority_entity),
  ];

  return values.some((value) => regionTerms.some((term) => value.includes(term.toLowerCase())));
}

export async function POST(request: Request) {
  const supabase = createAdminClient();

  try {
    const nowIso = new Date().toISOString();
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

    console.log("[PREVIEW] Input:", { offeringCategories, preferredTenderTypes, regions });

    const previewProfile: ParsedCompanyProfile = {
      primaryIndustry: derivePrimaryIndustry(offeringCategories, null),
      offeringCategories,
      preferredTenderTypes,
      companyDescription: null,
      legacyIndustryText: null,
    };

    const mediatedSignals = await mediatePreviewSignals(previewProfile, regions);
    console.log("[PREVIEW] Mediated signals:", {
      keywords: mediatedSignals.keywords,
      cpvCodes: mediatedSignals.cpvCodes,
    });

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

    console.log("[PREVIEW] Recommendation context:", {
      keywords: recommendationContext.keywords.length,
      cpvPrefixes: recommendationContext.cpvPrefixes,
      preferredContractTypes: recommendationContext.preferredContractTypes,
      regionTerms: recommendationContext.regionTerms.length,
      negativeSignals: recommendationContext.negativeSignals.length,
    });

    // ── Step 1: Always fetch a broad pool of tenders ──
    // Fetch future-deadline, null-deadline, AND recent past-deadline tenders
    // so the preview is never empty even when no future tenders exist.
    const ninetyDaysAgoIso = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { data: futureRows, error: futureError },
      { data: undatedRows, error: undatedError },
      { data: recentPastRows, error: recentPastError },
    ] = await Promise.all([
      supabase
        .from("tenders")
        .select(
          "id, title, deadline, estimated_value, contracting_authority, contracting_authority_jib, contract_type, raw_description"
        )
        .gt("deadline", nowIso)
        .order("deadline", { ascending: true, nullsFirst: false })
        .limit(600),
      supabase
        .from("tenders")
        .select(
          "id, title, deadline, estimated_value, contracting_authority, contracting_authority_jib, contract_type, raw_description"
        )
        .is("deadline", null)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("tenders")
        .select(
          "id, title, deadline, estimated_value, contracting_authority, contracting_authority_jib, contract_type, raw_description"
        )
        .lte("deadline", nowIso)
        .gte("deadline", ninetyDaysAgoIso)
        .order("deadline", { ascending: false })
        .limit(400),
    ]);

    console.log("[PREVIEW] Broad pool fetch:", {
      futureCount: futureRows?.length ?? 0,
      futureError: futureError?.message ?? null,
      undatedCount: undatedRows?.length ?? 0,
      undatedError: undatedError?.message ?? null,
      recentPastCount: recentPastRows?.length ?? 0,
      recentPastError: recentPastError?.message ?? null,
    });

    // Deduplicate by id, preferring future > undated > recent past
    const allPoolRows = [
      ...new Map(
        [
          ...((futureRows ?? []) as PreviewTenderCandidate[]),
          ...((undatedRows ?? []) as PreviewTenderCandidate[]),
          ...((recentPastRows ?? []) as PreviewTenderCandidate[]),
        ].map((row) => [row.id, row])
      ).values(),
    ];

    if (allPoolRows.length === 0) {
      console.log("[PREVIEW] No tenders in database at all");
      return NextResponse.json({
        tenders: [],
        summary:
          "Trenutno nema aktivnih tendera u bazi. Podaci se automatski sinhronizuju sa e-Nabavke portala.",
      });
    }

    // ── Step 2: Enrich with authority geo data ──
    const authorityJibs = [
      ...new Set(
        allPoolRows
          .map((tender) => tender.contracting_authority_jib)
          .filter(Boolean) as string[]
      ),
    ];

    interface AuthorityGeo {
      jib: string;
      city: string | null;
      municipality: string | null;
      canton: string | null;
      entity: string | null;
    }

    const { data: authorityRows } =
      authorityJibs.length > 0
        ? await supabase
            .from("contracting_authorities")
            .select("jib, city, municipality, canton, entity")
            .in("jib", authorityJibs.slice(0, 500))
        : { data: [] as AuthorityGeo[] };

    const authorityMap = new Map(
      (authorityRows ?? ([] as AuthorityGeo[])).map((authority) => [authority.jib, authority])
    );

    const enrichedPool: PreviewTenderCandidate[] = allPoolRows.map((tender) => {
      const authority = tender.contracting_authority_jib
        ? authorityMap.get(tender.contracting_authority_jib)
        : null;

      return {
        ...tender,
        authority_city: authority?.city ?? null,
        authority_municipality: authority?.municipality ?? null,
        authority_canton: authority?.canton ?? null,
        authority_entity: authority?.entity ?? null,
      };
    });

    console.log("[PREVIEW] Enriched pool size:", enrichedPool.length);

    // ── Step 3: Score every tender against the profile ──
    const scored = enrichedPool
      .map((candidate) => scoreTenderRecommendation(candidate, recommendationContext))
      .sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        return (
          new Date(a.tender.deadline ?? 0).getTime() -
          new Date(b.tender.deadline ?? 0).getTime()
        );
      });

    const hasRegionFilter = recommendationContext.regionTerms.length > 0;
    const sameGroupRegions = hasRegionFilter ? buildSameGroupRegionFallback(regions) : [];
    const sameGroupRegionTerms = hasRegionFilter ? buildRegionSearchTerms(sameGroupRegions) : [];
    const neighboringRegions = hasRegionFilter ? buildNeighboringGroupRegionFallback(regions) : [];
    const neighboringRegionTerms = hasRegionFilter ? buildRegionSearchTerms(neighboringRegions) : [];

    const withBusinessSignal = scored.filter(
      (item) =>
        item.cpvMatch ||
        item.titleMatches.length > 0 ||
        item.matchedKeywords.length > 0
    );
    const qualified = withBusinessSignal.filter((item) => item.qualifies);
    const businessSignalAndRegion = withBusinessSignal.filter((item) => item.regionMatch);
    const businessSignalSameGroup = withBusinessSignal.filter(
      (item) =>
        !item.regionMatch &&
        matchesPreviewRegionTerms(item.tender, sameGroupRegionTerms)
    );
    const businessSignalNeighboring = withBusinessSignal.filter(
      (item) =>
        !item.regionMatch &&
        !matchesPreviewRegionTerms(item.tender, sameGroupRegionTerms) &&
        matchesPreviewRegionTerms(item.tender, neighboringRegionTerms)
    );

    console.log("[PREVIEW] Scoring results:", {
      totalScored: scored.length,
      qualified: qualified.length,
      withBusinessSignal: withBusinessSignal.length,
      businessSignalAndRegion: businessSignalAndRegion.length,
      businessSignalSameGroup: businessSignalSameGroup.length,
      businessSignalNeighboring: businessSignalNeighboring.length,
      hasRegionFilter,
      sameGroupRegions: sameGroupRegions.slice(0, 12),
      neighboringRegions: neighboringRegions.slice(0, 12),
      topScores: scored.slice(0, 5).map((item) => ({
        title: item.tender.title.slice(0, 60),
        score: item.score,
        qualifies: item.qualifies,
        cpvMatch: item.cpvMatch,
        contractMatch: item.contractMatch,
        regionMatch: item.regionMatch,
        keywords: item.matchedKeywords.length,
        titleMatches: item.titleMatches.length,
        negPenalty: item.negativePenalty,
      })),
    });

    // ── Step 4: Pick the best available preview set (never empty) ──
    let previewTenders: PreviewTender[];
    let previewSummary: string;
    let tier: string;

    if (qualified.length > 0) {
      previewTenders = qualified.slice(0, 6).map((item) => toPreviewTender(item.tender));
      previewSummary = `Na osnovu osnovnih podataka izdvojili smo ${previewTenders.length} tendera koji najviše liče na ono što radite.`;
      tier = "qualified";
    } else if (businessSignalAndRegion.length > 0) {
      previewTenders = businessSignalAndRegion.slice(0, 6).map((item) => toPreviewTender(item.tender));
      previewSummary =
        "Prikazujemo početni pregled tendera na osnovu djelatnosti i odabrane regije. U sljedećem koraku dodajte kontekst za preciznije preporuke.";
      tier = "business+region";
    } else if (hasRegionFilter && businessSignalSameGroup.length > 0) {
      previewTenders = businessSignalSameGroup.slice(0, 6).map((item) => toPreviewTender(item.tender));
      previewSummary =
        "Na odabranom području trenutno nema više tendera iz vaše djelatnosti. Izdvojili smo relevantne prilike iz obližnjih općina i gradova.";
      tier = "business+same-group";
    } else if (hasRegionFilter && businessSignalNeighboring.length > 0) {
      previewTenders = businessSignalNeighboring.slice(0, 6).map((item) => toPreviewTender(item.tender));
      previewSummary =
        "Na odabranom području trenutno nema više tendera iz vaše djelatnosti. Izdvojili smo najbliže relevantne prilike iz okolnih područja.";
      tier = "business+neighboring";
    } else if (!hasRegionFilter && withBusinessSignal.length > 0) {
      previewTenders = withBusinessSignal.slice(0, 6).map((item) => toPreviewTender(item.tender));
      previewSummary =
        "Prikazujemo širi početni pregled tendera na osnovu djelatnosti i dostupnih signala. U sljedećem koraku dodajte kontekst za preciznije preporuke.";
      tier = "business-anywhere";
    } else if (hasRegionFilter) {
      previewTenders = [];
      previewSummary =
        "Trenutno nema otvorenih tendera iz vaše djelatnosti na odabranom području ni u obližnjim područjima. Nastavite dalje i dopunite profil za šire, ali i dalje relevantne preporuke.";
      tier = "no-business-match-in-area";
    } else {
      previewTenders = [];
      previewSummary =
        "Trenutno nema otvorenih tendera koji se jasno poklapaju s odabranom djelatnošću. Nastavite dalje i dopunite profil kako bismo proširili relevantne preporuke.";
      tier = "no-business-match";
    }

    console.log("[PREVIEW] Final result:", {
      tendersReturned: previewTenders.length,
      tier,
    });

    return NextResponse.json({
      tenders: previewTenders,
      summary: previewSummary,
    });
  } catch (error) {
    console.error("[PREVIEW] Unhandled error:", error);
    return NextResponse.json({
      tenders: [],
      summary:
        "Početni pregled je trenutno ograničen za ovaj osnovni unos. Nastavite dalje i u sljedećem koraku ćemo izoštriti preporuke.",
    });
  }
}
