// ============================================================
// EJN Sync Orchestrator
// Reads last_sync_at from sync_log, fetches incremental data,
// upserts into Supabase, writes sync result to sync_log.
// ============================================================

import { createClient } from "@supabase/supabase-js";
import {
  fetchProcurementNotices,
  fetchAwardNotices,
  fetchContractingAuthorities,
  fetchSuppliers,
  fetchPlannedProcurements,
  type EjnProcurementNotice,
  type EjnAwardNotice,
  type EjnContractingAuthority,
  type EjnSupplier,
  type EjnPlannedProcurement,
} from "@/lib/ejn-api";

interface SyncResult {
  endpoint: string;
  added: number;
  updated: number;
  error?: string;
}

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getLastSyncAt(
  supabase: ReturnType<typeof createServiceClient>,
  endpoint: string
): Promise<string | null> {
  const { data } = await supabase
    .from("sync_log")
    .select("last_sync_at")
    .eq("endpoint", endpoint)
    .order("ran_at", { ascending: false })
    .limit(1)
    .single();

  // Return null on first sync to fetch all data
  return data?.last_sync_at ?? null;
}

async function writeSyncLog(
  supabase: ReturnType<typeof createServiceClient>,
  endpoint: string,
  lastSyncAt: string,
  added: number,
  updated: number
) {
  await supabase.from("sync_log").insert({
    endpoint,
    last_sync_at: lastSyncAt,
    records_added: added,
    records_updated: updated,
  });
}

// --- Sync: Tenders (ProcurementNotices) ---

async function syncTenders(
  supabase: ReturnType<typeof createServiceClient>
): Promise<SyncResult> {
  const endpoint = "ProcurementNotices";
  try {
    const lastSync = await getLastSyncAt(supabase, endpoint);
    const notices = await fetchProcurementNotices(lastSync);

    let added = 0;
    let updated = 0;

    for (const n of notices) {
      const row = {
        portal_id: n.NoticeId,
        title: n.Title || "Bez naziva",
        contracting_authority: n.ContractingAuthorityName || null,
        contracting_authority_jib: n.ContractingAuthorityJib || null,
        deadline: n.Deadline || null,
        estimated_value: n.EstimatedValue || null,
        contract_type: n.ContractType || null,
        procedure_type: n.ProcedureType || null,
        status: n.Status || null,
        portal_url: n.NoticeUrl || null,
        raw_description: n.Description || null,
      };

      const { data: existing } = await supabase
        .from("tenders")
        .select("id")
        .eq("portal_id", n.NoticeId)
        .single();

      if (existing) {
        await supabase.from("tenders").update(row).eq("portal_id", n.NoticeId);
        updated++;
      } else {
        await supabase.from("tenders").insert(row);
        added++;
      }
    }

    const syncAt = new Date().toISOString();
    await writeSyncLog(supabase, endpoint, syncAt, added, updated);

    return { endpoint, added, updated };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { endpoint, added: 0, updated: 0, error: msg };
  }
}

// --- Sync: Award Decisions ---

async function syncAwardDecisions(
  supabase: ReturnType<typeof createServiceClient>
): Promise<SyncResult> {
  const endpoint = "AwardNotices";
  try {
    const lastSync = await getLastSyncAt(supabase, endpoint);
    const awards = await fetchAwardNotices(lastSync);

    let added = 0;
    let updated = 0;

    for (const a of awards) {
      // Pokušaj naći tender po NoticeId
      let tenderId: string | null = null;
      if (a.NoticeId) {
        const { data: tender } = await supabase
          .from("tenders")
          .select("id")
          .eq("portal_id", a.NoticeId)
          .single();
        tenderId = tender?.id ?? null;
      }

      const row = {
        portal_award_id: a.AwardId,
        tender_id: tenderId,
        contracting_authority_jib: a.ContractingAuthorityJib || null,
        winner_name: a.WinnerName || null,
        winner_jib: a.WinnerJib || null,
        winning_price: a.WinningPrice || null,
        estimated_value: a.EstimatedValue || null,
        total_bidders_count: a.TotalBiddersCount || null,
        procedure_type: a.ProcedureType || null,
        contract_type: a.ContractType || null,
        award_date: a.AwardDate || null,
      };

      const { data: existing } = await supabase
        .from("award_decisions")
        .select("id")
        .eq("portal_award_id", a.AwardId)
        .single();

      if (existing) {
        await supabase
          .from("award_decisions")
          .update(row)
          .eq("portal_award_id", a.AwardId);
        updated++;
      } else {
        await supabase.from("award_decisions").insert(row);
        added++;
      }
    }

    const syncAt = new Date().toISOString();
    await writeSyncLog(supabase, endpoint, syncAt, added, updated);

    return { endpoint, added, updated };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { endpoint, added: 0, updated: 0, error: msg };
  }
}

// --- Sync: Contracting Authorities ---

