import { describe, expect, it } from "vitest";
import {
  computeTenderDecisionInsights,
  type TenderDecisionTender,
} from "@/lib/tender-decision";

type TableRows = Record<string, Array<Record<string, unknown>>>;

function createSupabaseMock(rowsByTable: TableRows) {
  return {
    from(table: string) {
      let data = [...(rowsByTable[table] ?? [])];
      const query = {
        select() {
          return query;
        },
        in(column: string, values: unknown[]) {
          data = data.filter((row) => values.includes(row[column]));
          return query;
        },
        eq(column: string, value: unknown) {
          data = data.filter((row) => row[column] === value);
          return query;
        },
        order() {
          return query;
        },
        limit(count: number) {
          data = data.slice(0, count);
          return query;
        },
        then(resolve: (value: { data: typeof data; error: null }) => unknown, reject?: (reason: unknown) => unknown) {
          return Promise.resolve({ data, error: null }).then(resolve, reject);
        },
      };
      return query;
    },
  };
}

function tender(overrides: Partial<TenderDecisionTender> = {}): TenderDecisionTender {
  return {
    id: "tender-1",
    title: "Izvodjenje gradjevinskih radova",
    deadline: "2026-06-01T00:00:00.000Z",
    estimated_value: null,
    contracting_authority: "Opcina Test",
    contracting_authority_jib: "4200000000000",
    contract_type: "Radovi",
    procedure_type: "Otvoreni postupak",
    raw_description: "Gradjevinski radovi na objektu.",
    cpv_code: "45000000-7",
    ai_analysis: null,
    ...overrides,
  };
}

function award(overrides: Record<string, unknown> = {}) {
  return {
    contracting_authority_jib: "4200000000000",
    winner_jib: `winner-${Math.random()}`,
    winner_name: "Dobavljac",
    winning_price: 100_000,
    estimated_value: null,
    discount_pct: null,
    total_bidders_count: null,
    procedure_type: "Otvoreni postupak",
    tender_id: null,
    tenders: { cpv_code: "45000000-7" },
    ...overrides,
  };
}

describe("tender decision insights", () => {
  it("does not invent win probability or bidder ranges when bidder counts are missing", async () => {
    const supabase = createSupabaseMock({
      award_decisions: [
        award({ winning_price: 95_000 }),
        award({ winning_price: 100_000 }),
        award({ winning_price: 110_000 }),
        award({ winning_price: 120_000 }),
        award({ winning_price: 130_000 }),
      ],
    });

    const insights = await computeTenderDecisionInsights(
      supabase as never,
      [tender()],
      { id: "company-1", jib: "111", industry: null, keywords: ["gradjevina"], cpv_codes: [], operating_regions: [] },
      new Map([["tender-1", { matchScore: 82, confidence: 4, reasons: ["Profil odgovara CPV grupi."] }]]),
    );

    const insight = insights.get("tender-1");
    expect(insight).toBeDefined();
    expect(insight?.winProbability).toBe(0);
    expect(insight?.winConfidence).toBe("low");
    expect(insight?.expectedBiddersRange.min).toBeNull();
    expect(insight?.competitionLabel).toContain("indirektan signal");
    expect(insight?.priceRange.basedOn).toBe("authority+cpv");
    expect(insight?.priceRange.sampleCount).toBe(5);
    expect(insight?.recommendation).toBe("risky");
  });

  it("uses actual bidder samples before showing a win probability", async () => {
    const supabase = createSupabaseMock({
      award_decisions: [
        award({ total_bidders_count: 2, winning_price: 95_000 }),
        award({ total_bidders_count: 3, winning_price: 100_000 }),
        award({ total_bidders_count: 4, winning_price: 110_000 }),
        award({ total_bidders_count: 3, winning_price: 120_000 }),
        award({ total_bidders_count: 2, winning_price: 130_000 }),
        award({ total_bidders_count: 4, winning_price: 140_000 }),
      ],
    });

    const insights = await computeTenderDecisionInsights(
      supabase as never,
      [tender()],
      { id: "company-1", jib: "111", industry: null, keywords: ["gradjevina"], cpv_codes: [], operating_regions: [] },
      new Map([["tender-1", { matchScore: 82, confidence: 4, reasons: ["Profil odgovara CPV grupi."] }]]),
    );

    const insight = insights.get("tender-1");
    expect(insight?.winProbability).toBeGreaterThan(0);
    expect(insight?.winConfidence).toBe("medium");
    expect(insight?.competitionLevel).not.toBe("unknown");
    expect(insight?.expectedBiddersRange.min).not.toBeNull();
  });
});
