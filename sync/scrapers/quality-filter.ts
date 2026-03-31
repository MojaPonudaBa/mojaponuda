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
  "oglas",
  "natječaj",
];

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

  // Rule 2: Must have some description (at least 20 chars) - relaxed
  if (!item.description || item.description.trim().length < 20) {
    return { passed: false, reason: "Description too short or missing (< 20 chars)" };
  }

  // Rule 3: Deadline must not be expired (only if deadline exists)
  if (item.deadline) {
    const deadlineDate = new Date(item.deadline);
    const now = new Date();
    if (deadlineDate < now) {
      return { passed: false, reason: "Deadline has expired" };
    }
  }

  // Rule 4: Must be relevant (keyword matching) - lowered threshold
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
