// ============================================================
// EJN Sync Orchestrator
// Reads last_sync_at from sync_log, fetches incremental data,
// upserts into Supabase, writes sync result to sync_log.
// ============================================================

import { createClient } from "@supabase/supabase-js";
import {
  fetchProcurementNotices,
  fetchAwardNotices,
  fetchAwardedSupplierGroups,
  fetchContractingAuthorities,
  fetchSuppliers,
  fetchSuppliersByIds,
  fetchSupplierGroupSupplierLinks,
  fetchPlannedProcurements,
  type EjnProcurementNotice,
  type EjnAwardedSupplierGroup,
  type EjnSupplierGroupSupplierLink,
} from "@/lib/ejn-api";
import {
  getGeoEnrichmentFromAiAnalysis,
  mergeGeoEnrichmentIntoAiAnalysis,
  normalizeGeoText,
  resolveBestTenderArea,
  resolveTenderAreaWithAiHint,
} from "@/lib/tender-area";
import type { Json } from "@/types/database";

interface SyncResult {
  endpoint: string;
  added: number;
  updated: number;
  error?: string;
}

export const ADMIN_MANUAL_SYNC_ENDPOINTS = [
  "MorningSync4AM",
  "ProcurementNotices",
  "ContractingAuthorities",
  "ContractingAuthorityMaintenance4AM",
  "TenderAreaMaintenance4AM",
  "Awards",
  "PlannedProcurements",
  "Suppliers",
] as const;

export type AdminManualSyncEndpoint = (typeof ADMIN_MANUAL_SYNC_ENDPOINTS)[number];

export interface TenderAreaMaintenanceResult extends SyncResult {
  scanned: number;
  unresolved: number;
}

interface FullSyncOptions {
  authorityBackfillTarget?: number;
  authorityScanBatchSize?: number;
  authorityScanLimit?: number;
  runAuthorityMaintenanceAfterSync?: boolean;
  tenderAreaBackfillTarget?: number;
  tenderAreaScanBatchSize?: number;
  tenderAreaScanLimit?: number;
  runTenderAreaMaintenanceAfterSync?: boolean;
}

interface NightlyMaintenanceSweepOptions {
  supabase?: ReturnType<typeof createServiceClient>;
  authorityTarget?: number;
  authorityScanBatchSize?: number;
  authorityScanLimit?: number;
  tenderTarget?: number;
  tenderScanBatchSize?: number;
  tenderScanLimit?: number;
  maxCycles?: number;
  timeBudgetMs?: number;
}

interface ContractingAuthorityMaintenanceOptions {
  supabase?: ReturnType<typeof createServiceClient>;
  targetUpdates?: number;
  scanBatchSize?: number;
  maxScanRows?: number;
  endpoint?: string;
  writeLog?: boolean;
  allowAi?: boolean;
}

export interface ContractingAuthorityMaintenanceResult extends SyncResult {
  scanned: number;
  unresolved: number;
}

interface TenderAreaMaintenanceOptions {
  supabase?: ReturnType<typeof createServiceClient>;
  targetUpdates?: number;
  scanBatchSize?: number;
  maxScanRows?: number;
  endpoint?: string;
  writeLog?: boolean;
}

interface TenderAreaCandidate {
  id: string;
  title: string;
  contracting_authority: string | null;
  contracting_authority_jib: string | null;
  raw_description: string | null;
  ai_analysis: Json | null;
}

interface AuthorityGeoRecord {
  city: string | null;
  municipality: string | null;
  canton: string | null;
  entity: string | null;
}

interface AuthoritySeedCandidate {
  jib: string;
  name: string;
  portalId?: string | null;
  city?: string | null;
  municipality?: string | null;
  canton?: string | null;
  entity?: string | null;
  authorityType?: string | null;
  activityType?: string | null;
}

interface AuthorityGeoMaps {
  byJib: Map<string, AuthorityGeoRecord>;
  byExactName: Map<string, AuthorityGeoRecord>;
  byNormalizedName: Map<string, AuthorityGeoRecord>;
}

const DEFAULT_TENDER_AREA_BACKFILL_TARGET = 120;
const DEFAULT_TENDER_AREA_SCAN_BATCH_SIZE = 250;
const DEFAULT_TENDER_AREA_SCAN_LIMIT = 4000;
const DEFAULT_AUTHORITY_BACKFILL_TARGET = 150;
const DEFAULT_AUTHORITY_SCAN_BATCH_SIZE = 250;
const DEFAULT_AUTHORITY_SCAN_LIMIT = 4000;
const DEFAULT_NIGHTLY_MAINTENANCE_MAX_CYCLES = 6;
const DEFAULT_NIGHTLY_MAINTENANCE_TIME_BUDGET_MS = 210000;
const SARAJEVO_TIME_ZONE = "Europe/Sarajevo";
const MORNING_SYNC_ENDPOINT = "MorningSync4AM";
const MORNING_SYNC_ALLOWED_HOURS = new Set([4, 5]);

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

function chunkArray<T>(items: T[], size: number): T[][] {
  if (items.length === 0) {
    return [];
  }

  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])];
}

function buildAuthorityGeoRecord(row: {
  city: string | null;
  municipality: string | null;
  canton: string | null;
  entity: string | null;
}): AuthorityGeoRecord {
  return {
    city: row.city ?? null,
    municipality: row.municipality ?? null,
    canton: row.canton ?? null,
    entity: row.entity ?? null,
  };
}

function assignAuthorityGeoRecord(
  maps: AuthorityGeoMaps,
  authority: AuthorityGeoRecord,
  options: {
    jib?: string | null;
    name?: string | null;
  }
) {
  const trimmedJib = options.jib?.trim();
  const trimmedName = options.name?.trim();
  const normalizedName = normalizeGeoText(trimmedName);

  if (trimmedJib) {
    maps.byJib.set(trimmedJib, authority);
  }

  if (trimmedName) {
    maps.byExactName.set(trimmedName, authority);
  }

  if (normalizedName && !maps.byNormalizedName.has(normalizedName)) {
    maps.byNormalizedName.set(normalizedName, authority);
  }
}

function getAuthorityGeoFromMaps(
  maps: AuthorityGeoMaps,
  authorityJib: string | null | undefined,
  authorityName: string | null | undefined
): AuthorityGeoRecord | null {
  const trimmedJib = authorityJib?.trim();
  if (trimmedJib) {
    const byJib = maps.byJib.get(trimmedJib);
    if (byJib) {
      return byJib;
    }
  }

  const trimmedName = authorityName?.trim();
  if (trimmedName) {
    const byExactName = maps.byExactName.get(trimmedName);
    if (byExactName) {
      return byExactName;
    }

    const byNormalizedName = maps.byNormalizedName.get(normalizeGeoText(trimmedName));
    if (byNormalizedName) {
      return byNormalizedName;
    }
  }

  return null;
}

