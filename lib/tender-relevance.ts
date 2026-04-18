import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getOpenAIClient } from "@/lib/openai";
import {
  buildTenderEmbeddingText,
  generateEmbeddings,
  toPgVector,
} from "@/lib/embeddings";
import type { Database } from "@/types/database";

// ── Constants ─────────────────────────────────────────────────────────
export const RELEVANCE_MODEL_VERSION = "gpt-4o-mini-v1";
export const RETRIEVAL_TOP_K = 200;
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
  // Some models wrap in {"scores":[...]} — handle both shapes
  let arr: unknown;
  try {
    const parsed = JSON.parse(trimmed);
    arr = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as { scores?: unknown[] }).scores)
        ? (parsed as { scores: unknown[] }).scores
        : null;
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

// ── Main entry point (Step A + Step B with cache) ─────────────────────
export interface GetRecommendedOptions {
  topK?: number;
  limit?: number;
  /** Minimum score to include in output (default 5 — hides "nerelevantno"). */
  minScore?: number;
  nowIso?: string;
  /** When true, return all scored items regardless of minScore (for admin/debug). */
  includeHidden?: boolean;
}

interface CompanyRow {
  id: string;
  industry: string | null;
  profile_text: string | null;
  profile_embedding: unknown;
}

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
  const { data: company, error: companyErr } = await (supabase as any)
    .from("companies")
    .select("id, industry, profile_text, profile_embedding")
    .eq("id", companyId)
    .maybeSingle();

  if (companyErr || !company) return [];
  const row = company as CompanyRow;
  const embedding = row.profile_embedding;
  if (embedding == null) return [];

  // Step A: embedding retrieval — top K without threshold
  const candidates = await retrieveEmbeddingCandidates(
    supabase,
    embedding as number[] | string,
    { topK, nowIso: options.nowIso }
  );
  if (candidates.length === 0) return [];
  const candidateIds = candidates.map((c) => c.id);
  const similarityById = new Map(candidates.map((c) => [c.id, c.similarity]));

  // Cache lookup
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingRows } = await (supabase as any)
    .from("tender_relevance")
    .select("tender_id, score, confidence")
    .eq("company_id", companyId)
    .in("tender_id", candidateIds);

  const cached = new Map<string, { score: number; confidence: number }>();
  for (const r of (existingRows ?? []) as Array<{
    tender_id: string;
    score: number;
    confidence: number;
  }>) {
    cached.set(r.tender_id, { score: r.score, confidence: r.confidence });
  }

  const missingIds = candidateIds.filter((id) => !cached.has(id));

  // Step B: LLM reranking for missing pairs (batched 7, max 10 parallel)
  if (missingIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tenderRows } = await (supabase as any)
      .from("tenders")
      .select("id, title, raw_description, cpv_code, contract_type, contracting_authority")
      .in("id", missingIds);

    const rowsById = new Map(
      ((tenderRows ?? []) as Array<{
        id: string;
        title: string | null;
        raw_description: string | null;
        cpv_code: string | null;
      }>).map((r) => [r.id, r])
    );

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

    const results = await runPool(
      batches,
      LLM_MAX_PARALLEL,
      (batch) => scoreBatch(profileText, industry, batch),
      LLM_BATCH_DELAY_MS
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

  // Final: load tender rows for all scored candidates
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allTenderRows } = await (supabase as any)
    .from("tenders")
    .select("*")
    .in("id", candidateIds);

  const tenderMap = new Map<string, T>(
    ((allTenderRows ?? []) as T[]).map((r) => [r.id, r])
  );

  const scored: Array<ScoredTender<T>> = [];
  for (const id of candidateIds) {
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
