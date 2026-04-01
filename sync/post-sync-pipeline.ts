import "server-only";
import { createClient } from "@supabase/supabase-js";
import { scrapeFmrpo } from "./scrapers/scraper-fbih-ministarstvo";
import { scrapeRazvojneAgencije } from "./scrapers/scraper-razvojne-agencije";
import { scrapeFederalSources } from "./scrapers/scraper-federal-sources";
import { scrapeCantonalSources } from "./scrapers/scraper-cantonal-sources";
import { scrapeMunicipalSources } from "./scrapers/scraper-municipal-sources";
import { scrapeLegalUpdates } from "./scrapers/scraper-legal-updates";
import type { ExecutionLayer } from "./scrapers/scraper-orchestrator";
import { processOpportunitiesWithHashing } from "./scrapers/content-hasher";
import { filterOpportunities } from "./scrapers/quality-filter";
import { scoreOpportunity, generateSlug, PUBLISH_THRESHOLD } from "./opportunity-scorer";
import { generateOpportunityContent, generateLegalSummary, aiReviewOpportunity } from "./ai-content-generator";
import type { ScrapedOpportunity } from "./scrapers/types";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export interface PostSyncResult {
  opportunities_processed: number;
  opportunities_published: number;
  opportunities_filtered: number;
  legal_updates_processed: number;
  errors: string[];
  duration_ms: number;
  execution_layer?: ExecutionLayer;
}

/**
 * Run post-sync pipeline with layered execution strategy
 * @param layer - Execution layer: "layer1" (daily), "layer2" (weekly), "layer3" (monthly)
 */
