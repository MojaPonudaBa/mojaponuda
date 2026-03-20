import * as dotenv from "dotenv";
import { runTenderAreaMaintenance } from "../sync/ejn-sync";

dotenv.config({ path: ".env.local" });

function parseNumberArg(name: string): number | null {
  const raw = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (!raw) {
    return null;
  }

  const value = Number(raw.split("=")[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

async function countMissingAreaLabels(): Promise<number> {
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let missing = 0;
  let offset = 0;
  const pageSize = 500;

  while (true) {
    const { data } = await supabase
      .from("tenders")
      .select("id, ai_analysis")
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    const batch = data ?? [];
    if (batch.length === 0) {
      break;
    }

    for (const row of batch) {
      const aiAnalysis = row.ai_analysis as { geo_enrichment?: { area_label?: string | null } } | null;
      if (!aiAnalysis?.geo_enrichment?.area_label) {
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

  const beforeMissing = await countMissingAreaLabels();
  const result = await runTenderAreaMaintenance({
    targetUpdates,
    scanBatchSize,
    maxScanRows,
    endpoint: "TenderAreaBackfillScript",
    writeLog: true,
  });
  const afterMissing = await countMissingAreaLabels();

  console.log(
    JSON.stringify(
      {
        before_missing_area_labels: beforeMissing,
        after_missing_area_labels: afterMissing,
        processed: result,
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
