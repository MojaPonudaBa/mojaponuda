import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getGeoEnrichmentFromAiAnalysis,
  normalizeGeoText,
  resolveTenderAreaFromAuthority,
  resolveTenderAreaFromText,
  type TenderAreaContext,
  type TenderAreaEnrichment,
} from "@/lib/tender-area";
import type { Database } from "@/types/database";

interface AuthorityGeoRecord {
  name: string;
  city: string | null;
  municipality: string | null;
  canton: string | null;
  entity: string | null;
}

interface AuthorityGeoMaps {
  byJib: Map<string, AuthorityGeoRecord>;
  byExactName: Map<string, AuthorityGeoRecord>;
  byNormalizedName: Map<string, AuthorityGeoRecord>;
}

type TenderRow = Pick<
  Database["public"]["Tables"]["tenders"]["Row"],
  | "id"
  | "portal_id"
  | "title"
  | "contracting_authority"
  | "contracting_authority_jib"
  | "deadline"
  | "portal_url"
  | "raw_description"
  | "ai_analysis"
  | "created_at"
>;

export type TenderAreaGapReasonCode =
  | "repairable_from_authority_registry"
  | "repairable_from_tender_text"
  | "authority_registry_without_location"
  | "missing_authority_match"
  | "insufficient_tender_text"
  | "manual_review_required";

export interface TenderAreaGapReportItem {
  id: string;
  portal_id: string;
  title: string;
  contracting_authority: string | null;
  contracting_authority_jib: string | null;
  deadline: string | null;
  portal_url: string | null;
  created_at: string;
  description_preview: string | null;
  authority_lookup_status: "matched_with_geo" | "matched_without_geo" | "not_matched";
  authority_registry_label: string | null;
  deterministic_authority_suggestion: string | null;
  deterministic_text_suggestion: string | null;
  suggested_next_area_label: string | null;
  likely_reason_code: TenderAreaGapReasonCode;
  likely_reason_label: string;
  likely_reason_detail: string;
  text_signal_quality: "strong" | "weak";
  existing_geo_source: TenderAreaEnrichment["source"] | null;
}

export interface TenderAreaGapReasonSummary {
  code: TenderAreaGapReasonCode;
  label: string;
  count: number;
}

export interface TenderAreaGapReport {
  generated_at: string;
  total_unresolved: number;
  page: number;
  page_size: number;
  total_pages: number;
  summary: {
    repairable_from_authority_registry: number;
    repairable_from_tender_text: number;
    matched_authorities_with_geo: number;
    matched_authorities_without_geo: number;
    missing_authority_matches: number;
    weak_text_signals: number;
    reasons: TenderAreaGapReasonSummary[];
  };
  items: TenderAreaGapReportItem[];
}

interface TenderAreaGapReportOptions {
  page?: number;
  pageSize?: number;
  maxScanRows?: number;
}

const REPORT_SCAN_BATCH_SIZE = 500;
const DEFAULT_PAGE_SIZE = 25;
const DEFAULT_MAX_SCAN_ROWS = 5000;
const GENERIC_TEXT_PATTERNS = [
  "kao u td",
  "kao u tender",
  "u skladu sa td",
  "u skladu sa tender",
  "dato u td",
  "dato u tenderskoj dokumentaciji",
  "detaljno opisano u tenderskoj dokumentaciji",
  "obavezni uslovi za ucesce",
  "predmetna td",
  "bez naknade",
  "da ne",
  "ne da",
];

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

function buildDescriptionPreview(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) {
    return null;
  }

  return compact.length > 180 ? `${compact.slice(0, 177)}...` : compact;
}

function getAuthorityRegistryLabel(authority: AuthorityGeoRecord | null): string | null {
  if (!authority) {
    return null;
  }

  return authority.municipality ?? authority.city ?? authority.canton ?? authority.entity ?? null;
}

