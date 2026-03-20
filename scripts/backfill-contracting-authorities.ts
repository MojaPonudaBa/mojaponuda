import * as dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { runContractingAuthorityMaintenance } from "../sync/ejn-sync";

dotenv.config({ path: ".env.local" });

function parseNumberArg(name: string): number | null {
  const raw = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (!raw) {
    return null;
  }

  const value = Number(raw.split("=")[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function parseBooleanArg(name: string): boolean {
  return process.argv.includes(`--${name}`) || process.argv.includes(`--${name}=true`);
}

async function countAuthoritiesMissingGeo(): Promise<number> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let missing = 0;
  let offset = 0;
  const pageSize = 500;

  while (true) {
    const { data } = await supabase
      .from("contracting_authorities")
      .select("id, city, municipality, canton, entity")
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    const batch = data ?? [];
    if (batch.length === 0) {
      break;
    }

    for (const row of batch) {
      if (!row.city && !row.municipality && !row.canton && !row.entity) {
        missing += 1;
      }
    }

    offset += batch.length;

    if (batch.length < pageSize) {
      break;
    }
  }

  return missing;
}

async function main() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }

  const targetUpdates = parseNumberArg("target") ?? Number.MAX_SAFE_INTEGER;
  const scanBatchSize = parseNumberArg("scan-batch") ?? 250;
  const maxScanRows = parseNumberArg("max-scan") ?? Number.MAX_SAFE_INTEGER;
  const allowAi = parseBooleanArg("allow-ai");

  const beforeMissing = await countAuthoritiesMissingGeo();
  const result = await runContractingAuthorityMaintenance({
    targetUpdates,
    scanBatchSize,
    maxScanRows,
    endpoint: "ContractingAuthorityBackfillScript",
    writeLog: true,
    allowAi,
  });
  const afterMissing = await countAuthoritiesMissingGeo();

  console.log(
    JSON.stringify(
      {
        before_missing_authority_geo: beforeMissing,
        after_missing_authority_geo: afterMissing,
        processed: result,
        allow_ai: allowAi,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
