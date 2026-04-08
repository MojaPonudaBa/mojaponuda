import "server-only";
import { createClient } from "@supabase/supabase-js";
import { validateOpportunitySources, logSourceValidation, updateOpportunityValidationStatus } from "./source-validation-integration";
import { historicalContextCalculator } from "./historical-context-calculator";
import { generateEnhancedContentWithRetry } from "./enhanced-ai-generator";
import { decisionAnalyzer } from "./decision-analyzer";
import { aiReviewOpportunity } from "./ai-content-generator";
import { scoreOpportunity, generateSlug, PUBLISH_THRESHOLD } from "./opportunity-scorer";
import { categorizeOpportunity } from "@/lib/category-classifier";
import type { ScrapedOpportunity } from "./scrapers/types";
import type { PostSyncResult } from "./post-sync-pipeline";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/**
 * Enhanced post-sync pipeline with quality system integration
 * This extends the base pipeline with:
 * - Source validation
 * - Historical context calculation
 * - Enhanced AI content generation
 * - Decision support analysis
 * - Quality score calculation
 */
export async function processOpportunitiesWithQualitySystem(
  opportunities: ScrapedOpportunity[]
): Promise<{
  processed: number;
  published: number;
  rejected: number;
  errors: string[];
}> {
  const supabase = createServiceClient();
  const errors: string[] = [];
  let processed = 0;
  let published = 0;
  let rejected = 0;

  console.log(`[EnhancedPipeline] Processing ${opportunities.length} opportunities with quality system...`);

  // Step 1: Validate source URLs
  const validatedOpportunities = await validateOpportunitySources(opportunities);

  // Step 2: Process each opportunity
  for (const item of validatedOpportunities) {
    processed++;

    try {
      // Check if already exists
      const { data: existing } = await supabase
        .from("opportunities")
        .select("id, quality_score")
        .eq("external_id", item.external_id)
        .maybeSingle();

      if (existing) {
        // Update validation status if changed
        if (item.validation) {
          await updateOpportunityValidationStatus(existing.id, item.validation);
        }
        continue;
      }

      // Score opportunity
      const score = scoreOpportunity(item);
      if (score < PUBLISH_THRESHOLD) {
        rejected++;
        continue;
      }

      // AI Review Gate
      const review = await aiReviewOpportunity(
        item.title,
        item.issuer,
        item.description,
        item.requirements
      );

      if (!review.approved) {
        console.log(`[EnhancedPipeline] AI REJECTED: ${item.title.slice(0, 50)} — ${review.reason}`);
        rejected++;
        continue;
      }

      // Calculate historical context
      const historicalContext = await historicalContextCalculator.calculateContext({
        title: item.title,
        issuer: item.issuer,
        category: categorizeOpportunity(item.title, item.issuer, item.description, item.eligibility_signals),
        value: item.value,
        deadline: item.deadline,
      });

      // Generate enhanced AI content with historical context
      const aiContent = await generateEnhancedContentWithRetry(
        item.title,
        item.issuer,
        item.description,
        item.requirements,
        item.value,
        item.deadline,
        "poticaj",
        item.location,
        item.eligibility_signals,
        historicalContext
      );

      if (!aiContent) {
        console.warn(`[EnhancedPipeline] AI content generation failed for: ${item.title.slice(0, 50)}`);
        // Continue with basic content
      }

      // Generate decision support
      const decisionSupport = decisionAnalyzer.generateDecisionSupport(
        {
          title: item.title,
          issuer: item.issuer,
          category: aiContent?.category ?? categorizeOpportunity(item.title, item.issuer, item.description, item.eligibility_signals),
          value: item.value,
          deadline: item.deadline,
          requirements: item.requirements,
          eligibility_signals: item.eligibility_signals,
          ai_difficulty: aiContent?.ai_difficulty ?? null,
        },
        historicalContext
      );

      // Create opportunity record
      const id = crypto.randomUUID();
      const slug = generateSlug(item.title, "poticaj", id);

      const { error: insertError } = await supabase.from("opportunities").insert({
        id,
        type: "poticaj",
        slug,
        title: item.title,
        issuer: item.issuer,
        category: aiContent?.category ?? categorizeOpportunity(item.title, item.issuer, item.description, item.eligibility_signals),
        description: item.description,
        requirements: item.requirements,
        value: item.value,
        deadline: item.deadline,
        location: item.location,
        source_url: item.source_url,
        eligibility_signals: item.eligibility_signals,
        external_id: item.external_id,
        quality_score: score,
        published: score >= PUBLISH_THRESHOLD,
        status: "active",
        // SEO fields
        seo_title: aiContent?.seo_title ?? item.title.slice(0, 60),
        seo_description: aiContent?.seo_description ?? null,
        // AI fields
        ai_summary: aiContent?.ai_summary ?? null,
        ai_who_should_apply: aiContent?.ai_who_should_apply ?? null,
        ai_difficulty: aiContent?.ai_difficulty ?? null,
        ai_risks: aiContent?.ai_risks ?? null,
        ai_competition: aiContent?.ai_competition ?? null,
        ai_content: aiContent?.ai_content ?? null,
        ai_generated_at: aiContent ? new Date().toISOString() : null,
        // Source validation
        source_validated: item.validation?.valid ?? false,
        source_validation_error: item.validation?.valid ? null : item.validation?.error,
        source_validated_at: item.validation?.validated_at,
        // Historical context and decision support
        historical_context: historicalContext,
        decision_support: decisionSupport,
      });

      if (insertError) {
        errors.push(`Insert failed for ${item.external_id}: ${insertError.message}`);
        continue;
      }

      // Log source validation
      if (item.validation) {
        await logSourceValidation(
          id,
          item.source_url,
          item.validation.domain_match ? "matched" : "unmatched",
          item.validation
        );
      }

      published++;
      console.log(`[EnhancedPipeline] Published: ${item.title.slice(0, 50)}...`);
    } catch (err) {
      errors.push(`Processing error for ${item.external_id}: ${String(err)}`);
    }
  }

  console.log(`[EnhancedPipeline] Complete: ${published}/${processed} published, ${rejected} rejected`);

  return {
    processed,
    published,
    rejected,
    errors,
  };
}