async function syncContractingAuthorities(
  supabase: ReturnType<typeof createServiceClient>
): Promise<SyncResult> {
  const endpoint = "ContractingAuthorities";
  try {
    const lastSync = await getLastSyncAt(supabase, endpoint);
    const authorities = await fetchContractingAuthorities(lastSync);

    let added = 0;
    let updated = 0;

    for (const ca of authorities) {
      const row = {
        portal_id: ca.AuthorityId,
        name: ca.Name || "Nepoznato",
        jib: ca.Jib,
        city: ca.City || null,
        entity: ca.Entity || null,
        canton: ca.Canton || null,
        municipality: ca.Municipality || null,
        authority_type: ca.AuthorityType || null,
        activity_type: ca.ActivityType || null,
      };

      const { data: existing } = await supabase
        .from("contracting_authorities")
        .select("id")
        .eq("jib", ca.Jib)
        .single();

      if (existing) {
        await supabase
          .from("contracting_authorities")
          .update(row)
          .eq("jib", ca.Jib);
        updated++;
      } else {
        await supabase.from("contracting_authorities").insert(row);
        added++;
      }
    }

    const syncAt = new Date().toISOString();
    await writeSyncLog(supabase, endpoint, syncAt, added, updated);

    return { endpoint, added, updated };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { endpoint, added: 0, updated: 0, error: msg };
  }
}

// --- Sync: Suppliers (Market Companies) ---

async function syncSuppliers(
  supabase: ReturnType<typeof createServiceClient>
): Promise<SyncResult> {
  const endpoint = "Suppliers";
  try {
    const lastSync = await getLastSyncAt(supabase, endpoint);
    const suppliers = await fetchSuppliers(lastSync);

    let added = 0;
    let updated = 0;

    for (const s of suppliers) {
      if (!s.Jib) continue;

      const row = {
        portal_id: s.SupplierId || null,
        name: s.Name || "Nepoznato",
        jib: s.Jib,
        city: s.City || null,
        municipality: s.Municipality || null,
      };

      const { data: existing } = await supabase
        .from("market_companies")
        .select("id")
        .eq("jib", s.Jib)
        .single();

      if (existing) {
        await supabase.from("market_companies").update(row).eq("jib", s.Jib);
        updated++;
      } else {
        await supabase.from("market_companies").insert(row);
        added++;
      }
    }

    const syncAt = new Date().toISOString();
    await writeSyncLog(supabase, endpoint, syncAt, added, updated);

    return { endpoint, added, updated };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { endpoint, added: 0, updated: 0, error: msg };
  }
}

// --- Sync: Planned Procurements ---

async function syncPlannedProcurements(
  supabase: ReturnType<typeof createServiceClient>
): Promise<SyncResult> {
  const endpoint = "PlannedProcurements";
  try {
    const lastSync = await getLastSyncAt(supabase, endpoint);
    const plans = await fetchPlannedProcurements(lastSync);

    let added = 0;
    let updated = 0;

    for (const p of plans) {
      // Pokušaj naći contracting authority
      let authorityId: string | null = null;
      if (p.ContractingAuthorityId) {
        const { data: ca } = await supabase
          .from("contracting_authorities")
          .select("id")
          .eq("portal_id", p.ContractingAuthorityId)
          .single();
        authorityId = ca?.id ?? null;
      }

      const row = {
        portal_id: p.PlanId,
        contracting_authority_id: authorityId,
        description: p.Description || null,
        estimated_value: p.EstimatedValue || null,
        planned_date: p.PlannedDate || null,
        contract_type: p.ContractType || null,
        cpv_code: p.CpvCode || null,
      };

      const { data: existing } = await supabase
        .from("planned_procurements")
        .select("id")
        .eq("portal_id", p.PlanId)
        .single();

      if (existing) {
        await supabase
          .from("planned_procurements")
          .update(row)
          .eq("portal_id", p.PlanId);
        updated++;
      } else {
        await supabase.from("planned_procurements").insert(row);
        added++;
      }
    }

    const syncAt = new Date().toISOString();
    await writeSyncLog(supabase, endpoint, syncAt, added, updated);

    return { endpoint, added, updated };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { endpoint, added: 0, updated: 0, error: msg };
  }
}

// --- Main: Run full sync ---

export async function runFullSync(): Promise<{
  results: SyncResult[];
  duration_ms: number;
}> {
  const supabase = createServiceClient();
  const start = Date.now();

  // Sync u redoslijedu zavisnosti: authorities → suppliers → tenders → awards → plans
  const results: SyncResult[] = [];

  results.push(await syncContractingAuthorities(supabase));
  results.push(await syncSuppliers(supabase));
  results.push(await syncTenders(supabase));
  results.push(await syncAwardDecisions(supabase));
  results.push(await syncPlannedProcurements(supabase));

  const duration_ms = Date.now() - start;
  return { results, duration_ms };
}
