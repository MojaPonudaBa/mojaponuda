import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { count: total } = await s
    .from("tenders")
    .select("id", { count: "exact", head: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: embedded } = await (s as any)
    .from("tenders")
    .select("id", { count: "exact", head: true })
    .not("embedding", "is", null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: activeTotal } = await (s as any)
    .from("tenders")
    .select("id", { count: "exact", head: true })
    .gte("deadline", new Date().toISOString());

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: activeEmbedded } = await (s as any)
    .from("tenders")
    .select("id", { count: "exact", head: true })
    .gte("deadline", new Date().toISOString())
    .not("embedding", "is", null);

  console.log("Total tenders:           ", total);
  console.log("Embedded:                ", embedded);
  console.log("Active (future deadline):", activeTotal);
  console.log("Active + embedded:       ", activeEmbedded);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: companiesEmbedded } = await (s as any)
    .from("companies")
    .select("id", { count: "exact", head: true })
    .not("profile_embedding", "is", null);

  const { count: companiesTotal } = await s
    .from("companies")
    .select("id", { count: "exact", head: true });

  console.log("Companies total:         ", companiesTotal);
  console.log("Companies with embedding:", companiesEmbedded);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