/**
 * Regenerate missing content for existing opportunities
 * This is a maintenance function to backfill quality system data
 */
export async function regenerateQualitySystemData(
  batchSize: number = 10,
  maxDuration: number = 120000
): Promise<{ regenerated: number; errors: string[] }> {
  const supabase = createServiceClient();
  const errors: string[] = [];
  let regenerated = 0;
  const startTime = Date.now();

  console.log("[EnhancedPipeline] Starting quality system data regeneration...");

  while (Date.now() - startTime < maxDuration) {
    // Find opportunities missing quality system data
    const { data: batch } = await supabase
      .from("opportunities")
      .select("id, title, issuer, category, description, requirements, value, deadline, location, eligibility_signals, ai_difficulty")
      .eq("published", true)
      .is("historical_context", null)
      .order("created_at", { ascending: false })
      .limit(batchSize);

    if (!batch || batch.length === 0) {
      break;
    }

    for (const opp of batch) {
      if (Date.now() - startTime >= maxDuration) {
        break;
      }

      try {
        // Calculate historical context
        const historicalContext = await historicalContextCalculator.calculateContext({
          title: opp.title,
          issuer: opp.issuer,
          category: opp.category,
          value: opp.value,
          deadline: opp.deadline,
        });

        // Generate decision support
        const decisionSupport = decisionAnalyzer.generateDecisionSupport(
          {
            title: opp.title,
            issuer: opp.issuer,
            category: opp.category,
            value: opp.value,
            deadline: opp.deadline,
            requirements: opp.requirements,
            eligibility_signals: opp.eligibility_signals ?? [],
            ai_difficulty: opp.ai_difficulty,
          },
          historicalContext
        );

        // Update opportunity
        const { error: updateError } = await supabase
          .from("opportunities")
          .update({
            historical_context: historicalContext,
            decision_support: decisionSupport,
          })
          .eq("id", opp.id);

        if (!updateError) {
          regenerated++;
        } else {
          errors.push(`Update failed for ${opp.id}: ${updateError.message}`);
        }
      } catch (err) {
        errors.push(`Regeneration error for ${opp.id}: ${String(err)}`);
      }
    }
  }

  console.log(`[EnhancedPipeline] Regenerated quality data for ${regenerated} opportunities`);

  return { regenerated, errors };
}