function hasAuthorityGeo(record: {
  city?: string | null;
  municipality?: string | null;
  canton?: string | null;
  entity?: string | null;
}): boolean {
  return Boolean(
    record.city?.trim() ||
      record.municipality?.trim() ||
      record.canton?.trim() ||
      record.entity?.trim()
  );
}

function isSeedPortalId(value: string | null | undefined): boolean {
  const normalized = value?.trim();
  return Boolean(normalized?.startsWith("notice-seed:") || normalized?.startsWith("tender-seed:"));
}

function chooseAuthorityPortalId(
  existingPortalId: string | null | undefined,
  candidatePortalId: string | null | undefined,
  jib: string
): string {
  const normalizedExisting = existingPortalId?.trim() || null;
  const normalizedCandidate = candidatePortalId?.trim() || null;

  if (normalizedCandidate && !isSeedPortalId(normalizedCandidate)) {
    return normalizedCandidate;
  }

  if (normalizedExisting && !isSeedPortalId(normalizedExisting)) {
    return normalizedExisting;
  }

  if (normalizedCandidate) {
    return normalizedCandidate;
  }

  if (normalizedExisting) {
    return normalizedExisting;
  }

  return `notice-seed:${jib}`;
}

function mergeAuthoritySeedCandidate(
  current: AuthoritySeedCandidate | undefined,
  next: AuthoritySeedCandidate
): AuthoritySeedCandidate {
  if (!current) {
    return next;
  }

  return {
    jib: current.jib,
    name: next.name?.trim() || current.name,
    portalId:
      next.portalId && !isSeedPortalId(next.portalId)
        ? next.portalId
        : current.portalId && !isSeedPortalId(current.portalId)
          ? current.portalId
          : next.portalId ?? current.portalId,
    city: current.city ?? next.city ?? null,
    municipality: current.municipality ?? next.municipality ?? null,
    canton: current.canton ?? next.canton ?? null,
    entity: current.entity ?? next.entity ?? null,
    authorityType: current.authorityType ?? next.authorityType ?? null,
    activityType: current.activityType ?? next.activityType ?? null,
  };
}

function addAuthoritySeedCandidate(
  target: Map<string, AuthoritySeedCandidate>,
  candidate: AuthoritySeedCandidate | null
) {
  const jib = candidate?.jib?.trim();
  const name = candidate?.name?.trim();

  if (!jib || !name) {
    return;
  }

  target.set(
    jib,
    mergeAuthoritySeedCandidate(target.get(jib), {
      ...candidate,
      jib,
      name,
      portalId: candidate?.portalId?.trim() || null,
      city: candidate?.city?.trim() || null,
      municipality: candidate?.municipality?.trim() || null,
      canton: candidate?.canton?.trim() || null,
      entity: candidate?.entity?.trim() || null,
      authorityType: candidate?.authorityType?.trim() || null,
      activityType: candidate?.activityType?.trim() || null,
    })
  );
}

async function loadExistingAuthoritiesByJib(
  supabase: ReturnType<typeof createServiceClient>,
  jibs: string[]
): Promise<
  Map<
    string,
    {
      portal_id: string;
      name: string;
      jib: string;
      city: string | null;
      municipality: string | null;
      canton: string | null;
      entity: string | null;
      authority_type: string | null;
      activity_type: string | null;
    }
  >
> {
  const map = new Map<
    string,
    {
      portal_id: string;
      name: string;
      jib: string;
      city: string | null;
      municipality: string | null;
      canton: string | null;
      entity: string | null;
      authority_type: string | null;
      activity_type: string | null;
    }
  >();

  for (const batch of chunkArray(uniqueNonEmpty(jibs), 250)) {
    const { data } = await supabase
      .from("contracting_authorities")
      .select("portal_id, name, jib, city, municipality, canton, entity, authority_type, activity_type")
      .in("jib", batch);

    for (const row of data ?? []) {
      if (row.jib) {
        map.set(row.jib, row);
      }
    }
  }

  return map;
}

async function resolveAuthorityGeoForCandidate(
  candidate: AuthoritySeedCandidate,
  allowAi: boolean
): Promise<AuthorityGeoRecord> {
  const context = {
    contracting_authority: candidate.name,
    authority_city: candidate.city ?? null,
    authority_municipality: candidate.municipality ?? null,
    authority_canton: candidate.canton ?? null,
    authority_entity: candidate.entity ?? null,
  };

  let geoEnrichment = resolveBestTenderArea(context, null);

  if (!geoEnrichment?.area_label && allowAi) {
    geoEnrichment = await resolveTenderAreaWithAiHint(context);
  }

  return {
    city: candidate.city ?? null,
    municipality: candidate.municipality ?? geoEnrichment?.municipality ?? null,
    canton: candidate.canton ?? geoEnrichment?.canton ?? null,
    entity: candidate.entity ?? geoEnrichment?.entity ?? null,
  };
}

async function upsertAuthoritySeedCandidates(
  supabase: ReturnType<typeof createServiceClient>,
  candidates: Iterable<AuthoritySeedCandidate>,
  options: { allowAi?: boolean } = {}
): Promise<{ added: number; updated: number; scanned: number; unresolved: number }> {
  const mergedCandidates = new Map<string, AuthoritySeedCandidate>();

  for (const candidate of candidates) {
    addAuthoritySeedCandidate(mergedCandidates, candidate);
  }

  if (mergedCandidates.size === 0) {
    return { added: 0, updated: 0, scanned: 0, unresolved: 0 };
  }

  const existingByJib = await loadExistingAuthoritiesByJib(supabase, [...mergedCandidates.keys()]);
  const rowsToUpsert: Array<{
    portal_id: string;
    name: string;
    jib: string;
    city: string | null;
    municipality: string | null;
    canton: string | null;
    entity: string | null;
    authority_type: string | null;
    activity_type: string | null;
  }> = [];
  let added = 0;
  let updated = 0;
  let unresolved = 0;

  for (const candidate of mergedCandidates.values()) {
    const existing = existingByJib.get(candidate.jib);
    const mergedCandidate: AuthoritySeedCandidate = {
      jib: candidate.jib,
      name: candidate.name || existing?.name || "Nepoznato",
      portalId: chooseAuthorityPortalId(existing?.portal_id, candidate.portalId, candidate.jib),
      city: candidate.city ?? existing?.city ?? null,
      municipality: candidate.municipality ?? existing?.municipality ?? null,
      canton: candidate.canton ?? existing?.canton ?? null,
      entity: candidate.entity ?? existing?.entity ?? null,
      authorityType: candidate.authorityType ?? existing?.authority_type ?? null,
      activityType: candidate.activityType ?? existing?.activity_type ?? null,
    };
    const resolvedGeo = await resolveAuthorityGeoForCandidate(
      mergedCandidate,
      options.allowAi ?? false
    );

    if (!hasAuthorityGeo(resolvedGeo)) {
      unresolved += 1;
    }

    rowsToUpsert.push({
      portal_id: mergedCandidate.portalId ?? `notice-seed:${mergedCandidate.jib}`,
      name: mergedCandidate.name,
      jib: mergedCandidate.jib,
      city: resolvedGeo.city,
      municipality: resolvedGeo.municipality,
      canton: resolvedGeo.canton,
      entity: resolvedGeo.entity,
      authority_type: mergedCandidate.authorityType ?? null,
      activity_type: mergedCandidate.activityType ?? null,
    });

    if (existing) {
      updated += 1;
    } else {
      added += 1;
    }
  }

  for (const batch of chunkArray(rowsToUpsert, 250)) {
    await supabase.from("contracting_authorities").upsert(batch, {
      onConflict: "jib",
      ignoreDuplicates: false,
    });
  }

  return {
    added,
    updated,
    scanned: mergedCandidates.size,
    unresolved,
  };
}

