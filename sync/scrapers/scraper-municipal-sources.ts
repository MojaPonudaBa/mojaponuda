/**
 * Scraper: Municipal Sources (Layer 3)
 * Sources:
 * - Sarajevo: https://www.sarajevo.ba/
 * - Tuzla: https://tuzla.ba/
 * - Zenica: https://zenica.ba/
 * - Mostar: https://www.mostar.ba/
 * - Banja Luka: https://www.banjaluka.rs.ba/
 * 
 * Features:
 * - Broader CMS support (WordPress, Drupal, custom municipal CMS)
 * - Auto-detection of grant/tender sections
 * - Multiple parsing strategies with fallback
 * - Gradual expansion based on data quality and relevance
 * 
 * Legal: Publicly available municipal websites, informational content only.
 */

import { fetchHtml, extractLinks, extractLinksWithText, stripTags, parseDate, parseValue, extractBestDescription } from "./fetch-html";
import type { ScrapedOpportunity, ScraperResult } from "./types";

interface MunicipalityConfig {
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

const MUNICIPAL_SOURCES: MunicipalityConfig[] = [
  {
    name: "Grad Sarajevo",
    baseUrl: "https://www.sarajevo.ba",
    grantsPath: "/",
    location: "Sarajevo",
    linkPattern: /konkurs|poziv|grant|natječaj|poticaj/i,
    issuer: "Grad Sarajevo",
  },
  {
    name: "Grad Tuzla",
    baseUrl: "https://tuzla.ba",
    grantsPath: "/",
    location: "Tuzla",
    linkPattern: /konkurs|poziv|grant|natječaj|poticaj/i,
    issuer: "Grad Tuzla",
  },
  {
    name: "Grad Zenica",
    baseUrl: "https://zenica.ba",
    grantsPath: "/",
    location: "Zenica",
    linkPattern: /konkurs|poziv|grant|natječaj|poticaj/i,
    issuer: "Grad Zenica",
  },
  {
    name: "Grad Mostar",
    baseUrl: "https://www.mostar.ba",
    grantsPath: "/",
    location: "Mostar",
    linkPattern: /konkurs|poziv|grant|natječaj|poticaj/i,
    issuer: "Grad Mostar",
  },
  {
    name: "Grad Banja Luka",
    baseUrl: "https://www.banjaluka.rs.ba",
    grantsPath: "/",
    location: "Banja Luka",
    linkPattern: /konkurs|poziv|grant|natječaj|poticaj/i,
    issuer: "Grad Banja Luka",
  },
  // RS gradovi
  {
    name: "Grad Bijeljina",
    baseUrl: "https://www.bijeljina.rs.ba",
    grantsPath: "/",
    location: "Bijeljina",
    linkPattern: /konkurs|poziv|grant|poticaj/i,
    issuer: "Grad Bijeljina",
  },
  {
    name: "Grad Doboj",
    baseUrl: "https://www.opstinadoboj.rs.ba",
    grantsPath: "/",
    location: "Doboj",
    linkPattern: /konkurs|poziv|grant|poticaj/i,
    issuer: "Grad Doboj",
  },
  {
    name: "Grad Prijedor",
    baseUrl: "https://prijedorgrad.org",
    grantsPath: "/",
    location: "Prijedor",
    linkPattern: /konkurs|poziv|grant|poticaj/i,
    issuer: "Grad Prijedor",
  },
  {
    name: "Grad Trebinje",
    baseUrl: "https://www.trebinje.rs.ba",
    grantsPath: "/",
    location: "Trebinje",
    linkPattern: /konkurs|poziv|grant|poticaj/i,
    issuer: "Grad Trebinje",
  },
  {
    name: "Istočno Sarajevo",
    baseUrl: "https://www.istocnosarajevo.rs.ba",
    grantsPath: "/",
    location: "Istočno Sarajevo",
    linkPattern: /konkurs|poziv|grant|poticaj/i,
    issuer: "Grad Istočno Sarajevo",
  },
  // FBiH gradovi i općine
  {
    name: "Grad Bihać",
    baseUrl: "https://www.bihac.org",
    grantsPath: "/",
    location: "Bihać",
    linkPattern: /konkurs|poziv|grant|poticaj/i,
    issuer: "Grad Bihać",
  },
  {
    name: "Općina Cazin",
    baseUrl: "https://www.cazin.ba",
    grantsPath: "/",
    location: "Cazin",
    linkPattern: /konkurs|poziv|grant|poticaj/i,
    issuer: "Općina Cazin",
  },
  {
    name: "Grad Goražde",
    baseUrl: "https://www.gorazde.ba",
    grantsPath: "/",
    location: "Goražde",
    linkPattern: /konkurs|poziv|grant|poticaj/i,
    issuer: "Grad Goražde",
  },
  {
    name: "Općina Travnik",
    baseUrl: "https://www.travnik.ba",
    grantsPath: "/",
    location: "Travnik",
    linkPattern: /konkurs|poziv|grant|poticaj/i,
    issuer: "Općina Travnik",
  },
  {
    name: "Grad Livno",
    baseUrl: "https://www.livno.ba",
    grantsPath: "/",
    location: "Livno",
    linkPattern: /konkurs|poziv|grant|poticaj/i,
    issuer: "Grad Livno",
  },
  {
    name: "Grad Tomislavgrad",
    baseUrl: "https://www.tomislavgrad.ba",
    grantsPath: "/",
    location: "Tomislavgrad",
    linkPattern: /konkurs|poziv|grant|poticaj/i,
    issuer: "Općina Tomislavgrad",
  },
  {
    name: "Općina Visoko",
    baseUrl: "https://www.visoko.gov.ba",
    grantsPath: "/",
    location: "Visoko",
    linkPattern: /konkurs|poziv|grant|poticaj/i,
    issuer: "Općina Visoko",
  },
  {
    name: "Općina Kakanj",
    baseUrl: "https://www.kakanj.gov.ba",
    grantsPath: "/",
    location: "Kakanj",
    linkPattern: /konkurs|poziv|grant|poticaj/i,
    issuer: "Općina Kakanj",
  },
  {
    name: "Općina Zavidovići",
    baseUrl: "https://www.zavidovici.ba",
    grantsPath: "/",
    location: "Zavidovići",
    linkPattern: /konkurs|poziv|grant|poticaj/i,
    issuer: "Općina Zavidovići",
  },
  {
    name: "Općina Tešanj",
    baseUrl: "https://www.tesanj.ba",
    grantsPath: "/",
    location: "Tešanj",
    linkPattern: /konkurs|poziv|grant|poticaj/i,
    issuer: "Općina Tešanj",
  },
  {
    name: "Općina Građačac",
    baseUrl: "https://www.gradacac.ba",
    grantsPath: "/",
    location: "Građačac",
    linkPattern: /konkurs|poziv|grant|poticaj/i,
    issuer: "Općina Građačac",
  },
  {
    name: "Općina Lukavac",
    baseUrl: "https://www.lukavac.ba",
    grantsPath: "/",
    location: "Lukavac",
    linkPattern: /konkurs|poziv|grant|poticaj/i,
    issuer: "Općina Lukavac",
  },
  {
    name: "Općina Jajce",
    baseUrl: "https://www.jajce.ba",
    grantsPath: "/",
    location: "Jajce",
    linkPattern: /konkurs|poziv|grant|poticaj/i,
    issuer: "Općina Jajce",
  },
  {
    name: "Općina Konjic",
    baseUrl: "https://www.konjic.ba",
    grantsPath: "/",
    location: "Konjic",
    linkPattern: /konkurs|poziv|grant|poticaj/i,
    issuer: "Općina Konjic",
  },
  {
    name: "Općina Bugojno",
    baseUrl: "https://www.bugojno.ba",
    grantsPath: "/",
    location: "Bugojno",
    linkPattern: /konkurs|poziv|grant|poticaj/i,
    issuer: "Općina Bugojno",
  },
  {
    name: "Općina Široki Brijeg",
    baseUrl: "https://www.siroki-brijeg.ba",
    grantsPath: "/",
    location: "Široki Brijeg",
    linkPattern: /konkurs|poziv|grant|poticaj/i,
    issuer: "Općina Široki Brijeg",
  },
  {
    name: "Općina Čapljina",
    baseUrl: "https://www.capljina.ba",
    grantsPath: "/",
    location: "Čapljina",
    linkPattern: /konkurs|poziv|grant|poticaj/i,
    issuer: "Općina Čapljina",
  },
  {
    name: "Općina Ljubuški",
    baseUrl: "https://www.ljubuski.ba",
    grantsPath: "/",
    location: "Ljubuški",
    linkPattern: /konkurs|poziv|grant|poticaj/i,
    issuer: "Općina Ljubuški",
  },
  {
    name: "Općina Stolac",
    baseUrl: "https://www.stolac.gov.ba",
    grantsPath: "/",
    location: "Stolac",
    linkPattern: /konkurs|poziv|grant|poticaj/i,
    issuer: "Općina Stolac",
  },
  // Sarajevske općine
  {
    name: "Općina Ilidža",
    baseUrl: "https://www.ilidza.gov.ba",
    grantsPath: "/",
    location: "Ilidža",
    linkPattern: /konkurs|poziv|grant|poticaj/i,
    issuer: "Općina Ilidža",
  },
  {
    name: "Novi Grad Sarajevo",
    baseUrl: "https://www.novigradsa.ba",
    grantsPath: "/",
    location: "Novi Grad Sarajevo",
    linkPattern: /konkurs|poziv|grant|poticaj/i,
    issuer: "Općina Novi Grad Sarajevo",
  },
  {
    name: "Općina Vogošća",
    baseUrl: "https://www.vogosca.gov.ba",
    grantsPath: "/",
    location: "Vogošća",
    linkPattern: /konkurs|poziv|grant|poticaj/i,
    issuer: "Općina Vogošća",
  },
  {
    name: "Općina Ilijaš",
    baseUrl: "https://www.ilijas.ba",
    grantsPath: "/",
    location: "Ilijaš",
    linkPattern: /konkurs|poziv|grant|poticaj/i,
    issuer: "Općina Ilijaš",
  },
];

/** Map registry sourceId → MUNICIPAL_SOURCES config name */
const SOURCE_ID_MAP: Record<string, string> = {
  "grad-sarajevo": "Grad Sarajevo",
  "grad-tuzla": "Grad Tuzla",
  "grad-zenica": "Grad Zenica",
  "grad-mostar": "Grad Mostar",
  "grad-banja-luka": "Grad Banja Luka",
  // RS gradovi
  "grad-bijeljina": "Grad Bijeljina",
  "grad-doboj": "Grad Doboj",
  "grad-prijedor": "Grad Prijedor",
  "grad-trebinje": "Grad Trebinje",
  "grad-istocno-sarajevo": "Istočno Sarajevo",
  // FBiH gradovi
  "grad-bihac": "Grad Bihać",
  "opcina-cazin": "Općina Cazin",
  "grad-gorazde": "Grad Goražde",
  "opcina-travnik": "Općina Travnik",
  "grad-livno": "Grad Livno",
  "opcina-tomislavgrad": "Grad Tomislavgrad",
  "opcina-visoko": "Općina Visoko",
  "opcina-kakanj": "Općina Kakanj",
  "opcina-zavidovici": "Općina Zavidovići",
  "opcina-tesanj": "Općina Tešanj",
  "opcina-gradacac": "Općina Građačac",
  "opcina-lukavac": "Općina Lukavac",
  "opcina-jajce": "Općina Jajce",
  "opcina-konjic": "Općina Konjic",
  "opcina-bugojno": "Općina Bugojno",
  "opcina-siroki-brijeg": "Općina Široki Brijeg",
  "opcina-capljina": "Općina Čapljina",
  "opcina-ljubuski": "Općina Ljubuški",
  "opcina-stolac": "Općina Stolac",
  // Sarajevske općine
  "opcina-ilidza": "Općina Ilidža",
  "novi-grad-sarajevo": "Novi Grad Sarajevo",
  "opcina-vogosca": "Općina Vogošća",
  "opcina-ilijas": "Općina Ilijaš",
};

/** Scrape a SINGLE municipal source by registry sourceId */
export async function scrapeSingleMunicipalSource(sourceId: string): Promise<ScraperResult> {
  const configName = SOURCE_ID_MAP[sourceId];
  const config = MUNICIPAL_SOURCES.find((s) => s.name === configName);
  if (!config) {
    return { source: sourceId, items: [], error: `Unknown municipal sourceId: ${sourceId}` };
  }
  return scrapeMunicipalSource(config);
}

export async function scrapeMunicipalSources(): Promise<ScraperResult[]> {
  const results: ScraperResult[] = [];

  for (const municipality of MUNICIPAL_SOURCES) {
    const result = await scrapeMunicipalSource(municipality);
    results.push(result);
  }

  return results;
}

async function scrapeMunicipalSource(config: MunicipalityConfig): Promise<ScraperResult> {
  const items: ScrapedOpportunity[] = [];
  const source = new URL(config.baseUrl).hostname;

  try {
    const url = `${config.baseUrl}${config.grantsPath}`;
    const html = await fetchHtml(url);
    if (!html) return { source, items: [], error: "Stranica nedostupna" };

    // Try multiple parsing strategies with broader CMS support
    let links = tryStrategy1_WordPressDrupal(html, config);
    if (links.length === 0) {
      links = tryStrategy2_CustomMunicipalCMS(html, config);
    }
    if (links.length === 0) {
      links = tryStrategy3_SemanticHTML5(html, config);
    }
    if (links.length === 0) {
      links = tryStrategy4_RegexFallback(html, config);
    }
    if (links.length === 0) {
      // Final fallback: match anchor TEXT (not just URL)
      links = extractLinksWithText(html, config.baseUrl, config.linkPattern);
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

/**
 * Strategy 1: WordPress and Drupal patterns
 * Supports both WordPress and Drupal CMS systems commonly used by municipalities
 */
function tryStrategy1_WordPressDrupal(html: string, config: MunicipalityConfig): string[] {
  const links: string[] = [];

  // WordPress patterns
  const wpPatterns = [
    /<article[^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>/gi,
    /<div[^>]*class="[^"]*post[^"]*"[^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>/gi,
    /<div[^>]*class="[^"]*entry[^"]*"[^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>/gi,
    /<div[^>]*class="[^"]*wp-block[^"]*"[^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>/gi,
  ];

  // Drupal patterns
  const drupalPatterns = [
    /<div[^>]*class="[^"]*node[^"]*"[^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>/gi,
    /<article[^>]*class="[^"]*node[^"]*"[^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>/gi,
    /<div[^>]*class="[^"]*view-content[^"]*"[^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>/gi,
    /<div[^>]*class="[^"]*field-content[^"]*"[^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>/gi,
  ];

  const allPatterns = [...wpPatterns, ...drupalPatterns];

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
 * Strategy 2: Custom municipal CMS patterns
 * Handles custom government CMS systems with auto-detection of grant/tender sections
 */
function tryStrategy2_CustomMunicipalCMS(html: string, config: MunicipalityConfig): string[] {
  const links: string[] = [];

  // Auto-detect grant/tender sections with broader keywords
  const sectionKeywords = [
    "javni poziv", "javni pozivi",
    "konkurs", "konkursi",
    "natječaj", "natječaji",
    "obavijest", "obavijesti",
    "grant", "grantovi",
    "poticaj", "poticaji",
    "subvencij", "subvencije",
    "tender", "tenderi",
  ];
  
  for (const keyword of sectionKeywords) {
    // Look for sections containing keywords (case-insensitive)
    const sectionRegex = new RegExp(
      `<(?:div|section|article)[^>]*>([\\s\\S]*?${keyword}[\\s\\S]{0,500})<\\/(?:div|section|article)>`,
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
 * Strategy 3: Semantic HTML5 patterns
 * Uses modern HTML5 semantic elements (nav, section, article, aside)
 */
function tryStrategy3_SemanticHTML5(html: string, config: MunicipalityConfig): string[] {
  const links: string[] = [];

  // HTML5 semantic patterns
  const semanticPatterns = [
    /<section[^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>/gi,
    /<article[^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>/gi,
    /<nav[^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>/gi,
    /<aside[^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>/gi,
    /<main[^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>/gi,
  ];

  for (const pattern of semanticPatterns) {
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
 * Strategy 4: Regex fallback for unstructured content
 * Simple link extraction with pattern matching as last resort
 */
function tryStrategy4_RegexFallback(html: string, config: MunicipalityConfig): string[] {
  return extractLinks(html, config.baseUrl, config.linkPattern);
}

function extractTitle(html: string): string {
  // Try h1 first
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) {
    const text = stripTags(h1[1]).slice(0, 200);
    if (text.length > 10) return text;
  }
  
  // Try h2
  const h2 = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
  if (h2) {
    const text = stripTags(h2[1]).slice(0, 200);
    if (text.length > 10) return text;
  }
  
  // Try title tag
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (title) {
    const text = stripTags(title[1]).replace(/\s*[-|].*$/, "").trim().slice(0, 200);
    if (text.length > 10) return text;
  }

  return "";
}

function extractDescription(html: string): string | null {
  // Look for main content area with various class names and IDs
  const contentPatterns = [
    /<(?:div|article)[^>]*class="[^"]*(?:content|body|text|entry|post|main|article-body)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|article)>/i,
    /<(?:div|article)[^>]*id="[^"]*(?:content|body|text|entry|post|main|article-body)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|article)>/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
    /<section[^>]*class="[^"]*(?:content|main)[^"]*"[^>]*>([\s\S]*?)<\/section>/i,
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
  // Broader requirement keywords for municipal sources
  const requirementKeywords = [
    "uvjet", "uvjeti",
    "kriterij", "kriteriji",
    "zahtjev", "zahtjevi",
    "potrebno", "potrebni",
    "mora", "moraju",
    "dokumentacij", "dokumentacija",
    "prilog", "prilozi",
  ];
  
  for (const keyword of requirementKeywords) {
    const regex = new RegExp(`${keyword}[^<]{0,50}<[^>]+>([\\s\\S]*?)(?=<h[23]|<div|$)`, "i");
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
    /(?:iznos|vrijednost|sredstva|budžet)[^:]{0,20}:\s*(\d[\d.,\s]*)/i,
    /(?:do|maksimalno|ukupno)\s*(\d[\d.,\s]*)\s*(?:KM|EUR|BAM)/i,
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
  const deadlineKeywords = [
    "rok", "rokovi",
    "datum", "datuma",
    "deadline",
    "do", "zaključno",
    "prijav", "prijave",
    "podnošenj", "podnošenja",
  ];
  
  for (const keyword of deadlineKeywords) {
    const regex = new RegExp(`${keyword}[^:]{0,30}:\\s*([^<\\n]{5,50})`, "i");
    const match = html.match(regex);
    if (match) {
      const date = parseDate(match[1]);
      if (date) return date;
    }
  }

  // Try to find any date pattern in the HTML
  const datePattern = /(\d{1,2}[./]\d{1,2}[./]\d{4})/g;
  const dates: string[] = [];
  let dateMatch: RegExpExecArray | null;
  while ((dateMatch = datePattern.exec(html)) !== null) {
    const parsed = parseDate(dateMatch[1]);
    if (parsed) dates.push(parsed);
  }

  // Return the latest date found (likely to be deadline)
  if (dates.length > 0) {
    return dates.sort().reverse()[0];
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
  if (/kultur/i.test(html)) signals.push("kultura");
  if (/sport/i.test(html)) signals.push("sport");
  if (/mlad/i.test(html)) signals.push("mladi");
  if (/žen/i.test(html)) signals.push("žene");
  if (/osobe\s+sa\s+invaliditet/i.test(html)) signals.push("osobe sa invaliditetom");
  
  return signals;
}
