import "server-only";

export interface SEOOptimizedContent {
  seo_title: string;
  seo_description: string;
  first_paragraph: string;
  keywords: string[];
}

export interface SEOValidationResult {
  valid: boolean;
  missing: string[];
}

/**
 * SEOOptimizer generates and validates SEO-optimized content
 * for opportunity pages to rank on Google.ba
 */
export class SEOOptimizer {
  private readonly MAX_TITLE_LENGTH = 65;
  private readonly MIN_DESCRIPTION_LENGTH = 140;
  private readonly MAX_DESCRIPTION_LENGTH = 155;

  private readonly ACTION_WORDS = [
    "Prijavite se",
    "Saznajte više",
    "Iskoristite",
    "Aplicirajte",
    "Prijavite",
  ];

  /**
   * Generates SEO-optimized title in search query format
   * @param title - Original opportunity title
   * @param type - Opportunity type (poticaj/tender)
   * @param location - Location
   * @param target - Target audience
   * @returns SEO-optimized title (max 65 chars)
   */
  generateSEOTitle(
    title: string,
    type: string,
    location: string,
    target: string
  ): string {
    // Determine type label
    const typeLabel = type === "tender" ? "Tender" : "Poticaji";

    // Build SEO title in format: "[Vrsta] za [ko] u [lokacija] (2026)"
    let seoTitle = `${typeLabel} za ${target} u ${location} (2026)`;

    // Truncate if too long
    if (seoTitle.length > this.MAX_TITLE_LENGTH) {
      // Try shorter location
      const shortLocation = this.shortenLocation(location);
      seoTitle = `${typeLabel} za ${target} u ${shortLocation} (2026)`;

      // If still too long, truncate target
      if (seoTitle.length > this.MAX_TITLE_LENGTH) {
        const shortTarget = this.shortenTarget(target);
        seoTitle = `${typeLabel} za ${shortTarget} u ${shortLocation} (2026)`;
      }

      // Final truncation if needed
      if (seoTitle.length > this.MAX_TITLE_LENGTH) {
        seoTitle = seoTitle.slice(0, this.MAX_TITLE_LENGTH - 3) + "...";
      }
    }

    return seoTitle;
  }

