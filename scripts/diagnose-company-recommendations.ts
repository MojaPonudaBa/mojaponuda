/* eslint-disable @typescript-eslint/no-explicit-any */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const EMAIL = process.argv[2] || "hello@pageitup.com";

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: users } = await (s.auth.admin as any).listUsers();
  const user = users?.users?.find((u: any) => u.email === EMAIL);
  if (!user) {
    console.error(`No auth user for ${EMAIL}`);
    return;
  }
  console.log("User id:", user.id);

  const { data: company } = await (s as any)
    .from("companies")
    .select("id, name, profile_embedded_at, profile_text")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!company) {
    console.error("No company row");
    return;
  }
  console.log("Company:", company.id, "-", company.name);
  console.log("profile_embedded_at:", company.profile_embedded_at);
  console.log("profile_text chars:", (company.profile_text ?? "").length);

  // cache distribution
  const { data: cache } = await (s as any)
    .from("tender_relevance")
    .select("score")
    .eq("company_id", company.id);

  if (!cache?.length) {
    console.log("tender_relevance cache: EMPTY (will be populated on next Preporuceno render)");
  } else {
    console.log(`tender_relevance rows: ${cache.length}`);
    const buckets: Record<string, number> = {};
    for (const r of cache as any[]) {
      const b = String(r.score);
      buckets[b] = (buckets[b] ?? 0) + 1;
    }
    console.log("score distribution:");
    for (const k of Object.keys(buckets).sort((a, b) => Number(a) - Number(b))) {
      console.log(`  ${k}: ${buckets[k]}`);
    }
    const atLeast = (min: number) => (cache as any[]).filter((r) => r.score >= min).length;
    console.log(`  >=5: ${atLeast(5)}`);
    console.log(`  >=6: ${atLeast(6)}`);
    console.log(`  >=7: ${atLeast(7)}`);
    console.log(`  >=8: ${atLeast(8)}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
