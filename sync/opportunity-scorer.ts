import type { ScrapedOpportunity } from "./scrapers/types";

/**
 * Quality scoring for opportunities.
 * Returns 0-100. Only opportunities with score >= 40 get published.
 */
export function scoreOpportunity(item: ScrapedOpportunity): number {
  let score = 0;

  // Title quality (0-20)
  if (item.title.length >= 20) score += 10;
  if (item.title.length >= 40) score += 10;

  // Has description (0-20)
  if (item.description && item.description.length >= 50) score += 10;
  if (item.description && item.description.length >= 200) score += 10;

  // Has deadline (0-20)
  if (item.deadline) {
    score += 10;
    // Deadline in future
    const daysLeft = Math.ceil((new Date(item.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft > 7) score += 10;
  }

  // Has value (0-15)
  if (item.value && item.value > 0) {
    score += 10;
    if (item.value >= 10_000) score += 5;
  }

  // Has requirements (0-10)
  if (item.requirements && item.requirements.length >= 30) score += 10;

  // Has eligibility signals (0-5)
  if (item.eligibility_signals.length > 0) score += 5;

  // Has location (0-5)
  if (item.location) score += 5;

  // Penalty: too short title
  if (item.title.length < 15) score -= 20;

  // Penalty: no description and no requirements
  if (!item.description && !item.requirements) score -= 15;

  return Math.max(0, Math.min(100, score));
}

export const PUBLISH_THRESHOLD = 20;

/** Generate a URL-safe slug from title */
export function generateSlug(title: string, type: "tender" | "poticaj", id: string): string {
  const base = title
    .toLowerCase()
    .replace(/[šđžčć]/g, (c) => ({ š: "s", đ: "d", ž: "z", č: "c", ć: "c" }[c] ?? c))
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60)
    .replace(/^-|-$/g, "");

  const shortId = id.slice(0, 8);
  return `${type === "poticaj" ? "poticaj" : "tender"}/${base}-${shortId}`;
}