  /**
   * Generates action-oriented meta description
   * @param opportunity - Opportunity data
   * @returns SEO description (140-155 chars)
   */
  generateSEODescription(opportunity: {
    type: string;
    location: string;
    target: string;
    value?: number | null;
    deadline?: string | null;
  }): string {
    const typeLabel =
      opportunity.type === "tender" ? "tender" : "poticaj";
    const actionWord =
      this.ACTION_WORDS[Math.floor(Math.random() * this.ACTION_WORDS.length)];

    // Build description with key information
    let description = `${actionWord} za ${typeLabel} u ${opportunity.location}`;

    // Add target audience
    if (opportunity.target) {
      description += ` za ${opportunity.target}`;
    }

    // Add value if available
    if (opportunity.value) {
      const valueStr = `${opportunity.value.toLocaleString("bs-BA")} KM`;
      description += `. Vrijednost: ${valueStr}`;
    }

    // Add deadline if available and close
    if (opportunity.deadline) {
      const deadline = new Date(opportunity.deadline);
      const now = new Date();
      const daysUntil = Math.ceil(
        (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntil > 0 && daysUntil <= 30) {
        description += `. Rok: ${daysUntil} dana`;
      }
    }

    // Add year and keywords
    description += ". 2026";

    // Ensure length is within bounds
    if (description.length < this.MIN_DESCRIPTION_LENGTH) {
      description += ". Detalji i uslovi na MojaPonuda.ba";
    }

    if (description.length > this.MAX_DESCRIPTION_LENGTH) {
      description = description.slice(0, this.MAX_DESCRIPTION_LENGTH - 3) + "...";
    }

    return description;
  }

  /**
   * Validates first paragraph contains required SEO elements
   * @param paragraph - First paragraph of ai_content
   * @returns Validation result with missing elements
   */
  validateFirstParagraph(paragraph: string): SEOValidationResult {
    const missing: string[] = [];
    const paragraphLower = paragraph.toLowerCase();

    // Check for tip finansiranja
    const financingTypes = [
      "poticaj",
      "grant",
      "subvencija",
      "finansiranje",
      "sredstva",
    ];
    if (!financingTypes.some((type) => paragraphLower.includes(type))) {
      missing.push("tip finansiranja (poticaj/grant/subvencija)");
    }

    // Check for lokacija
    const locations = [
      "bih",
      "bosna",
      "hercegovina",
      "fbih",
      "rs",
      "kanton",
      "sarajevo",
      "tuzla",
      "mostar",
      "banja luka",
      "zenica",
    ];
    if (!locations.some((loc) => paragraphLower.includes(loc))) {
      missing.push("lokacija");
    }

    // Check for ciljna skupina
    const targets = [
      "firme",
      "firma",
      "preduzetnici",
      "preduzetnik",
      "msp",
      "organizacije",
      "organizacija",
      "privreda",
      "privrednici",
    ];
    if (!targets.some((target) => paragraphLower.includes(target))) {
      missing.push("ciljna skupina (firme/preduzetnici)");
    }

    // Check for godina
    if (!paragraphLower.includes("2026")) {
      missing.push("godina (2026)");
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Extracts natural keywords from opportunity data
   * @param opportunity - Opportunity data
   * @returns Array of keywords
   */
  extractKeywords(opportunity: {
    type: string;
    category: string | null;
    location: string;
    issuer: string;
  }): string[] {
    const keywords: string[] = [];

    // Base keywords
    keywords.push("poticaji", "grantovi", "BiH", "2026");

    // Type-specific
    if (opportunity.type === "tender") {
      keywords.push("javne nabavke", "tenderi");
    } else {
      keywords.push("finansiranje", "subvencije");
    }

    // Location
    keywords.push(opportunity.location);

    // Category
    if (opportunity.category) {
      keywords.push(opportunity.category.toLowerCase());
    }

    // Issuer (extract key terms)
    const issuerWords = opportunity.issuer
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 4);
    keywords.push(...issuerWords.slice(0, 2));

    return keywords;
  }

  /**
   * Shortens location for title optimization
   */
  private shortenLocation(location: string): string {
    const shortForms: Record<string, string> = {
      "Bosna i Hercegovina": "BiH",
      "Federacija BiH": "FBiH",
      "Republika Srpska": "RS",
      "Tuzlanski kanton": "TK",
      "Kanton Sarajevo": "KS",
      "Hercegovačko-neretvanski kanton": "HNK",
      "Zeničko-dobojski kanton": "ZDK",
    };

    return shortForms[location] ?? location;
  }

  /**
   * Shortens target audience for title optimization
   */
  private shortenTarget(target: string): string {
    const shortForms: Record<string, string> = {
      "mikro firme": "mikro",
      "male firme": "MSP",
      "srednje firme": "MSP",
      "preduzetnici": "preduzetnici",
      "izvoznici": "izvoznici",
      "proizvođači": "proizvođači",
    };

    // Check for exact match
    for (const [long, short] of Object.entries(shortForms)) {
      if (target.toLowerCase().includes(long)) {
        return short;
      }
    }

    // Truncate if too long
    if (target.length > 15) {
      return target.slice(0, 12) + "...";
    }

    return target;
  }

  /**
   * Validates SEO content meets all requirements
   * @param content - SEO content to validate
   * @returns Validation result
   */
  validateSEOContent(content: SEOOptimizedContent): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate title length
    if (content.seo_title.length > this.MAX_TITLE_LENGTH) {
      errors.push(
        `SEO title too long: ${content.seo_title.length} > ${this.MAX_TITLE_LENGTH}`
      );
    }

    // Validate description length
    if (
      content.seo_description.length < this.MIN_DESCRIPTION_LENGTH ||
      content.seo_description.length > this.MAX_DESCRIPTION_LENGTH
    ) {
      errors.push(
        `SEO description length invalid: ${content.seo_description.length} (should be ${this.MIN_DESCRIPTION_LENGTH}-${this.MAX_DESCRIPTION_LENGTH})`
      );
    }

    // Validate description starts with action word
    const startsWithAction = this.ACTION_WORDS.some((word) =>
      content.seo_description.startsWith(word)
    );
    if (!startsWithAction) {
      errors.push(
        `SEO description should start with action word: ${this.ACTION_WORDS.join(", ")}`
      );
    }

    // Validate first paragraph
    const paragraphValidation = this.validateFirstParagraph(
      content.first_paragraph
    );
    if (!paragraphValidation.valid) {
      errors.push(
        `First paragraph missing: ${paragraphValidation.missing.join(", ")}`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Singleton instance for reuse
 */
export const seoOptimizer = new SEOOptimizer();
