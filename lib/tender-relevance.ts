import type { SupabaseClient } from "@supabase/supabase-js";
import { getOpenAIClient } from "@/lib/openai";
import {
  buildTenderEmbeddingText,
  generateEmbeddings,
  toPgVector,
} from "@/lib/embeddings";
import {
  buildBroadRetrievalCpvPrefixes,
  buildRetrievalKeywordSeeds,
  parseCompanyProfile,
} from "@/lib/company-profile";
import { expandKeywordVariants } from "@/lib/cyrillic-transliterate";
import { timed } from "@/lib/performance-log";
import type { Database } from "@/types/database";

// ── Constants ─────────────────────────────────────────────────────────
export const RELEVANCE_MODEL_VERSION = "gpt-4o-mini-v1";
export const RETRIEVAL_TOP_K = 500;
export const KEYWORD_RETRIEVAL_LIMIT = 500;
// Max UUIDs to pack into a single Supabase `.in(...)` filter.
// Supabase PostgREST silently truncates URLs above ~8 KB, which with 36-char
// UUIDs translates to roughly 200 items before results start disappearing.
export const IN_CHUNK_SIZE = 200;
export const LLM_BATCH_SIZE = 7;
export const LLM_MAX_PARALLEL = 10;
export const LLM_BATCH_DELAY_MS = 300;

export type RelevanceTier = "top" | "maybe" | "hidden";

export function classifyTier(score: number): RelevanceTier {
  if (score >= 8) return "top";
  if (score >= 5) return "maybe";
  return "hidden";
}

export interface RelevanceScore {
  tender_id: string;
  score: number; // 1-10
  confidence: number; // 1-5
}

export interface ScoredTender<T = Record<string, unknown>> {
  tender: T;
  score: number;
  confidence: number;
  similarity?: number;
  tier: RelevanceTier;
}

// ── LLM prompt ────────────────────────────────────────────────────────
const SYSTEM_PROMPT =
  "Ti si expert za javne nabavke u Bosni i Hercegovini. Procjenjuješ može li firma realno konkurisati na tender na osnovu svoje djelatnosti. Odgovori SAMO validnim JSON nizom bez ikakvog dodatnog teksta, objašnjenja ili markdown formatiranja.";

function buildUserPrompt(
  profileText: string,
  industry: string | null,
  tenders: Array<{ id: string; title: string; short: string | null; cpv: string | null }>
): string {
  return [
    "Firma:",
    `- Industrija: ${industry ?? "nepoznato"}`,
    `- Opis: ${profileText}`,
    "",
    "Tenderi:",
    JSON.stringify(
      tenders.map((t) => ({
        id: t.id,
        title: t.title,
        opis: (t.short ?? "").slice(0, 400),
        cpv: t.cpv,
      })),
      null,
      2
    ),
    "",
    "Vrati JSON listu s score (1-10) i confidence (1-5) za svaki tender.",
    'Format: [{"tender_id":"...","score":n,"confidence":n}]',
    "Score: 1-3 nerelevantno, 4-6 možda, 7-8 relevantno, 9-10 vrlo relevantno.",
  ].join("\n");
}

function parseScoresResponse(text: string): RelevanceScore[] {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  // When response_format is json_object, the API forces the reply to be a
  // JSON object, so the model picks an arbitrary key name ("tenders",
  // "scores", "results", "items", …) to wrap the array. Accept any array
  // value found on the root — do NOT hard-code a key name. Also accept a
  // bare array for robustness against loosely-formatted replies.
  let arr: unknown = null;
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      arr = parsed;
    } else if (parsed && typeof parsed === "object") {
      for (const value of Object.values(parsed as Record<string, unknown>)) {
        if (Array.isArray(value)) {
          arr = value;
          break;
        }
      }
    }
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .map((raw) => {
      const it = raw as Record<string, unknown>;
      const tid = String(it.tender_id ?? it.id ?? "").trim();
      const score = Math.max(1, Math.min(10, Math.round(Number(it.score ?? 0))));
      const confidence = Math.max(
        1,
        Math.min(5, Math.round(Number(it.confidence ?? 3)))
      );
      return { tender_id: tid, score, confidence };
    })
    .filter((it) => it.tender_id.length > 0);
}

