import "server-only";
import { createClient } from "@supabase/supabase-js";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export interface HistoricalContext {
  similar_calls_count: number;
  issuer_calls_count: number;
  category_trend: "increasing" | "stable" | "decreasing";
  typical_frequency?: string;
  last_similar_call?: {
    title: string;
    deadline: string;
    value: number;
  };
  calculated_at: string;
}

interface OpportunityData {
  title: string;
  issuer: string;
  category: string | null;
  value: number | null;
  deadline: string | null;
}

/**
 * HistoricalContextCalculator analyzes historical opportunity data
 * to provide context about similar calls, issuer patterns, and trends
 */
export class HistoricalContextCalculator {
  /**
   * Calculates historical context for an opportunity
   * @param opportunity - Opportunity data to analyze
   * @returns Historical context with trends and patterns
   */
  async calculateContext(
    opportunity: OpportunityData
  ): Promise<HistoricalContext> {
    const supabase = createServiceClient();
    const calculated_at = new Date().toISOString();

    // Calculate date ranges
    const now = new Date();
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(now.getMonth() - 12);

    const twentyFourMonthsAgo = new Date(now);
    twentyFourMonthsAgo.setMonth(now.getMonth() - 24);

    // Query similar opportunities (same category, last 12 months)
    const { data: similarCalls, error: similarError } = await supabase
      .from("opportunities")
      .select("id, title, deadline, value, created_at")
      .eq("category", opportunity.category)
      .gte("created_at", twelveMonthsAgo.toISOString())
      .eq("published", true)
      .order("created_at", { ascending: false });

    if (similarError) {
      console.error(
        `[HistoricalContext] Error querying similar calls: ${similarError.message}`
      );
    }

    const similar_calls_count = similarCalls?.length ?? 0;

    // Get last similar call details
    let last_similar_call: HistoricalContext["last_similar_call"] = undefined;
    if (similarCalls && similarCalls.length > 0) {
      const last = similarCalls[0];
      if (last.deadline && last.value) {
        last_similar_call = {
          title: last.title,
          deadline: last.deadline,
          value: last.value,
        };
      }
    }

    // Query issuer opportunities (last 24 months)
    const { data: issuerCalls, error: issuerError } = await supabase
      .from("opportunities")
      .select("id, title, created_at")
      .eq("issuer", opportunity.issuer)
      .gte("created_at", twelveMonthsAgo.toISOString())
      .eq("published", true);

    if (issuerError) {
      console.error(
        `[HistoricalContext] Error querying issuer calls: ${issuerError.message}`
      );
    }

    const issuer_calls_count = issuerCalls?.length ?? 0;

    // Calculate category trend (compare last 6 months vs previous 6 months)
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(now.getMonth() - 6);

    const { data: recentCalls } = await supabase
      .from("opportunities")
      .select("id")
      .eq("category", opportunity.category)
      .gte("created_at", sixMonthsAgo.toISOString())
      .eq("published", true);

    const { data: previousCalls } = await supabase
      .from("opportunities")
      .select("id")
      .eq("category", opportunity.category)
      .gte("created_at", twelveMonthsAgo.toISOString())
      .lt("created_at", sixMonthsAgo.toISOString())
      .eq("published", true);

    const recentCount = recentCalls?.length ?? 0;
    const previousCount = previousCalls?.length ?? 0;

    let category_trend: "increasing" | "stable" | "decreasing" = "stable";

    if (recentCount > previousCount * 1.2) {
      category_trend = "increasing";
    } else if (recentCount < previousCount * 0.8) {
      category_trend = "decreasing";
    }

    // Detect typical frequency pattern for issuer
    const typical_frequency = await this.detectFrequencyPattern(
      opportunity.issuer,
      opportunity.category
    );

    return {
      similar_calls_count,
      issuer_calls_count,
      category_trend,
      typical_frequency,
      last_similar_call,
      calculated_at,
    };
  }

  /**
   * Detects frequency pattern for issuer calls
   * @param issuer - Issuer name
   * @param category - Category to analyze
   * @returns Frequency description or undefined
   */
  private async detectFrequencyPattern(
    issuer: string,
    category: string | null
  ): Promise<string | undefined> {
    const supabase = createServiceClient();

    // Query last 24 months of calls from this issuer in this category
    const twentyFourMonthsAgo = new Date();
    twentyFourMonthsAgo.setMonth(twentyFourMonthsAgo.getMonth() - 24);

    const { data: calls } = await supabase
      .from("opportunities")
      .select("created_at, deadline")
      .eq("issuer", issuer)
      .eq("category", category)
      .gte("created_at", twentyFourMonthsAgo.toISOString())
      .eq("published", true)
      .order("created_at", { ascending: true });

    if (!calls || calls.length < 2) {
      return undefined;
    }

    // Analyze intervals between calls
    const intervals: number[] = [];
    for (let i = 1; i < calls.length; i++) {
      const prev = new Date(calls[i - 1].created_at);
      const curr = new Date(calls[i].created_at);
      const diffMonths =
        (curr.getFullYear() - prev.getFullYear()) * 12 +
        (curr.getMonth() - prev.getMonth());
      intervals.push(diffMonths);
    }

    if (intervals.length === 0) {
      return undefined;
    }

    // Calculate average interval
    const avgInterval =
      intervals.reduce((sum, val) => sum + val, 0) / intervals.length;

    // Detect pattern
    if (avgInterval >= 11 && avgInterval <= 13) {
      // Yearly pattern
      const months = calls.map((c) => new Date(c.created_at).getMonth());
      const mostCommonMonth = this.getMostCommonValue(months);
      const monthName = this.getMonthName(mostCommonMonth);
      return `Ovaj poziv se objavljuje svake godine u ${monthName}`;
    } else if (avgInterval >= 5 && avgInterval <= 7) {
      // Semi-annual pattern
      return "Ovaj poziv se objavljuje dva puta godišnje";
    } else if (avgInterval >= 2 && avgInterval <= 4) {
      // Quarterly pattern
      return "Ovaj poziv se objavljuje kvartalno (3-4 puta godišnje)";
    } else if (calls.length >= 3) {
      // Generic frequency
      const callsPerYear = 12 / avgInterval;
      if (callsPerYear >= 1) {
        return `Ovaj poziv se objavljuje ${Math.round(callsPerYear)} puta godišnje`;
      }
    }

    return undefined;
  }

  /**
   * Gets most common value in array
   */
  private getMostCommonValue(arr: number[]): number {
    const counts = new Map<number, number>();
    for (const val of arr) {
      counts.set(val, (counts.get(val) ?? 0) + 1);
    }

    let maxCount = 0;
    let mostCommon = arr[0];
    for (const [val, count] of counts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = val;
      }
    }

    return mostCommon;
  }

  /**
   * Gets month name in Bosnian
   */
  private getMonthName(month: number): string {
    const months = [
      "januaru",
      "februaru",
      "martu",
      "aprilu",
      "maju",
      "junu",
      "julu",
      "augustu",
      "septembru",
      "oktobru",
      "novembru",
      "decembru",
    ];
    return months[month] ?? "nepoznatom mjesecu";
  }
}

/**
 * Singleton instance for reuse
 */
export const historicalContextCalculator = new HistoricalContextCalculator();
