/**
 * Scraper: Zakon o javnim nabavkama BiH + izmjene + vijesti
 * Sources:
 *   - Agencija za javne nabavke BiH: https://www.javnenabavke.gov.ba
 *   - Službeni glasnik FBiH: http://www.sluzbenenovine.ba
 *   - Parlament BiH: https://www.parlament.ba
 *   - Vijeće ministara BiH: https://www.vijeceministara.gov.ba
 * Legal: Official government sources, publicly available.
 */

import { fetchHtml, extractLinks, stripTags, parseDate } from "./fetch-html";

export interface ScrapedLegalUpdate {
  external_id: string;
  type: "zakon" | "izmjena" | "vijest";
  title: string;
  summary: string | null;
  source: string;
  source_url: string;
  published_date: string | null;
  relevance_tags: string[];
}

export interface LegalScraperResult {
  source: string;
  items: ScrapedLegalUpdate[];
  error?: string;
}

const AJN_BASE = "https://www.javnenabavke.gov.ba";
const AJN_NEWS_URL = `${AJN_BASE}/bs/novosti`;
const AJN_LAWS_URL = `${AJN_BASE}/bs/zakonodavstvo`;
const GLASNIK_BASE = "http://www.sluzbenenovine.ba";
const PARLAMENT_BASE = "https://www.parlament.ba";
const VIJECE_BASE = "https://www.vijeceministara.gov.ba";

export async function scrapeLegalUpdates(): Promise<LegalScraperResult[]> {
  const results = await Promise.allSettled([
    scrapeAjnNews(),
    scrapeAjnLaws(),
    scrapeSluzbenGlasnik(),
    scrapeParlament(),
    scrapeVijeceMinistara(),
  ]);

  return results.map((r) =>
    r.status === "fulfilled" ? r.value : { source: "unknown", items: [], error: String(r.reason) }
  );
}

async function scrapeAjnNews(): Promise<LegalScraperResult> {
  const items: ScrapedLegalUpdate[] = [];
  const source = "javnenabavke.gov.ba";

  try {
    const html = await fetchHtml(AJN_NEWS_URL);
    if (!html) return { source, items: [], error: "Nedostupno" };

    const links = extractLinks(html, AJN_BASE, /novost|vijest|obavijest/i).slice(0, 10);

    for (const link of links) {
      try {
        const pageHtml = await fetchHtml(link);
        if (!pageHtml) continue;

        const title = extractTitle(pageHtml);
        if (!title || title.length < 10) continue;

        const dateMatch = pageHtml.match(/(\d{1,2}[./]\d{1,2}[./]\d{4})/);
        const published_date = dateMatch ? parseDate(dateMatch[1]) : null;

        // Only include if recent (within 90 days)
        if (published_date) {
          const age = Date.now() - new Date(published_date).getTime();
          if (age > 90 * 24 * 60 * 60 * 1000) continue;
        }

        items.push({
          external_id: `ajn-news:${Buffer.from(link).toString("base64").slice(0, 32)}`,
          type: "vijest",
          title,
          summary: extractSummary(pageHtml),
          source: "Agencija za javne nabavke BiH",
          source_url: link,
          published_date,
          relevance_tags: extractTags(title + " " + (extractSummary(pageHtml) ?? "")),
        });
      } catch {
        // skip
      }
    }
  } catch (err) {
    return { source, items, error: String(err) };
  }

  return { source, items };
}

async function scrapeAjnLaws(): Promise<LegalScraperResult> {
  const items: ScrapedLegalUpdate[] = [];
  const source = "javnenabavke.gov.ba/zakonodavstvo";

  try {
    const html = await fetchHtml(AJN_LAWS_URL);
    if (!html) return { source, items: [], error: "Nedostupno" };

    const links = extractLinks(html, AJN_BASE, /zakon|pravilnik|uputstvo|odluka/i).slice(0, 15);

    for (const link of links) {
      try {
        const pageHtml = await fetchHtml(link);
        if (!pageHtml) continue;

        const title = extractTitle(pageHtml);
        if (!title || title.length < 10) continue;

        // Improved law vs amendment detection
        const type = /izmjena|dopuna|amandman|novelacija|revizija/i.test(title) ? "izmjena" : "zakon";

        // Try to extract date from page
        const dateMatch = pageHtml.match(/(\d{1,2}[./]\d{1,2}[./]\d{4})/);
        const published_date = dateMatch ? parseDate(dateMatch[1]) : null;

        items.push({
          external_id: `ajn-law:${Buffer.from(link).toString("base64").slice(0, 32)}`,
          type,
          title,
          summary: extractSummary(pageHtml),
          source: "Agencija za javne nabavke BiH",
          source_url: link,
          published_date,
          relevance_tags: extractTags(title + " " + (extractSummary(pageHtml) ?? "")),
        });
      } catch {
        // skip
      }
    }
  } catch (err) {
    return { source, items, error: String(err) };
  }

  return { source, items };
}

