import { describe, expect, it } from "vitest";
import {
  buildRecommendationContext,
  scoreTenderRecommendation,
  selectTenderRecommendations,
  type RecommendationTenderInput,
} from "@/lib/tender-recommendations";

function createTender(
  overrides: Partial<RecommendationTenderInput>
): RecommendationTenderInput {
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
    ...overrides,
  };
}

describe("tender recommendations", () => {
  const context = buildRecommendationContext({
    industry: null,
    keywords: ["erp", "softver"],
    cpv_codes: [],
    operating_regions: ["Kanton Sarajevo"],
  });

  it("keeps strong business-fit tenders even when location is broad", () => {
    const scored = scoreTenderRecommendation(
      createTender({
        id: "broad-fit",
        title: "Nabavka ERP softvera za finansijsko poslovanje",
        raw_description: "Implementacija i odrÅ¾avanje ERP sistema",
      }),
      context
    );

    expect(scored.locationScope).toBe("broad");
    expect(scored.qualifies).toBe(true);
    expect(scored.titleMatches).toContain("erp");
  });

  it("ranks stronger relevance ahead of closer but weaker matches", () => {
    const ranked = selectTenderRecommendations(
      [
        createTender({
          id: "local-weaker",
          title: "OdrÅ¾avanje softvera",
          authority_city: "Sarajevo",
        }),
        createTender({
          id: "broad-stronger",
          title: "Nabavka ERP softvera i integracija poslovnih sistema",
        }),
      ],
      context
    );

    expect(ranked.map((item) => item.tender.id)).toEqual([
      "broad-stronger",
      "local-weaker",
    ]);
  });

  it("keeps broad profile signals available alongside strict keywords", () => {
    const profileContext = buildRecommendationContext({
      industry: JSON.stringify({
        version: 1,
        primaryIndustry: "it",
        offeringCategories: ["software_licenses"],
        specializationIds: [],
        preferredTenderTypes: [],
        companyDescription: "Razvijamo poslovni softver za institucije.",
        manualKeywords: ["erp"],
      }),
      keywords: ["erp"],
      cpv_codes: [],
      operating_regions: [],
    });

    expect(profileContext.keywords).toContain("erp");
    expect(profileContext.keywords).toContain("softver");
    expect(profileContext.retrievalKeywords).toContain("software");
    expect(profileContext.cpvPrefixes).toContain("48000");
  });

  it("matches cross-variant software titles for the same profile", () => {
    const profileContext = buildRecommendationContext({
      industry: JSON.stringify({
        version: 1,
        primaryIndustry: "it",
        offeringCategories: ["software_licenses"],
        specializationIds: [],
        preferredTenderTypes: [],
        companyDescription: "Implementacija i odrzavanje poslovnog softvera.",
        manualKeywords: [],
      }),
      keywords: [],
      cpv_codes: [],
      operating_regions: [],
    });

    const scored = scoreTenderRecommendation(
      createTender({
        id: "software-fit",
        title: "Nabavka software platforme za upravljanje dokumentima",
        raw_description: "Implementation of business software platform",
      }),
      profileContext
    );

    expect(scored.qualifies).toBe(true);
    expect(scored.titleMatches).toContain("software");
  });

  it("uses inferred contract types and rejects unrelated service tenders for medical suppliers", () => {
    const profileContext = buildRecommendationContext({
      industry: JSON.stringify({
        version: 1,
        primaryIndustry: "medical",
        offeringCategories: ["medical_supplies"],
        specializationIds: [],
        preferredTenderTypes: [],
        companyDescription: "Prodaja medicinske opreme i medicinskog potrosnog materijala.",
        manualKeywords: [],
      }),
      keywords: [],
      cpv_codes: [],
      operating_regions: [],
    });

    const unrelatedService = scoreTenderRecommendation(
      createTender({
        id: "medical-noise",
        title: "Odrzavanje i servisiranje klima uredjaja",
        contracting_authority: "JU Dom zdravlja Sarajevo",
        contract_type: "Usluge",
        raw_description: "Redovan servis rashladnih i ventilacionih sistema.",
      }),
      profileContext
    );

    const relevantMedicalSupply = scoreTenderRecommendation(
      createTender({
        id: "medical-fit",
        title: "Nabavka medicinske opreme i sanitetskog materijala",
        contract_type: "Robe",
        cpv_code: "33100000-1",
        raw_description: "Isporuka medicinskog potrosnog materijala i opreme za ambulante.",
      }),
      profileContext
    );

    expect(profileContext.preferredContractTypes).toEqual(["Robe"]);
    expect(unrelatedService.qualifies).toBe(false);
    expect(relevantMedicalSupply.qualifies).toBe(true);
  });

  it("does not treat contracting authority text as a positive industry match", () => {
    const profileContext = buildRecommendationContext({
      industry: JSON.stringify({
        version: 1,
        primaryIndustry: "medical",
        offeringCategories: ["laboratory_diagnostics"],
        specializationIds: [],
        preferredTenderTypes: [],
        companyDescription: "Laboratorijska oprema i dijagnostika.",
        manualKeywords: [],
      }),
      keywords: [],
      cpv_codes: [],
      operating_regions: [],
    });

    const scored = scoreTenderRecommendation(
      createTender({
        id: "authority-noise",
        title: "Servisiranje sluzbenih vozila",
        contracting_authority: "Klinicki centar univerziteta Sarajevo",
        contract_type: "Usluge",
        raw_description: "Odrzavanje voznog parka i nabavka autodijelova.",
      }),
      profileContext
    );

    expect(scored.matchedKeywords).toEqual([]);
    expect(scored.qualifies).toBe(false);
  });

  it("covers broader construction CPV families beyond the main works code", () => {
    const profileContext = buildRecommendationContext({
      industry: JSON.stringify({
        version: 1,
        primaryIndustry: "construction",
        offeringCategories: ["construction_works"],
        specializationIds: [],
        preferredTenderTypes: [],
        companyDescription: "Izvodimo gradjevinske i instalaterske radove.",
        manualKeywords: [],
      }),
      keywords: [],
      cpv_codes: [],
      operating_regions: [],
    });

    const scored = scoreTenderRecommendation(
      createTender({
        id: "construction-fit",
        title: "Elektroinstalacioni radovi na rekonstrukciji objekta",
        contract_type: "Radovi",
        cpv_code: "45310000-3",
        raw_description: "Izvodjenje elektroinstalacionih radova i rekonstrukcija objekta.",
      }),
      profileContext
    );

    expect(profileContext.cpvPrefixes).toContain("45300");
    expect(scored.qualifies).toBe(true);
    expect(scored.cpvMatch).toBe(true);
  });

  it("merges AI-generated core keywords into the recommendation context", () => {
    const profileContext = buildRecommendationContext({
      industry: JSON.stringify({
        version: 1,
        primaryIndustry: null,
        offeringCategories: [],
        specializationIds: [],
        preferredTenderTypes: [],
        companyDescription: "Prodaja poljoprivrednih masina.",
        manualKeywords: [],
        aiCoreKeywords: ["poljoprivredna mehanizacija", "traktor", "kombajn", "plug"],
        aiBroadKeywords: ["poljopriv", "mehanizac", "traktor", "kombajn"],
        aiCpvCodes: ["16000000"],
        aiNegativeKeywords: ["softver", "građevinsk", "medicinsk"],
        aiEnrichedAt: "2026-01-01T00:00:00.000Z",
      }),
      keywords: [],
      cpv_codes: [],
      operating_regions: [],
    });

    expect(profileContext.coreKeywords).toContain("poljoprivredna mehanizacija");
    expect(profileContext.coreKeywords).toContain("traktor");
    expect(profileContext.keywords).toContain("poljopriv");
    expect(profileContext.cpvPrefixes).toContain("16000");
    expect(profileContext.negativeSignals).toContain("softver");
    expect(profileContext.negativeSignals).toContain("medicinsk");
  });

  it("qualifies tenders for an AI-enriched profile in any industry", () => {
    const profileContext = buildRecommendationContext({
      industry: JSON.stringify({
        version: 1,
        primaryIndustry: null,
        offeringCategories: [],
        specializationIds: [],
        preferredTenderTypes: [],
        companyDescription: "Proizvodnja peciva i kruha.",
        manualKeywords: [],
        aiCoreKeywords: ["pekarski proizvodi", "kruh", "pecivo", "pekara"],
        aiBroadKeywords: ["pekar", "kruh", "peciv", "brašn"],
        aiCpvCodes: ["15810000"],
        aiNegativeKeywords: ["softver", "građevinsk", "medicinsk", "vozil"],
        aiEnrichedAt: "2026-01-01T00:00:00.000Z",
      }),
      keywords: [],
      cpv_codes: [],
      operating_regions: [],
    });

    const relevant = scoreTenderRecommendation(
      createTender({
        id: "bakery-fit",
        title: "Nabavka kruha i pekarskih proizvoda",
        contract_type: "Robe",
        cpv_code: "15811000-6",
        raw_description: "Nabavka pekarskih proizvoda za potrebe bolnice.",
      }),
      profileContext
    );

    const irrelevant = scoreTenderRecommendation(
      createTender({
        id: "bakery-noise",
        title: "Nabavka softverskih licenci",
        contract_type: "Robe",
        cpv_code: "48000000-8",
        raw_description: "Nabavka licenci za operativni sistem i office paket.",
      }),
      profileContext
    );

    expect(relevant.qualifies).toBe(true);
    expect(relevant.cpvMatch).toBe(true);
    expect(irrelevant.qualifies).toBe(false);
  });

  it("AI negative keywords block false positives from related institutions", () => {
    const profileContext = buildRecommendationContext({
      industry: JSON.stringify({
        version: 1,
        primaryIndustry: null,
        offeringCategories: [],
        specializationIds: [],
        preferredTenderTypes: [],
        companyDescription: "Laboratorijska oprema i reagensi.",
        manualKeywords: [],
        aiCoreKeywords: ["laboratorijska oprema", "reagensi", "dijagnostika"],
        aiBroadKeywords: ["laboratorij", "reagens", "dijagnostik"],
        aiCpvCodes: ["33696000", "38000000"],
        aiNegativeKeywords: ["goriv", "čišćenj", "vozil", "namještaj", "catering"],
        aiEnrichedAt: "2026-01-01T00:00:00.000Z",
      }),
      keywords: [],
      cpv_codes: [],
      operating_regions: [],
    });

    const hospitalFuelTender = scoreTenderRecommendation(
      createTender({
        id: "hospital-fuel",
        title: "Nabavka goriva za potrebe bolnice",
        contract_type: "Robe",
        raw_description: "Nabavka loz ulja i goriva za centralno grijanje bolnice.",
        contracting_authority: "Opca bolnica Sarajevo",
      }),
      profileContext
    );

    expect(hospitalFuelTender.negativeTitleMatches.length).toBeGreaterThan(0);
    expect(hospitalFuelTender.qualifies).toBe(false);
  });

  it("AI CPV codes produce broad prefixes for retrieval", () => {
    const profileContext = buildRecommendationContext({
      industry: JSON.stringify({
        version: 1,
        primaryIndustry: null,
        offeringCategories: [],
        specializationIds: [],
        preferredTenderTypes: [],
        companyDescription: "Stampanje reklamnog materijala.",
        manualKeywords: [],
        aiCoreKeywords: ["stampanje", "reklamni materijal", "ofset stampa"],
        aiBroadKeywords: ["stamp", "reklam", "ofset", "tisak"],
        aiCpvCodes: ["22000000", "79800000"],
        aiNegativeKeywords: ["građevinsk", "medicinsk", "softver"],
        aiEnrichedAt: "2026-01-01T00:00:00.000Z",
      }),
      keywords: [],
      cpv_codes: [],
      operating_regions: [],
    });

    expect(profileContext.cpvPrefixes).toContain("22000");
    expect(profileContext.cpvPrefixes).toContain("79800");
    expect(profileContext.broadCpvPrefixes).toContain("22");
    expect(profileContext.broadCpvPrefixes).toContain("79");
  });

  it("CPV match bypasses contractMatch for flexible qualification", () => {
    const profileContext = buildRecommendationContext({
      industry: JSON.stringify({
        version: 1,
        primaryIndustry: "medical",
        offeringCategories: ["medical_supplies"],
        specializationIds: [],
        preferredTenderTypes: [],
        companyDescription: "Prodaja medicinske opreme.",
        manualKeywords: [],
      }),
      keywords: [],
      cpv_codes: [],
      operating_regions: [],
    });

    const scored = scoreTenderRecommendation(
      createTender({
        id: "medical-service-cpv",
        title: "Nabavka medicinske opreme za laboratoriju",
        contract_type: "Usluge",
        cpv_code: "33100000-1",
        raw_description: "Nabavka i isporuka medicinske opreme za laboratorijsku dijagnostiku.",
      }),
      profileContext
    );

    expect(scored.cpvMatch).toBe(true);
    expect(scored.contractMatch).toBe(false);
    expect(scored.qualifies).toBe(true);
  });
});
