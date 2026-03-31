/**
 * Scraper: Federal Government Sources (Layer 1 and Layer 2)
 * Sources:
 * - FBiH Vlada: https://fbihvlada.gov.ba/bs/javni-pozivi
 * - UNDP BiH: https://javnipoziv.undp.ba/
 * - MCP BiH: https://www.mcp.gov.ba/publication/read/objavljeni-pozivi-za-dodjelu-grant-sredstava
 * - FZZZ: https://www.fzzz.ba/
 * - FMPVS: https://fmpvs.gov.ba/
 * - FMOIT: https://fmoit.gov.ba/
 * Legal: Publicly available government websites, informational content only.
 */

import { fetchHtml, extractLinks, extractLinksWithText, stripTags, parseDate, parseValue, extractBestDescription } from "./fetch-html";
import type { ScrapedOpportunity, ScraperResult } from "./types";

interface FederalSourceConfig {
  name: string;
  baseUrl: string;
  grantsPath: string;
  location: string;
  linkPattern: RegExp;
  issuer: string;
}

const FEDERAL_SOURCES: FederalSourceConfig[] = [
  {
    name: "FBiH Vlada",
    baseUrl: "https://fbihvlada.gov.ba",
    grantsPath: "/bs/javni-pozivi",
    location: "Federacija BiH",
    linkPattern: /javni-poziv|poziv|grant/i,
    issuer: "Vlada Federacije BiH",
  },
  {
    name: "UNDP BiH",
    baseUrl: "https://javnipoziv.undp.ba",
    grantsPath: "/",
    location: "Bosna i Hercegovina",
    linkPattern: /poziv|grant|project/i,
    issuer: "UNDP Bosna i Hercegovina",
  },
  {
    name: "MCP BiH",
    baseUrl: "https://www.mcp.gov.ba",
    grantsPath: "/publication/read/objavljeni-pozivi-za-dodjelu-grant-sredstava",
    location: "Bosna i Hercegovina",
    linkPattern: /poziv|grant/i,
    issuer: "Ministarstvo civilnih poslova BiH",
  },
  {
    name: "FZZZ",
    baseUrl: "https://www.fzzz.ba",
    grantsPath: "/",
    location: "Federacija BiH",
    linkPattern: /poziv|natječaj|grant/i,
    issuer: "Federalni zavod za zapošljavanje",
  },
  {
    name: "FMPVS",
    baseUrl: "https://fmpvs.gov.ba",
    grantsPath: "/",
    location: "Federacija BiH",
    linkPattern: /poziv|grant|subvencij/i,
    issuer: "Federalno ministarstvo poljoprivrede, vodoprivrede i šumarstva",
  },
  {
    name: "FMOIT",
    baseUrl: "https://fmoit.gov.ba",
    grantsPath: "/",
    location: "Federacija BiH",
    linkPattern: /poziv|grant|poticaj/i,
    issuer: "Federalno ministarstvo okoliša i turizma",
  },
];

/** Map registry sourceId → FEDERAL_SOURCES config index */
const SOURCE_ID_MAP: Record<string, string> = {
  "fbih-vlada": "FBiH Vlada",
  "undp-bih": "UNDP BiH",
  "mcp-bih": "MCP BiH",
  "fzzz": "FZZZ",
  "fmpvs": "FMPVS",
  "fmoit": "FMOIT",
};

/** Scrape a SINGLE federal source by registry sourceId */
export async function scrapeSingleFederalSource(sourceId: string): Promise<ScraperResult> {
  const configName = SOURCE_ID_MAP[sourceId];
  const config = FEDERAL_SOURCES.find((s) => s.name === configName);
  if (!config) {
    return { source: sourceId, items: [], error: `Unknown federal sourceId: ${sourceId}` };
  }
  return scrapeFederalSource(config);
}

export async function scrapeFederalSources(): Promise<ScraperResult[]> {
  const results: ScraperResult[] = [];

  for (const source of FEDERAL_SOURCES) {
    const result = await scrapeFederalSource(source);
    results.push(result);
  }

  return results;
}

async function scrapeFederalSource(config: FederalSourceConfig): Promise<ScraperResult> {
  const items: ScrapedOpportunity[] = [];
  const source = new URL(config.baseUrl).hostname;

  try {
    const url = `${config.baseUrl}${config.grantsPath}`;
    const html = await fetchHtml(url);
    if (!html) return { source, items: [], error: "Stranica nedostupna" };

    // Extract links: try URL-pattern first, then anchor-text matching as fallback
    let links = extractLinks(html, config.baseUrl, config.linkPattern);
    if (links.length === 0) {
      links = extractLinksWithText(html, config.baseUrl, config.linkPattern);
    }
    const uniqueLinks = links.slice(0, 20); // max 20 per run

    for (const link of uniqueLinks) {
      try {
        const pageHtml = await fetchHtml(link);
        if (!pageHtml) continue;

        const title = extractTitle(pageHtml);
        if (!title || title.length < 10) continue;

        const item: ScrapedOpportunity = {
          external_id: `${source}:${Buffer.from(link).toString("base64").slice(0, 32)}`,
          title,
          issuer: config.issuer,
          category: "Poticaji i grantovi",
          description: extractDescription(pageHtml) ?? extractBestDescription(pageHtml),
          requirements: extractRequirements(pageHtml),
          value: extractValue(pageHtml),
          deadline: extractDeadline(pageHtml),
          location: config.location,
          source_url: link,
          eligibility_signals: extractEligibility(pageHtml),
        };

        items.push(item);
      } catch {
        // skip individual page errors
      }
    }
  } catch (err) {
    return { source, items, error: String(err) };
  }

  return { source, items };
}

function extractTitle(html: string): string {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return stripTags(h1[1]).slice(0, 200);
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return title ? stripTags(title[1]).replace(/\s*[-|].*$/, "").trim().slice(0, 200) : "";
}

function extractDescription(html: string): string | null {
  // Look for main content area
  const content = html.match(/<(?:div|article)[^>]*class="[^"]*(?:content|body|text|entry|post)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|article)>/i);
  if (content) return stripTags(content[1]).slice(0, 1000);
  return null;
}

function extractRequirements(html: string): string | null {
  const uvjeti = html.match(/uvjeti[^<]*<[^>]+>([\s\S]*?)(?=<h[23]|$)/i);
  if (uvjeti) return stripTags(uvjeti[1]).slice(0, 500);
  return null;
}

function extractValue(html: string): number | null {
  const match = html.match(/(\d[\d.,\s]*)\s*(?:KM|EUR|BAM)/i);
  return match ? parseValue(match[1]) : null;
}

function extractDeadline(html: string): string | null {
  const match = html.match(/rok[^:]*:\s*([^<\n]+)/i);
  return match ? parseDate(match[1]) : null;
}

function extractEligibility(html: string): string[] {
  const signals: string[] = [];
  if (/malo[g\s]i\s+srednje[g\s]/i.test(html)) signals.push("MSP");
  if (/poduzetni[ck]/i.test(html)) signals.push("poduzetnici");
  if (/obrt/i.test(html)) signals.push("obrti");
  if (/zadruga/i.test(html)) signals.push("zadruge");
  if (/izvoz/i.test(html)) signals.push("izvoznici");
  if (/poljoprivreda/i.test(html)) signals.push("poljoprivrednici");
  if (/turizam/i.test(html)) signals.push("turizam");
  if (/nezaposleni/i.test(html)) signals.push("nezaposleni");
  return signals;
}
