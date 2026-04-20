/**
 * Backfill svih agregatnih analitičkih tablica iz
 * `public.award_decisions` + `public.tenders` + `public.tender_participants`.
 *
 * Pokreni JEDNOM:
 *   npx tsx scripts/backfill-analytics.ts
 *
 * Popuniti prije nego što se cron uključi. Idempotentan — UPSERT na sve tablice.
 */

import { config as loadEnv } from "dotenv";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

// Next.js projekti drže env u .env.local; učitavamo oba (local ima prioritet).
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });
loadEnv({ path: path.resolve(process.cwd(), ".env") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Nedostaju NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const PAGE_SIZE = 1000;

function cpvPrefix(code: string | null | undefined): string | null {
  if (!code) return null;
  const clean = String(code).replace(/[^0-9]/g, "");
  if (clean.length < 3) return null;
  return clean.slice(0, 3);
}

function avg(vals: number[]): number | null {
  const clean = vals.filter((v) => Number.isFinite(v));
  if (clean.length === 0) return null;
  return clean.reduce((a, b) => a + b, 0) / clean.length;
}

function topKeys(counter: Map<string, number>, k: number): string[] {
  return [...counter.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map(([key]) => key);
}

interface TenderRef {
  cpv_code: string | null;
  authority_jib: string | null;
  estimated_value: number | null;
  created_at: string | null;
}

interface TenderLookup {
  byId: Map<string, TenderRef>;
  byAuthority: Map<string, Array<TenderRef & { id: string }>>;
}

async function fetchTenderLookup(): Promise<TenderLookup> {
  console.log("→ Dohvatam tenders lookup (id → cpv + authority + value) …");
  const byId = new Map<string, TenderRef>();
  const byAuthority = new Map<string, Array<TenderRef & { id: string }>>();
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("tenders")
      .select("id, cpv_code, contracting_authority_jib, estimated_value, created_at")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const t of data) {
      const ref: TenderRef & { id: string } = {
        id: t.id,
        cpv_code: t.cpv_code,
        authority_jib: t.contracting_authority_jib,
        estimated_value: t.estimated_value !== null && t.estimated_value !== undefined ? Number(t.estimated_value) : null,
        created_at: t.created_at,
      };
      byId.set(t.id, ref);
      if (ref.authority_jib) {
        const list = byAuthority.get(ref.authority_jib) ?? [];
        list.push(ref);
        byAuthority.set(ref.authority_jib, list);
      }
    }
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  console.log(`   indeksirano ${byId.size} tendera (${byAuthority.size} naručilaca)`);
  return { byId, byAuthority };
}

/**
 * Award → tender matching preko (authority_jib + estimated_value).
 * Ako je više kandidata, bira najbliži po datumu (award_date vs tender.created_at).
 */
function matchAwardToTender(
  award: { contracting_authority_jib: string | null; estimated_value: number | null; award_date: string | null },
  lookup: TenderLookup
): TenderRef | null {
  if (!award.contracting_authority_jib || award.estimated_value === null) return null;
  const candidates = lookup.byAuthority.get(award.contracting_authority_jib);
  if (!candidates) return null;

  // Match na estimated_value (tolerancija 1 KM zbog zaokruživanja)
  const value = award.estimated_value;
  const matches = candidates.filter((t) => {
    if (t.estimated_value === null) return false;
    return Math.abs(t.estimated_value - value) <= 1;
  });
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];

  // Više kandidata: odaberi najbliži po datumu
  const awardTs = award.award_date ? new Date(award.award_date).getTime() : null;
  if (awardTs === null) return matches[0];
  let best = matches[0];
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const m of matches) {
    if (!m.created_at) continue;
    const diff = Math.abs(new Date(m.created_at).getTime() - awardTs);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = m;
    }
  }
  return best;
}

