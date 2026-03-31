/**
 * Example: How to integrate quality filter into post-sync-pipeline
 * 
 * This file shows how the quality filter should be used in the scraping pipeline.
 * It will be integrated in task 3.8.
 */

import { filterOpportunities } from "./quality-filter";
import type { ScrapedOpportunity } from "./types";

/**
 * Example integration in post-sync-pipeline.ts
 * 
 * Add this after collecting all opportunities from scrapers (step 1)
 * and before processing them (step 2):
 */
export function exampleIntegration(allOpportunities: ScrapedOpportunity[]) {
  // ── 1.5. Apply quality filtering ────────────────────────────────
  const { filtered, stats } = filterOpportunities(allOpportunities);
  
  // Log filtering statistics
  console.log(`Quality Filter Stats:
    Total: ${stats.total}
    Passed: ${stats.passed}
    Failed: ${stats.failed}
    Reasons: ${JSON.stringify(stats.reasons, null, 2)}
  `);
  
  // Continue processing only with filtered (high-quality) opportunities
  return filtered;
}

/**
 * Modified pipeline flow:
 * 
 * 1. Scrape opportunities from all sources (parallel)
 * 2. Collect all opportunities into array
 * 3. **Apply quality filtering** (NEW - this task)
 * 4. Process filtered opportunities (score, deduplicate, AI generate, store)
 * 5. Process legal updates
 * 6. Log scraper run
 * 7. Expire old opportunities
 * 
 * Benefits:
 * - Reduces processing time by filtering out low-quality items early
 * - Reduces AI generation costs (only generate for relevant items)
 * - Improves data quality in database
 * - Provides visibility into what's being filtered and why
 */

/**
 * Alternative: Apply filter per-scraper
 * 
 * You can also apply the filter immediately after each scraper runs,
 * before collecting all opportunities:
 */
export function examplePerScraperFiltering() {
  // In each scraper (e.g., scraper-federal-sources.ts):
  // 
  // const items: ScrapedOpportunity[] = [];
  // // ... scrape items ...
  // 
  // // Filter before returning
  // const { filtered } = filterOpportunities(items);
  // return { source, items: filtered };
  
  // This approach filters earlier but loses visibility into what was filtered
}