async function scoreBatch(
  profileText: string,
  industry: string | null,
  tenders: Array<{ id: string; title: string; short: string | null; cpv: string | null }>
): Promise<RelevanceScore[]> {
  if (tenders.length === 0) return [];
  const openai = getOpenAIClient();
  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(profileText, industry, tenders) },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    });
    const content = resp.choices[0]?.message?.content ?? "[]";
    return parseScoresResponse(content);
  } catch (err) {
    console.error("[tender-relevance] scoreBatch error:", err);
    return [];
  }
}

// Bounded-concurrency pool
async function runPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
  delayBetweenMs = 0
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function run() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
      if (delayBetweenMs > 0 && next < items.length) {
        await new Promise((r) => setTimeout(r, delayBetweenMs));
      }
    }
  }
  const parallel = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: parallel }, run));
  return results;
}

// ── Retrieval via pgvector (Step A) ───────────────────────────────────
export async function retrieveEmbeddingCandidates(
  supabase: SupabaseClient<Database>,
  profileEmbedding: number[] | string,
  options: { topK?: number; nowIso?: string } = {}
): Promise<Array<{ id: string; similarity: number }>> {
  const vec =
    typeof profileEmbedding === "string"
      ? profileEmbedding
      : toPgVector(profileEmbedding);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(
    "match_tenders_by_embedding",
    {
      query_embedding: vec,
      match_count: options.topK ?? RETRIEVAL_TOP_K,
      now_iso: options.nowIso ?? new Date().toISOString(),
    }
  );
  if (error) {
    console.error("[tender-relevance] match_tenders_by_embedding RPC error:", error);
    return [];
  }
  return (data ?? []).map(
    (r: { id: string; similarity: number }) => ({
      id: r.id,
      similarity: r.similarity,
    })
  );
}

// ── Retrieval via keywords + CPV prefixes (complementary recall) ──────
// The embedding captures the gist of what a company does but can bury
// long-tail category matches in the similarity ranking. For example, a
// profile heavy on "servers and networks" may push pure software tenders
// below topK even though the company explicitly selected
// "software_licenses" as an offering category. This function compensates
// by fetching active tenders whose title / description / CPV code match
// the company's onboarding categories. The final LLM gate (>=6) prevents
// false positives from slipping through.
export async function retrieveKeywordCandidates(
  supabase: SupabaseClient<Database>,
  keywords: string[],
  cpvPrefixes: string[],
  options: { limit?: number; nowIso?: string } = {}
): Promise<string[]> {
  if (keywords.length === 0 && cpvPrefixes.length === 0) return [];

  const limit = options.limit ?? KEYWORD_RETRIEVAL_LIMIT;
  const nowIso = options.nowIso ?? new Date().toISOString();

  const escapeIlike = (term: string) =>
    term.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_").replace(/,/g, " ");

  const keywordConds: string[] = [];
  for (const raw of keywords.slice(0, 30)) {
    // Expand each seed to BOTH latin and cyrillic forms. Bosnian/Croatian
    // tenders are written in latin; Republika Srpska tenders are written
    // in cyrillic. A latin-only seed like "vozil" cannot ILIKE-match
    // "Набавка возила", so we add "возил" as a second condition.
    for (const variant of expandKeywordVariants(raw)) {
      const term = escapeIlike(variant);
      if (!term) continue;
      keywordConds.push(`title.ilike.%${term}%`);
      keywordConds.push(`raw_description.ilike.%${term}%`);
    }
  }
  for (const prefix of cpvPrefixes.slice(0, 12)) {
    const term = escapeIlike(prefix.trim());
    if (!term) continue;
    keywordConds.push(`cpv_code.ilike.${term}%`);
  }

  if (keywordConds.length === 0) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("tenders")
    .select("id, deadline")
    .or(keywordConds.join(","))
    .or(`deadline.gt.${nowIso},deadline.is.null`)
    .order("deadline", { ascending: true, nullsFirst: false })
    .limit(limit);

  const { data, error } = await query;
  if (error) {
    console.error("[tender-relevance] retrieveKeywordCandidates error:", error);
    return [];
  }
  return ((data ?? []) as Array<{ id: string }>).map((r) => r.id);
}