async function fetchAllAwards(tenderLookup: TenderLookup) {
  console.log("→ Dohvatam award_decisions (s fuzzy matchingom na tendere) …");
  const all: Array<{
    winner_jib: string | null;
    winner_name: string | null;
    contracting_authority_jib: string | null;
    winning_price: number | null;
    estimated_value: number | null;
    discount_pct: number | null;
    total_bidders_count: number | null;
    tender_cpv: string | null;
  }> = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("award_decisions")
      .select(
        "tender_id, winner_jib, winner_name, contracting_authority_jib, winning_price, estimated_value, discount_pct, total_bidders_count, award_date"
      )
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const r of data) {
      const estVal = r.estimated_value !== null && r.estimated_value !== undefined ? Number(r.estimated_value) : null;
      // 1) Prvo pokušaj direktni FK match (ako je sync popunio)
      let tenderRef: TenderRef | null = r.tender_id ? tenderLookup.byId.get(r.tender_id) ?? null : null;
      // 2) Fallback: match po (authority + estimated_value [+ award_date kao tiebreaker])
      if (!tenderRef) {
        tenderRef = matchAwardToTender(
          {
            contracting_authority_jib: r.contracting_authority_jib,
            estimated_value: estVal,
            award_date: r.award_date ?? null,
          },
          tenderLookup
        );
      }
      all.push({
        winner_jib: r.winner_jib,
        winner_name: r.winner_name,
        contracting_authority_jib: r.contracting_authority_jib ?? tenderRef?.authority_jib ?? null,
        winning_price: r.winning_price ? Number(r.winning_price) : null,
        estimated_value: estVal,
        discount_pct: r.discount_pct ? Number(r.discount_pct) : null,
        total_bidders_count: r.total_bidders_count,
        tender_cpv: tenderRef?.cpv_code ?? null,
      });
    }
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
    process.stdout.write(`   +${data.length} (ukupno ${all.length})\r`);
  }
  const matched = all.filter((a) => a.tender_cpv).length;
  const pct = all.length > 0 ? Math.round((matched / all.length) * 1000) / 10 : 0;
  console.log(`\n   dohvaćeno ${all.length} award redova (${matched} s CPV-om = ${pct}% match rate)`);
  return all;
}

async function fetchAuthorities() {
  const { data } = await supabase
    .from("contracting_authorities")
    .select("jib, name");
  return new Map<string, string>((data ?? []).map((r: { jib: string; name: string }) => [r.jib, r.name]));
}

