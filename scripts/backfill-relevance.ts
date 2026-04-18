/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Backfill script: for every company with a profile_embedding, runs the
 * retrieval + LLM reranking pipeline and warms the tender_relevance cache.
 *
 * Usage:
 *   npx ts-node scripts/backfill-relevance.ts
 *   or
 *   npx tsx scripts/backfill-relevance.ts
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { getRecommendedTenders, RETRIEVAL_TOP_K } from "../lib/tender-relevance";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!URL || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!process.env.OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY");
  process.exit(1);
}

// Pricing reference (gpt-4o-mini, Apr 2026): ~$0.15 / 1M input tokens, $0.60 / 1M output tokens.
// Per LLM call (~7 tenders, ~800 input + 140 output tokens) ≈ $0.00020.
const COST_PER_LLM_CALL_USD = 0.00020;

async function main() {
  const supabase = createClient(URL, KEY, { auth: { persistSession: false } });

  const { data: companies, error } = await supabase
    .from("companies")
    .select("id, name, profile_embedding")
    .not("profile_embedding", "is", null);

  if (error) {
    console.error("Failed to load companies:", error.message);
    process.exit(1);
  }

  const total = companies?.length ?? 0;
  console.log(`Found ${total} companies with profile_embedding.`);

  let totalLLMCalls = 0;
  let totalNewRows = 0;

  for (let i = 0; i < total; i++) {
    const c = (companies as any)[i];
    const label = `[${i + 1}/${total}] ${c.name ?? c.id}`;
    console.log(`${label}: retrieving top ${RETRIEVAL_TOP_K} + reranking...`);

    // Count existing cache rows before
    const { count: beforeCount } = await supabase
      .from("tender_relevance")
      .select("id", { count: "exact", head: true })
      .eq("company_id", c.id);

    const before = beforeCount ?? 0;

    try {
      const scored = await getRecommendedTenders(supabase as any, c.id, {
        topK: RETRIEVAL_TOP_K,
        limit: 999999,
        includeHidden: true,
      });

      const { count: afterCount } = await supabase
        .from("tender_relevance")
        .select("id", { count: "exact", head: true })
        .eq("company_id", c.id);

      const after = afterCount ?? 0;
      const added = Math.max(0, after - before);
      const estimatedCalls = Math.ceil(added / 7);
      totalLLMCalls += estimatedCalls;
      totalNewRows += added;

      console.log(
        `${label}: ${scored.length} scored, ${added} new cache rows, ~${estimatedCalls} LLM calls`
      );
    } catch (err) {
      console.error(`${label}: FAILED`, err);
    }
  }

  const costUsd = (totalLLMCalls * COST_PER_LLM_CALL_USD).toFixed(4);
  console.log("—".repeat(60));
  console.log(`Ukupno kompanija: ${total}`);
  console.log(`Ukupno LLM poziva: ~${totalLLMCalls}`);
  console.log(`Procijenjeni trošak: ~$${costUsd}`);
  console.log(`Novih zapisa u bazi: ${totalNewRows}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
