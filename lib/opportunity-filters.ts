import "server-only";
import { createClient } from "@supabase/supabase-js";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export interface FilterOptions {
  urgency?: "deadline_soon"; // ≤ 14 days
  value?: "high_value"; // Top 25% by value
  difficulty?: "lako" | "srednje" | "tesko";
  category?: string;
  location?: string;
}

export interface FilterResult {
  opportunities: Array<{
    id: string;
    slug: string;
    title: string;
    issuer: string;
    category: string | null;
    location: string | null;
    value: number | null;
    deadline: string | null;
    ai_difficulty: "lako" | "srednje" | "tesko" | null;
    status: string;
    seo_title: string | null;
    seo_description: string | null;
  }>;
  count: number;
  applied_filters: FilterOptions;
}

/**
 * AdvancedFilter applies multiple filters to opportunity list
 */
export class AdvancedFilter {
  private cache: Map<string, { data: FilterResult; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Applies multiple filters to opportunity list
   * @param filters - Filter options
   * @returns Filtered opportunities with count
   */
  async applyFilters(filters: FilterOptions): Promise<FilterResult> {
    // Check cache
    const cacheKey = JSON.stringify(filters);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    const supabase = createServiceClient();

    // Build query
    let query = supabase
      .from("opportunities")
      .select(
        "id, slug, title, issuer, category, location, value, deadline, ai_difficulty, status, seo_title, seo_description"
      )
      .eq("published", true)
      .eq("status", "active");

    // Apply urgency filter (deadline ≤ 14 days)
    if (filters.urgency === "deadline_soon") {
      const fourteenDaysFromNow = new Date();
      fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14);
      query = query
        .not("deadline", "is", null)
        .lte("deadline", fourteenDaysFromNow.toISOString());
    }

    // Apply difficulty filter
    if (filters.difficulty) {
      query = query.eq("ai_difficulty", filters.difficulty);
    }

    // Apply category filter
    if (filters.category) {
      query = query.eq("category", filters.category);
    }

    // Apply location filter
    if (filters.location) {
      query = query.eq("location", filters.location);
    }

    // Execute query
    const { data: opportunities, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      console.error("[AdvancedFilter] Query error:", error);
      return {
        opportunities: [],
        count: 0,
        applied_filters: filters,
      };
    }

    let filteredOpportunities = opportunities ?? [];

    // Apply high value filter (top 25% percentile)
    if (filters.value === "high_value") {
      // Get all values for percentile calculation
      const values = filteredOpportunities
        .map((opp) => opp.value)
        .filter((v): v is number => v !== null)
        .sort((a, b) => a - b);

      if (values.length > 0) {
        const percentile75Index = Math.floor(values.length * 0.75);
        const threshold = values[percentile75Index];

        filteredOpportunities = filteredOpportunities.filter(
          (opp) => opp.value !== null && opp.value >= threshold
        );
      }
    }

    const result: FilterResult = {
      opportunities: filteredOpportunities,
      count: filteredOpportunities.length,
      applied_filters: filters,
    };

    // Cache result
    this.cache.set(cacheKey, { data: result, timestamp: Date.now() });

    return result;
  }

  /**
   * Gets filter counts before applying (for UI display)
   * @param filters - Filter options
   * @returns Count for each filter option
   */
  async getFilterCounts(
    filters: FilterOptions
  ): Promise<Record<string, number>> {
    const supabase = createServiceClient();

    const counts: Record<string, number> = {};

    // Base query
    let baseQuery = supabase
      .from("opportunities")
      .select("id, value, deadline, ai_difficulty", { count: "exact", head: false })
      .eq("published", true)
      .eq("status", "active");

    // Apply existing filters (except the one we're counting)
    if (filters.category) {
      baseQuery = baseQuery.eq("category", filters.category);
    }
    if (filters.location) {
      baseQuery = baseQuery.eq("location", filters.location);
    }

    const { data: baseOpportunities } = await baseQuery;

    if (!baseOpportunities) {
      return counts;
    }

    // Count urgency filter
    if (!filters.urgency) {
      const fourteenDaysFromNow = new Date();
      fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14);
      counts.deadline_soon = baseOpportunities.filter(
        (opp) =>
          opp.deadline &&
          new Date(opp.deadline) <= fourteenDaysFromNow
      ).length;
    }

    // Count high value filter
    if (!filters.value) {
      const values = baseOpportunities
        .map((opp) => opp.value)
        .filter((v): v is number => v !== null)
        .sort((a, b) => a - b);

      if (values.length > 0) {
        const percentile75Index = Math.floor(values.length * 0.75);
        const threshold = values[percentile75Index];
        counts.high_value = baseOpportunities.filter(
          (opp) => opp.value !== null && opp.value >= threshold
        ).length;
      }
    }

    // Count difficulty filters
    if (!filters.difficulty) {
      counts.lako = baseOpportunities.filter(
        (opp) => opp.ai_difficulty === "lako"
      ).length;
      counts.srednje = baseOpportunities.filter(
        (opp) => opp.ai_difficulty === "srednje"
      ).length;
      counts.tesko = baseOpportunities.filter(
        (opp) => opp.ai_difficulty === "tesko"
      ).length;
    }

    return counts;
  }

  /**
   * Clears the filter cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * Singleton instance for reuse
 */
export const advancedFilter = new AdvancedFilter();