async function fetchTenderCountsPerAuthority() {
  console.log("→ Brojim tenders po autoritetu …");
  const countMap = new Map<string, { count: number; totalValue: number }>();
  let from = 0;
  while (true) {
    const { data } = await supabase
      .from("tenders")
      .select("contracting_authority_jib, estimated_value")
      .range(from, from + PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    for (const t of data) {
      const jib = t.contracting_authority_jib;
      if (!jib) continue;
      const ev = t.estimated_value ? Number(t.estimated_value) : 0;
      const existing = countMap.get(jib) ?? { count: 0, totalValue: 0 };
      existing.count += 1;
      existing.totalValue += ev;
      countMap.set(jib, existing);
    }
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return countMap;
}

async function fetchTenderCountsPerCpv() {
  console.log("→ Brojim tenders po CPV kodu …");
  const countMap = new Map<string, { count: number; totalValue: number[] }>();
  let from = 0;
  while (true) {
    const { data } = await supabase
      .from("tenders")
      .select("cpv_code, estimated_value")
      .range(from, from + PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    for (const t of data) {
      const p = cpvPrefix(t.cpv_code);
      if (!p) continue;
      const existing = countMap.get(p) ?? { count: 0, totalValue: [] as number[] };
      existing.count += 1;
      if (t.estimated_value) existing.totalValue.push(Number(t.estimated_value));
      countMap.set(p, existing);
    }
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return countMap;
}

async function upsertChunked(table: string, rows: Record<string, unknown>[], onConflict: string, chunkSize = 500) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const slice = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).upsert(slice, { onConflict });
    if (error) {
      console.error(`   upsert ${table} chunk ${i}–${i + slice.length} failed:`, error.message);
    }
  }
}

async function main() {
  console.time("backfill-analytics");
  const tenderLookup = await fetchTenderLookup();
  const [awards, authorityNames, tenderCountsByAuth, tenderCountsByCpv] = await Promise.all([
    fetchAllAwards(tenderLookup),
    fetchAuthorities(),
    fetchTenderCountsPerAuthority(),
    fetchTenderCountsPerCpv(),
  ]);

  // ── authority_stats ─────────────────────────────────────────────────
  console.log("→ Gradim authority_stats …");
  const byAuth = new Map<string, {
    winningPrices: number[];
    discountPcts: number[];
    biddersCounts: number[];
    cpvCounter: Map<string, number>;
  }>();
  for (const a of awards) {
    if (!a.contracting_authority_jib) continue;
    const g = byAuth.get(a.contracting_authority_jib) ?? {
      winningPrices: [] as number[],
      discountPcts: [] as number[],
      biddersCounts: [] as number[],
      cpvCounter: new Map<string, number>(),
    };
    if (a.winning_price) g.winningPrices.push(a.winning_price);
    if (a.discount_pct !== null) g.discountPcts.push(a.discount_pct);
    if (a.total_bidders_count) g.biddersCounts.push(a.total_bidders_count);
    const p = cpvPrefix(a.tender_cpv);
    if (p) g.cpvCounter.set(p, (g.cpvCounter.get(p) ?? 0) + 1);
    byAuth.set(a.contracting_authority_jib, g);
  }
  const authorityRows = [...byAuth.entries()].map(([jib, g]) => {
    const counts = tenderCountsByAuth.get(jib) ?? { count: 0, totalValue: 0 };
    return {
      authority_jib: jib,
      authority_name: authorityNames.get(jib) ?? null,
      tender_count: counts.count,
      total_estimated_value: counts.totalValue,
      avg_contract_value: avg(g.winningPrices),
      avg_bidders_count: avg(g.biddersCounts),
      avg_discount_pct: avg(g.discountPcts),
      top_cpv_codes: topKeys(g.cpvCounter, 5),
      updated_at: new Date().toISOString(),
    };
  });
  await upsertChunked("authority_stats", authorityRows, "authority_jib");
  console.log(`   ✓ authority_stats: ${authorityRows.length} redova`);

  // ── cpv_stats i authority_cpv_stats (iz tenders, augmented awards) ───
  //
  // NAPOMENA: Trenutno samo ~3% awarda u bazi ima estimated_value i samo
  // zadnja 2 mjeseca imaju matchujuće tendere (ostali awardi su istorijski,
  // iz 2014-2024). Zato CPV/authority_cpv agregate gradimo PRIMARNO iz
  // `tenders` tablice (uvijek ima CPV kod), a discount metriku dopunjavamo
  // kad god award ima povezan tender (tender_id FK ili fuzzy match).
  console.log("→ Gradim cpv_stats (iz tendera) + authority_cpv_stats …");
  const cpvAgg = new Map<string, {
    tenders: number;
    values: number[];
    discountPcts: number[];
    biddersCounts: number[];
    authorityCounter: Map<string, number>;
  }>();
  const authCpvAgg = new Map<string, {
    tenders: number;
    values: number[];
    discountPcts: number[];
    biddersCounts: number[];
  }>();

  // (1) Primarni izvor — sve tendere iz `tenders` (imaju CPV + authority).
  for (const [, t] of tenderLookup.byId) {
    const p = cpvPrefix(t.cpv_code);
    if (!p) continue;
    const cg = cpvAgg.get(p) ?? {
      tenders: 0, values: [] as number[], discountPcts: [] as number[],
      biddersCounts: [] as number[], authorityCounter: new Map<string, number>(),
    };
    cg.tenders += 1;
    if (t.estimated_value !== null) cg.values.push(t.estimated_value);
    if (t.authority_jib) {
      cg.authorityCounter.set(t.authority_jib, (cg.authorityCounter.get(t.authority_jib) ?? 0) + 1);
    }
    cpvAgg.set(p, cg);

    if (t.authority_jib) {
      const key = `${t.authority_jib}|${p}`;
      const ag = authCpvAgg.get(key) ?? {
        tenders: 0, values: [] as number[], discountPcts: [] as number[], biddersCounts: [] as number[],
      };
      ag.tenders += 1;
      if (t.estimated_value !== null) ag.values.push(t.estimated_value);
      authCpvAgg.set(key, ag);
    }
  }

  // (2) Dopuniti discount/bidders iz awarda koji imaju CPV match.
  for (const a of awards) {
    const p = cpvPrefix(a.tender_cpv);
    if (!p) continue;
    const cg = cpvAgg.get(p);
    if (cg) {
      if (a.discount_pct !== null) cg.discountPcts.push(a.discount_pct);
      if (a.total_bidders_count) cg.biddersCounts.push(a.total_bidders_count);
    }
    if (a.contracting_authority_jib) {
      const key = `${a.contracting_authority_jib}|${p}`;
      const ag = authCpvAgg.get(key);
      if (ag) {
        if (a.discount_pct !== null) ag.discountPcts.push(a.discount_pct);
        if (a.total_bidders_count) ag.biddersCounts.push(a.total_bidders_count);
      }
    }
  }

  const cpvRows = [...cpvAgg.entries()].map(([code, g]) => ({
    cpv_code: code,
    tender_count: g.tenders,
    avg_estimated_value: avg(g.values),
    avg_bidders_count: avg(g.biddersCounts),
    avg_discount_pct: avg(g.discountPcts),
    top_authorities: topKeys(g.authorityCounter, 5),
    updated_at: new Date().toISOString(),
  }));
  await upsertChunked("cpv_stats", cpvRows, "cpv_code");
  const cpvWithDiscount = cpvRows.filter((r) => r.avg_discount_pct !== null).length;
  console.log(`   ✓ cpv_stats: ${cpvRows.length} redova (${cpvWithDiscount} s discount metrikom)`);

  const authCpvRows = [...authCpvAgg.entries()].map(([key, g]) => {
    const [authority_jib, cpv_code] = key.split("|");
    return {
      authority_jib,
      cpv_code,
      tender_count: g.tenders,
      avg_discount_pct: avg(g.discountPcts),
      min_winning_price: null,
      max_winning_price: null,
      avg_winning_price: avg(g.values),
      avg_bidders_count: avg(g.biddersCounts),
      updated_at: new Date().toISOString(),
    };
  });
  await upsertChunked("authority_cpv_stats", authCpvRows, "authority_jib,cpv_code");
  const authCpvWithDiscount = authCpvRows.filter((r) => r.avg_discount_pct !== null).length;
  console.log(`   ✓ authority_cpv_stats: ${authCpvRows.length} redova (${authCpvWithDiscount} s discount metrikom)`);

  // ── company_stats + company_authority_stats + company_cpv_stats ────
  console.log("→ Gradim company_stats (iz awarda, kao wins-only baseline) …");
  const byCompany = new Map<string, {
    name: string;
    wins: number;
    winningPrices: number[];
    discountPcts: number[];
    cpvCounter: Map<string, number>;
    authorityCounter: Map<string, number>;
  }>();
  const byCompanyAuth = new Map<string, { wins: number }>();
  const byCompanyCpv = new Map<string, { wins: number }>();

  for (const a of awards) {
    if (!a.winner_jib) continue;
    const g = byCompany.get(a.winner_jib) ?? {
      name: a.winner_name ?? a.winner_jib,
      wins: 0,
      winningPrices: [] as number[],
      discountPcts: [] as number[],
      cpvCounter: new Map<string, number>(),
      authorityCounter: new Map<string, number>(),
    };
    g.wins += 1;
    if (a.winning_price) g.winningPrices.push(a.winning_price);
    if (a.discount_pct !== null) g.discountPcts.push(a.discount_pct);
    const p = cpvPrefix(a.tender_cpv);
    if (p) g.cpvCounter.set(p, (g.cpvCounter.get(p) ?? 0) + 1);
    if (a.contracting_authority_jib) {
      g.authorityCounter.set(a.contracting_authority_jib, (g.authorityCounter.get(a.contracting_authority_jib) ?? 0) + 1);
    }
    byCompany.set(a.winner_jib, g);

    if (a.contracting_authority_jib) {
      const caKey = `${a.winner_jib}|${a.contracting_authority_jib}`;
      byCompanyAuth.set(caKey, { wins: (byCompanyAuth.get(caKey)?.wins ?? 0) + 1 });
    }
    if (p) {
      const ccKey = `${a.winner_jib}|${p}`;
      byCompanyCpv.set(ccKey, { wins: (byCompanyCpv.get(ccKey)?.wins ?? 0) + 1 });
    }
  }

  // Dohvati tender_participants za ukupne appearances po firmi (ako postoji)
  console.log("→ Dohvatam tender_participants za appearances …");
  const appearancesByCompany = new Map<string, number>();
  const appearancesByCompanyAuth = new Map<string, number>();
  const appearancesByCompanyCpv = new Map<string, number>();
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("tender_participants")
      .select("company_jib, tenders(contracting_authority_jib, cpv_code)")
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      // PGRST205 = "Could not find the table" — tablica nije u schemi, preskačemo
      if (
        error.code === "PGRST205" ||
        error.message?.includes("does not exist") ||
        error.message?.includes("Could not find the table")
      ) {
        console.log("   (tender_participants ne postoji — preskačem appearances; koristim wins-only baseline)");
        break;
      }
      throw error;
    }
    if (!data || data.length === 0) break;
    for (const r of data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rr = r as any;
      if (!rr.company_jib) continue;
      const t = Array.isArray(rr.tenders) ? rr.tenders[0] : rr.tenders;
      appearancesByCompany.set(rr.company_jib, (appearancesByCompany.get(rr.company_jib) ?? 0) + 1);
      if (t?.contracting_authority_jib) {
        const k = `${rr.company_jib}|${t.contracting_authority_jib}`;
        appearancesByCompanyAuth.set(k, (appearancesByCompanyAuth.get(k) ?? 0) + 1);
      }
      const p = cpvPrefix(t?.cpv_code);
      if (p) {
        const k = `${rr.company_jib}|${p}`;
        appearancesByCompanyCpv.set(k, (appearancesByCompanyCpv.get(k) ?? 0) + 1);
      }
    }
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  const companyRows = [...byCompany.entries()].map(([jib, g]) => {
    const apps = appearancesByCompany.get(jib) ?? g.wins; // fallback: wins only
    return {
      company_jib: jib,
      company_name: g.name,
      total_bids: apps,
      total_wins: g.wins,
      win_rate: apps > 0 ? Math.round((g.wins / apps) * 10000) / 100 : null,
      total_won_value: g.winningPrices.reduce((a, b) => a + b, 0),
      avg_discount_pct: avg(g.discountPcts),
      top_cpv_codes: topKeys(g.cpvCounter, 5),
      top_authorities: topKeys(g.authorityCounter, 5),
      updated_at: new Date().toISOString(),
    };
  });
  await upsertChunked("company_stats", companyRows, "company_jib");
  console.log(`   ✓ company_stats: ${companyRows.length} redova`);

  const companyAuthRows = [...byCompanyAuth.entries()].map(([key, v]) => {
    const [company_jib, authority_jib] = key.split("|");
    const apps = appearancesByCompanyAuth.get(key) ?? v.wins;
    return {
      company_jib,
      authority_jib,
      appearances: apps,
      wins: v.wins,
      win_rate: apps > 0 ? Math.round((v.wins / apps) * 10000) / 100 : null,
      updated_at: new Date().toISOString(),
    };
  });
  await upsertChunked("company_authority_stats", companyAuthRows, "company_jib,authority_jib");
  console.log(`   ✓ company_authority_stats: ${companyAuthRows.length} redova`);

  const companyCpvRows = [...byCompanyCpv.entries()].map(([key, v]) => {
    const [company_jib, cpv_code] = key.split("|");
    const apps = appearancesByCompanyCpv.get(key) ?? v.wins;
    return {
      company_jib,
      cpv_code,
      appearances: apps,
      wins: v.wins,
      win_rate: apps > 0 ? Math.round((v.wins / apps) * 10000) / 100 : null,
      updated_at: new Date().toISOString(),
    };
  });
  await upsertChunked("company_cpv_stats", companyCpvRows, "company_jib,cpv_code");
  console.log(`   ✓ company_cpv_stats: ${companyCpvRows.length} redova`);

  console.timeEnd("backfill-analytics");
  console.log("\n✓ Backfill završen. Pokreni dnevni cron da održava svježe vrijednosti.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