// ── Main entry point (Step A + Step B with cache) ─────────────────────
export interface GetRecommendedOptions {
  topK?: number;
  limit?: number;
  /** Minimum score to include in output (default 5 — hides "nerelevantno"). */
  minScore?: number;
  nowIso?: string;
  /** When true, return all scored items regardless of minScore (for admin/debug). */
  includeHidden?: boolean;
  /**
   * When true, missing relevance rows are scored with the model inline.
   * Page navigation should keep this false and rely on the background cache.
   */
  scoreMissing?: boolean;
}

interface CompanyRow {
  id: string;
  industry: string | null;
  profile_text: string | null;
  profile_embedding: unknown;
}

type SupabaseMaybeResult<T> = {
  data: T | null;
  error: { message?: string } | null;
};

type SupabaseListResult<T> = {
  data: T[] | null;
  error: { message?: string } | null;
};

export async function getRecommendedTenders<T extends { id: string } = Record<string, unknown> & { id: string }>(
  supabase: SupabaseClient<Database>,
  companyId: string,
  options: GetRecommendedOptions = {}
): Promise<Array<ScoredTender<T>>> {
  const topK = options.topK ?? RETRIEVAL_TOP_K;
  const limit = options.limit ?? 50;
  const minScore = options.includeHidden ? 0 : options.minScore ?? 5;

  // Load company
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: company, error: companyErr } = await timed<SupabaseMaybeResult<CompanyRow>>(
    "recommended.company",
    () =>
      (supabase as any)
        .from("companies")
        .select("id, industry, profile_text, profile_embedding")
        .eq("id", companyId)
        .maybeSingle(),
    { meta: { companyId } },
  );

  if (companyErr || !company) return [];
  const row = company as CompanyRow;
  const embedding = row.profile_embedding;
  if (embedding == null) return [];

  // Step A: hybrid retrieval — pgvector similarity UNION keyword/CPV match.
  //   (a) pgvector top-K: captures semantic fit from the profile embedding.
  //   (b) keyword/CPV: guarantees recall for every offering category the
  //       user explicitly selected in onboarding, even if the embedding
  //       happens to push those tenders below top-K.
  // The LLM gate >=6 later filters false positives from (b), so widening
  // recall here is safe and dramatically reduces missed matches.
  const [embeddingCandidates, keywordCandidateIds] = await timed(
    "recommended.retrieve_candidates",
    () => Promise.all([
      retrieveEmbeddingCandidates(supabase, embedding as number[] | string, {
        topK,
        nowIso: options.nowIso,
      }),
      (async () => {
      const parsed = parseCompanyProfile(row.industry);
      const keywords = buildRetrievalKeywordSeeds(parsed);
      const cpvPrefixes = buildBroadRetrievalCpvPrefixes(parsed);
      if (keywords.length === 0 && cpvPrefixes.length === 0) return [];
      return retrieveKeywordCandidates(supabase, keywords, cpvPrefixes, {
        nowIso: options.nowIso,
        limit: KEYWORD_RETRIEVAL_LIMIT,
      });
      })(),
    ]),
    { meta: { companyId, topK } },
  );

  if (embeddingCandidates.length === 0 && keywordCandidateIds.length === 0) return [];

  // Dedup while preserving similarity score for the embedding subset.
  const similarityById = new Map(embeddingCandidates.map((c) => [c.id, c.similarity]));
  const candidateIdSet = new Set<string>();
  for (const c of embeddingCandidates) candidateIdSet.add(c.id);
  for (const id of keywordCandidateIds) candidateIdSet.add(id);
  const candidateIds = [...candidateIdSet];

  // Cache lookup — chunked because Supabase truncates URLs with >~200 UUIDs
  // in a single `.in()` filter (silently returning 0 rows).
  const cached = new Map<string, { score: number; confidence: number }>();
  for (let i = 0; i < candidateIds.length; i += IN_CHUNK_SIZE) {
    const slice = candidateIds.slice(i, i + IN_CHUNK_SIZE);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingRows } = await timed<SupabaseListResult<{
      tender_id: string;
      score: number;
      confidence: number;
    }>>(
      "recommended.relevance_cache",
      () =>
        (supabase as any)
          .from("tender_relevance")
          .select("tender_id, score, confidence")
          .eq("company_id", companyId)
          .in("tender_id", slice),
      { thresholdMs: 250, meta: { companyId, count: slice.length } },
    );
    for (const r of (existingRows ?? []) as Array<{
      tender_id: string;
      score: number;
      confidence: number;
    }>) {
      cached.set(r.tender_id, { score: r.score, confidence: r.confidence });
    }
  }

  const missingIds = candidateIds.filter((id) => !cached.has(id));

  // Step B: LLM reranking for missing pairs (batched 7, max 10 parallel)
  if (missingIds.length > 0 && options.scoreMissing === true) {
    const rowsById = new Map<
      string,
      { id: string; title: string | null; raw_description: string | null; cpv_code: string | null }
    >();
    for (let i = 0; i < missingIds.length; i += IN_CHUNK_SIZE) {
      const slice = missingIds.slice(i, i + IN_CHUNK_SIZE);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: tenderRows } = await timed<SupabaseListResult<{
        id: string;
        title: string | null;
        raw_description: string | null;
        cpv_code: string | null;
      }>>(
        "recommended.load_missing_tenders",
        () =>
          (supabase as any)
            .from("tenders")
            .select("id, title, raw_description, cpv_code, contract_type, contracting_authority")
            .in("id", slice),
        { thresholdMs: 250, meta: { count: slice.length } },
      );
      for (const r of (tenderRows ?? []) as Array<{
        id: string;
        title: string | null;
        raw_description: string | null;
        cpv_code: string | null;
      }>) {
        rowsById.set(r.id, r);
      }
    }

    const profileText = row.profile_text?.trim() || row.industry || "";
    const industry = row.industry ?? null;

    const batches: Array<Array<{
      id: string;
      title: string;
      short: string | null;
      cpv: string | null;
    }>> = [];
    for (let i = 0; i < missingIds.length; i += LLM_BATCH_SIZE) {
      const slice = missingIds.slice(i, i + LLM_BATCH_SIZE);
      const batch = slice
        .map((id) => {
          const r = rowsById.get(id);
          if (!r) return null;
          return {
            id,
            title: r.title ?? "",
            short: r.raw_description ?? null,
            cpv: r.cpv_code ?? null,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);
      if (batch.length > 0) batches.push(batch);
    }

    const results = await timed(
      "recommended.llm_score_missing",
      () =>
        runPool(
          batches,
          LLM_MAX_PARALLEL,
          (batch) => scoreBatch(profileText, industry, batch),
          LLM_BATCH_DELAY_MS,
        ),
      { thresholdMs: 1, meta: { companyId, missing: missingIds.length, batches: batches.length } },
    );

    const upserts: Array<{
      company_id: string;
      tender_id: string;
      score: number;
      confidence: number;
      model_version: string;
    }> = [];
    const candidateSet = new Set(candidateIds);
    for (const scores of results) {
      for (const s of scores) {
        if (!candidateSet.has(s.tender_id)) continue;
        cached.set(s.tender_id, { score: s.score, confidence: s.confidence });
        upserts.push({
          company_id: companyId,
          tender_id: s.tender_id,
          score: s.score,
          confidence: s.confidence,
          model_version: RELEVANCE_MODEL_VERSION,
        });
      }
    }

    if (upserts.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: upErr } = await (supabase as any)
        .from("tender_relevance")
        .upsert(upserts, { onConflict: "company_id,tender_id" });
      if (upErr) {
        console.error("[tender-relevance] upsert error:", upErr);
      }
    }
  }

  // Final: load tender rows for all scored candidates (chunked)
  const scoredIds = candidateIds.filter((id) => {
    const entry = cached.get(id);
    return entry && entry.score >= minScore;
  });

  const tenderMap = new Map<string, T>();
  for (let i = 0; i < scoredIds.length; i += IN_CHUNK_SIZE) {
    const slice = scoredIds.slice(i, i + IN_CHUNK_SIZE);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: allTenderRows } = await timed<SupabaseListResult<T>>(
      "recommended.load_scored_tenders",
      () =>
        (supabase as any)
          .from("tenders")
          .select("*")
          .in("id", slice),
      { thresholdMs: 250, meta: { count: slice.length } },
    );
    for (const r of ((allTenderRows ?? []) as T[])) tenderMap.set(r.id, r);
  }

  const scored: Array<ScoredTender<T>> = [];
  for (const id of scoredIds) {
    const entry = cached.get(id);
    const tender = tenderMap.get(id);
    if (!entry || !tender) continue;
    const tier = classifyTier(entry.score);
    if (entry.score < minScore) continue;
    scored.push({
      tender,
      score: entry.score,
      confidence: entry.confidence,
      similarity: similarityById.get(id),
      tier,
    });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return (b.similarity ?? 0) - (a.similarity ?? 0);
  });

  return scored.slice(0, limit);
}

