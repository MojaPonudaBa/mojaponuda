/**
 * Pre-warm the tender_relevance cache for a single company OR all companies
 * that have a profile_embedding. Mirrors the production pipeline logic
 * (retrieve top-K via pgvector, LLM rerank in batches) but runs locally so
 * it is NOT bounded by the Vercel 30s serverless timeout. Used:
 *   - after backfilling profile_embedding for existing companies
 *   - as a one-shot admin task when the recommendation cache looks empty
 *
 * Usage:
 *   npx tsx scripts/warm-company-recommendations.ts                 # all companies
 *   npx tsx scripts/warm-company-recommendations.ts user@example    # single
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import {
  buildBroadRetrievalCpvPrefixes,
  buildProfileKeywordSeeds,
  parseCompanyProfile,
} from "../lib/company-profile";

const MODEL = "gpt-4o-mini";
const MODEL_VERSION = "gpt-4o-mini-v1";
const RETRIEVE_TOP_K = 200;
const LLM_BATCH_SIZE = 7;
const LLM_MAX_PARALLEL = 6;
const LLM_BATCH_DELAY_MS = 200;

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
    "Score: 1-3 nerelevantno, 4-5 graničan slučaj (bolje ne), 6-7 firma realno može konkurirati, 8-10 idealno podudaranje.",
  ].join("\n");
}

interface RelevanceScore {
  tender_id: string;
  score: number;
  confidence: number;
}

function parseScores(text: string): RelevanceScore[] {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
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
      const confidence = Math.max(1, Math.min(5, Math.round(Number(it.confidence ?? 3))));
      return { tender_id: tid, score, confidence };
    })
    .filter((it) => it.tender_id.length > 0);
}

async function scoreBatch(
  openai: OpenAI,
  profileText: string,
  industry: string | null,
  batch: Array<{ id: string; title: string; short: string | null; cpv: string | null }>
): Promise<RelevanceScore[]> {
  if (batch.length === 0) return [];
  try {
    const resp = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(profileText, industry, batch) },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    });
    return parseScores(resp.choices[0]?.message?.content ?? "[]");
  } catch (err) {
    console.error("  scoreBatch error:", (err as Error).message);
    return [];
  }
}

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

// Delegates to the same library helpers the production pipeline uses
// (lib/tender-relevance.ts). This guarantees identical seed coverage across
// ALL offering categories — construction, medical, food, cleaning, vehicles,
// fuel/energy, legal/finance, training, printing/marketing, etc. — not just
// the IT subset. Any future change to OFFERING_CATEGORY_OPTIONS or its
// keyword/CPV tables is automatically picked up here.
function deriveCategoryRecall(industry: string | null): { keywords: string[]; cpvPrefixes: string[] } {
  const parsed = parseCompanyProfile(industry);
  return {
    keywords: buildProfileKeywordSeeds(parsed),
    cpvPrefixes: buildBroadRetrievalCpvPrefixes(parsed),
  };
}

async function retrieveByKeywords(
  s: any,
  keywords: string[],
  cpvPrefixes: string[],
  nowIso: string
): Promise<string[]> {
  if (keywords.length === 0 && cpvPrefixes.length === 0) return [];
  const escape = (t: string) => t.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_").replace(/,/g, " ");
  const conds: string[] = [];
  for (const k of keywords.slice(0, 12)) {
    const term = escape(k.trim());
    if (!term) continue;
    conds.push(`title.ilike.%${term}%`);
    conds.push(`raw_description.ilike.%${term}%`);
  }
  for (const p of cpvPrefixes.slice(0, 12)) {
    const term = escape(p.trim());
    if (!term) continue;
    conds.push(`cpv_code.ilike.${term}%`);
  }
  if (conds.length === 0) return [];
  const { data, error } = await s
    .from("tenders")
    .select("id")
    .or(conds.join(","))
    .or(`deadline.gt.${nowIso},deadline.is.null`)
    .order("deadline", { ascending: true, nullsFirst: false })
    .limit(200);
  if (error) {
    console.error("  retrieveByKeywords error:", error.message);
    return [];
  }
  return ((data ?? []) as any[]).map((r) => r.id);
}

async function warmOne(
  s: any,
  openai: OpenAI,
  company: { id: string; name: string; profile_text: string | null; industry: string | null; profile_embedding: any }
) {
  const profileText = (company.profile_text ?? "").trim();
  if (!profileText) {
    console.log(`  SKIP ${company.name}: no profile_text`);
    return;
  }
  if (!company.profile_embedding) {
    console.log(`  SKIP ${company.name}: no profile_embedding`);
    return;
  }

  const nowIso = new Date().toISOString();

  // (a) pgvector top-K
  const { data: matches, error: rpcErr } = await s.rpc("match_tenders_by_embedding", {
    query_embedding: company.profile_embedding,
    match_count: RETRIEVE_TOP_K,
    now_iso: nowIso,
  });
  if (rpcErr) {
    console.error(`  ${company.name}: RPC error`, rpcErr.message);
    return;
  }
  const embeddingIds: string[] = (matches ?? []).map((m: any) => m.id);

  // (b) keyword/CPV retrieval for the company's offering categories
  const { keywords, cpvPrefixes } = deriveCategoryRecall(company.industry);
  const keywordIds = await retrieveByKeywords(s, keywords, cpvPrefixes, nowIso);

  const candidateIdSet = new Set<string>();
  for (const id of embeddingIds) candidateIdSet.add(id);
  for (const id of keywordIds) candidateIdSet.add(id);
  const candidateIds = [...candidateIdSet];

  if (candidateIds.length === 0) {
    console.log(`  ${company.name}: no candidates (pgvector + keyword both empty)`);
    return;
  }
  console.log(
    `  ${company.name}: retrieval → pgvector=${embeddingIds.length}, keyword=${keywordIds.length}, union=${candidateIds.length}`
  );

  // skip ones already cached
  const { data: existing } = await s
    .from("tender_relevance")
    .select("tender_id")
    .eq("company_id", company.id)
    .in("tender_id", candidateIds);
  const cachedSet = new Set<string>((existing ?? []).map((r: any) => r.tender_id));
  const missingIds = candidateIds.filter((id: string) => !cachedSet.has(id));

  if (missingIds.length === 0) {
    console.log(`  ${company.name}: cache already complete (${candidateIds.length} candidates)`);
    return;
  }

  // fetch tender rows for missing IDs
  const { data: tenderRows } = await s
    .from("tenders")
    .select("id, title, raw_description, cpv_code")
    .in("id", missingIds);
  const byId = new Map<string, any>((tenderRows ?? []).map((r: any) => [r.id, r]));

  const batches: Array<Array<{ id: string; title: string; short: string | null; cpv: string | null }>> = [];
  for (let i = 0; i < missingIds.length; i += LLM_BATCH_SIZE) {
    const slice = missingIds.slice(i, i + LLM_BATCH_SIZE);
    const batch = slice
      .map((id: string) => {
        const r = byId.get(id);
        if (!r) return null;
        return { id, title: r.title ?? "", short: r.raw_description ?? null, cpv: r.cpv_code ?? null };
      })
      .filter((x: any): x is NonNullable<typeof x> => x !== null);
    if (batch.length > 0) batches.push(batch);
  }

  console.log(
    `  ${company.name}: scoring ${missingIds.length} new / ${candidateIds.length} total via ${batches.length} batches`
  );
  const t0 = Date.now();
  const results = await runPool(
    batches,
    LLM_MAX_PARALLEL,
    (batch) => scoreBatch(openai, profileText, company.industry, batch),
    LLM_BATCH_DELAY_MS
  );
  const duration = ((Date.now() - t0) / 1000).toFixed(1);

  const upserts: any[] = [];
  const buckets: Record<string, number> = {};
  const candSet = new Set(candidateIds);
  for (const scores of results) {
    for (const s of scores) {
      if (!candSet.has(s.tender_id)) continue;
      buckets[String(s.score)] = (buckets[String(s.score)] ?? 0) + 1;
      upserts.push({
        company_id: company.id,
        tender_id: s.tender_id,
        score: s.score,
        confidence: s.confidence,
        model_version: MODEL_VERSION,
      });
    }
  }

  if (upserts.length > 0) {
    const { error: upErr } = await s
      .from("tender_relevance")
      .upsert(upserts, { onConflict: "company_id,tender_id" });
    if (upErr) {
      console.error(`  ${company.name}: upsert error`, upErr.message);
      return;
    }
  }

  const countAtLeast = (min: number) =>
    Object.entries(buckets).reduce((acc, [k, v]) => acc + (Number(k) >= min ? v : 0), 0);
  console.log(
    `  ${company.name}: upserted ${upserts.length} in ${duration}s | >=5: ${countAtLeast(5)}, >=6: ${countAtLeast(6)}, >=7: ${countAtLeast(7)}, >=8: ${countAtLeast(8)}`
  );
}

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  const emailArg = process.argv[2];
  let companies: any[] = [];
  if (emailArg) {
    const { data: users } = await (s.auth.admin as any).listUsers();
    const u = users?.users?.find((uu: any) => uu.email === emailArg);
    if (!u) throw new Error(`No auth user for ${emailArg}`);
    const { data } = await s
      .from("companies")
      .select("id, name, profile_text, industry, profile_embedding")
      .eq("user_id", u.id)
      .maybeSingle();
    if (!data) throw new Error("no company");
    companies = [data];
  } else {
    const { data } = await s
      .from("companies")
      .select("id, name, profile_text, industry, profile_embedding")
      .not("profile_embedded_at", "is", null);
    companies = data ?? [];
  }

  console.log(`Warming ${companies.length} companies`);
  for (const c of companies) {
    await warmOne(s, openai, c);
  }
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
