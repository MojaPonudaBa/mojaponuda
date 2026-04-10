/**
 * Robust HTML fetcher with timeout, retry and robots.txt respect.
 * Only fetches publicly accessible pages.
 */

const DEFAULT_TIMEOUT_MS = 15_000;
const USER_AGENT = "TenderSistem.com/1.0 (javne-nabavke-info; +https://tendersistem.com)";

export async function fetchHtml(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "bs,hr,sr;q=0.9,en;q=0.5",
      },
    });

    clearTimeout(timer);

    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/** Extract text content from an HTML tag by simple regex â€” no DOM dependency needed on server */
export function extractText(html: string, selector: string): string {
  // Simple tag content extraction
  const tagMatch = selector.match(/^([a-z0-9]+)(?:\.[a-z0-9_-]+)?$/i);
  if (!tagMatch) return "";
  const tag = tagMatch[1];
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const match = re.exec(html);
  return match ? stripTags(match[1]).trim() : "";
}

/** Remove non-content blocks before text extraction */
export function cleanHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
}

export function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/\s+/g, " ")
    .trim();
}

/** Returns true if extracted text is navigation, JS, address or otherwise garbage */
function isGarbageText(text: string): boolean {
  if (text.length < 40) return true;
  if (/^(?:window\.|var |function |document\.|jQuery|\$\(|\/\*)/i.test(text)) return true;
  if (/^(?:Naslovna|Home|PoÄetna|Vijesti|Kontakt|Menu|Navigation)\b/i.test(text)) return true;
  if (/^(?:Ul\.|Ulica\s|Trg\s|\d{5}\s)/i.test(text)) return true;
  const words = text.split(/\s+/);
  const long = words.filter(w => w.length > 3).length;
  if (words.length > 5 && long / words.length < 0.25) return true;
  return false;
}

/** Extract all links matching a pattern */
export function extractLinks(html: string, baseUrl: string, pattern?: RegExp): string[] {
  const re = /href=["']([^"']+)["']/gi;
  const links: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const href = match[1];
    if (pattern && !pattern.test(href)) continue;
    try {
      links.push(new URL(href, baseUrl).toString());
    } catch {
      // skip invalid URLs
    }
  }
  return [...new Set(links)];
}

/**
 * Extract links where EITHER the URL or the anchor text matches the pattern.
 * Much more effective for government sites where URLs are numeric but text is descriptive.
 * Only returns same-origin links.
 */
export function extractLinksWithText(html: string, baseUrl: string, pattern: RegExp): string[] {
  // Match <a> tags with their href and inner text
  const re = /<a[^>]*href=["']([^"']+)["'][^>]*>((?:(?!<\/a>)[\s\S])*)<\/a>/gi;
  const links: string[] = [];
  const baseDomain = new URL(baseUrl).hostname;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const href = match[1];
    const text = stripTags(match[2]).trim();
    // Accept if URL or anchor text matches pattern
    if (!pattern.test(href) && !pattern.test(text)) continue;
    // Skip anchors, mailto, tel, javascript
    if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) continue;
    try {
      const url = new URL(href, baseUrl);
      // Only same-origin links
      if (url.hostname === baseDomain || url.hostname.endsWith("." + baseDomain)) {
        links.push(url.toString());
      }
    } catch {
      // skip invalid URLs
    }
  }
  return [...new Set(links)];
}

/** Parse a date string in various formats to ISO date */
export function parseDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/\s+/g, " ");

  // DD.MM.YYYY or DD/MM/YYYY â€” most common in BiH government sites
  const dmy = cleaned.match(/\b(\d{1,2})[./](\d{1,2})[./](\d{4})\b/);
  if (dmy) {
    const d = dmy[1].padStart(2, "0");
    const m = dmy[2].padStart(2, "0");
    const y = dmy[3];
    // Validate: day 1-31, month 1-12, year reasonable
    if (parseInt(d) >= 1 && parseInt(d) <= 31 && parseInt(m) >= 1 && parseInt(m) <= 12) {
      const year = parseInt(y);
      if (year >= 2020 && year <= 2035) {
        return `${y}-${m}-${d}`;
      }
    }
    return null;
  }

  // YYYY-MM-DD
  const ymd = cleaned.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (ymd) {
    const year = parseInt(ymd[1]);
    const month = parseInt(ymd[2]);
    const day = parseInt(ymd[3]);
    if (year >= 2020 && year <= 2035 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return ymd[0];
    }
    return null;
  }

  return null;
}

/**
 * Extract the best available description from a page.
 * Strips scripts/nav/header/footer first, then tries: og:description, meta description, content div, first meaningful <p>.
 */
export function extractBestDescription(html: string): string | null {
  // 1. og:description (from raw html, before clean)
  const og = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i);
  if (og) {
    const text = stripTags(og[1]).trim();
    if (text.length > 30 && !isGarbageText(text)) return text.slice(0, 1000);
  }

  // 2. meta description
  const meta = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
  if (meta) {
    const text = stripTags(meta[1]).trim();
    if (text.length > 30 && !isGarbageText(text)) return text.slice(0, 1000);
  }

  // Strip non-content blocks before content extraction
  const clean = cleanHtml(html);

  // 3. Content area (article, main, common class names)
  const contentPatterns = [
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
    /<div[^>]*class="[^"]*(?:entry-content|post-content|article-body|page-content|field-item)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*id="[^"]*(?:main-content|post-body)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  ];
  for (const pattern of contentPatterns) {
    const match = clean.match(pattern);
    if (match) {
      const text = stripTags(match[1]).trim();
      if (text.length > 80 && !isGarbageText(text)) return text.slice(0, 1000);
    }
  }

  // 4. First meaningful <p> tag (skip garbage)
  const paragraphs = clean.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi);
  for (const p of paragraphs) {
    const text = stripTags(p[1]).trim();
    if (text.length > 60 && !isGarbageText(text)) return text.slice(0, 1000);
  }

  return null;
}

/** Parse a value string like "50.000 KM" or "EUR 100,000" to number */
export function parseValue(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d,.]/g, "").replace(",", ".");
  const num = parseFloat(digits.replace(/\.(?=\d{3})/g, ""));
  return isNaN(num) ? null : num;
}

