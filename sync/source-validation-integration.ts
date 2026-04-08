import "server-only";
import { createClient } from "@supabase/supabase-js";
import { sourceValidator, type SourceValidationResult } from "./source-validator";
import type { ScrapedOpportunity } from "./scrapers/types";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/**
 * Maps source URLs to their expected domains for validation
 */
const SOURCE_DOMAIN_MAP: Record<string, string> = {
  "fmrpo.gov.ba": "fmrpo.gov.ba",
  "fmrpo": "fmrpo.gov.ba",
  "fbih-ministarstvo": "fmrpo.gov.ba",
  "razvojne-agencije": "razvojne-agencije", // Multiple domains, will need specific mapping
  "federal": "gov.ba", // Generic federal domain
  "cantonal": "gov.ba", // Generic cantonal domain
  "municipal": "gov.ba", // Generic municipal domain
};

/**
 * Extracts expected domain from source URL or issuer
 */
function getExpectedDomain(opportunity: ScrapedOpportunity): string {
  try {
    const url = new URL(opportunity.source_url);
    const hostname = url.hostname;

    // Return the base domain (e.g., fmrpo.gov.ba from www.fmrpo.gov.ba)
    const parts = hostname.split(".");
    if (parts.length >= 2) {
      return parts.slice(-2).join(".");
    }

    return hostname;
  } catch {
    // If URL parsing fails, try to extract from issuer or use generic
    const issuerLower = opportunity.issuer.toLowerCase();

    for (const [key, domain] of Object.entries(SOURCE_DOMAIN_MAP)) {
      if (issuerLower.includes(key)) {
        return domain;
      }
    }

    return "gov.ba"; // Default fallback
  }
}

/**
 * Validates source URLs for opportunities and logs results
 * @param opportunities - Array of scraped opportunities to validate
 * @returns Array of opportunities with validation status
 */
export async function validateOpportunitySources(
  opportunities: ScrapedOpportunity[]
): Promise<Array<ScrapedOpportunity & { validation?: SourceValidationResult }>> {
  if (opportunities.length === 0) {
    return [];
  }

  console.log(`[SourceValidation] Validating ${opportunities.length} source URLs...`);

  const supabase = createServiceClient();
  const validatedOpportunities: Array<ScrapedOpportunity & { validation?: SourceValidationResult }> = [];

  // Validate in batches to avoid overwhelming the system
  const batchSize = 10;
  for (let i = 0; i < opportunities.length; i += batchSize) {
    const batch = opportunities.slice(i, i + batchSize);

    const validationItems = batch.map((opp) => ({
      url: opp.source_url,
      expectedDomain: getExpectedDomain(opp),
      opportunityId: opp.external_id,
    }));

    const results = await sourceValidator.batchValidate(validationItems);

    for (const opp of batch) {
      const validation = results.get(opp.external_id);
      validatedOpportunities.push({
        ...opp,
        validation,
      });

      // Log validation result if failed
      if (validation && !validation.valid) {
        console.log(
          `[SourceValidation] FAILED: ${opp.title.slice(0, 50)} - ${validation.error}`
        );
      }
    }
  }

  // Log validation failures to database (for opportunities that will be inserted)
  const failedValidations = validatedOpportunities.filter(
    (opp) => opp.validation && !opp.validation.valid
  );

  if (failedValidations.length > 0) {
    console.log(
      `[SourceValidation] ${failedValidations.length}/${opportunities.length} validations failed`
    );
  }

  return validatedOpportunities;
}

/**
 * Logs source validation result to database
 * @param opportunityId - UUID of the opportunity in database
 * @param sourceUrl - Source URL that was validated
 * @param expectedDomain - Expected domain for the source
 * @param result - Validation result
 */
export async function logSourceValidation(
  opportunityId: string,
  sourceUrl: string,
  expectedDomain: string,
  result: SourceValidationResult
): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase.from("source_validation_log").insert({
    opportunity_id: opportunityId,
    source_url: sourceUrl,
    expected_domain: expectedDomain,
    status_code: result.status_code,
    valid: result.valid,
    error: result.error,
    redirect_chain: result.redirect_chain,
    validated_at: result.validated_at,
  });

  if (error) {
    console.error(`[SourceValidation] Failed to log validation: ${error.message}`);
  }
}

/**
 * Updates opportunity with validation status
 * @param opportunityId - UUID of the opportunity in database
 * @param result - Validation result
 */
export async function updateOpportunityValidationStatus(
  opportunityId: string,
  result: SourceValidationResult
): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("opportunities")
    .update({
      source_validated: result.valid,
      source_validation_error: result.valid ? null : result.error,
      source_validated_at: result.validated_at,
    })
    .eq("id", opportunityId);

  if (error) {
    console.error(
      `[SourceValidation] Failed to update opportunity validation status: ${error.message}`
    );
  }
}