async function loadContractingAuthorityMaintenanceCandidates(
  supabase: ReturnType<typeof createServiceClient>,
  targetUpdates: number,
  scanBatchSize: number,
  maxScanRows: number
): Promise<AuthoritySeedCandidate[]> {
  const candidates: AuthoritySeedCandidate[] = [];
  let offset = 0;

  while (offset < maxScanRows && candidates.length < targetUpdates) {
    const currentBatchSize = Math.min(scanBatchSize, maxScanRows - offset);
    const { data } = await supabase
      .from("contracting_authorities")
      .select("portal_id, name, jib, city, municipality, canton, entity, authority_type, activity_type")
      .order("created_at", { ascending: false })
      .range(offset, offset + currentBatchSize - 1);

    const batch = data ?? [];
    if (batch.length === 0) {
      break;
    }

    for (const row of batch) {
      if (!row.jib || !row.name) {
        continue;
      }

      if (!hasAuthorityGeo(row)) {
        candidates.push({
          jib: row.jib,
          name: row.name,
          portalId: row.portal_id,
          city: row.city ?? null,
          municipality: row.municipality ?? null,
          canton: row.canton ?? null,
          entity: row.entity ?? null,
          authorityType: row.authority_type ?? null,
          activityType: row.activity_type ?? null,
        });

        if (candidates.length >= targetUpdates) {
          break;
        }
      }
    }

    offset += batch.length;

    if (batch.length < currentBatchSize) {
      break;
    }
  }

  return candidates;
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

function getSarajevoLocalParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: SARAJEVO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const getPart = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";

  return {
    dayKey: `${getPart("year")}-${getPart("month")}-${getPart("day")}`,
    hour: Number(getPart("hour")),
    minute: Number(getPart("minute")),
  };
}

async function hasSyncRunOnSarajevoDay(
  supabase: ReturnType<typeof createServiceClient>,
  endpoint: string,
  dayKey: string
): Promise<boolean> {
  const { data } = await supabase
    .from("sync_log")
    .select("ran_at")
    .eq("endpoint", endpoint)
    .order("ran_at", { ascending: false })
    .limit(10);

  return (data ?? []).some((row) => getSarajevoLocalParts(new Date(row.ran_at)).dayKey === dayKey);
}

async function loadTenderAreaCandidates(
  supabase: ReturnType<typeof createServiceClient>,
  targetUpdates: number,
  scanBatchSize: number,
  maxScanRows: number
): Promise<TenderAreaCandidate[]> {
  const candidates: TenderAreaCandidate[] = [];
  let offset = 0;

  while (offset < maxScanRows && candidates.length < targetUpdates) {
    const currentBatchSize = Math.min(scanBatchSize, maxScanRows - offset);
    const { data } = await supabase
      .from("tenders")
      .select(
        "id, title, contracting_authority, contracting_authority_jib, raw_description, ai_analysis"
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + currentBatchSize - 1);

    const batch = (data ?? []) as TenderAreaCandidate[];

    if (batch.length === 0) {
      break;
    }

    for (const tender of batch) {
      if (!getGeoEnrichmentFromAiAnalysis(tender.ai_analysis)?.area_label) {
        candidates.push(tender);
        if (candidates.length >= targetUpdates) {
          break;
        }
      }
    }

    offset += batch.length;

    if (batch.length < currentBatchSize) {
      break;
    }
  }

  return candidates;
}

async function buildTenderIdMap(
  supabase: ReturnType<typeof createServiceClient>,
  portalIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  for (const batch of chunkArray(uniqueNonEmpty(portalIds), 250)) {
    const { data } = await supabase
      .from("tenders")
      .select("id, portal_id")
      .in("portal_id", batch);

    for (const row of data ?? []) {
      if (row.portal_id) {
        map.set(row.portal_id, row.id);
      }
    }
  }

  return map;
}

async function buildContractingAuthorityIdMapByPortalId(
  supabase: ReturnType<typeof createServiceClient>,
  portalIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  for (const batch of chunkArray(uniqueNonEmpty(portalIds), 250)) {
    const { data } = await supabase
      .from("contracting_authorities")
      .select("id, portal_id")
      .in("portal_id", batch);

    for (const row of data ?? []) {
      if (row.portal_id) {
        map.set(row.portal_id, row.id);
      }
    }
  }

  return map;
}

async function buildExistingAwardDecisionIdSet(
  supabase: ReturnType<typeof createServiceClient>,
  portalAwardIds: string[]
): Promise<Set<string>> {
  const existingIds = new Set<string>();

  for (const batch of chunkArray(uniqueNonEmpty(portalAwardIds), 250)) {
    const { data } = await supabase
      .from("award_decisions")
      .select("portal_award_id")
      .in("portal_award_id", batch);

    for (const row of data ?? []) {
      if (row.portal_award_id) {
        existingIds.add(row.portal_award_id);
      }
    }
  }

  return existingIds;
}

async function buildExistingPlannedProcurementIdSet(
  supabase: ReturnType<typeof createServiceClient>,
  portalIds: string[]
): Promise<Set<string>> {
  const existingIds = new Set<string>();

  for (const batch of chunkArray(uniqueNonEmpty(portalIds), 250)) {
    const { data } = await supabase
      .from("planned_procurements")
      .select("portal_id")
      .in("portal_id", batch);

    for (const row of data ?? []) {
      if (row.portal_id) {
        existingIds.add(row.portal_id);
      }
    }
  }

  return existingIds;
}

async function loadAuthoritySeedCandidatesFromTenderHistory(
  supabase: ReturnType<typeof createServiceClient>,
  targetUpdates: number,
  scanBatchSize: number,
  maxScanRows: number
): Promise<AuthoritySeedCandidate[]> {
  const candidates = new Map<string, AuthoritySeedCandidate>();
  let offset = 0;

  while (offset < maxScanRows && candidates.size < targetUpdates) {
    const currentBatchSize = Math.min(scanBatchSize, maxScanRows - offset);
    const { data } = await supabase
      .from("tenders")
      .select("contracting_authority, contracting_authority_jib")
      .order("created_at", { ascending: false })
      .range(offset, offset + currentBatchSize - 1);

    const batch = data ?? [];
    if (batch.length === 0) {
      break;
    }

    for (const row of batch) {
      const jib = row.contracting_authority_jib?.trim();
      const name = row.contracting_authority?.trim();

      if (!jib || !name) {
        continue;
      }

      addAuthoritySeedCandidate(candidates, {
        jib,
        name,
        portalId: `tender-seed:${jib}`,
      });

      if (candidates.size >= targetUpdates) {
        break;
      }
    }

    offset += batch.length;

    if (batch.length < currentBatchSize) {
      break;
    }
  }

  return [...candidates.values()];
}

