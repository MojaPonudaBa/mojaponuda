/**
 * Data Quality Filtering System
 * 
 * Filters out low-quality opportunities before processing.
 * Focus on quality over quantity - only process relevant, complete items.
 * 
 * Requirements: 2.13, 3.2
 * Preservation: Keep existing scoreOpportunity function, same scoring logic
 */

import type { ScrapedOpportunity } from "./types";

/**
 * Quality filter result
 */
export interface QualityFilterResult {
  passed: boolean;
  reason?: string;
  relevanceScore?: number;
}

/**
 * Relevance keywords for grant/incentive opportunities
 */
const POSITIVE_KEYWORDS = [
  "grant",
  "poticaj",
  "poticaja",
  "subvencij",
  "subvencija",
  "javni poziv",
  "konkurs",
  "poziv",
  "finansij",
  "sredstv",
  "dodjel",
  "potpora",
  "program",
];

/**
 * Negative keywords that reduce relevance
 * (unless combined with positive context)
 */
const NEGATIVE_KEYWORDS = [
  "zaposlenje",
  "zaposlen",
  "obavijest",
  "obavještenje",
  "natječaj",
];

/**
 * Items with these keywords in the TITLE are NOT business opportunities.
 * They're appointment notices, board member selections, etc.
 */
const IRRELEVANT_TITLE_PATTERNS = [
  /imenovanje/i,
  /izbor\s+(članova|predsjedavajućeg|direktora|zamjenika|člana)/i,
  /skupštin[aei]\s+(turisti|zajednic|općin)/i,
  /razrješenj/i,
  /postavljenj/i,
  /komisij[aeu]\s+za\s+(izbor|imenovanje)/i,
  /nadzorn[io]\s+odbor/i,
  /upravn[io]\s+odbor/i,
  // Personal certifications / licenses — not business grants
  /sticanje zvanja/i,
  /instruktor[a-z]*\s+vožnje/i,
  /polaganje.*ispita/i,
  /stručni ispit/i,
  /vozačk[aeiou]/i,
  /licenc[aeiou]\s+(za|o)\s+(lov|ribolov|pecar)/i,
  // Internal government / administrative notices
  /sistematizacij/i,
  /pravilnik\s+o\s+unutrašnj/i,
  /interni oglas/i,
  /prijem.*državn.*služb/i,
];

/**
 * Titles that are clearly scraped HTML artifacts / navigation elements.
 * These are NOT opportunity titles.
 */
const GARBAGE_TITLE_PATTERNS = [
  /^glavna navigacija$/i,
  /^navigacija$/i,
  /^pretraga$/i,
  /^meni$/i,
  /^menu$/i,
  /^footer$/i,
  /^podnožje$/i,
  /^kontakt$/i,
  /^linkovi$/i,
  /^korisni linkovi$/i,
  /^brzi linkovi$/i,
  /^sadržaj$/i,
  /^breadcrumb/i,
  /^copyright/i,
  /^\s*$/,
  // HTML entities / fragments
  /^&[a-z]+;/i,
  /^<[a-z]/i,
  // Just a site/ministry name with no specific call
  /^ministarstvo\s+\w+\s+kantons?k?o?g?a?\s+\w+$/i,
  // Spaced-letter titles: "J A V N I P O Z I V"
  /^([A-ZČĆŠĐŽ]\s+){3,}[A-ZČĆŠĐŽ]\s*$/,
];

/**
 * Detect garbage descriptions (footer/contact info scraped instead of content).
 * If description is mostly phone numbers, emails, copyright, social media links.
 */
function isGarbageDescription(desc: string | null): boolean {
  if (!desc) return false;
  const text = desc.trim();
  if (text.length < 20) return false;

  // Count garbage signals
  let signals = 0;
  if (/\+387/.test(text)) signals++;
  if (/@/.test(text) && /\.ba/.test(text)) signals++;
  if (/copyright|©|&copy;|sva prava/i.test(text)) signals++;
  if (/pratite nas|društvenim mrežama/i.test(text)) signals++;
  if (/politika privatnosti|uslovi poslovanja/i.test(text)) signals++;
  if (/preuzmite.*aplikacij/i.test(text)) signals++;
  if (/kolačić|cookie/i.test(text)) signals++;
  if (/slažem se|accept|saznaj više/i.test(text)) signals++;
  if (/izrada:\s/i.test(text)) signals++;
  if (/zavod za informatiku/i.test(text)) signals++;
  if (/web:\s|fax:\s/i.test(text)) signals++;
  if (/designed by|powered by/i.test(text)) signals++;
  // If the "description" is mostly a site footer
  if (signals >= 2) return true;
  // Single strong signal: description is just copyright line
  if (/^&copy;/i.test(text) || /^©/i.test(text)) return true;

  // If it's just the page title repeated as description
  if (text.split(/\s+/).length < 4) return true;

  return false;
}

/**
 * Employment-related positive keywords
 * (make employment announcements relevant if they're about grants)
 */
const EMPLOYMENT_GRANT_KEYWORDS = [
  "poticaj za zapošljavanje",
  "subvencija za zapošljavanje",
  "grant za zapošljavanje",
  "potpora za zapošljavanje",
];

/**
 * Announcement-related positive keywords
 * (make announcements relevant if they're about grants)
 */
const GRANT_ANNOUNCEMENT_KEYWORDS = [
  "obavijest o pozivu",
  "obavještenje o konkursu",
  "obavijest o grantu",
  "obavještenje o poticaju",
];

/**
 * Apply quality filtering rules to an opportunity
 * 
 * @param item - Scraped opportunity to filter
 * @returns Filter result with pass/fail and reason
 */
