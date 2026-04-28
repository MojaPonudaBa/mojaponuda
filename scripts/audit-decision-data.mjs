import { config as loadEnv } from "dotenv";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

loadEnv({ path: path.resolve(process.cwd(), ".env.local") });
loadEnv({ path: path.resolve(process.cwd(), ".env") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Nedostaju NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
  global: { headers: { "statement-timeout": "120000" } },
});

async function countRows(table, apply, countMode = "exact") {
  let query = supabase.from(table).select("*", { count: countMode, head: true });
  if (apply) query = apply(query);
  const { count, error } = await query;
  if (error) throw new Error(`${table}: ${error.message}`);
  return count ?? 0;
}

async function safeCountRows(table, apply, countMode = "exact") {
  try {
    return await countRows(table, apply, countMode);
  } catch (error) {
    console.warn(`Upozorenje: ne mogu prebrojati ${table}${apply ? " sa filterom" : ""}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

async function boundaryDate(table, column, ascending) {
  try {
    const { data, error } = await supabase
      .from(table)
      .select(column)
      .not(column, "is", null)
      .order(column, { ascending })
      .limit(1);
    if (error) return null;
    const row = data?.[0] ?? {};
    return typeof row[column] === "string" ? row[column] : null;
  } catch {
    return null;
  }
}

function pct(part, total) {
  if (total <= 0) return "0%";
  return `${Math.round((part / total) * 1000) / 10}%`;
}

async function maybeCount(table) {
  try {
    return await countRows(table);
  } catch {
    return null;
  }
}

const tendersTotal = await countRows("tenders");
const awardsTotal = await countRows("award_decisions");

const report = {
  tenders: {
    total: tendersTotal,
    first_created_at: await boundaryDate("tenders", "created_at", true),
    last_created_at: await boundaryDate("tenders", "created_at", false),
    missing_cpv: await safeCountRows("tenders", (q) => q.is("cpv_code", null)),
    missing_authority_jib: await safeCountRows("tenders", (q) => q.is("contracting_authority_jib", null)),
    missing_estimated_value: await safeCountRows("tenders", (q) => q.is("estimated_value", null), "estimated"),
    missing_deadline: await safeCountRows("tenders", (q) => q.is("deadline", null)),
  },
  awards: {
    total: awardsTotal,
    first_award_date: await boundaryDate("award_decisions", "award_date", true),
    last_award_date: await boundaryDate("award_decisions", "award_date", false),
    missing_tender_id: await safeCountRows("award_decisions", (q) => q.is("tender_id", null)),
    missing_winner_jib: await safeCountRows("award_decisions", (q) => q.is("winner_jib", null)),
    missing_winning_price: await safeCountRows("award_decisions", (q) => q.is("winning_price", null)),
    missing_estimated_value: await safeCountRows("award_decisions", (q) => q.is("estimated_value", null)),
    missing_bidders_count: await safeCountRows("award_decisions", (q) => q.is("total_bidders_count", null)),
  },
  aggregates: {
    authority_stats: await maybeCount("authority_stats"),
    cpv_stats: await maybeCount("cpv_stats"),
    authority_cpv_stats: await maybeCount("authority_cpv_stats"),
    company_stats: await maybeCount("company_stats"),
    company_authority_stats: await maybeCount("company_authority_stats"),
    company_cpv_stats: await maybeCount("company_cpv_stats"),
    tender_participants: await maybeCount("tender_participants"),
    tender_decision_insights: await maybeCount("tender_decision_insights"),
  },
};

const warnings = [];
if (tendersTotal === 0) warnings.push("Nema tendera u bazi.");
if (awardsTotal === 0) warnings.push("Nema award_decisions redova; win/price/competition ne mogu biti pouzdani.");
if (typeof report.tenders.missing_estimated_value === "number" && report.tenders.missing_estimated_value / Math.max(1, tendersTotal) > 0.5) {
  warnings.push("Više od 50% aktivnih tendera nema procijenjenu vrijednost; price guidance mora koristiti historijske pobjedničke cijene ili prikazati nisku pouzdanost.");
}
if (typeof report.awards.missing_bidders_count === "number" && report.awards.missing_bidders_count / Math.max(1, awardsTotal) > 0.5) {
  warnings.push("Više od 50% award_decisions redova nema broj ponuđača; competition i win probability moraju ostati niske/srednje pouzdanosti.");
}
if (typeof report.awards.missing_winning_price === "number" && report.awards.missing_winning_price / Math.max(1, awardsTotal) > 0.3) {
  warnings.push("Više od 30% award_decisions redova nema pobjedničku cijenu; price guidance mora biti ograničen.");
}
if (typeof report.awards.missing_tender_id === "number" && report.awards.missing_tender_id / Math.max(1, awardsTotal) > 0.5) {
  warnings.push("Većina award_decisions redova nije direktno povezana s tenderima; CPV matching zavisi od fallback logike.");
}
if ((report.aggregates.authority_stats ?? 0) === 0 || (report.aggregates.cpv_stats ?? 0) === 0) {
  warnings.push("Agregatne analytics tabele nisu popunjene; pokrenuti backfill:analytics prije decision backfilla.");
}
if ((report.aggregates.tender_participants ?? 0) === 0) {
  warnings.push("Nema tender_participants podataka; personalizovani win-rate dobavljača ne smije se koristiti kao pouzdan signal.");
}
if ((report.aggregates.tender_decision_insights ?? 0) === 0) {
  warnings.push("tender_decision_insights je prazan; UI će prikazivati samo nisku pouzdanost dok se ne pokrene backfill.");
}

console.log(JSON.stringify({
  ...report,
  completeness: {
    tenders_with_cpv: typeof report.tenders.missing_cpv === "number" ? pct(tendersTotal - report.tenders.missing_cpv, tendersTotal) : "unknown",
    tenders_with_authority_jib: typeof report.tenders.missing_authority_jib === "number" ? pct(tendersTotal - report.tenders.missing_authority_jib, tendersTotal) : "unknown",
    awards_with_winning_price: typeof report.awards.missing_winning_price === "number" ? pct(awardsTotal - report.awards.missing_winning_price, awardsTotal) : "unknown",
    awards_with_bidders_count: typeof report.awards.missing_bidders_count === "number" ? pct(awardsTotal - report.awards.missing_bidders_count, awardsTotal) : "unknown",
    awards_linked_to_tender: typeof report.awards.missing_tender_id === "number" ? pct(awardsTotal - report.awards.missing_tender_id, awardsTotal) : "unknown",
  },
  warnings,
}, null, 2));

if (warnings.length > 0) {
  process.exitCode = 1;
}