async function seedMissingContractingAuthoritiesFromNotices(
  supabase: ReturnType<typeof createServiceClient>,
  notices: EjnProcurementNotice[]
): Promise<void> {
  const seedCandidates = notices.map((notice) => ({
    jib: notice.ContractingAuthorityJib?.trim() || "",
    name: notice.ContractingAuthorityName?.trim() || "",
    portalId: notice.ContractingAuthorityJib?.trim()
      ? `notice-seed:${notice.ContractingAuthorityJib.trim()}`
      : null,
  }));

  await upsertAuthoritySeedCandidates(supabase, seedCandidates, {
    allowAi: false,
  });
}

async function buildAuthorityGeoMaps(
  supabase: ReturnType<typeof createServiceClient>,
  authorityJibs: string[],
  authorityNames: string[]
): Promise<AuthorityGeoMaps> {
  const maps: AuthorityGeoMaps = {
    byJib: new Map<string, AuthorityGeoRecord>(),
    byExactName: new Map<string, AuthorityGeoRecord>(),
    byNormalizedName: new Map<string, AuthorityGeoRecord>(),
  };

  const exactNameMap = await buildAuthorityGeoMapByName(supabase, authorityNames);
  for (const [name, authority] of exactNameMap.entries()) {
    assignAuthorityGeoRecord(maps, authority, { name });
  }

  for (const batch of chunkArray(uniqueNonEmpty(authorityJibs), 250)) {
    const { data } = await supabase
      .from("contracting_authorities")
      .select("jib, name, city, municipality, canton, entity")
      .in("jib", batch);

    for (const row of data ?? []) {
      if (!row.jib) {
        continue;
      }

      const authority = buildAuthorityGeoRecord(row);
      assignAuthorityGeoRecord(maps, authority, {
        jib: row.jib,
        name: row.name ?? null,
      });
    }
  }

  const { data: allAuthorities } = await supabase
    .from("contracting_authorities")
    .select("jib, name, city, municipality, canton, entity");

  for (const row of allAuthorities ?? []) {
    if (!row.name) {
      continue;
    }

    const normalizedName = normalizeGeoText(row.name);
    if (!normalizedName || maps.byNormalizedName.has(normalizedName)) {
      continue;
    }

    assignAuthorityGeoRecord(maps, buildAuthorityGeoRecord(row), {
      jib: row.jib ?? null,
      name: row.name,
    });
  }

  return maps;
}

async function buildAuthorityGeoMapByName(
  supabase: ReturnType<typeof createServiceClient>,
  authorityNames: string[]
): Promise<Map<string, AuthorityGeoRecord>> {
  const map = new Map<string, AuthorityGeoRecord>();

  for (const batch of chunkArray(uniqueNonEmpty(authorityNames), 100)) {
    const { data } = await supabase
      .from("contracting_authorities")
      .select("name, city, municipality, canton, entity")
      .in("name", batch);

    for (const row of data ?? []) {
      if (row.name) {
        map.set(row.name, {
          city: row.city ?? null,
          municipality: row.municipality ?? null,
          canton: row.canton ?? null,
          entity: row.entity ?? null,
        });
      }
    }
  }

  return map;
}

export async function runContractingAuthorityMaintenance(
  options: ContractingAuthorityMaintenanceOptions = {}
): Promise<ContractingAuthorityMaintenanceResult> {
  const supabase = options.supabase ?? createServiceClient();
  const endpoint = options.endpoint ?? "ContractingAuthorityMaintenance";
  const targetUpdates = options.targetUpdates ?? DEFAULT_AUTHORITY_BACKFILL_TARGET;
  const scanBatchSize = options.scanBatchSize ?? DEFAULT_AUTHORITY_SCAN_BATCH_SIZE;
  const maxScanRows = options.maxScanRows ?? DEFAULT_AUTHORITY_SCAN_LIMIT;

  try {
    const [registryCandidates, tenderHistoryCandidates] = await Promise.all([
      loadContractingAuthorityMaintenanceCandidates(
        supabase,
        Math.max(1, targetUpdates),
        Math.max(1, scanBatchSize),
        Math.max(1, maxScanRows)
      ),
      loadAuthoritySeedCandidatesFromTenderHistory(
        supabase,
        Math.max(1, targetUpdates),
        Math.max(1, scanBatchSize),
        Math.max(1, maxScanRows)
      ),
    ]);

    const result = await upsertAuthoritySeedCandidates(
      supabase,
      [...registryCandidates, ...tenderHistoryCandidates],
      { allowAi: options.allowAi ?? false }
    );

    if (options.writeLog) {
      await writeSyncLog(supabase, endpoint, new Date().toISOString(), result.added, result.updated);
    }

    return {
      endpoint,
      added: result.added,
      updated: result.updated,
      scanned: result.scanned,
      unresolved: result.unresolved,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      endpoint,
      added: 0,
      updated: 0,
      scanned: 0,
      unresolved: 0,
      error: msg,
    };
  }
}

export async function runTenderAreaMaintenance(
  options: TenderAreaMaintenanceOptions = {}
): Promise<TenderAreaMaintenanceResult> {
  const supabase = options.supabase ?? createServiceClient();
  const endpoint = options.endpoint ?? "TenderAreaMaintenance";
  const targetUpdates = options.targetUpdates ?? DEFAULT_TENDER_AREA_BACKFILL_TARGET;
  const scanBatchSize = options.scanBatchSize ?? DEFAULT_TENDER_AREA_SCAN_BATCH_SIZE;
  const maxScanRows = options.maxScanRows ?? DEFAULT_TENDER_AREA_SCAN_LIMIT;

  try {
    const candidates = await loadTenderAreaCandidates(
      supabase,
      Math.max(1, targetUpdates),
      Math.max(1, scanBatchSize),
      Math.max(1, maxScanRows)
    );

    if (candidates.length === 0) {
      if (options.writeLog) {
        await writeSyncLog(supabase, endpoint, new Date().toISOString(), 0, 0);
      }

      return {
        endpoint,
        added: 0,
        updated: 0,
        scanned: 0,
        unresolved: 0,
      };
    }

    const authorityGeoMaps = await buildAuthorityGeoMaps(
      supabase,
      uniqueNonEmpty(candidates.map((tender) => tender.contracting_authority_jib)),
      uniqueNonEmpty(candidates.map((tender) => tender.contracting_authority))
    );

    let updated = 0;

    for (const tender of candidates) {
      const fallbackAuthority = getAuthorityGeoFromMaps(
        authorityGeoMaps,
        tender.contracting_authority_jib,
        tender.contracting_authority
      );
      const areaContext = {
        title: tender.title,
        raw_description: tender.raw_description,
        contracting_authority: tender.contracting_authority,
        authority_city: fallbackAuthority?.city ?? null,
        authority_municipality: fallbackAuthority?.municipality ?? null,
        authority_canton: fallbackAuthority?.canton ?? null,
        authority_entity: fallbackAuthority?.entity ?? null,
      };
      let geoEnrichment = resolveBestTenderArea(areaContext, null);

      if (!geoEnrichment?.area_label) {
        geoEnrichment = await resolveTenderAreaWithAiHint(areaContext);
      }

      if (!geoEnrichment?.area_label) {
        continue;
      }

      await supabase
        .from("tenders")
        .update({
          ai_analysis: mergeGeoEnrichmentIntoAiAnalysis(tender.ai_analysis, geoEnrichment),
        })
        .eq("id", tender.id);

      updated += 1;
    }

    if (options.writeLog) {
      await writeSyncLog(supabase, endpoint, new Date().toISOString(), 0, updated);
    }

    return {
      endpoint,
      added: 0,
      updated,
      scanned: candidates.length,
      unresolved: Math.max(candidates.length - updated, 0),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      endpoint,
      added: 0,
      updated: 0,
      scanned: 0,
      unresolved: 0,
      error: msg,
    };
  }
}

