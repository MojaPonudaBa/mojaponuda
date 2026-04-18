/**
 * Standalone tender embedding backfill. Embeds all tenders where embedding IS NULL,
 * using OpenAI text-embedding-3-small (1536 dims) → pgvector. Batches 20 tenders
 * per OpenAI call. Does NOT import lib/ (which uses server-only guard).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const EMBEDDING_MODEL = "text-embedding-3-small";
const BATCH_SIZE = 20;
const MAX_BATCHES = 500;
const MAX_INPUT_CHARS = 8000;

function buildTenderText(t: {
  title?: string | null;
  raw_description?: string | null;
  cpv_code?: string | null;
  contract_type?: string | null;
  contracting_authority?: string | null;
}): string {
  const parts: string[] = [];
  if (t.title) parts.push(`Naslov: ${t.title}`);
  if (t.contract_type) parts.push(`Tip: ${t.contract_type}`);
  if (t.cpv_code) parts.push(`CPV: ${t.cpv_code}`);
  if (t.contracting_authority) parts.push(`Naručilac: ${t.contracting_authority}`);
  if (t.raw_description) parts.push(`Opis: ${t.raw_description}`);
  return parts.join("\n");
}

function sanitizeInput(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, MAX_INPUT_CHARS);
}

function toPgVector(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  let batches = 0;
  let updated = 0;
  const started = Date.now();

  while (batches < MAX_BATCHES) {
    const { data: rows, error } = await (s as any)
      .from("tenders")
      .select("id, title, raw_description, cpv_code, contract_type, contracting_authority")
      .is("embedding", null)
      .limit(BATCH_SIZE);

    if (error) {
      console.error("select error:", error.message);
      break;
    }
    if (!rows || rows.length === 0) {
      console.log("No more tenders without embedding.");
      break;
    }

    const texts: string[] = rows.map((r: any) => sanitizeInput(buildTenderText(r) || r.title || "tender"));

    let vectors: number[][];
    try {
      const resp = await openai.embeddings.create({ model: EMBEDDING_MODEL, input: texts });
      vectors = resp.data.map((d) => d.embedding);
    } catch (err) {
      console.error("openai error:", err);
      break;
    }

    for (let i = 0; i < rows.length; i++) {
      const id = rows[i].id as string;
      const vec = toPgVector(vectors[i]);
      const { error: upErr } = await (s as any).from("tenders").update({ embedding: vec }).eq("id", id);
      if (upErr) {
        console.error(`update ${id} error:`, upErr.message);
      } else {
        updated++;
      }
    }

    batches++;
    if (batches % 5 === 0) {
      const elapsed = ((Date.now() - started) / 1000).toFixed(0);
      console.log(`  batch ${batches}: updated=${updated} (${elapsed}s elapsed)`);
    }
  }

  const duration = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`\nDone. Batches=${batches} updated=${updated} in ${duration}s`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
