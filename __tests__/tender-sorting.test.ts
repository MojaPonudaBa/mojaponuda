import { describe, expect, it } from "vitest";
import { sortRecommendedTenderItems, sortStandardTenders } from "@/lib/tender-sorting";
import type { RecommendationTenderInput } from "@/lib/tender-recommendations";

function createTender(
  overrides: Partial<RecommendationTenderInput & { created_at: string }>
): RecommendationTenderInput & { created_at: string } {
  return {
    id: "tender-1",
    title: "Tender",
    deadline: "2026-06-01T00:00:00.000Z",
    estimated_value: null,
    contracting_authority: "Test authority",
    contracting_authority_jib: null,
    contract_type: "Usluge",
    raw_description: null,
    cpv_code: null,
    ai_analysis: null,
    authority_city: null,
    authority_municipality: null,
    authority_canton: null,
    authority_entity: null,
    created_at: "2026-04-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("tender sorting", () => {
  it("sorts recommended tenders by nearest location when requested", () => {
    const sorted = sortRecommendedTenderItems(
      [
        {
          tender: createTender({ id: "far-higher-score" }),
          score: 10,
          positiveSignalCount: 6,
          locationPriority: 120,
        },
        {
          tender: createTender({ id: "nearby", authority_city: "Sarajevo" }),
          score: 8,
          positiveSignalCount: 5,
          locationPriority: 8,
        },
      ],
      "nearest"
    );

    expect(sorted.map((item) => item.tender.id)).toEqual(["nearby", "far-higher-score"]);
  });

  it("sorts standard tenders by value descending with null values last", () => {
    const sorted = sortStandardTenders(
      [
        createTender({ id: "unknown", estimated_value: null }),
        createTender({ id: "mid", estimated_value: 100_000 }),
        createTender({ id: "high", estimated_value: 500_000 }),
      ],
      "value_desc"
    );

    expect(sorted.map((item) => item.id)).toEqual(["high", "mid", "unknown"]);
  });

  it("sorts standard tenders by nearest location when priorities are available", () => {
    const sorted = sortStandardTenders(
      [
        { ...createTender({ id: "far" }), locationPriority: 250 },
        { ...createTender({ id: "near" }), locationPriority: 25 },
        { ...createTender({ id: "unknown" }), locationPriority: Number.POSITIVE_INFINITY },
      ],
      "nearest"
    );

    expect(sorted.map((item) => item.id)).toEqual(["near", "far", "unknown"]);
  });
});
