import "server-only";
import type { HistoricalContext } from "./historical-context-calculator";

export interface DecisionSupport {
  competition_level: "niska" | "srednja" | "visoka";
  estimated_applicants?: number;
  success_probability: "niska" | "srednja" | "visoka";
  typical_mistakes: string[];
  recommendation: string;
  reasoning: string;
  calculated_at: string;
}

export interface CompetitionAnalysis {
  estimated_applicants: number;
  competition_level: "niska" | "srednja" | "visoka";
  reasoning: string;
}

export interface SuccessAnalysis {
  success_probability: "niska" | "srednja" | "visoka";
  factors: string[];
}

interface OpportunityData {
  title: string;
  issuer: string;
  category: string | null;
  value: number | null;
  deadline: string | null;
  requirements: string | null;
  eligibility_signals: string[];
  ai_difficulty: "lako" | "srednje" | "tesko" | null;
}

/**
 * DecisionAnalyzer provides competition analysis, success probability,
 * and actionable recommendations for opportunities
 */
export class DecisionAnalyzer {
  /**
   * Analyzes competition level based on historical data
   * @param opportunity - Opportunity data
   * @param historicalContext - Historical context
   * @returns Competition analysis
   */
  analyzeCompetition(
    opportunity: OpportunityData,
    historicalContext: HistoricalContext
  ): CompetitionAnalysis {
    let estimated_applicants = 10; // Default baseline
    let competition_level: "niska" | "srednja" | "visoka" = "srednja";
    const reasons: string[] = [];

    // Factor 1: Similar calls count (more similar calls = more awareness = more competition)
    if (historicalContext.similar_calls_count >= 10) {
      estimated_applicants += 20;
      reasons.push("visoka učestalost sličnih poziva");
    } else if (historicalContext.similar_calls_count >= 5) {
      estimated_applicants += 10;
      reasons.push("umjerena učestalost sličnih poziva");
    } else {
      estimated_applicants += 5;
      reasons.push("rijetki pozivi ove vrste");
    }

    // Factor 2: Category trend (increasing trend = more competition)
    if (historicalContext.category_trend === "increasing") {
      estimated_applicants += 15;
      reasons.push("rastući trend u kategoriji");
    } else if (historicalContext.category_trend === "decreasing") {
      estimated_applicants -= 5;
      reasons.push("opadajući trend u kategoriji");
    }

    // Factor 3: Value (higher value = more competition)
    if (opportunity.value) {
      if (opportunity.value >= 100000) {
        estimated_applicants += 25;
        reasons.push("visoka vrijednost poticaja");
      } else if (opportunity.value >= 50000) {
        estimated_applicants += 15;
        reasons.push("srednja vrijednost poticaja");
      } else {
        estimated_applicants += 5;
        reasons.push("niža vrijednost poticaja");
      }
    }

    // Factor 4: Difficulty (easier = more applicants)
    if (opportunity.ai_difficulty === "lako") {
      estimated_applicants += 20;
      reasons.push("jednostavna prijava");
    } else if (opportunity.ai_difficulty === "tesko") {
      estimated_applicants -= 10;
      reasons.push("kompleksna prijava");
    }

    // Factor 5: Eligibility restrictions (more restrictions = less competition)
    const eligibilityCount = opportunity.eligibility_signals.length;
    if (eligibilityCount >= 3) {
      estimated_applicants -= 10;
      reasons.push("strogi uvjeti prihvatljivosti");
    } else if (eligibilityCount === 0) {
      estimated_applicants += 10;
      reasons.push("široka prihvatljivost");
    }

    // Ensure minimum
    estimated_applicants = Math.max(5, estimated_applicants);

    // Determine competition level
    if (estimated_applicants >= 40) {
      competition_level = "visoka";
    } else if (estimated_applicants >= 20) {
      competition_level = "srednja";
    } else {
      competition_level = "niska";
    }

    const reasoning = `Procjena bazirana na: ${reasons.join(", ")}.`;

    return {
      estimated_applicants,
      competition_level,
      reasoning,
    };
  }

