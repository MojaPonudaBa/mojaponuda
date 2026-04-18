import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

async function main() {
  console.log("1. OpenAI embedding...");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const r = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: "test firma se bavi odrzavanjem servera",
  });
  console.log("   OK, dims =", r.data[0].embedding.length);

  console.log("2. Supabase update with vector string...");
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // Find any company to test write
  const { data: anyCompany } = await s
    .from("companies")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (!anyCompany) {
    console.log("   No company rows to test update against (skipping)");
    return;
  }

  const vec = `[${r.data[0].embedding.join(",")}]`;
  const { error } = await (s as any)
    .from("companies")
    .update({
      profile_text: "TEST — safe to overwrite",
      profile_embedding: vec,
      profile_embedded_at: new Date().toISOString(),
    })
    .eq("id", anyCompany.id);

  if (error) {
    console.log("   FAIL:", error.message, error);
    process.exit(1);
  }
  console.log("   OK, updated company", anyCompany.id);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
