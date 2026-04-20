/**
 * Historijski tender backfill iz EJN API-ja.
 *
 * `tenders` tablica trenutno sadrži samo tendere čiji deadline je u budućnosti
 * (aktivni). Awardi idu 12 godina unazad pa za analitiku (price prediction,
 * discount metrike) trebamo dopuniti historijske tendere.
 *
 * Strategija: pozivamo `/ProcurementNotices` po kvartalima unazad i upsertujemo
 * tendere u lokalnu bazu. Podjela na kvartale je bitna jer EJN OData ima
 * MAX_PAGES limit i veliki range može da timeout-uje.
 *
 * Argumenti (env):
 *   BACKFILL_FROM_YEAR  — default 2023
 *   BACKFILL_TO_DATE    — default today (ISO)
 *
 * Koristi:
 *   npx tsx scripts/backfill-historical-tenders.ts
 *   BACKFILL_FROM_YEAR=2022 npx tsx scripts/backfill-historical-tenders.ts
 *
 * Bezbjedno za visestruko pokretanje — upsert po portal_id.
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import { fetchProcurementNoticesInDateRange, type EjnProcurementNotice } from "@/lib/ejn-api";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Nedostaju env varijable: NEXT_PUBLIC_SUPABASE_URL ili SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const FROM_YEAR = Number(process.env.BACKFILL_FROM_YEAR ?? 2016);
const TO_DATE = process.env.BACKFILL_TO_DATE ?? new Date().toISOString();

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function generateQuarters(fromYear: number, toIso: string): Array<{ from: string; to: string; label: string }> {
  const quarters: Array<{ from: string; to: string; label: string }> = [];
  const toDate = new Date(toIso);
  const toYear = toDate.getUTCFullYear();
  const toMonth = toDate.getUTCMonth(); // 0-11

  for (let y = fromYear; y <= toYear; y++) {
    for (let q = 0; q < 4; q++) {
      const startMonth = q * 3;
      const endMonth = startMonth + 3;
      // Preskoci buduce kvartale
      if (y === toYear && startMonth > toMonth) continue;

      const from = new Date(Date.UTC(y, startMonth, 1)).toISOString();
      const to =
        y === toYear && endMonth > toMonth + 1
          ? toIso
          : new Date(Date.UTC(y, endMonth, 1)).toISOString();

      quarters.push({ from, to, label: `${y}-Q${q + 1}` });
    }
  }
  return quarters;
}

async function seedAuthorities(notices: EjnProcurementNotice[]) {
  const candidates = new Map<string, { jib: string; name: string; portalId: string }>();
  for (const n of notices) {
    const jib = n.ContractingAuthorityJib?.trim();
    const name = n.ContractingAuthorityName?.trim();
    if (!jib || !name) continue;
    if (!candidates.has(jib)) {
      candidates.set(jib, { jib, name, portalId: `notice-seed:${jib}` });
    }
  }
  if (candidates.size === 0) return;

  // Upsert samo one koji ne postoje (ne prekrivamo postojeca imena)
  const jibs = [...candidates.keys()];
  const existingByJib = new Set<string>();
  for (const batch of chunk(jibs, 200)) {
    const { data } = await supabase
      .from("contracting_authorities")
      .select("jib")
      .in("jib", batch);
    for (const r of data ?? []) existingByJib.add(r.jib);
  }

  const toInsert = [...candidates.values()]
    .filter((c) => !existingByJib.has(c.jib))
    .map((c) => ({
      portal_id: c.portalId,
      name: c.name,
      jib: c.jib,
      city: null,
      municipality: null,
      canton: null,
      entity: null,
      authority_type: null,
      activity_type: null,
    }));

  if (toInsert.length === 0) return;
  for (const batch of chunk(toInsert, 200)) {
    await supabase.from("contracting_authorities").upsert(batch, { onConflict: "jib" });
  }
}

async function upsertTenders(notices: EjnProcurementNotice[]): Promise<{ added: number; updated: number }> {
  // Idemo po CPV-u cist (bez ai_analysis jer to je AI obogaćivanje koje
  // backfill ne mora radi — area maintenance ce pokupiti kasnije).
  const rows = notices.map((n) => ({
    portal_id: n.NoticeId,
    title: n.Title || "Bez naziva",
    contracting_authority: n.ContractingAuthorityName || null,
    contracting_authority_jib: n.ContractingAuthorityJib || null,
    deadline: n.Deadline || null,
    estimated_value: n.EstimatedValue ?? null,
    contract_type: n.ContractType || null,
    procedure_type: n.ProcedureType || null,
    status: n.Status || null,
    portal_url: n.NoticeUrl || null,
    raw_description: n.Description || null,
    cpv_code: n.CpvCode ?? null,
  }));

  if (rows.length === 0) return { added: 0, updated: 0 };

  // Provjerimo koji postoje
  const portalIds = rows.map((r) => r.portal_id);
  const existing = new Set<string>();
  for (const batch of chunk(portalIds, 500)) {
    const { data } = await supabase.from("tenders").select("portal_id").in("portal_id", batch);
    for (const r of data ?? []) existing.add(r.portal_id);
  }

  let added = 0;
  let updated = 0;
  for (const r of rows) {
    if (existing.has(r.portal_id)) updated++;
    else added++;
  }

  for (const batch of chunk(rows, 250)) {
    const { error } = await supabase.from("tenders").upsert(batch, {
      onConflict: "portal_id",
      ignoreDuplicates: false,
    });
    if (error) {
      console.error("   upsert batch error:", error.message);
    }
  }

  return { added, updated };
}

async function main() {
  console.time("backfill-historical-tenders");
  const quarters = generateQuarters(FROM_YEAR, TO_DATE);
  console.log(`→ Backfill historijskih tendera od ${FROM_YEAR} (${quarters.length} kvartala)`);

  let totalAdded = 0;
  let totalUpdated = 0;
  let totalFetched = 0;

  for (const q of quarters) {
    process.stdout.write(`  ${q.label} (${q.from.slice(0, 10)} → ${q.to.slice(0, 10)}) … `);
    try {
      const notices = await fetchProcurementNoticesInDateRange(q.from, q.to);
      totalFetched += notices.length;
      if (notices.length === 0) {
        console.log("0 tendera");
        continue;
      }
      await seedAuthorities(notices);
      const result = await upsertTenders(notices);
      totalAdded += result.added;
      totalUpdated += result.updated;
      console.log(`${notices.length} fetched (+${result.added} novih, ${result.updated} postojecih)`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`GRESKA: ${msg.slice(0, 120)}`);
    }
  }

  console.log("");
  console.log(`✓ Backfill završen.`);
  console.log(`  Fetch-ano: ${totalFetched} tendera`);
  console.log(`  Dodano:    ${totalAdded}`);
  console.log(`  Azurirano: ${totalUpdated}`);
  console.timeEnd("backfill-historical-tenders");
  console.log("");
  console.log("→ Sljedeci koraci:");
  console.log("  1) npx tsx scripts/reconcile-award-tender-links.ts");
  console.log("  2) npx tsx scripts/backfill-analytics.ts");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
