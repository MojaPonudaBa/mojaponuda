/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function main() {
  const s = createClient(URL, KEY, { auth: { persistSession: false } });

  console.log("── Checking companies.profile_embedding ───────────────");
  const { error: e1 } = await s
    .from("companies")
    .select("id, profile_embedding, profile_text, profile_embedded_at")
    .limit(1);
  console.log(e1 ? "MISSING: " + e1.message : "OK");

  console.log("── Checking tenders.embedding ─────────────────────────");
  const { error: e2 } = await (s as any).from("tenders").select("id, embedding").limit(1);
  console.log(e2 ? "MISSING: " + e2.message : "OK");

  console.log("── Checking tender_relevance table ────────────────────");
  const { error: e3 } = await (s as any).from("tender_relevance").select("id").limit(1);
  console.log(e3 ? "MISSING: " + e3.message : "OK");

  console.log("── Checking match_tenders_by_embedding RPC ────────────");
  const fakeVec = "[" + new Array(1536).fill(0).join(",") + "]";
  const { error: e4 } = await (s as any).rpc("match_tenders_by_embedding", {
    query_embedding: fakeVec,
    match_count: 1,
    now_iso: new Date().toISOString(),
  });
  console.log(e4 ? "MISSING: " + e4.message : "OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
