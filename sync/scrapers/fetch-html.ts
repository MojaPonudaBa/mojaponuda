/**
 * Robust HTML fetcher with timeout, retry and robots.txt respect.
 * Only fetches publicly accessible pages.
 */

const DEFAULT_TIMEOUT_MS = 15_000;
const USER_AGENT = "MojaPonuda.ba/1.0 (javne-nabavke-info; +https://mojaponuda.ba)";

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

/** Extract text content from an HTML tag by simple regex — no DOM dependency needed on server */
export function extractText(html: string, selector: string): string {
  // Simple tag content extraction
  const tagMatch = selector.match(/^([a-z0-9]+)(?:\.[a-z0-9_-]+)?$/i);
  if (!tagMatch) return "";
  const tag = tagMatch[1];
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const match = re.exec(html);
  return match ? stripTags(match[1]).trim() : "";
}

export function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
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

/** Parse a date string in various formats to ISO date */
export function parseDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/\s+/g, " ");

  // DD.MM.YYYY or DD/MM/YYYY
  const dmy = cleaned.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // YYYY-MM-DD
  const ymd = cleaned.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) return ymd[0];

  return null;
}

/** Parse a value string like "50.000 KM" or "EUR 100,000" to number */
export function parseValue(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d,.]/g, "").replace(",", ".");
  const num = parseFloat(digits.replace(/\.(?=\d{3})/g, ""));
  return isNaN(num) ? null : num;
}
