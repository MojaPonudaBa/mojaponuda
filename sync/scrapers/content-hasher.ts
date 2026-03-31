/**
 * Content Hashing and Change Detection System
 * 
 * Generates content hashes to detect NEW, UPDATED, UNCHANGED, and EXPIRING opportunities.
 * Prevents duplicate content from appearing multiple times from different URLs.
 */

import { createHash } from "crypto";
import type { ScrapedOpportunity } from "./types";

export interface ContentHash {
  hash: string;
  status: "NEW" | "UPDATED" | "UNCHANGED" | "EXPIRING";
}

/**
 * Generate SHA-256 hash of opportunity content
 * Hash includes: title + description + deadline + value
 */
export function generateContentHash(opportunity: ScrapedOpportunity): string {
  const content = [
    opportunity.title?.trim() ?? "",
    opportunity.description?.trim() ?? "",
    opportunity.deadline ?? "",
    opportunity.value?.toString() ?? "",
  ].join("|");

  return createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Detect change status by comparing new hash with existing hash
 */
export function detectChangeStatus(
  newHash: string,
  existingHash: string | null,
  deadline: string | null
): "NEW" | "UPDATED" | "UNCHANGED" | "EXPIRING" {
  // No existing hash = NEW opportunity
  if (!existingHash) return "NEW";

  // Hash changed = UPDATED opportunity
  if (newHash !== existingHash) return "UPDATED";

  // Check if deadline is approaching (within 7 days)
  if (deadline && isDeadlineApproaching(deadline)) return "EXPIRING";

  // Hash matches and not expiring = UNCHANGED
  return "UNCHANGED";
}

/**
 * Check if deadline is within 7 days
 */
function isDeadlineApproaching(deadline: string): boolean {
  try {
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDeadline > 0 && daysUntilDeadline <= 7;
  } catch {
    return false;
  }
}

/**
 * Check if content is duplicate based on hash
 * Returns true if hash already exists in provided hash set
 */
export function isDuplicateContent(hash: string, existingHashes: Set<string>): boolean {
  return existingHashes.has(hash);
}

/**
 * Batch process opportunities to detect duplicates and changes
 */
export interface ProcessedOpportunity extends ScrapedOpportunity {
  content_hash: string;
  change_status: "NEW" | "UPDATED" | "UNCHANGED" | "EXPIRING";
  is_duplicate: boolean;
}

export function processOpportunitiesWithHashing(
  opportunities: ScrapedOpportunity[],
  existingHashMap: Map<string, string> // external_id -> content_hash
): ProcessedOpportunity[] {
  const seenHashes = new Set<string>();
  const processed: ProcessedOpportunity[] = [];

  for (const opp of opportunities) {
    const hash = generateContentHash(opp);
    const existingHash = existingHashMap.get(opp.external_id) ?? null;
    const changeStatus = detectChangeStatus(hash, existingHash, opp.deadline);
    const isDuplicate = isDuplicateContent(hash, seenHashes);

    seenHashes.add(hash);

    processed.push({
      ...opp,
      content_hash: hash,
      change_status: changeStatus,
      is_duplicate: isDuplicate,
    });
  }

  return processed;
}