async function runNightlyMaintenanceSweep(
  options: NightlyMaintenanceSweepOptions = {}
): Promise<SyncResult[]> {
  const supabase = options.supabase ?? createServiceClient();
  const authorityTarget = options.authorityTarget ?? DEFAULT_AUTHORITY_BACKFILL_TARGET;
  const authorityScanBatchSize =
    options.authorityScanBatchSize ?? DEFAULT_AUTHORITY_SCAN_BATCH_SIZE;
  const authorityScanLimit = options.authorityScanLimit ?? DEFAULT_AUTHORITY_SCAN_LIMIT;
  const tenderTarget = options.tenderTarget ?? DEFAULT_TENDER_AREA_BACKFILL_TARGET;
  const tenderScanBatchSize =
    options.tenderScanBatchSize ?? DEFAULT_TENDER_AREA_SCAN_BATCH_SIZE;
  const tenderScanLimit = options.tenderScanLimit ?? DEFAULT_TENDER_AREA_SCAN_LIMIT;
  const maxCycles = options.maxCycles ?? DEFAULT_NIGHTLY_MAINTENANCE_MAX_CYCLES;
  const timeBudgetMs = options.timeBudgetMs ?? DEFAULT_NIGHTLY_MAINTENANCE_TIME_BUDGET_MS;
  const startedAt = Date.now();

  let authorityAdded = 0;
  let authorityUpdated = 0;
  let tenderUpdated = 0;
  let authorityError: string | undefined;
  let tenderError: string | undefined;

  for (let cycle = 1; cycle <= maxCycles; cycle += 1) {
    if (Date.now() - startedAt >= timeBudgetMs) {
      break;
    }

    const authorityMaintenance = await runContractingAuthorityMaintenance({
      supabase,
      endpoint: `ContractingAuthorityMaintenance4AM#${cycle}`,
      targetUpdates: authorityTarget,
      scanBatchSize: authorityScanBatchSize,
      maxScanRows: authorityScanLimit,
      writeLog: false,
      allowAi: false,
    });
    const tenderMaintenance = await runTenderAreaMaintenance({
      supabase,
      endpoint: `TenderAreaMaintenance4AM#${cycle}`,
      targetUpdates: tenderTarget,
      scanBatchSize: tenderScanBatchSize,
      maxScanRows: tenderScanLimit,
      writeLog: false,
    });

    authorityAdded += authorityMaintenance.added;
    authorityUpdated += authorityMaintenance.updated;
    tenderUpdated += tenderMaintenance.updated;

    if (!authorityError && authorityMaintenance.error) {
      authorityError = authorityMaintenance.error;
    }

    if (!tenderError && tenderMaintenance.error) {
      tenderError = tenderMaintenance.error;
    }

    if (authorityMaintenance.error || tenderMaintenance.error) {
      break;
    }

    const madeProgress =
      authorityMaintenance.added +
        authorityMaintenance.updated +
        tenderMaintenance.updated >
      0;
    const hasBacklog =
      authorityMaintenance.unresolved > 0 || tenderMaintenance.unresolved > 0;

    if (!madeProgress || !hasBacklog) {
      break;
    }
  }

  await writeSyncLog(
    supabase,
    "ContractingAuthorityMaintenance4AM",
    new Date().toISOString(),
    authorityAdded,
    authorityUpdated
  );
  await writeSyncLog(
    supabase,
    "TenderAreaMaintenance4AM",
    new Date().toISOString(),
    0,
    tenderUpdated
  );

  return [
    {
      endpoint: "ContractingAuthorityMaintenance4AM",
      added: authorityAdded,
      updated: authorityUpdated,
      ...(authorityError ? { error: authorityError } : {}),
    },
    {
      endpoint: "TenderAreaMaintenance4AM",
      added: 0,
      updated: tenderUpdated,
      ...(tenderError ? { error: tenderError } : {}),
    },
  ];
}

async function buildExistingTenderMap(
  supabase: ReturnType<typeof createServiceClient>,
  portalIds: string[]
): Promise<Map<string, { id: string; ai_analysis: Json | null }>> {
  const map = new Map<string, { id: string; ai_analysis: Json | null }>();

  for (const batch of chunkArray(uniqueNonEmpty(portalIds), 250)) {
    const { data } = await supabase
      .from("tenders")
      .select("id, portal_id, ai_analysis")
      .in("portal_id", batch);

    for (const row of data ?? []) {
      if (row.portal_id) {
        map.set(row.portal_id, {
          id: row.id,
          ai_analysis: (row.ai_analysis as Json | null | undefined) ?? null,
        });
      }
    }
  }

  return map;
}

async function buildSupplierPortalMap(
  supabase: ReturnType<typeof createServiceClient>,
  supplierPortalIds: string[]
): Promise<Map<string, { jib: string; name: string }>> {
  const map = new Map<string, { jib: string; name: string }>();

  for (const batch of chunkArray(uniqueNonEmpty(supplierPortalIds), 250)) {
    const { data } = await supabase
      .from("market_companies")
      .select("portal_id, jib, name")
      .in("portal_id", batch);

    for (const row of data ?? []) {
      if (row.portal_id && row.jib) {
        map.set(row.portal_id, { jib: row.jib, name: row.name });
      }
    }
  }

  return map;
}

