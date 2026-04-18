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
import { filterLegalUpdates } from "./scrapers/legal-quality-filter";
import { scoreOpportunity, generateSlug, PUBLISH_THRESHOLD } from "./opportunity-scorer";
import { generateOpportunityContent, generateLegalSummary, aiReviewOpportunity } from "./ai-content-generator";
import { categorizeOpportunity } from "@/lib/category-classifier";
import type { ScrapedOpportunity } from "./scrapers/types";
import { embedNewTenders, cleanupOrphanedRelevance } from "@/lib/tender-relevance";

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
  ai_content_regen: number;
  expired_marked: number;
  tenders_embedded: number;
  relevance_cleaned: number;
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
        seo_title: aiContent?.seo_title ?? item.title.slice(0, 60),
        seo_description: aiContent?.seo_description ?? null,
        ai_summary: aiContent?.ai_summary ?? null,
        ai_who_should_apply: aiContent?.ai_who_should_apply ?? null,
        ai_difficulty: aiContent?.ai_difficulty ?? null,
        ai_risks: aiContent?.ai_risks ?? null,
        ai_competition: aiContent?.ai_competition ?? null,
        ai_generated_at: aiContent ? new Date().toISOString() : null,
      });

      if (!insertError) {
        opPublished++;
        console.log(`[PostSync] Published NEW: ${item.title.slice(0, 50)}...`);
        // Try to save ai_content separately (requires DB migration; regen backfills if this fails)
        if (aiContent?.ai_content) {
          await supabase
            .from("opportunities")
            .update({ ai_content: aiContent.ai_content })
            .eq("id", id)
            .then(({ error }) => {
              if (error) console.warn(`[PostSync] ai_content update skipped for ${id}: ${error.message}`);
            });
        }
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

      const { filtered, rejected } = filterLegalUpdates(result.items);

      if (rejected.length > 0) {
        console.warn(
          `[PostSync] Odbačeno ${rejected.length} pravnih objava sa izvora ${result.source}`
        );
      }

      for (const item of filtered) {
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
  let expiredCount = 0;
  {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data: expiredRows } = await supabase
      .from("opportunities")
      .update({ status: "expired", published: false })
      .lt("deadline", today.toISOString())
      .eq("status", "active")
      .select("id");
    expiredCount = expiredRows?.length ?? 0;
    if (expiredCount > 0) console.log(`[PostSync] Marked ${expiredCount} opportunities as expired`);
  }

  // ── 8. Auto-regen missing ai_content (batch loop, max 120s budget) ───────────
  let regenCount = 0;
  {
    const regenBudgetMs = 120_000;
    const regenStart = Date.now();
    const batchSize = 10;

    while (Date.now() - regenStart < regenBudgetMs) {
      // Check if ai_content column exists by trying a small query
      const { data: batch, error: batchErr } = await supabase
        .from("opportunities")
        .select("id, title, issuer, description, requirements, value, deadline, type, location, eligibility_signals")
        .eq("published", true)
        .is("ai_content", null)
        .order("created_at", { ascending: false })
        .limit(batchSize);

      // If ai_content column doesn't exist yet, bail silently
      if (batchErr?.message?.includes("ai_content")) break;
      if (!batch?.length) break;

      for (const row of batch) {
        if (Date.now() - regenStart >= regenBudgetMs) break;
        try {
          const aiContent = await generateOpportunityContent(
            row.title,
            row.issuer,
            row.description,
            row.requirements,
            row.value,
            row.deadline,
            (row.type ?? "poticaj") as "tender" | "poticaj",
            row.location,
            row.eligibility_signals,
          );
          if (!aiContent) continue;
          const { error: updErr } = await supabase
            .from("opportunities")
            .update({
              seo_title: aiContent.seo_title,
              seo_description: aiContent.seo_description,
              ai_summary: aiContent.ai_summary,
              ai_who_should_apply: aiContent.ai_who_should_apply,
              ai_difficulty: aiContent.ai_difficulty,
              ai_risks: aiContent.ai_risks,
              ai_competition: aiContent.ai_competition,
              ai_content: aiContent.ai_content,
              ai_generated_at: new Date().toISOString(),
            })
            .eq("id", row.id);
          if (!updErr) regenCount++;
          else if (updErr.message?.includes("ai_content")) break;
        } catch (err) {
          errors.push(`regen ${row.id}: ${String(err)}`);
        }
      }
    }

    if (regenCount > 0) console.log(`[PostSync] Regenerated ai_content for ${regenCount} posts`);
  }

  // ── 9. Embed any tenders missing `embedding` (used by the new recommendation pipeline) ──
  // Runs on every layer after new tenders have been written. LLM reranking is NOT
  // triggered here — scoring happens lazily via getRecommendedTenders() per user.
  let tendersEmbedded = 0;
  try {
    const embedResult = await embedNewTenders(supabase, { batchSize: 20, maxBatches: 25 });
    tendersEmbedded = embedResult.updated;
    for (const e of embedResult.errors) errors.push(`embed: ${e}`);
    if (tendersEmbedded > 0) {
      console.log(`[PostSync] Embedded ${tendersEmbedded} tenders into pgvector`);
    }
  } catch (err) {
    errors.push(`embedNewTenders: ${String(err)}`);
  }

  // ── 10. Maintenance: prune stale tender_relevance rows (layer3 only — monthly) ──────
  let relevanceCleaned = 0;
  if (layer === "layer3") {
    try {
      const cleanup = await cleanupOrphanedRelevance(supabase);
      relevanceCleaned = cleanup.deleted;
      if (relevanceCleaned > 0) {
        console.log(`[PostSync] Cleaned ${relevanceCleaned} stale tender_relevance rows`);
      }
    } catch (err) {
      errors.push(`cleanupOrphanedRelevance: ${String(err)}`);
    }
  }

  return {
    opportunities_processed: opProcessed,
    opportunities_published: opPublished,
    opportunities_filtered: opFiltered,
    legal_updates_processed: legalProcessed,
    ai_content_regen: regenCount,
    expired_marked: expiredCount,
    tenders_embedded: tendersEmbedded,
    relevance_cleaned: relevanceCleaned,
    errors,
    duration_ms: Date.now() - start,
    execution_layer: layer,
  };
}
