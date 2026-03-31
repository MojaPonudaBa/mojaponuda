/**
 * Scraper: Cantonal Government Sources (Layer 2)
 * Sources:
 * - Kanton Sarajevo: https://mp.ks.gov.ba/aktuelo/konkursi
 * - Tuzlanski Kanton: https://www.vladatk.kim.ba/
 * - Zeničko-dobojski Kanton: https://www.zdk.ba/
 * - Hercegovačko-neretvanski Kanton: https://www.hnk.ba/
 * 
 * Features:
 * - Flexible CMS support (WordPress, Joomla, custom government CMS)
 * - Multiple parsing strategies with fallback
 * - Auto-detection of content sections
 * 
 * Legal: Publicly available government websites, informational content only.
 */

import { fetchHtml, extractLinks, stripTags, parseDate, parseValue } from "./fetch-html";
import type { ScrapedOpportunity, ScraperResult } from "./types";

interface CantonConfig {
  name: string;
  baseUrl: string;
  grantsPath: string;
  location: string;
  linkPattern: RegExp;
  issuer: string;
  selectors?: {
    listContainer?: string;
    itemClass?: string;
    titleSelector?: string;
    contentSelector?: string;
  };
}

const CANTONAL_SOURCES: CantonConfig[] = [
  {
    name: "Kanton Sarajevo",
    baseUrl: "https://mp.ks.gov.ba",
    grantsPath: "/aktuelo/konkursi",
    location: "Kanton Sarajevo",
    linkPattern: /konkurs|poziv|grant/i,
    issuer: "Ministarstvo privrede Kantona Sarajevo",
    selectors: {
      listContainer: "article-list",
      itemClass: "article-item",
      titleSelector: "h2",
      contentSelector: "content",
    },
  },
  {
    name: "Tuzlanski Kanton",
    baseUrl: "https://www.vladatk.gov.ba",
    grantsPath: "/",
    location: "Tuzlanski Kanton",
    linkPattern: /poziv|konkurs|grant|natječaj/i,
    issuer: "Vlada Tuzlanskog kantona",
  },
  {
    name: "Zeničko-dobojski Kanton",
    baseUrl: "https://www.zdk.ba",
    grantsPath: "/",
    location: "Zeničko-dobojski Kanton",
    linkPattern: /poziv|konkurs|grant|natječaj/i,
    issuer: "Vlada Zeničko-dobojskog kantona",
  },
  {
    name: "Hercegovačko-neretvanski Kanton",
    baseUrl: "https://www.vladahnk.ba",
    grantsPath: "/",
    location: "Hercegovačko-neretvanski Kanton",
    linkPattern: /poziv|konkurs|grant|natječaj/i,
    issuer: "Vlada Hercegovačko-neretvanskog kantona",
  },
];

/** Map registry sourceId → CANTONAL_SOURCES config name */
const SOURCE_ID_MAP: Record<string, string> = {
  "kanton-sarajevo": "Kanton Sarajevo",
  "kanton-tuzla": "Tuzlanski Kanton",
  "kanton-zenica": "Zeničko-dobojski Kanton",
  "kanton-hnk": "Hercegovačko-neretvanski Kanton",
};

/** Scrape a SINGLE cantonal source by registry sourceId */
export async function scrapeSingleCantonalSource(sourceId: string): Promise<ScraperResult> {
  const configName = SOURCE_ID_MAP[sourceId];
  const config = CANTONAL_SOURCES.find((s) => s.name === configName);
  if (!config) {
    return { source: sourceId, items: [], error: `Unknown cantonal sourceId: ${sourceId}` };
  }
  return scrapeCantonalSource(config);
}

export async function scrapeCantonalSources(): Promise<ScraperResult[]> {
  const results: ScraperResult[] = [];

  for (const canton of CANTONAL_SOURCES) {
    const result = await scrapeCantonalSource(canton);
    results.push(result);
  }

  return results;
}

