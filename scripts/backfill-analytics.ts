/**
 * Backfill svih agregatnih analitičkih tablica iz
 * `public.award_decisions` + `public.tenders` + `public.tender_participants`.
 *
 * Pokreni JEDNOM:
 *   npx tsx scripts/backfill-analytics.ts
 *
 * Popuniti prije nego što se cron uključi. Idempotentan — UPSERT na sve tablice.
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

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

async function fetchAllAwards() {
  console.log("→ Dohvatam award_decisions + join tenders …");
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
        "winner_jib, winner_name, contracting_authority_jib, winning_price, estimated_value, discount_pct, total_bidders_count, tenders(cpv_code)"
      )
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const r of data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tt: any = Array.isArray((r as any).tenders) ? (r as any).tenders[0] : (r as any).tenders;
      all.push({
        winner_jib: r.winner_jib,
        winner_name: r.winner_name,
        contracting_authority_jib: r.contracting_authority_jib,
        winning_price: r.winning_price ? Number(r.winning_price) : null,
        estimated_value: r.estimated_value ? Number(r.estimated_value) : null,
        discount_pct: r.discount_pct ? Number(r.discount_pct) : null,
        total_bidders_count: r.total_bidders_count,
        tender_cpv: tt?.cpv_code ?? null,
      });
    }
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
    process.stdout.write(`   +${data.length} (ukupno ${all.length})\r`);
  }
  console.log(`\n   dohvaćeno ${all.length} award redova`);
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
  const [awards, authorityNames, tenderCountsByAuth, tenderCountsByCpv] = await Promise.all([
    fetchAllAwards(),
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

  // ── cpv_stats ───────────────────────────────────────────────────────
  console.log("→ Gradim cpv_stats …");
  const byCpv = new Map<string, {
    winningPrices: number[];
    discountPcts: number[];
    biddersCounts: number[];
    authorityCounter: Map<string, number>;
  }>();
  for (const a of awards) {
    const p = cpvPrefix(a.tender_cpv);
    if (!p) continue;
    const g = byCpv.get(p) ?? {
      winningPrices: [] as number[],
      discountPcts: [] as number[],
      biddersCounts: [] as number[],
      authorityCounter: new Map<string, number>(),
    };
    if (a.winning_price) g.winningPrices.push(a.winning_price);
    if (a.discount_pct !== null) g.discountPcts.push(a.discount_pct);
    if (a.total_bidders_count) g.biddersCounts.push(a.total_bidders_count);
    if (a.contracting_authority_jib) {
      g.authorityCounter.set(a.contracting_authority_jib, (g.authorityCounter.get(a.contracting_authority_jib) ?? 0) + 1);
    }
    byCpv.set(p, g);
  }
  const cpvRows = [...byCpv.entries()].map(([code, g]) => {
    const counts = tenderCountsByCpv.get(code) ?? { count: 0, totalValue: [] as number[] };
    return {
      cpv_code: code,
      tender_count: counts.count,
      avg_estimated_value: avg(counts.totalValue),
      avg_bidders_count: avg(g.biddersCounts),
      avg_discount_pct: avg(g.discountPcts),
      top_authorities: topKeys(g.authorityCounter, 5),
      updated_at: new Date().toISOString(),
    };
  });
  await upsertChunked("cpv_stats", cpvRows, "cpv_code");
  console.log(`   ✓ cpv_stats: ${cpvRows.length} redova`);

  // ── authority_cpv_stats ─────────────────────────────────────────────
  console.log("→ Gradim authority_cpv_stats …");
  const byAuthCpv = new Map<string, {
    winningPrices: number[];
    discountPcts: number[];
    biddersCounts: number[];
  }>();
  for (const a of awards) {
    if (!a.contracting_authority_jib) continue;
    const p = cpvPrefix(a.tender_cpv);
    if (!p) continue;
    const key = `${a.contracting_authority_jib}|${p}`;
    const g = byAuthCpv.get(key) ?? {
      winningPrices: [] as number[],
      discountPcts: [] as number[],
      biddersCounts: [] as number[],
    };
    if (a.winning_price) g.winningPrices.push(a.winning_price);
    if (a.discount_pct !== null) g.discountPcts.push(a.discount_pct);
    if (a.total_bidders_count) g.biddersCounts.push(a.total_bidders_count);
    byAuthCpv.set(key, g);
  }
  const authCpvRows = [...byAuthCpv.entries()].map(([key, g]) => {
    const [authority_jib, cpv_code] = key.split("|");
    return {
      authority_jib,
      cpv_code,
      tender_count: g.winningPrices.length || g.discountPcts.length,
      avg_discount_pct: avg(g.discountPcts),
      min_winning_price: g.winningPrices.length ? Math.min(...g.winningPrices) : null,
      max_winning_price: g.winningPrices.length ? Math.max(...g.winningPrices) : null,
      avg_winning_price: avg(g.winningPrices),
      avg_bidders_count: avg(g.biddersCounts),
      updated_at: new Date().toISOString(),
    };
  });
  await upsertChunked("authority_cpv_stats", authCpvRows, "authority_jib,cpv_code");
  console.log(`   ✓ authority_cpv_stats: ${authCpvRows.length} redova`);

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
      if (error.message?.includes("does not exist")) {
        console.log("   (tender_participants ne postoji — preskačem appearances)");
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
