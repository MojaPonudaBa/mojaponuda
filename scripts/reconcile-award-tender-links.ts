/**
 * Reconciliation skripta: popunjava award_decisions.tender_id gdje je NULL
 * koristeći kombinaciju signala:
 *   Stage 1 (strogi match): notice_id ili procedure_id → tenders.portal_id
 *   Stage 2 (srednji):      (contracting_authority_jib + procedure_name exact)
 *                           gdje tender.title == award.procedure_name
 *   Stage 3 (fuzzy):        (contracting_authority_jib + estimated_value ±1 KM
 *                           + award_date unutar ±90 dana od tender.created_at)
 *
 * Koristi: npx tsx scripts/reconcile-award-tender-links.ts
 *
 * Bezbjedno za višestruko pokretanje — ne dira awarde koji već imaju tender_id.
 *
 * NAPOMENA: Većina historijskih awarda (2014-2025) neće imati match jer ti
 * tenderi nisu u `tenders` tablici. To je očekivano; skripta reportira % match
 * rate-a po stage-u za vidljivost.
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

// Učitaj .env.local prvo, pa .env kao fallback
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

const PAGE_SIZE = 1000;
const DATE_TOLERANCE_MS = 90 * 24 * 60 * 60 * 1000; // ±90 dana

interface TenderRef {
  id: string;
  portal_id: string | null;
  title: string | null;
  contracting_authority_jib: string | null;
  estimated_value: number | null;
  created_at: string | null;
}

interface AwardRef {
  id: string;
  portal_award_id: string | null;
  notice_id: string | null;
  procedure_id: string | null;
  contracting_authority_jib: string | null;
  procedure_name: string | null;
  estimated_value: number | null;
  award_date: string | null;
}

function normalizeTitle(s: string | null): string {
  if (!s) return "";
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

async function fetchAllTenders(): Promise<TenderRef[]> {
  console.log("→ Dohvatam sve tendere …");
  const all: TenderRef[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("tenders")
      .select("id, portal_id, title, contracting_authority_jib, estimated_value, created_at")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const t of data) {
      all.push({
        id: t.id,
        portal_id: t.portal_id ?? null,
        title: t.title ?? null,
        contracting_authority_jib: t.contracting_authority_jib ?? null,
        estimated_value: t.estimated_value !== null && t.estimated_value !== undefined ? Number(t.estimated_value) : null,
        created_at: t.created_at ?? null,
      });
    }
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  console.log(`   indeksirano ${all.length} tendera`);
  return all;
}

async function fetchAwardsNeedingTenderLink(): Promise<AwardRef[]> {
  console.log("→ Dohvatam awards sa tender_id = NULL …");
  const all: AwardRef[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("award_decisions")
      .select("id, portal_award_id, notice_id, procedure_id, contracting_authority_jib, procedure_name, estimated_value, award_date")
      .is("tender_id", null)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const a of data) {
      all.push({
        id: a.id,
        portal_award_id: a.portal_award_id ?? null,
        notice_id: a.notice_id ?? null,
        procedure_id: a.procedure_id ?? null,
        contracting_authority_jib: a.contracting_authority_jib ?? null,
        procedure_name: a.procedure_name ?? null,
        estimated_value: a.estimated_value !== null && a.estimated_value !== undefined ? Number(a.estimated_value) : null,
        award_date: a.award_date ?? null,
      });
    }
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  console.log(`   dohvaćeno ${all.length} awarda koje treba reconcile-ati`);
  return all;
}

interface TenderIndex {
  byPortalId: Map<string, TenderRef>;
  byAuthorityTitle: Map<string, TenderRef[]>; // key = `${jib}|${normTitle}`
  byAuthority: Map<string, TenderRef[]>;
}

function buildTenderIndex(tenders: TenderRef[]): TenderIndex {
  const byPortalId = new Map<string, TenderRef>();
  const byAuthorityTitle = new Map<string, TenderRef[]>();
  const byAuthority = new Map<string, TenderRef[]>();

  for (const t of tenders) {
    if (t.portal_id) byPortalId.set(t.portal_id, t);
    if (t.contracting_authority_jib) {
      const aList = byAuthority.get(t.contracting_authority_jib) ?? [];
      aList.push(t);
      byAuthority.set(t.contracting_authority_jib, aList);
      const nt = normalizeTitle(t.title);
      if (nt) {
        const key = `${t.contracting_authority_jib}|${nt}`;
        const atList = byAuthorityTitle.get(key) ?? [];
        atList.push(t);
        byAuthorityTitle.set(key, atList);
      }
    }
  }
  return { byPortalId, byAuthorityTitle, byAuthority };
}

function matchStage1(award: AwardRef, idx: TenderIndex): TenderRef | null {
  if (award.notice_id) {
    const t = idx.byPortalId.get(award.notice_id);
    if (t) return t;
  }
  if (award.procedure_id) {
    const t = idx.byPortalId.get(award.procedure_id);
    if (t) return t;
  }
  return null;
}

function matchStage2(award: AwardRef, idx: TenderIndex): TenderRef | null {
  if (!award.contracting_authority_jib || !award.procedure_name) return null;
  const key = `${award.contracting_authority_jib}|${normalizeTitle(award.procedure_name)}`;
  const candidates = idx.byAuthorityTitle.get(key);
  if (!candidates || candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  // Više kandidata: izaberi najbliži po datumu award_date vs tender.created_at
  if (!award.award_date) return candidates[0];
  const awardTs = new Date(award.award_date).getTime();
  let best = candidates[0];
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const c of candidates) {
    if (!c.created_at) continue;
    const diff = Math.abs(new Date(c.created_at).getTime() - awardTs);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = c;
    }
  }
  return best;
}

function matchStage3(award: AwardRef, idx: TenderIndex): TenderRef | null {
  if (!award.contracting_authority_jib || award.estimated_value === null) return null;
  const candidates = idx.byAuthority.get(award.contracting_authority_jib);
  if (!candidates) return null;
  const value = award.estimated_value;
  const awardTs = award.award_date ? new Date(award.award_date).getTime() : null;

  const matches = candidates.filter((t) => {
    if (t.estimated_value === null) return false;
    if (Math.abs(t.estimated_value - value) > 1) return false;
    if (awardTs !== null && t.created_at) {
      const tts = new Date(t.created_at).getTime();
      if (Math.abs(tts - awardTs) > DATE_TOLERANCE_MS) return false;
    }
    return true;
  });

  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];
  // Više: najbliži po datumu
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

async function updateAwardsInBatches(updates: Array<{ id: string; tender_id: string }>) {
  if (updates.length === 0) return;
  const CHUNK = 100;
  let done = 0;
  for (let i = 0; i < updates.length; i += CHUNK) {
    const slice = updates.slice(i, i + CHUNK);
    // Radimo sekvencijalne update-ove u granulama po 10 (Supabase rate limit friendly)
    const INNER = 10;
    for (let j = 0; j < slice.length; j += INNER) {
      const batch = slice.slice(j, j + INNER);
      await Promise.all(
        batch.map((u) =>
          supabase.from("award_decisions").update({ tender_id: u.tender_id }).eq("id", u.id)
        )
      );
    }
    done += slice.length;
    process.stdout.write(`   update +${done}/${updates.length}\r`);
  }
  console.log("");
}

async function main() {
  console.time("reconcile-award-tender-links");

  const [tenders, awards] = await Promise.all([
    fetchAllTenders(),
    fetchAwardsNeedingTenderLink(),
  ]);

  if (awards.length === 0) {
    console.log("✓ Nema awarda sa tender_id = NULL. Ništa za reconcile.");
    return;
  }

  console.log("→ Gradim tender indeks …");
  const idx = buildTenderIndex(tenders);

  console.log("→ Matching stages …");
  const updates: Array<{ id: string; tender_id: string }> = [];
  let stage1 = 0;
  let stage2 = 0;
  let stage3 = 0;
  let unmatched = 0;

  for (const award of awards) {
    const m1 = matchStage1(award, idx);
    if (m1) {
      updates.push({ id: award.id, tender_id: m1.id });
      stage1++;
      continue;
    }
    const m2 = matchStage2(award, idx);
    if (m2) {
      updates.push({ id: award.id, tender_id: m2.id });
      stage2++;
      continue;
    }
    const m3 = matchStage3(award, idx);
    if (m3) {
      updates.push({ id: award.id, tender_id: m3.id });
      stage3++;
      continue;
    }
    unmatched++;
  }

  console.log(`   Stage 1 (notice/procedure_id):     ${stage1}`);
  console.log(`   Stage 2 (authority + title):        ${stage2}`);
  console.log(`   Stage 3 (authority + value + date): ${stage3}`);
  console.log(`   Unmatched (istorijski + ostali):    ${unmatched}`);
  console.log(`   → Ukupno update-ova: ${updates.length}`);

  if (updates.length === 0) {
    console.log("Nema match-eva. Ovo je očekivano ako su svi awardi iz perioda prije prvog tender sync-a.");
    console.timeEnd("reconcile-award-tender-links");
    return;
  }

  console.log("→ Apliciram update-ove u bazu …");
  await updateAwardsInBatches(updates);

  console.timeEnd("reconcile-award-tender-links");
  console.log(`✓ Reconciliation završen. ${updates.length} awarda sada ima tender_id.`);
  console.log("→ Preporuka: pokreni ponovo 'npx tsx scripts/backfill-analytics.ts' da osvježi CPV agregate.");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