async function backfillMissingSupplierPortalMapEntries(
  supabase: ReturnType<typeof createServiceClient>,
  supplierPortalMap: Map<string, { jib: string; name: string }>,
  supplierPortalIds: string[]
): Promise<Map<string, { jib: string; name: string }>> {
  const missingSupplierPortalIds = uniqueNonEmpty(supplierPortalIds).filter(
    (supplierPortalId) => !supplierPortalMap.has(supplierPortalId)
  );

  if (missingSupplierPortalIds.length === 0) {
    return supplierPortalMap;
  }

  const missingSuppliers = await fetchSuppliersByIds(missingSupplierPortalIds);

  const rowsToUpsert: Array<{
    portal_id: string | null;
    name: string;
    jib: string;
    city: string | null;
    municipality: string | null;
  }> = [];

  for (const supplier of missingSuppliers) {
    if (!supplier.SupplierId || !supplier.Jib) {
      continue;
    }

    const row = {
      portal_id: supplier.SupplierId,
      name: supplier.Name || "Nepoznato",
      jib: supplier.Jib,
      city: supplier.City || null,
      municipality: supplier.Municipality || null,
    };

    rowsToUpsert.push(row);

    supplierPortalMap.set(supplier.SupplierId, {
      jib: supplier.Jib,
      name: supplier.Name || "Nepoznato",
    });
  }

  for (const batch of chunkArray(rowsToUpsert, 250)) {
    await supabase.from("market_companies").upsert(batch, {
      onConflict: "jib",
      ignoreDuplicates: false,
    });
  }

  return supplierPortalMap;
}

function buildWinningSupplierPortalMap(
  groups: EjnAwardedSupplierGroup[],
  links: EjnSupplierGroupSupplierLink[]
): Map<string, string> {
  const linksByGroupId = new Map<string, EjnSupplierGroupSupplierLink[]>();

  for (const link of links) {
    const existing = linksByGroupId.get(link.SupplierGroupId);
    if (existing) {
      existing.push(link);
    } else {
      linksByGroupId.set(link.SupplierGroupId, [link]);
    }
  }

  const winnerPortalMap = new Map<string, string>();

  for (const group of groups) {
    if (!group.LotId) {
      continue;
    }

    const groupLinks = linksByGroupId.get(group.SupplierGroupId) ?? [];
    const leadSupplier = groupLinks.find((link) => link.IsLead) ?? groupLinks[0];

    if (leadSupplier?.SupplierId) {
      winnerPortalMap.set(group.LotId, leadSupplier.SupplierId);
    }
  }

  return winnerPortalMap;
}

async function refreshMarketCompanyAwardStats(
  supabase: ReturnType<typeof createServiceClient>,
  winnerJibs: string[]
): Promise<void> {
  const impactedJibs = uniqueNonEmpty(winnerJibs);

  if (impactedJibs.length === 0) {
    return;
  }

  const aggregates = new Map<string, { totalWins: number; totalWonValue: number }>();

  for (const batch of chunkArray(impactedJibs, 150)) {
    const { data: awards } = await supabase
      .from("award_decisions")
      .select("winner_jib, winning_price")
      .in("winner_jib", batch);

    for (const award of awards ?? []) {
      if (!award.winner_jib) {
        continue;
      }

      const current = aggregates.get(award.winner_jib) ?? { totalWins: 0, totalWonValue: 0 };
      current.totalWins += 1;
      current.totalWonValue += Number(award.winning_price) || 0;
      aggregates.set(award.winner_jib, current);
    }
  }

  for (const jib of impactedJibs) {
    const aggregate = aggregates.get(jib) ?? { totalWins: 0, totalWonValue: 0 };

    await supabase
      .from("market_companies")
      .update({
        total_wins_count: aggregate.totalWins,
        total_won_value: aggregate.totalWonValue,
      })
      .eq("jib", jib);
  }
}

// --- Sync: Tenders (ProcurementNotices) ---

