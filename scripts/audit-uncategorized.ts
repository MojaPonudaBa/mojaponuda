/**
 * Mjeri koliko aktivnih tendera NIJE pokriveno nijednom od 22 postojećih
 * OFFERING_CATEGORY_OPTIONS (po keyword + CPV retrievalu). Prikazuje top
 * CPV-ove i primjere naslova u "tamnoj materiji" — ovo su tenderi koje
 * keyword/CPV retrieval nikada neće dovući i oslanjaju se isključivo na
 * pgvector sličnost profila.
 *
 *   npx tsx scripts/audit-uncategorized.ts
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import {
  OFFERING_CATEGORY_OPTIONS,
  buildBroadRetrievalCpvPrefixes,
  buildRetrievalKeywordSeeds,
  type ParsedCompanyProfile,
} from "../lib/company-profile";
import { expandKeywordVariants } from "../lib/cyrillic-transliterate";

function simulate(categoryId: string): ParsedCompanyProfile {
  const opt = OFFERING_CATEGORY_OPTIONS.find((o) => o.id === categoryId);
  return {
    primaryIndustry: opt?.focusId ?? null,
    offeringCategories: [categoryId],
    specializationIds: [],
    preferredTenderTypes: [],
    companyDescription: null,
    legacyIndustryText: null,
    manualKeywords: [],
  };
}

async function matchCategoryIds(
  s: any,
  keywords: string[],
  cpvPrefixes: string[]
): Promise<Set<string>> {
  if (keywords.length === 0 && cpvPrefixes.length === 0) return new Set();
  const escape = (t: string) =>
    t.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_").replace(/,/g, " ");
  const conds: string[] = [];
  for (const k of keywords.slice(0, 30)) {
    for (const variant of expandKeywordVariants(k)) {
      const term = escape(variant);
      if (!term) continue;
      conds.push(`title.ilike.%${term}%`);
      conds.push(`raw_description.ilike.%${term}%`);
    }
  }
  for (const p of cpvPrefixes.slice(0, 12)) {
    const term = escape(p.trim());
    if (!term) continue;
    conds.push(`cpv_code.ilike.${term}%`);
  }
  if (conds.length === 0) return new Set();
  const nowIso = new Date().toISOString();
  const ids = new Set<string>();
  let from = 0;
  const pageSize = 1000;
  for (;;) {
    const { data, error } = await s
      .from("tenders")
      .select("id")
      .or(conds.join(","))
      .or(`deadline.gt.${nowIso},deadline.is.null`)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const rows = data ?? [];
    for (const r of rows as Array<{ id: string }>) ids.add(r.id);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return ids;
}

async function loadAllActive(s: any): Promise<Array<{ id: string; title: string; cpv: string | null }>> {
  const nowIso = new Date().toISOString();
  const out: Array<{ id: string; title: string; cpv: string | null }> = [];
  let from = 0;
  const pageSize = 1000;
  for (;;) {
    const { data, error } = await s
      .from("tenders")
      .select("id, title, cpv_code")
      .or(`deadline.gt.${nowIso},deadline.is.null`)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const rows = (data ?? []) as Array<{ id: string; title: string | null; cpv_code: string | null }>;
    for (const r of rows) out.push({ id: r.id, title: r.title ?? "", cpv: r.cpv_code ?? null });
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  console.log("Loading all active tenders...");
  const allActive = await loadAllActive(s);
  console.log(`Active tenders: ${allActive.length}\n`);

  const union = new Set<string>();
  const perCategory: Array<{ id: string; label: string; matches: number }> = [];

  for (const opt of OFFERING_CATEGORY_OPTIONS) {
    const profile = simulate(opt.id);
    const keywords = buildRetrievalKeywordSeeds(profile);
    const cpvPrefixes = buildBroadRetrievalCpvPrefixes(profile);
    const ids = await matchCategoryIds(s, keywords, cpvPrefixes);
    for (const id of ids) union.add(id);
    perCategory.push({ id: opt.id, label: opt.label, matches: ids.size });
  }

  const coveredCount = union.size;
  const uncovered = allActive.filter((t) => !union.has(t.id));
  const coveragePct = ((coveredCount / allActive.length) * 100).toFixed(1);

  console.log(`Covered by ≥1 category: ${coveredCount} / ${allActive.length} (${coveragePct}%)`);
  console.log(`Uncovered (dark matter): ${uncovered.length}\n`);

  // CPV histogram of uncovered
  const cpvHist = new Map<string, number>();
  const cpv2Hist = new Map<string, number>();
  for (const t of uncovered) {
    const cpv = (t.cpv ?? "").trim();
    if (!cpv) {
      cpvHist.set("(none)", (cpvHist.get("(none)") ?? 0) + 1);
      cpv2Hist.set("(none)", (cpv2Hist.get("(none)") ?? 0) + 1);
      continue;
    }
    const cpv2 = cpv.slice(0, 2);
    cpvHist.set(cpv, (cpvHist.get(cpv) ?? 0) + 1);
    cpv2Hist.set(cpv2, (cpv2Hist.get(cpv2) ?? 0) + 1);
  }

  console.log("Top CPV 2-digit groups among uncovered tenders:");
  const cpv2Sorted = [...cpv2Hist.entries()].sort((a, b) => b[1] - a[1]);
  for (const [code, n] of cpv2Sorted.slice(0, 25)) {
    console.log(`  ${code.padEnd(6)} ${String(n).padStart(5)}  ${((n / uncovered.length) * 100).toFixed(1)}%`);
  }

  console.log("\nTop exact CPV codes among uncovered tenders:");
  const cpvSorted = [...cpvHist.entries()].sort((a, b) => b[1] - a[1]);
  for (const [code, n] of cpvSorted.slice(0, 25)) {
    console.log(`  ${code.padEnd(10)} ${String(n).padStart(5)}`);
  }

  console.log("\nSample uncovered titles (first 30):");
  for (const t of uncovered.slice(0, 30)) {
    console.log(`  [${(t.cpv ?? "----").padEnd(10)}] ${t.title.slice(0, 120)}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