async function scrapeSluzbenGlasnik(): Promise<LegalScraperResult> {
  const items: ScrapedLegalUpdate[] = [];
  const source = "sluzbenenovine.ba";

  try {
    const html = await fetchHtml(GLASNIK_BASE);
    if (!html) return { source, items: [], error: "Nedostupno" };

    // Extract links to recent gazette issues
    const links = extractLinks(html, GLASNIK_BASE, /glasnik|broj|izdanje/i).slice(0, 15);

    for (const link of links) {
      try {
        const pageHtml = await fetchHtml(link);
        if (!pageHtml) continue;

        // Look for procurement-related laws
        const procurementMatches = pageHtml.matchAll(
          /<(?:h[2-4]|div|p)[^>]*>([\s\S]*?(?:javne?\s+nabavk|nabavk|tender|konkurs|poticaj|grant)[\s\S]*?)<\/(?:h[2-4]|div|p)>/gi
        );

        for (const match of procurementMatches) {
          const text = stripTags(match[1]);
          if (text.length < 20) continue;

          // Extract law number if present
          const lawNumberMatch = text.match(/(?:broj|br\.?)\s*(\d+\/\d+)/i);
          const lawNumber = lawNumberMatch ? lawNumberMatch[1] : "";

          const title = text.slice(0, 200);
          const type = /izmjena|dopuna|amandman/i.test(title) ? "izmjena" : "zakon";

          // Try to extract date from page
          const dateMatch = pageHtml.match(/(\d{1,2}[./]\d{1,2}[./]\d{4})/);
          const published_date = dateMatch ? parseDate(dateMatch[1]) : null;

          items.push({
            external_id: `glasnik:${lawNumber || Buffer.from(link + text).toString("base64").slice(0, 32)}`,
            type,
            title: lawNumber ? `${lawNumber} - ${title}` : title,
            summary: extractSummary(pageHtml),
            source: "Službeni glasnik FBiH",
            source_url: link,
            published_date,
            relevance_tags: extractTags(title),
          });

          // Limit to avoid too many items from one page
          if (items.length >= 10) break;
        }

        if (items.length >= 10) break;
      } catch {
        // skip
      }
    }
  } catch (err) {
    return { source, items, error: String(err) };
  }

  return { source, items };
}

async function scrapeParlament(): Promise<LegalScraperResult> {
  const items: ScrapedLegalUpdate[] = [];
  const source = "parlament.ba";

  try {
    const html = await fetchHtml(PARLAMENT_BASE);
    if (!html) return { source, items: [], error: "Nedostupno" };

    // Look for legislative activity links
    const links = extractLinks(html, PARLAMENT_BASE, /zakon|prijedlog|amandman|izmjena/i).slice(0, 15);

    for (const link of links) {
      try {
        const pageHtml = await fetchHtml(link);
        if (!pageHtml) continue;

        const title = extractTitle(pageHtml);
        if (!title || title.length < 20) continue;

        // Focus on public procurement and business-related legislation
        if (!/nabavk|tender|privred|ekonom|poticaj|grant|konkurs/i.test(title)) continue;

        const type = /izmjena|dopuna|amandman/i.test(title) ? "izmjena" : "zakon";

        // Try to extract date
        const dateMatch = pageHtml.match(/(\d{1,2}[./]\d{1,2}[./]\d{4})/);
        const published_date = dateMatch ? parseDate(dateMatch[1]) : null;

        items.push({
          external_id: `parlament:${Buffer.from(link).toString("base64").slice(0, 32)}`,
          type,
          title,
          summary: extractSummary(pageHtml),
          source: "Parlament BiH",
          source_url: link,
          published_date,
          relevance_tags: extractTags(title),
        });

        if (items.length >= 10) break;
      } catch {
        // skip
      }
    }
  } catch (err) {
    return { source, items, error: String(err) };
  }

  return { source, items };
}

async function scrapeVijeceMinistara(): Promise<LegalScraperResult> {
  const items: ScrapedLegalUpdate[] = [];
  const source = "vijeceministara.gov.ba";

  try {
    const html = await fetchHtml(VIJECE_BASE);
    if (!html) return { source, items: [], error: "Nedostupno" };

    // Look for decisions and regulations
    const links = extractLinks(html, VIJECE_BASE, /odluka|uredba|zaključak|regulativ/i).slice(0, 15);

    for (const link of links) {
      try {
        const pageHtml = await fetchHtml(link);
        if (!pageHtml) continue;

        const title = extractTitle(pageHtml);
        if (!title || title.length < 20) continue;

        // Focus on economic and procurement-related decisions
        if (!/nabavk|ekonom|privred|poticaj|grant|razvoj|investicij/i.test(title)) continue;

        const type = /izmjena|dopuna/i.test(title) ? "izmjena" : "zakon";

        // Try to extract date
        const dateMatch = pageHtml.match(/(\d{1,2}[./]\d{1,2}[./]\d{4})/);
        const published_date = dateMatch ? parseDate(dateMatch[1]) : null;

        items.push({
          external_id: `vijece:${Buffer.from(link).toString("base64").slice(0, 32)}`,
          type,
          title,
          summary: extractSummary(pageHtml),
          source: "Vijeće ministara BiH",
          source_url: link,
          published_date,
          relevance_tags: extractTags(title),
        });

        if (items.length >= 10) break;
      } catch {
        // skip
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

function extractSummary(html: string): string | null {
  const p = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (p) return stripTags(p[1]).slice(0, 400);
  return null;
}

function extractTags(text: string): string[] {
  const tags: string[] = [];
  if (/nabavk/i.test(text)) tags.push("javne-nabavke");
  if (/pravilnik/i.test(text)) tags.push("pravilnik");
  if (/zakon/i.test(text)) tags.push("zakon");
  if (/izmjena|dopuna|amandman|novelacija|revizija/i.test(text)) tags.push("izmjena");
  if (/tender|postupak/i.test(text)) tags.push("postupak");
  if (/žalba|prigovor/i.test(text)) tags.push("žalba");
  if (/ugovor|contract/i.test(text)) tags.push("ugovor");
  if (/odluka|decision/i.test(text)) tags.push("odluka");
  if (/uredba|regulation/i.test(text)) tags.push("uredba");
  if (/poticaj|grant|subvencij/i.test(text)) tags.push("poticaj");
  if (/ekonom|privred/i.test(text)) tags.push("ekonomija");
  if (/razvoj|development/i.test(text)) tags.push("razvoj");
  return tags;
}
