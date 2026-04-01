import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SCRAPER_SOURCES } from "@/sync/scrapers/scraper-registry";
import { filterOpportunities } from "@/sync/scrapers/quality-filter";
import { processOpportunitiesWithHashing } from "@/sync/scrapers/content-hasher";
import { scoreOpportunity, generateSlug, PUBLISH_THRESHOLD } from "@/sync/opportunity-scorer";
import { generateOpportunityContent, generateLegalSummary, aiReviewOpportunity } from "@/sync/ai-content-generator";
import { scrapeFmrpo } from "@/sync/scrapers/scraper-fbih-ministarstvo";
import { scrapeSingleAgency } from "@/sync/scrapers/scraper-razvojne-agencije";
import { scrapeSingleFederalSource } from "@/sync/scrapers/scraper-federal-sources";
import { scrapeSingleCantonalSource } from "@/sync/scrapers/scraper-cantonal-sources";
import { scrapeSingleMunicipalSource } from "@/sync/scrapers/scraper-municipal-sources";
import { scrapeSingleLegalSource } from "@/sync/scrapers/scraper-legal-updates";
import type { ScrapedOpportunity, ScraperResult } from "@/sync/scrapers/types";
import type { LegalScraperResult } from "@/sync/scrapers/scraper-legal-updates";

export const maxDuration = 300;

/** Scrape ONLY the single requested source (not the entire group) */
async function getOpportunityResults(sourceId: string): Promise<ScraperResult[]> {
  switch (sourceId) {
    case "fmrpo":
      return [await scrapeFmrpo()];
    case "serda":
    case "redah":
    case "nerda":
    case "zeda":
      return [await scrapeSingleAgency(sourceId)];
    case "fbih-vlada":
    case "undp-bih":
    case "mcp-bih":
    case "fzzz":
    case "fmpvs":
    case "fmoit":
    case "fmeri":
    case "fmks":
    case "fmrsp":
    case "fipa":
    case "mvteo":
    case "vlada-rs":
    case "rars":
    case "mper-rs":
    case "eu-fondovi":
      return [await scrapeSingleFederalSource(sourceId)];
    case "kanton-sarajevo":
    case "kanton-tuzla":
    case "kanton-zenica":
    case "kanton-hnk":
    case "kanton-usk":
    case "kanton-posavski":
    case "kanton-bpk":
    case "kanton-sbk":
    case "kanton-zhk":
    case "kanton-10":
    case "brcko":
      return [await scrapeSingleCantonalSource(sourceId)];
    case "grad-sarajevo":
    case "grad-tuzla":
    case "grad-zenica":
    case "grad-mostar":
    case "grad-banja-luka":
    case "grad-bijeljina":
    case "grad-doboj":
    case "grad-prijedor":
    case "grad-trebinje":
    case "grad-istocno-sarajevo":
    case "grad-bihac":
    case "opcina-cazin":
    case "grad-gorazde":
    case "opcina-travnik":
    case "grad-livno":
    case "opcina-tomislavgrad":
    case "opcina-visoko":
    case "opcina-kakanj":
    case "opcina-zavidovici":
    case "opcina-tesanj":
    case "opcina-gradacac":
    case "opcina-lukavac":
    case "opcina-jajce":
    case "opcina-konjic":
    case "opcina-bugojno":
    case "opcina-siroki-brijeg":
    case "opcina-capljina":
    case "opcina-ljubuski":
    case "opcina-stolac":
    case "opcina-ilidza":
    case "novi-grad-sarajevo":
    case "opcina-vogosca":
    case "opcina-ilijas":
      return [await scrapeSingleMunicipalSource(sourceId)];
    default:
      return [];
  }
}

