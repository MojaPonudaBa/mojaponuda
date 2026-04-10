import { describe, expect, it } from "vitest";
import {
  buildOpportunityRecommendationContext,
  scoreOpportunityRecommendation,
  selectOpportunityRecommendations,
  type OpportunityRecommendationInput,
} from "@/lib/opportunity-recommendations";

function createOpportunity(
  overrides: Partial<OpportunityRecommendationInput>
): OpportunityRecommendationInput {
  return {
    id: "opp-1",
    slug: "opp-1",
    type: "poticaj",
    title: "Javni poziv",
    issuer: "Razvojna agencija",
    category: "Poticaji",
    subcategory: null,
    industry: null,
    value: null,
    deadline: "2026-05-15T00:00:00.000Z",
    location: "Bosna i Hercegovina",
    requirements: null,
    eligibility_signals: null,
    description: null,
    status: "active",
    ai_summary: null,
    ai_who_should_apply: null,
    ai_difficulty: "srednje",
    created_at: "2026-04-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("opportunity recommendations", () => {
  const context = buildOpportunityRecommendationContext({
    industry: null,
    keywords: ["digitalizacija", "poslovni procesi"],
    cpv_codes: [],
    operating_regions: ["Kanton Sarajevo"],
  });

  it("qualifies grants based on eligibility and who-should-apply text", () => {
    const scored = scoreOpportunityRecommendation(
      createOpportunity({
        id: "eligibility-fit",
        title: "Javni poziv za mala i srednja preduzeÄ‡a",
        ai_who_should_apply:
          "MSP koja ulaÅ¾u u digitalizaciju i unapreÄ‘enje poslovnih procesa",
        requirements: "Dokaz o planu digitalizacije poslovnih procesa",
        ai_summary: "PodrÅ¡ka modernizaciji poslovnih procesa",
      }),
      context
    );

    expect(scored.qualifies).toBe(true);
    expect(scored.eligibilityMatches.length).toBeGreaterThan(0);
    expect(scored.matchedKeywords).toContain("digitalizacija");
  });

  it("filters out location-only noise and keeps the best personalized grants first", () => {
    const selected = selectOpportunityRecommendations(
      [
        createOpportunity({
          id: "relevant",
          title: "Grant za digitalizaciju MSP",
          ai_who_should_apply:
            "PreduzeÄ‡a koja ulaÅ¾u u digitalizaciju i unapreÄ‘enje poslovnih procesa",
          location: "Bosna i Hercegovina",
        }),
        createOpportunity({
          id: "noise",
          title: "PodrÅ¡ka za plasteniÄku proizvodnju",
          category: "Poljoprivreda",
          location: "Sarajevo",
          ai_summary: "Regionalni program podrÅ¡ke",
        }),
      ],
      context
    );

    expect(selected.map((item) => item.opportunity.id)).toEqual(["relevant"]);
  });

  it("does not treat generic local business grants as personalized for medical suppliers", () => {
    const medicalContext = buildOpportunityRecommendationContext({
      industry: JSON.stringify({
        version: 1,
        primaryIndustry: "medical",
        offeringCategories: ["medical_supplies"],
        specializationIds: ["medical_devices"],
        preferredTenderTypes: ["goods"],
        companyDescription: "Prodaja medicinske opreme i potroÅ¡nog materijala",
        manualKeywords: ["medicinska oprema", "medicinski proizvodi"],
      }),
      keywords: ["medicinska oprema", "medicinski proizvodi"],
      cpv_codes: ["33100000"],
      operating_regions: ["Kanton Sarajevo"],
    });

    const selected = selectOpportunityRecommendations(
      [
        createOpportunity({
          id: "generic-local",
          title: "Javni poziv za sufinansiranje razvoja biznisa",
          category: "Poticaji za MSP",
          location: "Visoko",
          ai_summary:
            "Program je namijenjen mikro, malim i srednjim preduzeÄ‡ima sa podruÄja grada.",
          ai_who_should_apply:
            "PreduzeÄ‡a koja posluju na podruÄju grada i razvijaju poslovanje",
        }),
        createOpportunity({
          id: "medical-fit",
          title: "Javni poziv za certificiranje i nabavku medicinske opreme",
          category: "Zdravstvo i medicinska oprema",
          industry: "Medicinska oprema",
          ai_who_should_apply:
            "Privredna druÅ¡tva koja proizvode ili prodaju medicinsku opremu i potroÅ¡ni medicinski materijal",
          requirements:
            "Plan investicije u medicinsku opremu, certifikaciju i usklaÄ‘ivanje sa zdravstvenim standardima",
        }),
      ],
      medicalContext
    );

    expect(selected.map((item) => item.opportunity.id)).toEqual(["medical-fit"]);
  });
});
