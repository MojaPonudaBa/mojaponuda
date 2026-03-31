import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { SCRAPER_SOURCES } from "@/sync/scrapers/scraper-registry";
import { filterOpportunities } from "@/sync/scrapers/quality-filter";
import { processOpportunitiesWithHashing } from "@/sync/scrapers/content-hasher";
import { scoreOpportunity, generateSlug, PUBLISH_THRESHOLD } from "@/sync/opportunity-scorer";
import { generateOpportunityContent, generateLegalSummary } from "@/sync/ai-content-generator";
import { scrapeFmrpo } from "@/sync/scrapers/scraper-fbih-ministarstvo";
import { scrapeRazvojneAgencije } from "@/sync/scrapers/scraper-razvojne-agencije";
import { scrapeFederalSources } from "@/sync/scrapers/scraper-federal-sources";
import { scrapeCantonalSources } from "@/sync/scrapers/scraper-cantonal-sources";
import { scrapeMunicipalSources } from "@/sync/scrapers/scraper-municipal-sources";
import { scrapeLegalUpdates } from "@/sync/scrapers/scraper-legal-updates";
import type { ScrapedOpportunity, ScraperResult } from "@/sync/scrapers/types";
import type { LegalScraperResult } from "@/sync/scrapers/scraper-legal-updates";

export const maxDuration = 300;

async function getOpportunityResults(sourceId: string): Promise<ScraperResult[]> {
  switch (sourceId) {
    case "fmrpo":
      return [await scrapeFmrpo()];
    case "serda":
    case "redah":
      return await scrapeRazvojneAgencije();
    case "fbih-vlada":
    case "undp-bih":
    case "mcp-bih":
    case "fzzz":
    case "fmpvs":
    case "fmoit":
      return await scrapeFederalSources();
    case "kanton-sarajevo":
    case "kanton-tuzla":
    case "kanton-zenica":
      return await scrapeCantonalSources();
    case "grad-sarajevo":
    case "grad-tuzla":
    case "grad-zenica":
    case "grad-mostar":
    case "grad-banja-luka":
      return await scrapeMunicipalSources();
    default:
      return [];
  }
}

async function getLegalResults(sourceId: string): Promise<LegalScraperResult[]> {
  const all = await scrapeLegalUpdates();
  switch (sourceId) {
    case "ajn-news":
      return all.filter((r) => r.source === "javnenabavke.gov.ba");
    case "ajn-laws":
      return all.filter((r) => r.source === "javnenabavke.gov.ba/zakonodavstvo");
    case "glasnik-fbih":
      return all.filter((r) => r.source.includes("sluzbenenovine"));
    case "parlament-bih":
      return all.filter((r) => r.source.includes("parlament"));
    case "vijece-ministara":
      return all.filter((r) => r.source.includes("vijeceministara"));
    default:
      return all;
  }
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

    const start = Date.now();
    const errors: string[] = [];
    let itemsFound = 0;
    let itemsNew = 0;
    let itemsSkipped = 0;
    let itemsFiltered = 0;

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

      const existingHashMap = new Map<string, string>();
      if (qualityOpportunities.length > 0) {
        const externalIds = qualityOpportunities.map((o) => o.external_id);
        const { data: existingOpps } = await supabase
          .from("opportunities")
          .select("external_id, content_hash")
          .in("external_id", externalIds);

        if (existingOpps) {
          for (const opp of existingOpps as unknown as Array<{ external_id: string; content_hash: string | null }>) {
            if (opp.content_hash) existingHashMap.set(opp.external_id, opp.content_hash);
          }
        }
      }

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

          const { data: existing } = await supabase
            .from("opportunities")
            .select("id, quality_score")
            .eq("external_id", item.external_id)
            .maybeSingle();

          if (existing) {
            if (item.change_status === "UPDATED" || score > (existing.quality_score ?? 0)) {
              await supabase
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
            content_hash: item.content_hash,
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
            const { data: existing } = await supabase
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

            itemsNew++;
          } catch (err) {
            errors.push(`legal ${item.external_id}: ${String(err)}`);
          }
        }
      }
    }

    await supabase.from("scraper_log").insert({
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
      errors: errors.length > 0 ? errors : undefined,
      duration_ms: Date.now() - start,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nepoznata greška.";
    console.error("Scraper failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
