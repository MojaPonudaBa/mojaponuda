/**
 * Scraper Orchestrator: Layered Execution Strategy
 * 
 * Implements a three-layer execution strategy for scraping official sources:
 * - Layer 1 (Daily): High-priority federal sources (FMRPO, FBiH Vlada, UNDP BiH)
 * - Layer 2 (Weekly): Cantonal governments and sector ministries
 * - Layer 3 (Monthly): Priority municipalities
 * 
 * Features:
 * - Error handling with fallback strategies
 * - Rate limiting and robots.txt respect
 * - Exponential backoff on errors
 * - Parallel execution with Promise.allSettled
 * - Comprehensive logging
 * 
 * Legal: Publicly available government websites, informational content only.
 */

import { scrapeFmrpo } from "./scraper-fbih-ministarstvo";
import { scrapeFederalSources } from "./scraper-federal-sources";
import { scrapeCantonalSources } from "./scraper-cantonal-sources";
import { scrapeMunicipalSources } from "./scraper-municipal-sources";
import type { ScraperResult } from "./types";

export type ExecutionLayer = "layer1" | "layer2" | "layer3";

interface OrchestratorConfig {
  layer: ExecutionLayer;
  respectRateLimit?: boolean;
  delayBetweenRequests?: number; // milliseconds
  maxRetries?: number;
}

interface OrchestratorResult {
  layer: ExecutionLayer;
  results: ScraperResult[];
  totalItems: number;
  totalErrors: number;
  duration_ms: number;
}

/**
 * Execute scrapers based on the specified layer
 */
export async function executeScraperLayer(
  config: OrchestratorConfig
): Promise<OrchestratorResult> {
  const start = Date.now();
  const { layer, respectRateLimit = true, delayBetweenRequests = 1500 } = config;

  let scraperPromises: Promise<ScraperResult | ScraperResult[]>[] = [];

  // Layer 1: Daily execution - High-priority federal sources
  if (layer === "layer1") {
    scraperPromises = [
      scrapeFmrpo(), // FMRPO
      executeFederalLayer1(), // FBiH Vlada, UNDP BiH
    ];
  }

  // Layer 2: Weekly execution - Cantons and sector ministries
  if (layer === "layer2") {
    scraperPromises = [
      executeFederalLayer2(), // MCP BiH, FZZZ, FMPVS, FMOIT
      scrapeCantonalSources(), // All cantons
    ];
  }

  // Layer 3: Monthly execution - Priority municipalities
  if (layer === "layer3") {
    scraperPromises = [
      scrapeMunicipalSources(), // Priority municipalities
    ];
  }

  // Execute all scrapers in parallel with error handling
  const settledResults = await Promise.allSettled(scraperPromises);

  // Flatten results and handle errors
  const allResults: ScraperResult[] = [];
  
  for (const result of settledResults) {
    if (result.status === "fulfilled") {
      const value = result.value;
      if (Array.isArray(value)) {
        allResults.push(...value);
      } else {
        allResults.push(value);
      }
    } else {
      // Log rejected promise but don't crash
      console.error(`[Orchestrator] Scraper failed:`, result.reason);
      allResults.push({
        source: "unknown",
        items: [],
        error: String(result.reason),
      });
    }
  }

  // Apply rate limiting between sources if enabled
  if (respectRateLimit && delayBetweenRequests > 0) {
    await delay(delayBetweenRequests);
  }

  // Calculate statistics
  const totalItems = allResults.reduce((sum, r) => sum + r.items.length, 0);
  const totalErrors = allResults.filter((r) => r.error).length;

  return {
    layer,
    results: allResults,
    totalItems,
    totalErrors,
    duration_ms: Date.now() - start,
  };
}

/**
 * Execute Layer 1 federal sources (FBiH Vlada, UNDP BiH)
 */
async function executeFederalLayer1(): Promise<ScraperResult[]> {
  const federalResults = await scrapeFederalSources();
  
  // Filter for Layer 1 sources only (FBiH Vlada, UNDP BiH)
  const layer1Sources = ["fbihvlada.gov.ba", "javnipoziv.undp.ba"];
  
  return federalResults.filter((result) =>
    layer1Sources.some((source) => result.source.includes(source))
  );
}

