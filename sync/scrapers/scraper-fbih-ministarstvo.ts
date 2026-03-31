/**
 * Scraper: Federalno ministarstvo razvoja, poduzetništva i obrta
 * Source: https://www.fmrpo.gov.ba/
 * Legal: Publicly available government website, informational content only.
 */

import { fetchHtml, extractLinks, stripTags, parseDate, parseValue } from "./fetch-html";
import type { ScrapedOpportunity, ScraperResult } from "./types";

const SOURCE = "fmrpo.gov.ba";
// Primary: dedicated grants subdomain; Fallback: main site
const GRANTS_URLS = [
  "https://javnipozivi.fmrpo.gov.ba/",
  "https://www.fmrpo.gov.ba/javni-pozivi",
  "https://fmrpo.gov.ba/javni-pozivi",
];

export async function scrapeFmrpo(): Promise<ScraperResult> {
  const items: ScrapedOpportunity[] = [];

  try {
    let html: string | null = null;
    let usedUrl = "";
    for (const url of GRANTS_URLS) {
      html = await fetchHtml(url);
      if (html) { usedUrl = url; break; }
    }
    if (!html) return { source: SOURCE, items: [], error: `Stranica nedostupna (pokušano: ${GRANTS_URLS.join(", ")})` };
    const BASE_URL = new URL(usedUrl).origin;

    // Extract links to individual grant pages
    const links = extractLinks(html, BASE_URL, /javni-poziv|poziv|grant|subvencij|poticaj/i);
    const uniqueLinks = links.slice(0, 20); // max 20 per run

    for (const link of uniqueLinks) {
      try {
        const pageHtml = await fetchHtml(link);
        if (!pageHtml) continue;

        const title = extractTitle(pageHtml);
        if (!title || title.length < 10) continue;

        const item: ScrapedOpportunity = {
          external_id: `fmrpo:${Buffer.from(link).toString("base64").slice(0, 32)}`,
          title,
          issuer: "Federalno ministarstvo razvoja, poduzetništva i obrta",
          category: "Poticaji i grantovi",
          description: extractDescription(pageHtml),
          requirements: extractRequirements(pageHtml),
          value: extractValue(pageHtml),
          deadline: extractDeadline(pageHtml),
          location: "Federacija BiH",
          source_url: link,
          eligibility_signals: extractEligibility(pageHtml),
        };

        items.push(item);
      } catch {
        // skip individual page errors
      }
    }
  } catch (err) {
    return { source: SOURCE, items, error: String(err) };
  }

  return { source: SOURCE, items };
}

function extractTitle(html: string): string {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return stripTags(h1[1]).slice(0, 200);
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return title ? stripTags(title[1]).replace(/\s*[-|].*$/, "").trim().slice(0, 200) : "";
}

function extractDescription(html: string): string | null {
  // Look for main content area
  const content = html.match(/<(?:div|article)[^>]*class="[^"]*(?:content|body|text)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|article)>/i);
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
  return signals;
}
