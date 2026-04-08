import "server-only";
import { createClient } from "@supabase/supabase-js";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export interface RelatedOpportunity {
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
  similarity_reason: string;
  relevance_score: number;
}

export interface RelatedOpportunitiesResult {
  opportunities: RelatedOpportunity[];
  category_link?: string;
}

/**
 * RelatedOpportunitiesService finds and ranks similar opportunities
 */
export class RelatedOpportunitiesService {
  /**
   * Finds related opportunities based on category, location, and type
   * @param opportunityId - Current opportunity ID
   * @param category - Opportunity category
   * @param location - Opportunity location
   * @param issuer - Opportunity issuer
   * @returns Related opportunities with similarity reasons
   */
  async findRelatedOpportunities(
    opportunityId: string,
    category: string | null,
    location: string | null,
    issuer: string
  ): Promise<RelatedOpportunitiesResult> {
    const supabase = createServiceClient();

    // Query opportunities excluding current one
    const { data: opportunities, error } = await supabase
      .from("opportunities")
      .select(
        "id, slug, title, issuer, category, location, value, deadline, ai_difficulty, status"
      )
      .neq("id", opportunityId)
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(20); // Get more than needed for scoring

    if (error || !opportunities) {
      console.error("[RelatedOpportunities] Query error:", error);
      return { opportunities: [] };
    }

    // Score and rank opportunities
    const scoredOpportunities = opportunities
      .map((opp) => {
        const { score, reason } = this.calculateRelevanceScore(
          opp,
          category,
          location,
          issuer
        );

        return {
          ...opp,
          similarity_reason: reason,
          relevance_score: score,
        } as RelatedOpportunity;
      })
      .filter((opp) => opp.relevance_score > 0) // Only include relevant ones
      .sort((a, b) => {
        // Sort by relevance score first
        if (b.relevance_score !== a.relevance_score) {
          return b.relevance_score - a.relevance_score;
        }

        // Then prioritize active over expired
        if (a.status === "active" && b.status !== "active") return -1;
        if (b.status === "active" && a.status !== "active") return 1;

        // Then by deadline proximity (closer deadlines first)
        if (a.deadline && b.deadline) {
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        }
        if (a.deadline) return -1;
        if (b.deadline) return 1;

        return 0;
      });

    // Return 3-5 opportunities
    const count = Math.min(5, Math.max(3, scoredOpportunities.length));
    const related = scoredOpportunities.slice(0, count);

    // Generate category link
    const category_link = category
      ? `/prilike/kategorija/${category}`
      : "/prilike";

    return {
      opportunities: related,
      category_link,
    };
  }

  /**
   * Calculates relevance score and generates similarity reason
   * @param opportunity - Opportunity to score
   * @param targetCategory - Target category
   * @param targetLocation - Target location
   * @param targetIssuer - Target issuer
   * @returns Score and reason
   */
  private calculateRelevanceScore(
    opportunity: {
      category: string | null;
      location: string | null;
      issuer: string;
      status: string;
    },
    targetCategory: string | null,
    targetLocation: string | null,
    targetIssuer: string
  ): { score: number; reason: string } {
    let score = 0;
    const reasons: string[] = [];

    // Category match (highest weight)
    if (opportunity.category && targetCategory && opportunity.category === targetCategory) {
      score += 50;
      reasons.push("ista kategorija");
    }

    // Location match
    if (opportunity.location && targetLocation) {
      if (opportunity.location === targetLocation) {
        score += 30;
        reasons.push("ista lokacija");
      } else if (
        this.isSameRegion(opportunity.location, targetLocation)
      ) {
        score += 15;
        reasons.push("isti region");
      }
    }

    // Issuer match
    if (opportunity.issuer === targetIssuer) {
      score += 20;
      reasons.push("ista institucija");
    }

    // Bonus for active opportunities
    if (opportunity.status === "active") {
      score += 10;
    }

    // Generate reason text
    let reason = "Slična prilika";
    if (reasons.length > 0) {
      reason = reasons.join(", ");
      // Capitalize first letter
      reason = reason.charAt(0).toUpperCase() + reason.slice(1);
    }

    return { score, reason };
  }

  /**
   * Checks if two locations are in the same region
   */
  private isSameRegion(location1: string, location2: string): boolean {
    const regions: Record<string, string[]> = {
      fbih: [
        "Federacija BiH",
        "FBiH",
        "Kanton Sarajevo",
        "Tuzlanski kanton",
        "Zeničko-dobojski kanton",
        "Hercegovačko-neretvanski kanton",
        "Bosansko-podrinjski kanton",
        "Srednjobosanski kanton",
        "Unsko-sanski kanton",
        "Posavski kanton",
        "Zapadnohercegovački kanton",
        "Kanton 10",
      ],
      rs: ["Republika Srpska", "RS", "Banja Luka", "Bijeljina", "Doboj"],
    };

    for (const [, locations] of Object.entries(regions)) {
      if (locations.includes(location1) && locations.includes(location2)) {
        return true;
      }
    }

    return false;
  }
}

/**
 * Singleton instance for reuse
 */
export const relatedOpportunitiesService = new RelatedOpportunitiesService();
