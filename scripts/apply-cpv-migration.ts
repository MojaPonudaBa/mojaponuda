import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log("Adding cpv_code column to tenders table...");

  const { error: alterError } = await supabase.rpc("exec_sql" as never, {
    query: "ALTER TABLE tenders ADD COLUMN IF NOT EXISTS cpv_code text;",
  });

  if (alterError) {
    // Try direct SQL via REST if rpc doesn't work
    console.log("RPC not available, trying alternative approach...");
    
    // Check if column already exists
    const { data: testRow } = await supabase
      .from("tenders")
      .select("id")
      .limit(1);
    
    if (testRow) {
      console.log("Connection works. Column needs to be added via Supabase Dashboard SQL Editor.");
      console.log("\nRun this SQL in the Supabase Dashboard → SQL Editor:");
      console.log("---");
      console.log("ALTER TABLE tenders ADD COLUMN IF NOT EXISTS cpv_code text;");
      console.log("CREATE INDEX IF NOT EXISTS idx_tenders_cpv_code ON tenders(cpv_code);");
      console.log("---");
    }
  } else {
    console.log("Column added successfully!");
  }

  // Verify
  const { data, error } = await supabase
    .from("tenders")
    .select("id, cpv_code")
    .limit(1);

  if (error) {
    console.log("\nVerification: cpv_code column still missing:", error.message);
  } else {
    console.log("\nVerification: cpv_code column exists!", data);
  }
}

main().catch(console.error);