// ── Embedding backfill for tenders (used by cron) ─────────────────────
export async function embedNewTenders(
  supabase: SupabaseClient<Database>,
  options: { batchSize?: number; maxBatches?: number } = {}
): Promise<{ updated: number; batches: number; errors: string[] }> {
  const batchSize = options.batchSize ?? 20;
  const maxBatches = options.maxBatches ?? 25; // cap ~500 per cron run
  const errors: string[] = [];
  let updated = 0;
  let batches = 0;

  while (batches < maxBatches) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows, error } = await (supabase as any)
      .from("tenders")
      .select(
        "id, title, raw_description, cpv_code, contract_type, contracting_authority"
      )
      .is("embedding", null)
      .limit(batchSize);

    if (error) {
      errors.push(`select: ${error.message}`);
      break;
    }
    if (!rows || rows.length === 0) break;

    const texts = (rows as Array<{
      id: string;
      title: string | null;
      raw_description: string | null;
      cpv_code: string | null;
      contract_type: string | null;
      contracting_authority: string | null;
    }>).map((r) => buildTenderEmbeddingText(r) || r.title || "tender");

    let embeddings: number[][];
    try {
      embeddings = await generateEmbeddings(texts);
    } catch (err) {
      errors.push(`openai: ${err instanceof Error ? err.message : String(err)}`);
      break;
    }

    for (let i = 0; i < rows.length; i++) {
      const id = (rows[i] as { id: string }).id;
      const vec = toPgVector(embeddings[i]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: upErr } = await (supabase as any)
        .from("tenders")
        .update({ embedding: vec })
        .eq("id", id);
      if (upErr) errors.push(`update ${id}: ${upErr.message}`);
      else updated++;
    }
    batches++;
  }

  return { updated, batches, errors };
}

// ── Maintenance: delete orphaned relevance rows ───────────────────────
export async function cleanupOrphanedRelevance(
  supabase: SupabaseClient<Database>
): Promise<{ deleted: number }> {
  // Delete relevance rows where the tender deadline is far past (> 180 days).
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 180);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: oldTenderIds } = await (supabase as any)
    .from("tenders")
    .select("id")
    .lt("deadline", cutoff.toISOString())
    .limit(5000);
  const ids = ((oldTenderIds ?? []) as Array<{ id: string }>).map((r) => r.id);
  if (ids.length === 0) return { deleted: 0 };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error, count } = await (supabase as any)
    .from("tender_relevance")
    .delete({ count: "exact" })
    .in("tender_id", ids);
  if (error) {
    console.error("[tender-relevance] cleanup error:", error);
    return { deleted: 0 };
  }
  return { deleted: count ?? 0 };
}
