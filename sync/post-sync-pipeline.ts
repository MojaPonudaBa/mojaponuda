import "server-only";
import { createClient } from "@supabase/supabase-js";
import { scrapeFmrpo } from "./scrapers/scraper-fbih-ministarstvo";
import { scrapeRazvojneAgencije } from "./scrapers/scraper-razvojne-agencije";
import { scrapeLegalUpdates } from "./scrapers/scraper-legal-updates";
import { scoreOpportunity, generateSlug, PUBLISH_THRESHOLD } from "./opportunity-scorer";
import { generateOpportunityContent, generateLegalSummary } from "./ai-content-generator";
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
  legal_updates_processed: number;
  errors: string[];
  duration_ms: number;
}

export async function runPostSyncPipeline(): Promise<PostSyncResult> {
  const start = Date.now();
  const errors: string[] = [];
  let opProcessed = 0;
  let opPublished = 0;
  let legalProcessed = 0;

  const supabase = createServiceClient();

  // ── 1. Scrape poticaje (parallel) ──────────────────────────────
  const [fmrpoResult, agencyResults, legalResults] = await Promise.allSettled([
    scrapeFmrpo(),
    scrapeRazvojneAgencije(),
    scrapeLegalUpdates(),
  ]);

  const allOpportunities: ScrapedOpportunity[] = [];

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

  // ── 2. Process opportunities ────────────────────────────────────
  for (const item of allOpportunities) {
    opProcessed++;
    try {
      const score = scoreOpportunity(item);
      if (score < PUBLISH_THRESHOLD) continue;

      // Check if already exists
      const { data: existing } = await supabase
        .from("opportunities")
        .select("id, quality_score")
        .eq("external_id", item.external_id)
        .maybeSingle();

      if (existing) {
        // Update if score improved
        if (score > (existing.quality_score ?? 0)) {
          await supabase
            .from("opportunities")
            .update({ quality_score: score, updated_at: new Date().toISOString() })
            .eq("id", existing.id);
        }
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
        "poticaj"
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
        ai_generated_at: aiContent ? new Date().toISOString() : null,
      });

      if (!insertError) opPublished++;
    } catch (err) {
      errors.push(`opportunity ${item.external_id}: ${String(err)}`);
    }
  }

  // ── 3. Process legal updates ────────────────────────────────────
  if (legalResults.status === "fulfilled") {
    for (const result of legalResults.value) {
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

  // ── 4. Log scraper run ──────────────────────────────────────────
  await supabase.from("scraper_log").insert({
    source: "post-sync-pipeline",
    items_found: allOpportunities.length,
    items_new: opPublished,
    items_skipped: opProcessed - opPublished,
    error: errors.length > 0 ? errors.slice(0, 3).join("; ") : null,
  });

  // ── 5. Expire old opportunities ─────────────────────────────────
  await supabase
    .from("opportunities")
    .update({ status: "expired" })
    .lt("deadline", new Date().toISOString().split("T")[0])
    .eq("status", "active");

  return {
    opportunities_processed: opProcessed,
    opportunities_published: opPublished,
    legal_updates_processed: legalProcessed,
    errors,
    duration_ms: Date.now() - start,
  };
}