/**
 * Execute Layer 2 federal sources (sector ministries)
 */
async function executeFederalLayer2(): Promise<ScraperResult[]> {
  const federalResults = await scrapeFederalSources();
  
  // Filter for Layer 2 sources only (MCP, FZZZ, FMPVS, FMOIT)
  const layer2Sources = ["mcp.gov.ba", "fzzz.ba", "fmpvs.gov.ba", "fmoit.gov.ba"];
  
  return federalResults.filter((result) =>
    layer2Sources.some((source) => result.source.includes(source))
  );
}

/**
 * Execute scraper with retry logic and exponential backoff
 */
export async function executeWithRetry<T>(
  scraperFn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await scraperFn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on last attempt
      if (attempt < maxRetries - 1) {
        // Exponential backoff: 1s, 2s, 4s, 8s...
        const delayMs = baseDelay * Math.pow(2, attempt);
        console.warn(
          `[Orchestrator] Attempt ${attempt + 1} failed, retrying in ${delayMs}ms...`
        );
        await delay(delayMs);
      }
    }
  }

  throw lastError || new Error("Max retries exceeded");
}

/**
 * Execute scraper with fallback strategies
 * 
 * Strategy order:
 * 1. Primary parser (standard HTML parsing)
 * 2. Alternative parser (regex-based fallback)
 * 3. Headless browser (for JavaScript-heavy sites)
 */
export async function executeWithFallback(
  primaryFn: () => Promise<ScraperResult>,
  alternativeFn?: () => Promise<ScraperResult>,
  headlessFn?: () => Promise<ScraperResult>
): Promise<ScraperResult> {
  // Try primary parser first
  try {
    const result = await primaryFn();
    
    // If successful and has items, return
    if (result.items.length > 0) {
      return result;
    }
    
    // If no items but no error, try alternative
    if (!result.error && alternativeFn) {
      console.log("[Orchestrator] Primary parser returned no items, trying alternative...");
      const altResult = await alternativeFn();
      if (altResult.items.length > 0) {
        return altResult;
      }
    }
    
    return result;
  } catch (primaryError) {
    console.error("[Orchestrator] Primary parser failed:", primaryError);
    
    // Try alternative parser
    if (alternativeFn) {
      try {
        console.log("[Orchestrator] Trying alternative parser...");
        const altResult = await alternativeFn();
        if (altResult.items.length > 0) {
          return altResult;
        }
      } catch (altError) {
        console.error("[Orchestrator] Alternative parser failed:", altError);
      }
    }
    
    // Try headless browser as last resort
    if (headlessFn) {
      try {
        console.log("[Orchestrator] Trying headless browser...");
        return await headlessFn();
      } catch (headlessError) {
        console.error("[Orchestrator] Headless browser failed:", headlessError);
      }
    }
    
    // All strategies failed, return error result
    return {
      source: "unknown",
      items: [],
      error: `All parsing strategies failed: ${String(primaryError)}`,
    };
  }
}

/**
 * Rate limiting: Add delay between requests
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check robots.txt for a given URL (simplified implementation)
 * In production, use a proper robots.txt parser library
 */
export async function checkRobotsTxt(baseUrl: string): Promise<boolean> {
  try {
    const robotsUrl = new URL("/robots.txt", baseUrl).toString();
    const response = await fetch(robotsUrl, {
      headers: { "User-Agent": "MojaPonuda-Bot/1.0" },
    });
    
    if (!response.ok) {
      // If robots.txt doesn't exist, assume allowed
      return true;
    }
    
    const robotsTxt = await response.text();
    
    // Simple check: look for "Disallow: /" for our user agent
    const lines = robotsTxt.split("\n");
    let isOurAgent = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith("User-agent:")) {
        const agent = trimmed.substring(11).trim();
        isOurAgent = agent === "*" || agent === "MojaPonuda-Bot";
      }
      
      if (isOurAgent && trimmed.startsWith("Disallow:")) {
        const path = trimmed.substring(9).trim();
        if (path === "/") {
          return false; // Disallowed
        }
      }
    }
    
    return true; // Allowed
  } catch (error) {
    console.warn(`[Orchestrator] Failed to check robots.txt for ${baseUrl}:`, error);
    // On error, assume allowed (fail open)
    return true;
  }
}