/** Scrape ONLY the single requested legal source */
async function getLegalResults(sourceId: string): Promise<LegalScraperResult[]> {
  return [await scrapeSingleLegalSource(sourceId)];
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Morate biti prijavljeni." }, { status: 401 });
    }

    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: "Samo admin može pokrenuti scraper." }, { status: 403 });
    }

    const body = await request.json();
    const { sourceId } = body;

    if (!sourceId) {
      return NextResponse.json({ error: "sourceId je obavezan." }, { status: 400 });
    }

    const source = SCRAPER_SOURCES.find((s) => s.id === sourceId);
    if (!source) {
      return NextResponse.json({ error: "Nepoznat izvor." }, { status: 404 });
    }

    // Use admin (service role) client for DB operations — bypasses RLS
    const adminDb = createAdminClient();

    const start = Date.now();
    const errors: string[] = [];
    let itemsFound = 0;
    let itemsNew = 0;
    let itemsSkipped = 0;
    let itemsFiltered = 0;
    let itemsRejectedByAi = 0;
    let aiRejectReasons: string[] = [];
    let filterReasons: Record<string, number> = {};

    if (source.category === "opportunities") {
      const results = await getOpportunityResults(sourceId);

      const allOpportunities: ScrapedOpportunity[] = [];
      for (const result of results) {
        if (result.error) errors.push(`${result.source}: ${result.error}`);
        allOpportunities.push(...result.items);
      }

      itemsFound = allOpportunities.length;

      const filterResult = filterOpportunities(allOpportunities);
      const qualityOpportunities = filterResult.filtered;
      itemsFiltered = filterResult.stats.failed;

      // Log filter reasons for debugging
      if (filterResult.stats.failed > 0) {
        console.log(`[ScrapeSource:${sourceId}] Filter reasons:`, filterResult.stats.reasons);
        filterReasons = filterResult.stats.reasons;
      }
      console.log(`[ScrapeSource:${sourceId}] Quality passed: ${filterResult.stats.passed}/${filterResult.stats.total}`);

      const existingHashMap = new Map<string, string>();
      // Skip content_hash lookup - column may not exist yet in DB
      // Items already in DB will be caught by external_id check below

      const processedOpportunities = processOpportunitiesWithHashing(
        qualityOpportunities,
        existingHashMap
      );

      for (const item of processedOpportunities) {
        try {
          if (item.is_duplicate || item.change_status === "UNCHANGED") {
            itemsSkipped++;
            continue;
          }

          const score = scoreOpportunity(item);
          if (score < PUBLISH_THRESHOLD) {
            itemsSkipped++;
            continue;
          }

          const { data: existing } = await adminDb
            .from("opportunities")
            .select("id, quality_score")
            .eq("external_id", item.external_id)
            .maybeSingle();

          if (existing) {
            if (item.change_status === "UPDATED" || score > (existing.quality_score ?? 0)) {
              await adminDb
                .from("opportunities")
                .update({
                  quality_score: score,
                  content_hash: item.content_hash,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existing.id);
            }
            itemsSkipped++;
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
            itemsRejectedByAi++;
            aiRejectReasons.push(`${item.title.slice(0, 60)}: ${review.reason}`);
            console.log(`[AI Review] REJECTED: ${item.title.slice(0, 50)} — ${review.reason}`);
            itemsFiltered++;
            continue;
          }

          console.log(`[AI Review] APPROVED: ${item.title.slice(0, 50)}`);

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

          const { error: insertError } = await adminDb.from("opportunities").insert({
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
            itemsNew++;
          } else {
            errors.push(`Insert error: ${insertError.message}`);
          }
        } catch (err) {
          errors.push(`opportunity ${item.external_id}: ${String(err)}`);
        }
      }
    } else {
      // legal
      const results = await getLegalResults(sourceId);

      for (const result of results) {
        if (result.error) errors.push(`${result.source}: ${result.error}`);
        itemsFound += result.items.length;

        for (const item of result.items) {
          try {
            const { data: existing } = await adminDb
              .from("legal_updates")
              .select("id")
              .eq("external_id", item.external_id)
              .maybeSingle();

            if (existing) {
              itemsSkipped++;
              continue;
            }

            const summary =
              item.summary ?? (await generateLegalSummary(item.title, item.type, item.summary));

            await adminDb.from("legal_updates").insert({
              type: item.type,
              title: item.title,
              summary,
              source: item.source,
              source_url: item.source_url,
              published_date: item.published_date,
              relevance_tags: item.relevance_tags,
              external_id: item.external_id,
            });

            itemsNew++;
          } catch (err) {
            errors.push(`legal ${item.external_id}: ${String(err)}`);
          }
        }
      }
    }

    await adminDb.from("scraper_log").insert({
      source: `manual-${sourceId}`,
      items_found: itemsFound,
      items_new: itemsNew,
      items_skipped: itemsSkipped,
      error: errors.length > 0 ? errors.slice(0, 3).join("; ") : null,
    });

    return NextResponse.json({
      success: true,
      sourceId,
      sourceName: source.name,
      itemsFound,
      itemsNew,
      itemsSkipped,
      itemsFiltered,
      itemsRejectedByAi,
      filterReasons: Object.keys(filterReasons).length > 0 ? filterReasons : undefined,
      aiRejectReasons: aiRejectReasons.length > 0 ? aiRejectReasons : undefined,
      errors: errors.length > 0 ? errors : undefined,
      duration_ms: Date.now() - start,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nepoznata greška.";
    console.error("Scraper failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