export async function runPostSyncPipeline(layer: ExecutionLayer = "layer1"): Promise<PostSyncResult> {
  const start = Date.now();
  const errors: string[] = [];
  let opProcessed = 0;
  let opPublished = 0;
  let opFiltered = 0;
  let legalProcessed = 0;

  const supabase = createServiceClient();

  // ── 1. Scrape opportunities using layered execution strategy ──────────────────────────────
  const allOpportunities: ScrapedOpportunity[] = [];

  // Layer 1 (Daily): High-priority federal sources
  if (layer === "layer1") {
    const [fmrpoResult, agencyResults, federalResults] = await Promise.allSettled([
      scrapeFmrpo(),
      scrapeRazvojneAgencije(),
      scrapeFederalSources(),
    ]);

    if (fmrpoResult.status === "fulfilled") {
      if (fmrpoResult.value.error) errors.push(`fmrpo: ${fmrpoResult.value.error}`);
      allOpportunities.push(...fmrpoResult.value.items);
    }

    if (agencyResults.status === "fulfilled") {
      for (const r of agencyResults.value) {
        if (r.error) errors.push(`${r.source}: ${r.error}`);
        allOpportunities.push(...r.items);
      }
    }

    if (federalResults.status === "fulfilled") {
      for (const r of federalResults.value) {
        if (r.error) errors.push(`${r.source}: ${r.error}`);
        allOpportunities.push(...r.items);
      }
    }
  }

  // Layer 2 (Weekly): Cantonal sources and sector ministries
  if (layer === "layer2") {
    const [cantonalResults, federalResults] = await Promise.allSettled([
      scrapeCantonalSources(),
      scrapeFederalSources(),
    ]);

    if (cantonalResults.status === "fulfilled") {
      for (const r of cantonalResults.value) {
        if (r.error) errors.push(`${r.source}: ${r.error}`);
        allOpportunities.push(...r.items);
      }
    }

    if (federalResults.status === "fulfilled") {
      for (const r of federalResults.value) {
        if (r.error) errors.push(`${r.source}: ${r.error}`);
        allOpportunities.push(...r.items);
      }
    }
  }

  // Layer 3 (Monthly): Municipal sources
  if (layer === "layer3") {
    const [municipalResults] = await Promise.allSettled([
      scrapeMunicipalSources(),
    ]);

    if (municipalResults.status === "fulfilled") {
      for (const r of municipalResults.value) {
        if (r.error) errors.push(`${r.source}: ${r.error}`);
        allOpportunities.push(...r.items);
      }
    }
  }

  // ── 2. Apply quality filtering ────────────────────────────────
  const filterResult = filterOpportunities(allOpportunities);
  const qualityOpportunities = filterResult.filtered;
  opFiltered = filterResult.stats.failed;

  // Log filtering statistics
  if (opFiltered > 0) {
    console.log(`[PostSync] Filtered out ${opFiltered} low-quality items:`, filterResult.stats.reasons);
  }
  console.log(`[PostSync] Quality passed: ${filterResult.stats.passed}/${filterResult.stats.total}`);

  // ── 3. Fetch existing content hashes for change detection ────────────────────────────────
  const existingHashMap = new Map<string, string>();
  
  if (qualityOpportunities.length > 0) {
    const externalIds = qualityOpportunities.map(o => o.external_id);
    // Use only external_id to avoid content_hash column dependency if migration not applied
    const { data: existingOpps } = await supabase
      .from("opportunities")
      .select("external_id")
      .in("external_id", externalIds);

    // content_hash map stays empty - all items treated as NEW or UPDATED
    if (existingOpps) {
      // Items already in DB will be caught by the existing check below
      void existingOpps;
    }
  }

  // ── 4. Process opportunities with content hashing ────────────────────────────────
  const processedOpportunities = processOpportunitiesWithHashing(qualityOpportunities, existingHashMap);

  for (const item of processedOpportunities) {
    opProcessed++;
    try {
      // Skip duplicates (same content from different URLs)
      if (item.is_duplicate) {
        console.log(`[PostSync] Skipping duplicate: ${item.title.slice(0, 50)}...`);
        continue;
      }

      // Skip unchanged items (no content changes)
      if (item.change_status === "UNCHANGED") {
        console.log(`[PostSync] Skipping unchanged: ${item.title.slice(0, 50)}...`);
        continue;
      }

      const score = scoreOpportunity(item);
      if (score < PUBLISH_THRESHOLD) continue;

      // Check if already exists
      const { data: existing } = await supabase
        .from("opportunities")
        .select("id, quality_score, content_hash")
        .eq("external_id", item.external_id)
        .maybeSingle();

      if (existing) {
        // Update if content changed or score improved
        if (item.change_status === "UPDATED" || score > (existing.quality_score ?? 0)) {
          await supabase
            .from("opportunities")
            .update({ 
              quality_score: score, 
              content_hash: item.content_hash,
              updated_at: new Date().toISOString() 
            })
            .eq("id", existing.id);
          
          console.log(`[PostSync] Updated: ${item.title.slice(0, 50)}... (status: ${item.change_status})`);
        }
        continue;
      }

      // ── AI Review Gate: verify this is a real business opportunity ──
      const review = await aiReviewOpportunity(
        item.title,
        item.issuer,
        item.description,
        item.requirements,
      );

      if (!review.approved) {
        console.log(`[PostSync] AI REJECTED: ${item.title.slice(0, 50)} — ${review.reason}`);
        continue;
      }

      // Generate AI content
      const aiContent = await generateOpportunityContent(
        item.title,
        item.issuer,
        item.description,
        item.requirements,
        item.value,
        item.deadline,
        "poticaj",
        item.location,
        item.eligibility_signals,
      );

      const id = crypto.randomUUID();
      const slug = generateSlug(item.title, "poticaj", id);

      const { error: insertError } = await supabase.from("opportunities").insert({
        id,
        type: "poticaj",
        slug,
        title: item.title,
        issuer: item.issuer,
        category: item.category,
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
        seo_title: aiContent?.seo_title ?? item.title.slice(0, 60),
        seo_description: aiContent?.seo_description ?? null,
        ai_summary: aiContent?.ai_summary ?? null,
        ai_who_should_apply: aiContent?.ai_who_should_apply ?? null,
        ai_difficulty: aiContent?.ai_difficulty ?? null,
        ai_risks: aiContent?.ai_risks ?? null,
        ai_competition: aiContent?.ai_competition ?? null,
        ...(aiContent?.ai_content ? { ai_content: aiContent.ai_content } : {}),
        ai_generated_at: aiContent ? new Date().toISOString() : null,
      });

      if (!insertError) {
        opPublished++;
        console.log(`[PostSync] Published NEW: ${item.title.slice(0, 50)}...`);
      }
    } catch (err) {
      errors.push(`opportunity ${item.external_id}: ${String(err)}`);
    }
  }

  // ── 5. Process legal updates (all layers) ────────────────────────────────────
  const legalResults = await Promise.allSettled([scrapeLegalUpdates()]);

  if (legalResults[0].status === "fulfilled") {
    for (const result of legalResults[0].value) {
      if (result.error) errors.push(`legal ${result.source}: ${result.error}`);

      for (const item of result.items) {
        legalProcessed++;
        try {
          const { data: existing } = await supabase
            .from("legal_updates")
            .select("id")
            .eq("external_id", item.external_id)
            .maybeSingle();

          if (existing) continue;

          // Generate AI summary if missing
          const summary = item.summary ?? await generateLegalSummary(item.title, item.type, item.summary);

          await supabase.from("legal_updates").insert({
            type: item.type,
            title: item.title,
            summary,
            source: item.source,
            source_url: item.source_url,
            published_date: item.published_date,
            relevance_tags: item.relevance_tags,
            external_id: item.external_id,
          });
        } catch (err) {
          errors.push(`legal ${item.external_id}: ${String(err)}`);
        }
      }
    }
  }

  // ── 6. Log scraper run ──────────────────────────────────────────
  await supabase.from("scraper_log").insert({
    source: `post-sync-pipeline-${layer}`,
    items_found: allOpportunities.length,
    items_new: opPublished,
    items_skipped: opProcessed - opPublished,
    error: errors.length > 0 ? errors.slice(0, 3).join("; ") : null,
  });

  // ── 7. Expire old opportunities ─────────────────────────────────
  await supabase
    .from("opportunities")
    .update({ status: "expired" })
    .lt("deadline", new Date().toISOString().split("T")[0])
    .eq("status", "active");

  return {
    opportunities_processed: opProcessed,
    opportunities_published: opPublished,
    opportunities_filtered: opFiltered,
    legal_updates_processed: legalProcessed,
    errors,
    duration_ms: Date.now() - start,
    execution_layer: layer,
  };
}