async function syncTenders(
  supabase: ReturnType<typeof createServiceClient>,
  options: FullSyncOptions = {}
): Promise<SyncResult> {
  const endpoint = "ProcurementNotices";
  try {
    const lastSync = await getLastSyncAt(supabase, endpoint);
    const notices = await fetchProcurementNotices(lastSync);
    await seedMissingContractingAuthoritiesFromNotices(supabase, notices);
    const existingTenderMap = await buildExistingTenderMap(
      supabase,
      notices.map((notice) => notice.NoticeId)
    );
    const authorityGeoMaps = await buildAuthorityGeoMaps(
      supabase,
      uniqueNonEmpty(
        notices
          .map((notice) => notice.ContractingAuthorityJib)
          .filter((value): value is string => Boolean(value?.trim()))
      ),
      uniqueNonEmpty(notices.map((notice) => notice.ContractingAuthorityName))
    );

    let added = 0;
    let updated = 0;
    const rowsToUpsert: Array<Record<string, unknown>> = [];

    for (const n of notices) {
      const existingTender = existingTenderMap.get(n.NoticeId) ?? null;
      const fallbackAuthority = getAuthorityGeoFromMaps(
        authorityGeoMaps,
        n.ContractingAuthorityJib,
        n.ContractingAuthorityName
      );
      const areaContext = {
        title: n.Title || null,
        raw_description: n.Description || null,
        contracting_authority: n.ContractingAuthorityName || null,
        authority_city: fallbackAuthority?.city ?? null,
        authority_municipality: fallbackAuthority?.municipality ?? null,
        authority_canton: fallbackAuthority?.canton ?? null,
        authority_entity: fallbackAuthority?.entity ?? null,
      };
      const geoEnrichment = resolveBestTenderArea(
        areaContext,
        getGeoEnrichmentFromAiAnalysis(existingTender?.ai_analysis ?? null)
      );

      const row = {
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
        ai_analysis: mergeGeoEnrichmentIntoAiAnalysis(
          existingTender?.ai_analysis ?? null,
          geoEnrichment
        ),
      };

      if (existingTender) {
        updated++;
      } else {
        added++;
      }

      rowsToUpsert.push(row);
    }

    for (const batch of chunkArray(rowsToUpsert, 250)) {
      const { error } = await supabase.from("tenders").upsert(batch, {
        onConflict: "portal_id",
        ignoreDuplicates: false,
      });
      if (error) {
        throw new Error(`Tender upsert failed: ${error.message}`);
      }
    }

    if (options.runTenderAreaMaintenanceAfterSync !== false) {
      const maintenance = await runTenderAreaMaintenance({
        supabase,
        targetUpdates: options.tenderAreaBackfillTarget,
        scanBatchSize: options.tenderAreaScanBatchSize,
        maxScanRows: options.tenderAreaScanLimit,
        writeLog: false,
      });
      updated += maintenance.updated;
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
  const endpoint = "Awards";
  try {
    const lastSync = await getLastSyncAt(supabase, endpoint);
    const [awards, awardedGroups] = await Promise.all([
      fetchAwardNotices(lastSync),
      fetchAwardedSupplierGroups(lastSync),
    ]);

    const supplierGroupIds = uniqueNonEmpty(awardedGroups.map((group) => group.SupplierGroupId));
    const groupLinks = await fetchSupplierGroupSupplierLinks(supplierGroupIds);
    const winningSupplierPortalMap = buildWinningSupplierPortalMap(awardedGroups, groupLinks);
    const supplierPortalIds = [...winningSupplierPortalMap.values()];
    let supplierPortalMap = await buildSupplierPortalMap(
      supabase,
      supplierPortalIds
    );
    supplierPortalMap = await backfillMissingSupplierPortalMapEntries(
      supabase,
      supplierPortalMap,
      supplierPortalIds
    );
    const tenderIdMap = await buildTenderIdMap(
      supabase,
      uniqueNonEmpty(awards.flatMap((award) => [award.NoticeId, award.ProcedureId]))
    );
    const existingAwardIds = await buildExistingAwardDecisionIdSet(
      supabase,
      awards.map((award) => award.AwardId)
    );

    let added = 0;
    let updated = 0;
    const impactedWinnerJibs = new Set<string>();
    const rowsToUpsert: Array<{
      portal_award_id: string;
      tender_id: string | null;
      notice_id: string | null;
      procedure_id: string | null;
      contracting_authority_jib: string | null;
      procedure_name: string | null;
      winner_name: string | null;
      winner_jib: string | null;
      winning_price: number | null;
      estimated_value: number | null;
      total_bidders_count: number | null;
      procedure_type: string | null;
      contract_type: string | null;
      award_date: string | null;
    }> = [];

    for (const a of awards) {
      const tenderId = (a.NoticeId ? tenderIdMap.get(a.NoticeId) : null)
        ?? (a.ProcedureId ? tenderIdMap.get(a.ProcedureId) : null)
        ?? null;
      const winningSupplierPortalId = winningSupplierPortalMap.get(a.AwardId);
      const winningSupplier = winningSupplierPortalId
        ? supplierPortalMap.get(winningSupplierPortalId)
        : null;

      const row = {
        portal_award_id: a.AwardId,
        tender_id: tenderId,
        // Čuvamo portal identifikatore — reconciliation skripta ih koristi kad
        // tender nije bio u bazi u vrijeme prvog award syncinga.
        notice_id: a.NoticeId || null,
        procedure_id: a.ProcedureId || null,
        contracting_authority_jib: a.ContractingAuthorityJib || null,
        procedure_name: a.ProcedureName || null,
        winner_name: winningSupplier?.name ?? a.WinnerName ?? null,
        winner_jib: winningSupplier?.jib ?? a.WinnerJib ?? null,
        winning_price: a.WinningPrice || null,
        estimated_value: a.EstimatedValue ?? null,
        total_bidders_count: a.TotalBiddersCount || null,
        procedure_type: a.ProcedureType || null,
        contract_type: a.ContractType || null,
        award_date: a.AwardDate || null,
      };

      if (row.winner_jib) {
        impactedWinnerJibs.add(row.winner_jib);
      }

      if (existingAwardIds.has(a.AwardId)) {
        updated++;
      } else {
        added++;
      }

      rowsToUpsert.push(row);
    }

    for (const batch of chunkArray(rowsToUpsert, 250)) {
      await supabase.from("award_decisions").upsert(batch, {
        onConflict: "portal_award_id",
        ignoreDuplicates: false,
      });
    }

    await refreshMarketCompanyAwardStats(supabase, [...impactedWinnerJibs]);

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

    const result = await upsertAuthoritySeedCandidates(
      supabase,
      authorities.map((ca) => ({
        jib: ca.Jib,
        name: ca.Name || "Nepoznato",
        portalId: ca.AuthorityId,
        city: ca.City || null,
        entity: ca.Entity || null,
        canton: ca.Canton || null,
        municipality: ca.Municipality || null,
        authorityType: ca.AuthorityType || null,
        activityType: ca.ActivityType || null,
      })),
      { allowAi: false }
    );

    const syncAt = new Date().toISOString();
    await writeSyncLog(supabase, endpoint, syncAt, result.added, result.updated);

    return { endpoint, added: result.added, updated: result.updated };
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
    const authorityIdMap = await buildContractingAuthorityIdMapByPortalId(
      supabase,
      plans.map((plan) => plan.ContractingAuthorityId ?? "")
    );
    const existingPlanIds = await buildExistingPlannedProcurementIdSet(
      supabase,
      plans.map((plan) => plan.PlanId)
    );

    let added = 0;
    let updated = 0;
    const rowsToUpsert: Array<{
      portal_id: string;
      contracting_authority_id: string | null;
      description: string | null;
      estimated_value: number | null;
      planned_date: string | null;
      contract_type: string | null;
      cpv_code: string | null;
    }> = [];

    for (const p of plans) {
      const authorityId = p.ContractingAuthorityId
        ? authorityIdMap.get(p.ContractingAuthorityId) ?? null
        : null;

      const row = {
        portal_id: p.PlanId,
        contracting_authority_id: authorityId,
        description: p.Description || null,
        estimated_value: p.EstimatedValue ?? null,
        planned_date: p.PlannedDate || null,
        contract_type: p.ContractType || null,
        cpv_code: p.CpvCode || null,
      };

      if (existingPlanIds.has(p.PlanId)) {
        updated++;
      } else {
        added++;
      }

      rowsToUpsert.push(row);
    }

    for (const batch of chunkArray(rowsToUpsert, 250)) {
      await supabase.from("planned_procurements").upsert(batch, {
        onConflict: "portal_id",
        ignoreDuplicates: false,
      });
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
  return runFullSyncWithOptions();
}

async function runOperationalPortalRefresh(): Promise<{
  results: SyncResult[];
  duration_ms: number;
  total_added: number;
  total_updated: number;
  status: "ok" | "partial";
}> {
  const start = Date.now();
  const supabase = createServiceClient();
  const { results } = await runFullSyncWithOptions({
    authorityBackfillTarget: DEFAULT_AUTHORITY_BACKFILL_TARGET,
    authorityScanBatchSize: DEFAULT_AUTHORITY_SCAN_BATCH_SIZE,
    authorityScanLimit: DEFAULT_AUTHORITY_SCAN_LIMIT,
    runAuthorityMaintenanceAfterSync: false,
    tenderAreaBackfillTarget: DEFAULT_TENDER_AREA_BACKFILL_TARGET,
    tenderAreaScanBatchSize: DEFAULT_TENDER_AREA_SCAN_BATCH_SIZE,
    tenderAreaScanLimit: DEFAULT_TENDER_AREA_SCAN_LIMIT,
    runTenderAreaMaintenanceAfterSync: false,
  });

  const maintenanceResults = await runNightlyMaintenanceSweep({
    supabase,
    authorityTarget: DEFAULT_AUTHORITY_BACKFILL_TARGET,
    authorityScanBatchSize: DEFAULT_AUTHORITY_SCAN_BATCH_SIZE,
    authorityScanLimit: DEFAULT_AUTHORITY_SCAN_LIMIT,
    tenderTarget: DEFAULT_TENDER_AREA_BACKFILL_TARGET,
    tenderScanBatchSize: DEFAULT_TENDER_AREA_SCAN_BATCH_SIZE,
    tenderScanLimit: DEFAULT_TENDER_AREA_SCAN_LIMIT,
    maxCycles: DEFAULT_NIGHTLY_MAINTENANCE_MAX_CYCLES,
    timeBudgetMs: DEFAULT_NIGHTLY_MAINTENANCE_TIME_BUDGET_MS,
  });

  const combinedResults = [...results, ...maintenanceResults];
  const totalAdded = combinedResults.reduce((sum, result) => sum + result.added, 0);
  const totalUpdated = combinedResults.reduce((sum, result) => sum + result.updated, 0);

  await writeSyncLog(
    supabase,
    MORNING_SYNC_ENDPOINT,
    new Date().toISOString(),
    totalAdded,
    totalUpdated
  );

  return {
    results: combinedResults,
    duration_ms: Date.now() - start,
    total_added: totalAdded,
    total_updated: totalUpdated,
    status: combinedResults.some((result) => result.error) ? "partial" : "ok",
  };
}

export async function runAdminPortalSync(): Promise<{
  results: SyncResult[];
  duration_ms: number;
  total_added: number;
  total_updated: number;
  status: "ok" | "partial";
}> {
  return runOperationalPortalRefresh();
}

export async function runAdminMaintenanceSweep(): Promise<{
  results: SyncResult[];
  duration_ms: number;
  total_updated: number;
  status: "ok" | "partial";
}> {
  const start = Date.now();
  const results = await runNightlyMaintenanceSweep();

  const totalUpdated = results.reduce((sum, r) => sum + r.added + r.updated, 0);

  return {
    results,
    duration_ms: Date.now() - start,
    total_updated: totalUpdated,
    status: results.some((r) => r.error) ? "partial" : "ok",
  };
}

export async function runManualSyncJob(endpoint: AdminManualSyncEndpoint): Promise<{
  endpoint: AdminManualSyncEndpoint;
  status: "ok" | "partial";
  duration_ms: number;
  added: number;
  updated: number;
  error?: string;
}> {
  const start = Date.now();

  if (endpoint === "MorningSync4AM") {
    const result = await runAdminPortalSync();

    return {
      endpoint,
      status: result.status,
      duration_ms: result.duration_ms,
      added: result.total_added,
      updated: result.total_updated,
      ...(result.status === "partial" ? { error: "Jedan ili više koraka unutar glavnog portal synca vratili su upozorenje." } : {}),
    };
  }

  const supabase = createServiceClient();
  let result: SyncResult;

  switch (endpoint) {
    case "ProcurementNotices":
      result = await syncTenders(supabase, { runTenderAreaMaintenanceAfterSync: false });
      break;
    case "ContractingAuthorities":
      result = await syncContractingAuthorities(supabase);
      break;
    case "ContractingAuthorityMaintenance4AM":
      result = await runContractingAuthorityMaintenance({
        supabase,
        endpoint: "ContractingAuthorityMaintenance4AM",
        writeLog: true,
        allowAi: false,
      });
      break;
    case "TenderAreaMaintenance4AM":
      result = await runTenderAreaMaintenance({
        supabase,
        endpoint: "TenderAreaMaintenance4AM",
        writeLog: true,
      });
      break;
    case "Awards":
      result = await syncAwardDecisions(supabase);
      break;
    case "PlannedProcurements":
      result = await syncPlannedProcurements(supabase);
      break;
    case "Suppliers":
      result = await syncSuppliers(supabase);
      break;
    default: {
      const exhaustiveCheck: never = endpoint;
      throw new Error(`Nepodržan sync job: ${String(exhaustiveCheck)}`);
    }
  }

  return {
    endpoint,
    status: result.error ? "partial" : "ok",
    duration_ms: Date.now() - start,
    added: result.added,
    updated: result.updated,
    ...(result.error ? { error: result.error } : {}),
  };
}

async function runFullSyncWithOptions(options: FullSyncOptions = {}): Promise<{
  results: SyncResult[];
  duration_ms: number;
}> {
  const supabase = createServiceClient();
  const start = Date.now();

  const results: SyncResult[] = [];

  results.push(await syncContractingAuthorities(supabase));
  results.push(await syncSuppliers(supabase));
  results.push(await syncTenders(supabase, options));
  if (options.runAuthorityMaintenanceAfterSync !== false) {
    const authorityMaintenance = await runContractingAuthorityMaintenance({
      supabase,
      endpoint: "ContractingAuthorityMaintenance",
      targetUpdates: options.authorityBackfillTarget,
      scanBatchSize: options.authorityScanBatchSize,
      maxScanRows: options.authorityScanLimit,
      writeLog: false,
      allowAi: false,
    });
    results.push(authorityMaintenance);
  }
  results.push(await syncAwardDecisions(supabase));
  results.push(await syncPlannedProcurements(supabase));

  const duration_ms = Date.now() - start;
  return { results, duration_ms };
}

export async function runMorningSyncAtSarajevo4AM(): Promise<{
  status: "ok" | "partial" | "skipped";
  reason?: string;
  duration_ms: number;
  local_day: string;
  local_hour: number;
  results: SyncResult[];
}> {
  const supabase = createServiceClient();
  const now = new Date();
  const localTime = getSarajevoLocalParts(now);

  if (!MORNING_SYNC_ALLOWED_HOURS.has(localTime.hour)) {
    return {
      status: "skipped",
      reason: "Outside scheduled morning sync window for Europe/Sarajevo.",
      duration_ms: 0,
      local_day: localTime.dayKey,
      local_hour: localTime.hour,
      results: [],
    };
  }

  if (await hasSyncRunOnSarajevoDay(supabase, MORNING_SYNC_ENDPOINT, localTime.dayKey)) {
    return {
      status: "skipped",
      reason: "Morning sync already completed for the current Sarajevo day.",
      duration_ms: 0,
      local_day: localTime.dayKey,
      local_hour: localTime.hour,
      results: [],
    };
  }

  const result = await runOperationalPortalRefresh();

  // After tenders are upserted, backfill pgvector embeddings for any rows
  // that still lack one. LLM reranking is NOT invoked here — relevance
  // scoring is computed lazily in getRecommendedTenders() per company.
  let tendersEmbedded = 0;
  try {
    const { embedNewTenders } = await import("@/lib/tender-relevance");
    const embedResult = await embedNewTenders(supabase, { batchSize: 20, maxBatches: 25 });
    tendersEmbedded = embedResult.updated;
    if (tendersEmbedded > 0) {
      console.log(`[MorningSync] Embedded ${tendersEmbedded} tenders into pgvector`);
    }
  } catch (err) {
    console.error("[MorningSync] embedNewTenders failed:", err);
  }

  return {
    status: result.status,
    duration_ms: result.duration_ms,
    local_day: localTime.dayKey,
    local_hour: localTime.hour,
    results: result.results,
    tenders_embedded: tendersEmbedded,
  } as {
    status: "ok" | "partial" | "skipped";
    reason?: string;
    duration_ms: number;
    local_day: string;
    local_hour: number;
    results: SyncResult[];
    tenders_embedded: number;
  };
}
