/**
 * Scores a poticaj/grant against a company's profile.
 * Used to build the "Poticaji za Vas" personalised section.
 *
 * Scoring:
 *  +2 per keyword match in title / category / summary
 *  +4 if opportunity location matches a company operating region
 *  +2 if opportunity is BiH-wide / entity-wide (relevant for everyone with regions set)
 */

interface MatchableOpportunity {
  id: string;
  title: string;
  category: string | null;
  location: string | null;
  ai_summary: string | null;
}

interface CompanyMatchProfile {
  keywords: string[] | null;
  operating_regions: string[] | null;
}

export function scoreOpportunityForCompany(
  opp: MatchableOpportunity,
  company: CompanyMatchProfile
): number {
  const keywords = (company.keywords ?? []).filter((k) => k.trim().length >= 2);
  const regions = company.operating_regions ?? [];

  if (keywords.length === 0 && regions.length === 0) return 0;

  let score = 0;
  const oppText =
    `${opp.title} ${opp.category ?? ""} ${opp.ai_summary ?? ""}`.toLowerCase();

  for (const kw of keywords) {
    if (oppText.includes(kw.trim().toLowerCase())) {
      score += 2;
    }
  }

  if (opp.location && regions.length > 0) {
    const loc = opp.location.toLowerCase();
    const hit = regions.some((r) => {
      const rl = r.toLowerCase();
      return loc.includes(rl) || rl.includes(loc);
    });
    if (hit) {
      score += 4;
    } else if (
      /bosna|bih|federacij|republika srpska|entitet/i.test(opp.location)
    ) {
      score += 2;
    }
  }

  return score;
}

export const GRANT_MATCH_THRESHOLD = 2;
