import { config as loadEnv } from "dotenv";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { precomputeTenderDecisionInsights } from "@/sync/tender-decision-precompute";
import type { Database } from "@/types/database";

loadEnv({ path: path.resolve(process.cwd(), ".env.local") });
loadEnv({ path: path.resolve(process.cwd(), ".env") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Nedostaju NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const maxCompanies = Number(process.argv.find((arg) => arg.startsWith("--companies="))?.split("=")[1] ?? 500);
const tenderLimit = Number(process.argv.find((arg) => arg.startsWith("--tenders="))?.split("=")[1] ?? 250);

const supabase = createClient<Database>(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
  global: { headers: { "statement-timeout": "120000" } },
});

async function main() {
  const result = await precomputeTenderDecisionInsights(supabase, {
    maxCompanies,
    tenderLimit,
  });

  console.log(JSON.stringify(result, null, 2));
  if (result.errors.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