async function scrapeCantonalSource(config: CantonConfig): Promise<ScraperResult> {
  const items: ScrapedOpportunity[] = [];
  const source = new URL(config.baseUrl).hostname;

  try {
    const url = `${config.baseUrl}${config.grantsPath}`;
    const html = await fetchHtml(url);
    if (!html) return { source, items: [], error: "Stranica nedostupna" };

    // Try multiple parsing strategies
    let links = tryStrategy1_StandardCMS(html, config);
    if (links.length === 0) {
      links = tryStrategy2_CustomGovernmentCMS(html, config);
    }
    if (links.length === 0) {
      links = tryStrategy3_RegexFallback(html, config);
    }

    const uniqueLinks = [...new Set(links)].slice(0, 20); // max 20 per run

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
          description: extractDescription(pageHtml),
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

/**
 * Strategy 1: Standard WordPress/Joomla patterns
 * Looks for common CMS patterns like article lists, post containers, etc.
 */
function tryStrategy1_StandardCMS(html: string, config: CantonConfig): string[] {
  const links: string[] = [];

  // WordPress patterns
  const wpPatterns = [
    /<article[^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>/gi,
    /<div[^>]*class="[^"]*post[^"]*"[^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>/gi,
    /<div[^>]*class="[^"]*entry[^"]*"[^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>/gi,
  ];

  // Joomla patterns
  const joomlaPatterns = [
    /<div[^>]*class="[^"]*item[^"]*"[^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>/gi,
    /<div[^>]*class="[^"]*article[^"]*"[^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>/gi,
  ];

  const allPatterns = [...wpPatterns, ...joomlaPatterns];

  for (const pattern of allPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null) {
      const href = match[1];
      if (config.linkPattern.test(href)) {
        try {
          links.push(new URL(href, config.baseUrl).toString());
        } catch {
          // skip invalid URLs
        }
      }
    }
  }

  return links;
}

/**
 * Strategy 2: Custom government CMS patterns
 * Looks for government-specific patterns like "Javni pozivi", "Konkursi", "Obavijesti"
 */
function tryStrategy2_CustomGovernmentCMS(html: string, config: CantonConfig): string[] {
  const links: string[] = [];

  // Look for sections with keywords
  const sectionKeywords = ["javni poziv", "konkurs", "natječaj", "obavijest", "grant", "poticaj"];
  
  for (const keyword of sectionKeywords) {
    const sectionRegex = new RegExp(
      `<(?:div|section)[^>]*>([\\s\\S]*?${keyword}[\\s\\S]*?)<\\/(?:div|section)>`,
      "gi"
    );
    
    let sectionMatch: RegExpExecArray | null;
    while ((sectionMatch = sectionRegex.exec(html)) !== null) {
      const sectionHtml = sectionMatch[1];
      
      // Extract links from this section
      const linkRegex = /href=["']([^"']+)["']/gi;
      let linkMatch: RegExpExecArray | null;
      while ((linkMatch = linkRegex.exec(sectionHtml)) !== null) {
        const href = linkMatch[1];
        if (config.linkPattern.test(href)) {
          try {
            links.push(new URL(href, config.baseUrl).toString());
          } catch {
            // skip invalid URLs
          }
        }
      }
    }
  }

  return links;
}

/**
 * Strategy 3: Regex fallback for unstructured content
 * Simple link extraction with pattern matching
 */
function tryStrategy3_RegexFallback(html: string, config: CantonConfig): string[] {
  return extractLinks(html, config.baseUrl, config.linkPattern);
}

function extractTitle(html: string): string {
  // Try h1 first
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return stripTags(h1[1]).slice(0, 200);
  
  // Try h2
  const h2 = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
  if (h2) return stripTags(h2[1]).slice(0, 200);
  
  // Try title tag
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return title ? stripTags(title[1]).replace(/\s*[-|].*$/, "").trim().slice(0, 200) : "";
}

function extractDescription(html: string): string | null {
  // Look for main content area with various class names
  const contentPatterns = [
    /<(?:div|article)[^>]*class="[^"]*(?:content|body|text|entry|post|main)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|article)>/i,
    /<(?:div|article)[^>]*id="[^"]*(?:content|body|text|entry|post|main)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|article)>/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i,
  ];

  for (const pattern of contentPatterns) {
    const match = html.match(pattern);
    if (match) {
      const text = stripTags(match[1]).slice(0, 1000);
      if (text.length > 50) return text;
    }
  }

  return null;
}

function extractRequirements(html: string): string | null {
  const requirementKeywords = ["uvjet", "kriterij", "zahtjev", "potrebno", "mora"];
  
  for (const keyword of requirementKeywords) {
    const regex = new RegExp(`${keyword}[^<]*<[^>]+>([\\s\\S]*?)(?=<h[23]|$)`, "i");
    const match = html.match(regex);
    if (match) {
      const text = stripTags(match[1]).slice(0, 500);
      if (text.length > 20) return text;
    }
  }

  return null;
}

function extractValue(html: string): number | null {
  // Look for monetary values in various formats
  const patterns = [
    /(\d[\d.,\s]*)\s*(?:KM|EUR|BAM)/i,
    /(?:iznos|vrijednost|sredstva)[^:]*:\s*(\d[\d.,\s]*)/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const value = parseValue(match[1]);
      if (value) return value;
    }
  }

  return null;
}

function extractDeadline(html: string): string | null {
  // Look for deadline with various keywords
  const deadlineKeywords = ["rok", "datum", "deadline", "do", "zaključno"];
  
  for (const keyword of deadlineKeywords) {
    const regex = new RegExp(`${keyword}[^:]*:\\s*([^<\\n]+)`, "i");
    const match = html.match(regex);
    if (match) {
      const date = parseDate(match[1]);
      if (date) return date;
    }
  }

  return null;
}

function extractEligibility(html: string): string[] {
  const signals: string[] = [];
  
  // Check for various eligibility signals
  if (/malo[g\s]i\s+srednje[g\s]/i.test(html)) signals.push("MSP");
  if (/poduzetni[ck]/i.test(html)) signals.push("poduzetnici");
  if (/obrt/i.test(html)) signals.push("obrti");
  if (/zadruga/i.test(html)) signals.push("zadruge");
  if (/izvoz/i.test(html)) signals.push("izvoznici");
  if (/poljoprivreda/i.test(html)) signals.push("poljoprivrednici");
  if (/turizam/i.test(html)) signals.push("turizam");
  if (/nezaposleni/i.test(html)) signals.push("nezaposleni");
  if (/startup/i.test(html)) signals.push("startupovi");
  if (/inovacij/i.test(html)) signals.push("inovacije");
  if (/digitalizacij/i.test(html)) signals.push("digitalizacija");
  
  return signals;
}