  /**
   * Analyzes success probability based on eligibility and competition
   * @param opportunity - Opportunity data
   * @param competition - Competition analysis
   * @returns Success analysis
   */
  analyzeSuccessProbability(
    opportunity: OpportunityData,
    competition: CompetitionAnalysis
  ): SuccessAnalysis {
    const factors: string[] = [];
    let score = 50; // Start at 50%

    // Factor 1: Competition level (inverse relationship)
    if (competition.competition_level === "niska") {
      score += 20;
      factors.push("+ Niska konkurencija");
    } else if (competition.competition_level === "visoka") {
      score -= 20;
      factors.push("- Visoka konkurencija");
    }

    // Factor 2: Eligibility match (more signals = better targeting)
    const eligibilityCount = opportunity.eligibility_signals.length;
    if (eligibilityCount >= 3) {
      score += 15;
      factors.push("+ Jasni uvjeti prihvatljivosti");
    } else if (eligibilityCount === 0) {
      score -= 10;
      factors.push("- Nejasni uvjeti prihvatljivosti");
    }

    // Factor 3: Difficulty (easier = higher success rate)
    if (opportunity.ai_difficulty === "lako") {
      score += 15;
      factors.push("+ Jednostavna prijava");
    } else if (opportunity.ai_difficulty === "tesko") {
      score -= 15;
      factors.push("- Kompleksna prijava");
    }

    // Factor 4: Value/effort ratio
    if (opportunity.value) {
      if (opportunity.value >= 50000 && opportunity.ai_difficulty !== "tesko") {
        score += 10;
        factors.push("+ Dobar omjer vrijednosti i napora");
      } else if (opportunity.value < 10000 && opportunity.ai_difficulty === "tesko") {
        score -= 10;
        factors.push("- Loš omjer vrijednosti i napora");
      }
    }

    // Clamp score between 0 and 100
    score = Math.max(0, Math.min(100, score));

    // Determine probability level
    let success_probability: "niska" | "srednja" | "visoka";
    if (score >= 65) {
      success_probability = "visoka";
    } else if (score >= 40) {
      success_probability = "srednja";
    } else {
      success_probability = "niska";
    }

    return {
      success_probability,
      factors,
    };
  }

  /**
   * Generates list of typical mistakes based on requirements complexity
   * @param requirements - Opportunity requirements
   * @param difficulty - AI difficulty rating
   * @returns List of typical mistakes (max 3)
   */
  generateTypicalMistakes(
    requirements: string | null,
    difficulty: "lako" | "srednje" | "tesko" | null
  ): string[] {
    const mistakes: string[] = [];

    // Base mistakes for all levels
    if (difficulty === "lako") {
      mistakes.push("Nepotpuna dokumentacija prilikom prijave");
      mistakes.push("Propuštanje roka za prijavu");
      mistakes.push("Neispunjavanje osnovnih uvjeta prihvatljivosti");
    } else if (difficulty === "srednje") {
      mistakes.push("Nedovoljna elaboracija projektnog prijedloga");
      mistakes.push("Neprecizna finansijska projekcija");
      mistakes.push("Nedostajuća obavezna dokumentacija");
    } else if (difficulty === "tesko") {
      mistakes.push("Neusklađenost projektnih ciljeva sa prioritetima poziva");
      mistakes.push("Slaba metodologija implementacije projekta");
      mistakes.push("Nerealan budžet ili nedovoljna finansijska održivost");
    } else {
      // Default mistakes
      mistakes.push("Nepotpuna dokumentacija");
      mistakes.push("Propuštanje roka");
      mistakes.push("Neispunjavanje uvjeta");
    }

    // Analyze requirements for specific mistakes
    if (requirements) {
      const reqLower = requirements.toLowerCase();

      if (reqLower.includes("finansij") || reqLower.includes("budžet")) {
        mistakes.push("Greške u finansijskom planu i budžetu");
      }

      if (reqLower.includes("izvještaj") || reqLower.includes("dokaz")) {
        mistakes.push("Nedostajući dokazi o ispunjavanju uvjeta");
      }

      if (reqLower.includes("registr") || reqLower.includes("certifikat")) {
        mistakes.push("Neažurna registracija ili certifikati");
      }
    }

    // Return max 3 mistakes
    return mistakes.slice(0, 3);
  }

  /**
   * Generates complete decision support analysis
   * @param opportunity - Opportunity data
   * @param historicalContext - Historical context
   * @returns Complete decision support
   */
  generateDecisionSupport(
    opportunity: OpportunityData,
    historicalContext: HistoricalContext
  ): DecisionSupport {
    const competition = this.analyzeCompetition(opportunity, historicalContext);
    const success = this.analyzeSuccessProbability(opportunity, competition);
    const typical_mistakes = this.generateTypicalMistakes(
      opportunity.requirements,
      opportunity.ai_difficulty
    );

    // Generate recommendation
    let recommendation: string;
    if (
      success.success_probability === "visoka" &&
      competition.competition_level !== "visoka"
    ) {
      recommendation = "Preporučujemo prijavu - dobre šanse za uspjeh";
    } else if (
      success.success_probability === "niska" ||
      competition.competition_level === "visoka"
    ) {
      recommendation =
        "Pažljivo procijenite - visoka konkurencija ili kompleksni uvjeti";
    } else {
      recommendation = "Vrijedi razmotriti - umjerene šanse za uspjeh";
    }

    // Generate reasoning
    const reasoning = `${competition.reasoning} ${success.factors.join(". ")}.`;

    return {
      competition_level: competition.competition_level,
      estimated_applicants: competition.estimated_applicants,
      success_probability: success.success_probability,
      typical_mistakes,
      recommendation,
      reasoning,
      calculated_at: new Date().toISOString(),
    };
  }
}

/**
 * Singleton instance for reuse
 */
export const decisionAnalyzer = new DecisionAnalyzer();