export function applyQualityFilter(item: ScrapedOpportunity): QualityFilterResult {
  // Rule 1: Must have a title (at least 10 chars)
  if (!item.title || item.title.trim().length < 10) {
    return { passed: false, reason: "Title too short or missing (< 10 chars)" };
  }

  // Rule 2: Reject items that are NOT business opportunities (appointments, board nominations)
  for (const pattern of IRRELEVANT_TITLE_PATTERNS) {
    if (pattern.test(item.title)) {
      return { passed: false, reason: `Irrelevant: title matches '${pattern.source}' (appointment/nomination, not a grant)` };
    }
  }

  // Rule 3: Reject garbage descriptions (footer/contact info)
  if (isGarbageDescription(item.description)) {
    // Clear garbage description so it doesn't pollute DB if item passes other checks
    item.description = null;
  }

  // Rule 4: Reject garbage titles (HTML artifacts, nav elements, footer)
  for (const pattern of GARBAGE_TITLE_PATTERNS) {
    if (pattern.test(item.title.trim())) {
      return { passed: false, reason: `Garbage title: '${item.title}' (HTML artifact or navigation element)` };
    }
  }

  // Rule 4b: Reject spaced-letter titles ("J A V N I P O Z I V" pattern)
  {
    const words = item.title.trim().split(/\s+/);
    const singleCharWords = words.filter((w) => w.length === 1).length;
    if (words.length >= 4 && singleCharWords / words.length >= 0.6) {
      return { passed: false, reason: `Garbage title: '${item.title}' (spaced letter formatting)` };
    }
  }

  // Rule 5: If title is too generic (e.g. just "Javni pozivi"), reject
  const genericTitles = [/^javni pozivi?$/i, /^obavijest$/i, /^novosti$/i, /^aktuelno$/i, /^početna$/i, /^pregled$/i, /^arhiva$/i, /^dokumenti$/i];
  for (const pattern of genericTitles) {
    if (pattern.test(item.title.trim())) {
      return { passed: false, reason: `Generic title: '${item.title}' (not a specific opportunity)` };
    }
  }

  // Rule 6: Reject if both title AND description look like garbage
  if (isGarbageDescription(item.description) && item.title.split(/\s+/).length <= 3) {
    return { passed: false, reason: `Garbage item: short title '${item.title}' + garbage description` };
  }

  // Rule 7: Deadline must not be expired (only if deadline exists)
  if (item.deadline) {
    const deadlineDate = new Date(item.deadline);
    const now = new Date();
    if (deadlineDate < now) {
      return { passed: false, reason: "Deadline has expired" };
    }
  }

  // Rule 6: Must be relevant (keyword matching) - lowered threshold
  const relevanceScore = calculateRelevanceScore(item);
  if (relevanceScore < 0.1) {
    return { passed: false, reason: "Not relevant (low keyword match)", relevanceScore };
  }

  return { passed: true, relevanceScore };
}

/**
 * Calculate relevance score based on keyword matching
 * 
 * Score calculation:
 * - Positive keywords: +0.2 per match
 * - Negative keywords: -0.15 per match
 * - Employment grant context: +0.3 (overrides negative employment keywords)
 * - Grant announcement context: +0.3 (overrides negative announcement keywords)
 * - Has clear value: +0.2
 * - Has deadline: +0.1
 * - Has requirements: +0.1
 * 
 * @param item - Scraped opportunity
 * @returns Relevance score (0-1)
 */
export function calculateRelevanceScore(item: ScrapedOpportunity): number {
  const text = [
    item.title,
    item.description,
    item.requirements,
    item.category,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let score = 0;

  // Check for positive keywords
  let positiveMatches = 0;
  for (const keyword of POSITIVE_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) {
      positiveMatches++;
      score += 0.2;
    }
  }

  // Check for negative keywords
  let negativeMatches = 0;
  for (const keyword of NEGATIVE_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) {
      negativeMatches++;
      score -= 0.15;
    }
  }

  // Check for employment grant context (overrides negative employment keywords)
  for (const keyword of EMPLOYMENT_GRANT_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) {
      score += 0.3;
      break;
    }
  }

  // Check for grant announcement context (overrides negative announcement keywords)
  for (const keyword of GRANT_ANNOUNCEMENT_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) {
      score += 0.3;
      break;
    }
  }

  // Boost score for items with clear value
  if (item.value && item.value > 0) {
    score += 0.2;
  }

  // Boost score for items with deadline
  if (item.deadline) {
    score += 0.1;
  }

  // Boost score for items with requirements
  if (item.requirements && item.requirements.length > 30) {
    score += 0.1;
  }

  // Normalize score to 0-1 range
  return Math.max(0, Math.min(1, score));
}

/**
 * Filter an array of opportunities, returning only those that pass quality checks
 * 
 * @param items - Array of scraped opportunities
 * @returns Filtered array and statistics
 */
export function filterOpportunities(items: ScrapedOpportunity[]): {
  filtered: ScrapedOpportunity[];
  stats: {
    total: number;
    passed: number;
    failed: number;
    reasons: Record<string, number>;
  };
} {
  const filtered: ScrapedOpportunity[] = [];
  const reasons: Record<string, number> = {};
  let passed = 0;
  let failed = 0;

  for (const item of items) {
    const result = applyQualityFilter(item);
    
    if (result.passed) {
      filtered.push(item);
      passed++;
    } else {
      failed++;
      const reason = result.reason ?? "Unknown";
      reasons[reason] = (reasons[reason] ?? 0) + 1;
    }
  }

  return {
    filtered,
    stats: {
      total: items.length,
      passed,
      failed,
      reasons,
    },
  };
}
