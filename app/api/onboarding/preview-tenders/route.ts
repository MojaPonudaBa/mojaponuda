import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { maybeRerankTenderRecommendationsWithAI } from "@/lib/tender-recommendation-rerank";
import {
  buildRecommendationContext,
  buildRecommendationSearchCondition,
  rankTenderRecommendations,
} from "@/lib/tender-recommendations";

interface PreviewTender {
  id: string;
  title: string;
  deadline: string | null;
  estimated_value: number | null;
  contracting_authority: string | null;
  reasons: string[];
}

interface PreviewTenderCandidate {
  id: string;
  title: string;
  deadline: string | null;
  estimated_value: number | null;
  contracting_authority: string | null;
  contract_type: string | null;
  raw_description: string | null;
  cpv_code: string | null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

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

    const recommendationContext = buildRecommendationContext({
      industry: JSON.stringify({
        version: 1,
        primaryIndustry: null,
        offeringCategories,
        preferredTenderTypes,
        companyDescription: null,
      }),
      keywords: [],
      cpv_codes: [],
      operating_regions: regions,
    });
    const searchCondition = buildRecommendationSearchCondition(recommendationContext);

    if (!searchCondition) {
      return NextResponse.json({
        tenders: [],
        summary: "Odaberite barem jednu djelatnost da pokažemo prve tendere.",
      });
    }

    let query = supabase
      .from("tenders")
      .select("id, title, deadline, estimated_value, contracting_authority, contract_type, raw_description, cpv_code")
      .gt("deadline", new Date().toISOString());

    if (
      recommendationContext.preferredContractTypes.length > 0 &&
      recommendationContext.preferredContractTypes.length < 3
    ) {
      query = query.in("contract_type", recommendationContext.preferredContractTypes);
    }

    query = query.or(searchCondition);

    const { data, error } = await query.order("deadline", { ascending: true }).limit(72);

    if (error) {
      throw error;
    }

    const candidateTenders = (data ?? []) as PreviewTenderCandidate[];

    const rankedTenders = rankTenderRecommendations(candidateTenders, recommendationContext);

    const rerankedTenders = await maybeRerankTenderRecommendationsWithAI(
      rankedTenders,
      recommendationContext,
      {
        limit: 6,
        shortlistSize: 8,
      }
    );

    const tenders = rerankedTenders.map(
      ({ tender, reasons }) =>
        ({
          id: tender.id,
          title: tender.title,
          deadline: tender.deadline,
          estimated_value: tender.estimated_value,
          contracting_authority: tender.contracting_authority,
          reasons,
        }) satisfies PreviewTender
    );

    const summary =
      tenders.length > 0
        ? `Na osnovu osnovnih podataka izdvojili smo ${tenders.length} tendera koji najviše liče na ono što radite.`
        : "Za ovaj osnovni unos još nema dovoljno jasnih poklapanja. U sljedećem koraku dopunite profil i dobit ćete preciznije preporuke.";

    return NextResponse.json({ tenders, summary });
  } catch (error) {
    console.error("Preview tenders error:", error);
    return NextResponse.json(
      { error: "Nismo uspjeli pripremiti početni pregled tendera." },
      { status: 500 }
    );
  }
}
