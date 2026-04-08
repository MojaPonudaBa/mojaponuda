import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

async function applyMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase credentials");
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  const migrationPath = join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260403_opportunity_quality_system.sql"
  );

  const sql = readFileSync(migrationPath, "utf-8");

  console.log("Applying migration: 20260403_opportunity_quality_system.sql");

  // Split by semicolons and execute each statement
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  for (const statement of statements) {
    if (statement.length === 0) continue;
    
    try {
      const { error } = await supabase.rpc("exec_sql", { sql: statement + ";" });
      
      if (error) {
        console.error("Error executing statement:", error);
        console.error("Statement:", statement.slice(0, 100));
      }
    } catch (err) {
      console.error("Failed to execute:", err);
      console.error("Statement:", statement.slice(0, 100));
    }
  }

  console.log("Migration applied successfully");
}

applyMigration().catch(console.error);