function assignAuthorityRecord(
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

function getAuthorityFromMaps(
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

function getReasonLabel(code: TenderAreaGapReasonCode): string {
  switch (code) {
    case "repairable_from_authority_registry":
      return "Može se popraviti iz registra";
    case "repairable_from_tender_text":
      return "Može se popraviti iz teksta tendera";
    case "authority_registry_without_location":
      return "Organ postoji, ali nema lokaciju";
    case "missing_authority_match":
      return "Nema podudaranja organa";
    case "insufficient_tender_text":
      return "Tekst nema dovoljno signala";
    case "manual_review_required":
      return "Treba automatska ili ručna provjera";
  }
}

function hasWeakTextSignal(title: string, description: string | null): boolean {
  const normalizedTitle = normalizeGeoText(title);
  const normalizedDescription = normalizeGeoText(description);

  if (!normalizedDescription) {
    return true;
  }

  if (normalizedDescription.split(" ").filter(Boolean).length <= 8) {
    return true;
  }

  if (GENERIC_TEXT_PATTERNS.some((pattern) => normalizedDescription.includes(pattern))) {
    return true;
  }

  if (normalizedTitle && normalizedDescription === normalizedTitle) {
    return true;
  }

  return false;
}

function classifyGapReason(params: {
  authorityLookupStatus: TenderAreaGapReportItem["authority_lookup_status"];
  authoritySuggestion: TenderAreaEnrichment | null;
  textSuggestion: TenderAreaEnrichment | null;
  weakTextSignal: boolean;
}): {
  code: TenderAreaGapReasonCode;
  detail: string;
} {
  if (params.authoritySuggestion?.area_label) {
    return {
      code: "repairable_from_authority_registry",
      detail:
        "U registru ugovornih organa već postoji dovoljan geo signal, ali area_label još nije upisan u tender.",
    };
  }

  if (params.textSuggestion?.area_label) {
    return {
      code: "repairable_from_tender_text",
      detail:
        "Naziv tendera ili opis već sadrži dovoljan lokacijski signal za popravku bez dodatnog ručnog rada.",
    };
  }

  if (params.authorityLookupStatus === "matched_without_geo") {
    return {
      code: "authority_registry_without_location",
      detail:
        "Ugovorni organ je pronađen, ali u registru nema grad, općinu, kanton ni entitet koji bi pomogli geo-enrichmentu.",
    };
  }

  if (params.authorityLookupStatus === "not_matched") {
    return {
      code: "missing_authority_match",
      detail:
        "Tender nije uspio pouzdano povezati ugovorni organ s registrom, pa nema autoritativnog geo izvora.",
    };
  }

  if (params.weakTextSignal) {
    return {
      code: "insufficient_tender_text",
      detail:
        "Naziv i opis tendera su previše generički ili kratki da bi se iz njih pouzdano izvelo područje.",
    };
  }

  return {
    code: "manual_review_required",
    detail:
      "Tender ima određene signale, ali nijedan nije dovoljno pouzdan za automatsku dodjelu područja bez dodatne ili ručne provjere.",
  };
}

async function fetchTenderRows(
  supabase: SupabaseClient<Database>,
  maxScanRows: number
): Promise<TenderRow[]> {
  const rows: TenderRow[] = [];
  let offset = 0;

  while (offset < maxScanRows) {
    const currentBatchSize = Math.min(REPORT_SCAN_BATCH_SIZE, maxScanRows - offset);
    const { data, error } = await supabase
      .from("tenders")
      .select(
        "id, portal_id, title, contracting_authority, contracting_authority_jib, deadline, portal_url, raw_description, ai_analysis, created_at"
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + currentBatchSize - 1);

    if (error) {
      throw error;
    }

    const batch = (data ?? []) as TenderRow[];
    if (batch.length === 0) {
      break;
    }

    rows.push(...batch);
    offset += batch.length;

    if (batch.length < currentBatchSize) {
      break;
    }
  }

  return rows;
}

async function buildAuthorityMaps(
  supabase: SupabaseClient<Database>,
  unresolvedTenders: TenderRow[]
): Promise<{
  byJib: Map<string, AuthorityGeoRecord>;
  byExactName: Map<string, AuthorityGeoRecord>;
  byNormalizedName: Map<string, AuthorityGeoRecord>;
}> {
  const maps: AuthorityGeoMaps = {
    byJib: new Map<string, AuthorityGeoRecord>(),
    byExactName: new Map<string, AuthorityGeoRecord>(),
    byNormalizedName: new Map<string, AuthorityGeoRecord>(),
  };
  const jibs = uniqueNonEmpty(unresolvedTenders.map((tender) => tender.contracting_authority_jib));
  const names = uniqueNonEmpty(unresolvedTenders.map((tender) => tender.contracting_authority));

  for (const batch of chunkArray(jibs, 250)) {
    const { data, error } = await supabase
      .from("contracting_authorities")
      .select("jib, name, city, municipality, canton, entity")
      .in("jib", batch);

    if (error) {
      throw error;
    }

    for (const row of data ?? []) {
      if (!row.jib || !row.name) {
        continue;
      }

      const authority: AuthorityGeoRecord = {
        name: row.name,
        city: row.city ?? null,
        municipality: row.municipality ?? null,
        canton: row.canton ?? null,
        entity: row.entity ?? null,
      };
      assignAuthorityRecord(maps, authority, {
        jib: row.jib,
        name: row.name,
      });
    }
  }

  for (const batch of chunkArray(names, 100)) {
    const { data, error } = await supabase
      .from("contracting_authorities")
      .select("jib, name, city, municipality, canton, entity")
      .in("name", batch);

    if (error) {
      throw error;
    }

    for (const row of data ?? []) {
      if (!row.name) {
        continue;
      }

      const authority: AuthorityGeoRecord = {
        name: row.name,
        city: row.city ?? null,
        municipality: row.municipality ?? null,
        canton: row.canton ?? null,
        entity: row.entity ?? null,
      };

      assignAuthorityRecord(maps, authority, {
        jib: row.jib ?? null,
        name: row.name,
      });
    }
  }

  const { data: allAuthorities, error } = await supabase
    .from("contracting_authorities")
    .select("jib, name, city, municipality, canton, entity");

  if (error) {
    throw error;
  }

  for (const row of allAuthorities ?? []) {
    if (!row.name) {
      continue;
    }

    assignAuthorityRecord(
      maps,
      {
        name: row.name,
        city: row.city ?? null,
        municipality: row.municipality ?? null,
        canton: row.canton ?? null,
        entity: row.entity ?? null,
      },
      {
        jib: row.jib ?? null,
        name: row.name,
      }
    );
  }

  return maps;
}

function buildAreaContext(tender: TenderRow, authority: AuthorityGeoRecord | null): TenderAreaContext {
  return {
    title: tender.title,
    raw_description: tender.raw_description,
    contracting_authority: tender.contracting_authority,
    authority_city: authority?.city ?? null,
    authority_municipality: authority?.municipality ?? null,
    authority_canton: authority?.canton ?? null,
    authority_entity: authority?.entity ?? null,
  };
}

export async function getTenderAreaGapReport(
  supabase: SupabaseClient<Database>,
  options: TenderAreaGapReportOptions = {}
): Promise<TenderAreaGapReport> {
  const pageSize = Math.max(1, options.pageSize ?? DEFAULT_PAGE_SIZE);
  const page = Math.max(1, options.page ?? 1);
  const maxScanRows = Math.max(pageSize, options.maxScanRows ?? DEFAULT_MAX_SCAN_ROWS);
  const allTenderRows = await fetchTenderRows(supabase, maxScanRows);
  const unresolvedTenders = allTenderRows.filter(
    (tender) => !getGeoEnrichmentFromAiAnalysis(tender.ai_analysis)?.area_label
  );
  const authorityMaps = await buildAuthorityMaps(supabase, unresolvedTenders);

  const allItems: TenderAreaGapReportItem[] = unresolvedTenders.map((tender) => {
    const fallbackAuthority = getAuthorityFromMaps(
      authorityMaps,
      tender.contracting_authority_jib,
      tender.contracting_authority
    );
    const areaContext = buildAreaContext(tender, fallbackAuthority);
    const authoritySuggestion = resolveTenderAreaFromAuthority(areaContext);
    const textSuggestion = resolveTenderAreaFromText(areaContext);
    const weakTextSignal = hasWeakTextSignal(tender.title, tender.raw_description);
    const authorityLookupStatus: TenderAreaGapReportItem["authority_lookup_status"] = fallbackAuthority
      ? getAuthorityRegistryLabel(fallbackAuthority)
        ? "matched_with_geo"
        : "matched_without_geo"
      : "not_matched";
    const reason = classifyGapReason({
      authorityLookupStatus,
      authoritySuggestion,
      textSuggestion,
      weakTextSignal,
    });
    const existingGeo = getGeoEnrichmentFromAiAnalysis(tender.ai_analysis);

    return {
      id: tender.id,
      portal_id: tender.portal_id,
      title: tender.title,
      contracting_authority: tender.contracting_authority,
      contracting_authority_jib: tender.contracting_authority_jib,
      deadline: tender.deadline,
      portal_url: tender.portal_url,
      created_at: tender.created_at,
      description_preview: buildDescriptionPreview(tender.raw_description),
      authority_lookup_status: authorityLookupStatus,
      authority_registry_label: getAuthorityRegistryLabel(fallbackAuthority),
      deterministic_authority_suggestion: authoritySuggestion?.area_label ?? null,
      deterministic_text_suggestion: textSuggestion?.area_label ?? null,
      suggested_next_area_label:
        authoritySuggestion?.area_label ?? textSuggestion?.area_label ?? getAuthorityRegistryLabel(fallbackAuthority),
      likely_reason_code: reason.code,
      likely_reason_label: getReasonLabel(reason.code),
      likely_reason_detail: reason.detail,
      text_signal_quality: weakTextSignal ? "weak" : "strong",
      existing_geo_source: existingGeo?.source ?? null,
    };
  });

  const reasonsMap = new Map<TenderAreaGapReasonCode, number>();
  for (const item of allItems) {
    reasonsMap.set(item.likely_reason_code, (reasonsMap.get(item.likely_reason_code) ?? 0) + 1);
  }

  const totalPages = Math.max(1, Math.ceil(allItems.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;

  return {
    generated_at: new Date().toISOString(),
    total_unresolved: allItems.length,
    page: safePage,
    page_size: pageSize,
    total_pages: totalPages,
    summary: {
      repairable_from_authority_registry: allItems.filter(
        (item) => item.likely_reason_code === "repairable_from_authority_registry"
      ).length,
      repairable_from_tender_text: allItems.filter(
        (item) => item.likely_reason_code === "repairable_from_tender_text"
      ).length,
      matched_authorities_with_geo: allItems.filter(
        (item) => item.authority_lookup_status === "matched_with_geo"
      ).length,
      matched_authorities_without_geo: allItems.filter(
        (item) => item.authority_lookup_status === "matched_without_geo"
      ).length,
      missing_authority_matches: allItems.filter(
        (item) => item.authority_lookup_status === "not_matched"
      ).length,
      weak_text_signals: allItems.filter((item) => item.text_signal_quality === "weak").length,
      reasons: [...reasonsMap.entries()]
        .map(([code, count]) => ({ code, count, label: getReasonLabel(code) }))
        .sort((left, right) => right.count - left.count),
    },
    items: allItems.slice(offset, offset + pageSize),
  };
}
