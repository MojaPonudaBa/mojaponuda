import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getTenderDecisionInsights,
  type TenderDecisionCompany,
  type TenderDecisionInsight,
  type TenderDecisionTender,
} from "@/lib/tender-decision";
import type { Database, Json } from "@/types/database";

type Client = SupabaseClient<Database>;
type Tables = Database["public"]["Tables"];
type BidStatus = Database["public"]["Enums"]["bid_status"];

type CompanyRow = Tables["companies"]["Row"];
type CpvStatsRow = Tables["cpv_stats"]["Row"];
type CompanyCpvStatsRow = Tables["company_cpv_stats"]["Row"];
type CompanyStatsRow = Tables["company_stats"]["Row"];
type TenderRow = Tables["tenders"]["Row"];
type BidRow = Tables["bids"]["Row"];
type ChecklistRow = Tables["bid_checklist_items"]["Row"];
type BidDocumentRow = Tables["bid_documents"]["Row"];
type SavedAlertRow = Tables["saved_alerts"]["Row"];
type NotificationRow = Tables["notifications"]["Row"];
type AlertCacheRow = Tables["alert_parse_cache"]["Row"];
type PlannedProcurementRow = Tables["planned_procurements"]["Row"];
type AwardDecisionRow = Tables["award_decisions"]["Row"];

export type DashboardCompany = Pick<
  CompanyRow,
  "id" | "name" | "jib" | "industry" | "keywords" | "cpv_codes" | "operating_regions"
>;

export interface CpvTreeNode {
  code: string;
  label: string;
  level: 1 | 2 | 3;
  tenderCount: number;
  marketValue: number;
  avgBidders: number | null;
  companyAppearances: number;
  companyWins: number;
  children: CpvTreeNode[];
}

export interface CpvCompetitor {
  jib: string;
  name: string;
  appearances: number;
  wins: number;
  winRate: number | null;
}

export interface CpvRecommendation {
  recommendation: string;
  reasoning: string[];
  requirements: string[];
  source: "cache" | "heuristic";
  generatedAt: string | null;
}

export interface CpvDashboardData {
  company: DashboardCompany | null;
  selectedCode: string | null;
  selectedWatched: boolean;
  statsCount: number;
  marketValue: number;
  activeCpvCount: number;
  coveragePercent: number;
  tree: CpvTreeNode[];
  selected: CpvTreeNode | null;
  topByValue: CpvTreeNode[];
  topByTenderCount: CpvTreeNode[];
  competitors: CpvCompetitor[];
  activeTenders: Array<Pick<TenderRow, "id" | "title" | "deadline" | "estimated_value" | "contracting_authority" | "cpv_code">>;
  recommendation: CpvRecommendation | null;
  missingSources: string[];
}

export interface TrackingItem {
  id: string;
  bidId: string;
  tenderId: string;
  title: string;
  buyer: string;
  cpvCode: string | null;
  status: BidStatus;
  statusLabel: string;
  deadline: string | null;
  bidValue: number | null;
  estimatedValue: number | null;
  checklistDone: number;
  checklistTotal: number;
  documentsConfirmed: number;
  documentsTotal: number;
  nextStep: string;
  priority: "urgent" | "high" | "medium" | "low";
  insight: TenderDecisionInsight | null;
}

export interface TrackingDashboardData {
  companies: DashboardCompany[];
  items: TrackingItem[];
  statusCounts: Record<BidStatus, number>;
  dueSoon: TrackingItem[];
  activeAuthorities: Array<{ name: string; count: number }>;
  quickInsight: string;
}

export interface AlertCard {
  id: string;
  name: string;
  enabled: boolean;
  frequency: string;
  qualityScore: number;
  matchedCount: number;
  winsCount: number;
  lastTriggeredAt: string | null;
  keywords: string[];
  cpvCodes: string[];
  authorities: string[];
  createdAt: string;
}

export interface AlertSuggestion {
  title: string;
  description: string;
  source: string;
}

export interface AlertsDashboardData {
  alerts: AlertCard[];
  notifications: NotificationRow[];
  preferences: Array<Tables["notification_preferences"]["Row"]>;
  parseHistory: Array<Pick<AlertCacheRow, "input_text" | "parsed_query" | "created_at">>;
  suggestions: AlertSuggestion[];
  efficientAlerts: AlertCard[];
}

export interface AuthorityRef {
  id: string;
  jib: string;
  name: string;
  city: string | null;
  municipality: string | null;
  canton: string | null;
  entity: string | null;
}

export interface PlannedProcurementItem extends PlannedProcurementRow {
  contracting_authorities: AuthorityRef | null;
  history: AwardDecisionRow[];
  trackingSupported: boolean;
}

export interface UpcomingFilters {
  search?: string;
  cpv?: string;
  organ?: string;
  year?: string;
  type?: string;
  minValue?: number;
  maxValue?: number;
}

export interface UpcomingDashboardData {
  items: PlannedProcurementItem[];
  totalCount: number;
  totalValue: number;
  knownValueCount: number;
  next30Count: number;
  filters: {
    cpvCodes: string[];
    authorities: string[];
    years: string[];
    types: string[];
  };
  trackingSupported: boolean;
}

export interface UpcomingDetailData {
  item: PlannedProcurementItem;
  pastAwards: AwardDecisionRow[];
  predictedWindow: {
    label: string;
    detail: string;
  };
  predictedDocuments: string[];
}

const CPV_PREFIX_LABELS: Record<string, string> = {
  "03": "Poljoprivreda i hrana",
  "09": "Naftni proizvodi i energija",
  "15": "Hrana, pica i srodni proizvodi",
  "18": "Odjeca, obuca i tekstil",
  "30": "Uredska i racunarska oprema",
  "32": "Telekomunikacije i radio oprema",
  "33": "Medicinska oprema i farmacija",
  "34": "Transportna oprema",
  "35": "Sigurnosna oprema",
  "39": "Namjestaj i oprema",
  "42": "Industrijske masine",
  "44": "Gradevinski materijal",
  "45": "Gradevinski radovi",
  "48": "Softver i informacijski sistemi",
  "50": "Popravke i odrzavanje",
  "55": "Ugostiteljske i hotelske usluge",
  "60": "Transportne usluge",
  "71": "Arhitektonske i inzenjerske usluge",
  "72": "IT usluge",
  "79": "Poslovne usluge",
  "80": "Obrazovanje i trening",
  "85": "Zdravstvo i socijalne usluge",
  "90": "Okolis, otpad i kanalizacija",
  "98": "Ostale usluge",
};

const BID_STATUS_LABELS: Record<BidStatus, string> = {
  draft: "Aktivni",
  in_review: "U evaluaciji",
  submitted: "Predati",
  won: "Zavrseni",
  lost: "Zavrseni",
};

export function formatKm(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(amount >= 10_000_000 ? 0 : 1)}M KM`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(amount >= 100_000 ? 0 : 1)}k KM`;
  return `${amount.toLocaleString("bs-BA")} KM`;
}

export function formatDateBs(value: string | null | undefined) {
  if (!value) return "Nije navedeno";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Nije navedeno";
  return date.toLocaleDateString("bs-BA");
}

export function daysUntil(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000);
}

export function cpvLabel(code: string | null | undefined) {
  const normalized = normalizeCpv(code);
  if (!normalized) return "CPV nije naveden";
  const prefix = normalized.slice(0, 2);
  return CPV_PREFIX_LABELS[prefix] ? `${normalized} - ${CPV_PREFIX_LABELS[prefix]}` : `CPV ${normalized}`;
}

export function normalizeCpv(code: string | null | undefined) {
  const digits = code?.replace(/\D/g, "") ?? "";
  return digits.length > 0 ? digits : null;
}

export async function getUserCompanies(supabase: Client, userId: string): Promise<DashboardCompany[]> {
  const { data } = await supabase
    .from("companies")
    .select("id, name, jib, industry, keywords, cpv_codes, operating_regions")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  return (data ?? []) as unknown as DashboardCompany[];
}

export async function getCpvDashboardData(
  supabase: Client,
  userId: string,
  selectedCodeInput?: string | null,
): Promise<CpvDashboardData> {
  const companies = await getUserCompanies(supabase, userId);
  const company = companies[0] ?? null;
  const missingSources = ["cpv_codes table is not present in regenerated public schema"];

  const [{ data: cpvStatsData }, { data: companyCpvData }, { data: companyStatsData }] = await Promise.all([
    supabase.from("cpv_stats").select("*").order("tender_count", { ascending: false }).limit(500),
    company?.jib
      ? supabase.from("company_cpv_stats").select("*").order("appearances", { ascending: false }).limit(1000)
      : Promise.resolve({ data: [] }),
    supabase.from("company_stats").select("company_jib, company_name, total_bids, total_wins, win_rate, total_won_value, top_cpv_codes").limit(1000),
  ]);

  const cpvStats = (cpvStatsData ?? []) as CpvStatsRow[];
  const companyCpvStats = (companyCpvData ?? []) as CompanyCpvStatsRow[];
  const companyStats = (companyStatsData ?? []) as CompanyStatsRow[];
  const tree = buildCpvTree(cpvStats, companyCpvStats.filter((row) => row.company_jib === company?.jib));
  const selectedCode = normalizeCpv(selectedCodeInput) ?? tree[0]?.code ?? normalizeCpv(cpvStats[0]?.cpv_code);
  const selected = selectedCode ? buildCpvNode(selectedCode, cpvStats, companyCpvStats.filter((row) => row.company_jib === company?.jib)) : null;

  const [watched, activeTenders, cachedRecommendation] = await Promise.all([
    selectedCode ? isWatchlisted(supabase, userId, "cpv", selectedCode) : Promise.resolve(false),
    selectedCode ? getActiveTendersForCpv(supabase, selectedCode) : Promise.resolve([]),
    company?.id && selectedCode ? getCachedCpvRecommendation(supabase, company.id, selectedCode) : Promise.resolve(null),
  ]);

  const totalMarketValue = cpvStats.reduce((sum, row) => sum + estimatedMarketValue(row), 0);
  const coveredCodes = new Set(
    companyCpvStats
      .filter((row) => row.company_jib === company?.jib)
      .map((row) => normalizeCpv(row.cpv_code))
      .filter(Boolean),
  );

  return {
    company,
    selectedCode,
    selectedWatched: watched,
    statsCount: cpvStats.length,
    marketValue: totalMarketValue,
    activeCpvCount: new Set(cpvStats.map((row) => normalizeCpv(row.cpv_code)).filter(Boolean)).size,
    coveragePercent: cpvStats.length ? Math.round((coveredCodes.size / cpvStats.length) * 100) : 0,
    tree,
    selected,
    topByValue: cpvStats
      .map((row) => buildCpvNode(normalizeCpv(row.cpv_code) ?? row.cpv_code, cpvStats, companyCpvStats))
      .sort((a, b) => b.marketValue - a.marketValue)
      .slice(0, 10),
    topByTenderCount: tree.slice().sort((a, b) => b.tenderCount - a.tenderCount).slice(0, 10),
    competitors: selectedCode ? buildCpvCompetitors(selectedCode, company?.jib ?? null, companyCpvStats, companyStats) : [],
    activeTenders,
    recommendation: selected ? cachedRecommendation ?? buildHeuristicCpvRecommendation(selected) : null,
    missingSources,
  };
}

export async function getTrackingDashboardData(supabase: Client, userId: string): Promise<TrackingDashboardData> {
  const companies = await getUserCompanies(supabase, userId);
  const companyIds = companies.map((company) => company.id);
  const primaryCompany = companies[0] ?? null;

  if (companyIds.length === 0) {
    return emptyTrackingData(companies, "Dodajte firmu da bi sistem povezao ponude sa tenderima.");
  }

  const { data: bidData } = await supabase
    .from("bids")
    .select(
      "id, tender_id, company_id, status, bid_value, submission_deadline, submitted_at, updated_at, created_at, notes, ai_analysis, tenders(id, title, deadline, estimated_value, contracting_authority, contracting_authority_jib, cpv_code, contract_type, procedure_type, raw_description, portal_url, status, ai_analysis)",
    )
    .in("company_id", companyIds)
    .order("updated_at", { ascending: false })
    .limit(250);

  const bids = (bidData ?? []) as unknown as Array<BidRow & { tenders: TenderRow | null }>;
  const bidIds = bids.map((bid) => bid.id);

  const [{ data: checklistData }, { data: documentData }] = await Promise.all([
    bidIds.length ? supabase.from("bid_checklist_items").select("id, bid_id, status, title").in("bid_id", bidIds) : Promise.resolve({ data: [] }),
    bidIds.length ? supabase.from("bid_documents").select("id, bid_id, is_confirmed").in("bid_id", bidIds) : Promise.resolve({ data: [] }),
  ]);

  const checklistByBid = bucketChecklist((checklistData ?? []) as Pick<ChecklistRow, "bid_id" | "status">[]);
  const documentsByBid = bucketDocuments((documentData ?? []) as Pick<BidDocumentRow, "bid_id" | "is_confirmed">[]);
  const tenderInputs = bids
    .map((bid) => bid.tenders)
    .filter((tender): tender is TenderRow => Boolean(tender))
    .slice(0, 80)
    .map(mapTenderDecisionInput);
  const companyForInsight: TenderDecisionCompany | null = primaryCompany
    ? {
        id: primaryCompany.id,
        jib: primaryCompany.jib,
        industry: primaryCompany.industry,
        keywords: primaryCompany.keywords,
        cpv_codes: primaryCompany.cpv_codes,
        operating_regions: primaryCompany.operating_regions,
      }
    : null;
  const insights = await getTenderDecisionInsights(supabase, tenderInputs, companyForInsight).catch(
    () => new Map<string, TenderDecisionInsight>(),
  );

  const items = bids.map((bid) => {
    const checklist = checklistByBid.get(bid.id) ?? { done: 0, total: 0 };
    const documents = documentsByBid.get(bid.id) ?? { confirmed: 0, total: 0 };
    const tender = bid.tenders;
    const insight = tender ? insights.get(tender.id) ?? null : null;
    const deadline = bid.submission_deadline ?? tender?.deadline ?? null;

    return {
      id: bid.id,
      bidId: bid.id,
      tenderId: bid.tender_id,
      title: tender?.title ?? "Tender bez naslova",
      buyer: tender?.contracting_authority ?? "Narucilac nije naveden",
      cpvCode: tender?.cpv_code ?? null,
      status: bid.status,
      statusLabel: BID_STATUS_LABELS[bid.status],
      deadline,
      bidValue: bid.bid_value,
      estimatedValue: tender?.estimated_value ?? null,
      checklistDone: checklist.done,
      checklistTotal: checklist.total,
      documentsConfirmed: documents.confirmed,
      documentsTotal: documents.total,
      nextStep: getNextTrackingStep(bid.status, checklist, documents, deadline),
      priority: getTrackingPriority(bid.status, deadline, insight),
      insight,
    } satisfies TrackingItem;
  });

  const statusCounts = {
    draft: 0,
    in_review: 0,
    submitted: 0,
    won: 0,
    lost: 0,
  } satisfies Record<BidStatus, number>;

  for (const item of items) {
    statusCounts[item.status] += 1;
  }

  const dueSoon = items
    .filter((item) => {
      const days = daysUntil(item.deadline);
      return days !== null && days >= 0 && days <= 7 && item.status !== "won" && item.status !== "lost";
    })
    .slice(0, 6);

  return {
    companies,
    items,
    statusCounts,
    dueSoon,
    activeAuthorities: buildAuthorityCounts(items),
    quickInsight: makeTrackingQuickInsight(items, dueSoon),
  };
}

export async function getAlertsDashboardData(supabase: Client, userId: string): Promise<AlertsDashboardData> {
  const [companies, alertsResult, notificationsResult, preferencesResult, cacheResult] = await Promise.all([
    getUserCompanies(supabase, userId),
    supabase.from("saved_alerts").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).limit(100),
    supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
    supabase.from("notification_preferences").select("*").eq("user_id", userId).limit(100),
    supabase.from("alert_parse_cache").select("input_text, parsed_query, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
  ]);

  const alerts = ((alertsResult.data ?? []) as SavedAlertRow[]).map(mapAlertCard);
  const notifications = (notificationsResult.data ?? []) as NotificationRow[];

  return {
    alerts,
    notifications,
    preferences: preferencesResult.data ?? [],
    parseHistory: (cacheResult.data ?? []) as Array<Pick<AlertCacheRow, "input_text" | "parsed_query" | "created_at">>,
    suggestions: buildAlertSuggestions(companies[0] ?? null, alerts),
    efficientAlerts: alerts.slice().sort((a, b) => b.winsCount - a.winsCount || b.qualityScore - a.qualityScore).slice(0, 5),
  };
}

export async function getUpcomingDashboardData(
  supabase: Client,
  filters: UpcomingFilters = {},
): Promise<UpcomingDashboardData> {
  const { data: planData } = await supabase
    .from("planned_procurements")
    .select(
      "id, portal_id, description, estimated_value, planned_date, contract_type, cpv_code, contracting_authority_id, created_at, contracting_authorities(id, jib, name, city, municipality, canton, entity)",
    )
    .order("planned_date", { ascending: true })
    .limit(400);

  const allItems = (planData ?? []) as unknown as PlannedProcurementItem[];
  const filteredItems = filterUpcomingItems(allItems, filters).slice(0, 120);
  const authorityJibs = uniqueStrings(filteredItems.map((item) => item.contracting_authorities?.jib)).slice(0, 80);
  const history = authorityJibs.length
    ? await getAwardHistoryByAuthority(supabase, authorityJibs, 250)
    : new Map<string, AwardDecisionRow[]>();

  const items = filteredItems.map((item) => ({
    ...item,
    history: item.contracting_authorities?.jib ? history.get(item.contracting_authorities.jib) ?? [] : [],
    trackingSupported: false,
  }));
  const totalValue = items.reduce((sum, item) => sum + Number(item.estimated_value ?? 0), 0);

  return {
    items,
    totalCount: items.length,
    totalValue,
    knownValueCount: items.filter((item) => item.estimated_value !== null).length,
    next30Count: items.filter((item) => {
      const days = daysUntil(item.planned_date);
      return days !== null && days >= 0 && days <= 30;
    }).length,
    filters: {
      cpvCodes: uniqueStrings(allItems.map((item) => normalizeCpv(item.cpv_code))).slice(0, 30),
      authorities: uniqueStrings(allItems.map((item) => item.contracting_authorities?.name)).slice(0, 40),
      years: uniqueStrings(allItems.map((item) => (item.planned_date ? String(new Date(item.planned_date).getFullYear()) : null))).sort(),
      types: uniqueStrings(allItems.map((item) => item.contract_type)).slice(0, 30),
    },
    trackingSupported: false,
  };
}

export async function getUpcomingDetailData(supabase: Client, id: string): Promise<UpcomingDetailData | null> {
  const { data } = await supabase
    .from("planned_procurements")
    .select(
      "id, portal_id, description, estimated_value, planned_date, contract_type, cpv_code, contracting_authority_id, created_at, contracting_authorities(id, jib, name, city, municipality, canton, entity)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;

  const item = data as unknown as PlannedProcurementItem;
  const authorityJib = item.contracting_authorities?.jib;
  const pastAwards = authorityJib ? (await getAwardHistoryByAuthority(supabase, [authorityJib], 30)).get(authorityJib) ?? [] : [];

  return {
    item: {
      ...item,
      history: pastAwards,
      trackingSupported: false,
    },
    pastAwards,
    predictedWindow: buildPredictedWindow(item, pastAwards),
    predictedDocuments: predictRequiredDocuments(item.cpv_code),
  };
}

function estimatedMarketValue(row: CpvStatsRow) {
  return Number(row.avg_estimated_value ?? 0) * Number(row.tender_count ?? 0);
}

function buildCpvTree(cpvStats: CpvStatsRow[], companyRows: CompanyCpvStatsRow[]): CpvTreeNode[] {
  const rootCodes = uniqueStrings(cpvStats.map((row) => normalizeCpv(row.cpv_code)?.slice(0, 2)))
    .filter((code) => code.length === 2)
    .slice(0, 24);

  return rootCodes
    .map((rootCode) => {
      const branches = uniqueStrings(
        cpvStats
          .map((row) => normalizeCpv(row.cpv_code))
          .filter((code): code is string => Boolean(code?.startsWith(rootCode)))
          .map((code) => code.slice(0, Math.min(3, code.length))),
      ).filter((code) => code.length >= 3);

      const root = buildCpvNode(rootCode, cpvStats, companyRows);
      root.children = branches
        .map((branchCode) => {
          const branch = buildCpvNode(branchCode, cpvStats, companyRows);
          branch.children = cpvStats
            .map((row) => normalizeCpv(row.cpv_code))
            .filter((code): code is string => Boolean(code?.startsWith(branchCode)) && code !== branchCode)
            .slice(0, 6)
            .map((code) => buildCpvNode(code, cpvStats, companyRows));
          return branch;
        })
        .sort((a, b) => b.marketValue - a.marketValue)
        .slice(0, 8);

      return root;
    })
    .sort((a, b) => b.marketValue - a.marketValue);
}

function buildCpvNode(code: string, cpvStats: CpvStatsRow[], companyRows: CompanyCpvStatsRow[]): CpvTreeNode {
  const normalized = normalizeCpv(code) ?? code;
  const matchedStats = cpvStats.filter((row) => normalizeCpv(row.cpv_code)?.startsWith(normalized));
  const matchedCompanies = companyRows.filter((row) => normalizeCpv(row.cpv_code)?.startsWith(normalized));
  const tenderCount = matchedStats.reduce((sum, row) => sum + Number(row.tender_count ?? 0), 0);
  const biddersSamples = matchedStats
    .map((row) => row.avg_bidders_count)
    .filter((value): value is number => typeof value === "number");

  return {
    code: normalized,
    label: cpvLabel(normalized),
    level: normalized.length <= 2 ? 1 : normalized.length <= 3 ? 2 : 3,
    tenderCount,
    marketValue: matchedStats.reduce((sum, row) => sum + estimatedMarketValue(row), 0),
    avgBidders: biddersSamples.length ? biddersSamples.reduce((sum, value) => sum + value, 0) / biddersSamples.length : null,
    companyAppearances: matchedCompanies.reduce((sum, row) => sum + Number(row.appearances ?? 0), 0),
    companyWins: matchedCompanies.reduce((sum, row) => sum + Number(row.wins ?? 0), 0),
    children: [],
  };
}

async function getActiveTendersForCpv(
  supabase: Client,
  code: string,
): Promise<Array<Pick<TenderRow, "id" | "title" | "deadline" | "estimated_value" | "contracting_authority" | "cpv_code">>> {
  const nowIso = new Date().toISOString();
  const { data } = await supabase
    .from("tenders")
    .select("id, title, deadline, estimated_value, contracting_authority, cpv_code")
    .gt("deadline", nowIso)
    .like("cpv_code", `${code}%`)
    .order("estimated_value", { ascending: false, nullsFirst: false })
    .limit(5);

  return (data ?? []) as Array<Pick<TenderRow, "id" | "title" | "deadline" | "estimated_value" | "contracting_authority" | "cpv_code">>;
}

async function isWatchlisted(supabase: Client, userId: string, entityType: "authority" | "cpv" | "company", entityKey: string) {
  const { data } = await supabase
    .from("watchlist_items")
    .select("id")
    .eq("user_id", userId)
    .eq("entity_type", entityType)
    .eq("entity_key", entityKey)
    .maybeSingle();

  return Boolean(data);
}

async function getCachedCpvRecommendation(
  supabase: Client,
  companyId: string,
  code: string,
): Promise<CpvRecommendation | null> {
  const { data } = await supabase
    .from("cpv_opportunity_ai_cache")
    .select("recommendation, generated_at")
    .eq("company_id", companyId)
    .eq("cpv_code", code)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.recommendation) return null;
  const recommendation = jsonObject(data.recommendation);
  return {
    recommendation: stringFromUnknown(recommendation.recommendation, "Mozda"),
    reasoning: stringArrayFromUnknown(recommendation.reasoning),
    requirements: stringArrayFromUnknown(recommendation.requirements),
    source: "cache",
    generatedAt: data.generated_at,
  };
}

function buildHeuristicCpvRecommendation(node: CpvTreeNode): CpvRecommendation {
  const avgBidders = node.avgBidders ?? 0;
  const recommendation = avgBidders > 0 && avgBidders <= 5 ? "Da" : avgBidders >= 9 ? "Ne" : "Mozda";

  return {
    recommendation,
    reasoning: [
      "AI cache za ovu CPV kategoriju jos nije generisan, pa je prikazan heuristicki signal iz javnih statistika.",
      avgBidders > 0 ? `Prosjecan broj ponudjaca u uzorku je ${avgBidders.toFixed(1)}.` : "Nema dovoljno podataka o konkurenciji.",
    ],
    requirements: predictRequiredDocuments(node.code).slice(0, 3),
    source: "heuristic",
    generatedAt: null,
  };
}

function buildCpvCompetitors(
  code: string,
  currentCompanyJib: string | null,
  companyRows: CompanyCpvStatsRow[],
  companyStats: CompanyStatsRow[],
): CpvCompetitor[] {
  const names = new Map(companyStats.map((row) => [row.company_jib, row.company_name ?? row.company_jib]));
  return companyRows
    .filter((row) => row.company_jib !== currentCompanyJib && normalizeCpv(row.cpv_code)?.startsWith(code))
    .sort((a, b) => b.appearances - a.appearances)
    .slice(0, 6)
    .map((row) => ({
      jib: row.company_jib,
      name: names.get(row.company_jib) ?? row.company_jib,
      appearances: row.appearances,
      wins: row.wins,
      winRate: row.win_rate,
    }));
}

function emptyTrackingData(companies: DashboardCompany[], quickInsight: string): TrackingDashboardData {
  return {
    companies,
    items: [],
    statusCounts: { draft: 0, in_review: 0, submitted: 0, won: 0, lost: 0 },
    dueSoon: [],
    activeAuthorities: [],
    quickInsight,
  };
}

function bucketChecklist(rows: Array<Pick<ChecklistRow, "bid_id" | "status">>) {
  const map = new Map<string, { done: number; total: number }>();
  for (const row of rows) {
    const current = map.get(row.bid_id) ?? { done: 0, total: 0 };
    current.total += 1;
    if (row.status !== "missing") current.done += 1;
    map.set(row.bid_id, current);
  }
  return map;
}

function bucketDocuments(rows: Array<Pick<BidDocumentRow, "bid_id" | "is_confirmed">>) {
  const map = new Map<string, { confirmed: number; total: number }>();
  for (const row of rows) {
    const current = map.get(row.bid_id) ?? { confirmed: 0, total: 0 };
    current.total += 1;
    if (row.is_confirmed) current.confirmed += 1;
    map.set(row.bid_id, current);
  }
  return map;
}

function mapTenderDecisionInput(tender: TenderRow): TenderDecisionTender {
  return {
    id: tender.id,
    title: tender.title,
    deadline: tender.deadline,
    estimated_value: tender.estimated_value,
    contracting_authority: tender.contracting_authority,
    contracting_authority_jib: tender.contracting_authority_jib,
    contract_type: tender.contract_type,
    raw_description: tender.raw_description,
    cpv_code: tender.cpv_code,
    procedure_type: tender.procedure_type,
    status: tender.status,
    portal_url: tender.portal_url,
    ai_analysis: tender.ai_analysis,
  };
}

function getNextTrackingStep(
  status: BidStatus,
  checklist: { done: number; total: number },
  documents: { confirmed: number; total: number },
  deadline: string | null,
) {
  if (status === "submitted") return "Pratite evaluaciju i odluku narucioca";
  if (status === "won") return "Arhivirajte ugovor i reference";
  if (status === "lost") return "Zabiljezite razlog gubitka i gap analizu";
  if (checklist.total > 0 && checklist.done < checklist.total) return "Zatvorite otvorene stavke iz checkliste";
  if (documents.total > 0 && documents.confirmed < documents.total) return "Potvrdite dokumente prije predaje";
  const remaining = daysUntil(deadline);
  if (remaining !== null && remaining <= 2) return "Finalna provjera i predaja";
  return status === "in_review" ? "Interna revizija ponude" : "Kalkulacija cijene i kompletiranje dokumentacije";
}

function getTrackingPriority(status: BidStatus, deadline: string | null, insight: TenderDecisionInsight | null): TrackingItem["priority"] {
  if (status === "won" || status === "lost") return "low";
  const remaining = daysUntil(deadline);
  if (remaining !== null && remaining <= 2) return "urgent";
  if (remaining !== null && remaining <= 7) return "high";
  if ((insight?.priorityScore ?? 0) >= 75) return "high";
  if ((insight?.priorityScore ?? 0) >= 50) return "medium";
  return "low";
}

function buildAuthorityCounts(items: TrackingItem[]) {
  const buckets = new Map<string, number>();
  for (const item of items) {
    buckets.set(item.buyer, (buckets.get(item.buyer) ?? 0) + 1);
  }
  return Array.from(buckets.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

function makeTrackingQuickInsight(items: TrackingItem[], dueSoon: TrackingItem[]) {
  if (dueSoon.length > 0) return `${dueSoon.length} ponuda ima rok u narednih 7 dana.`;
  const highPriority = items.filter((item) => item.priority === "high" || item.priority === "urgent").length;
  if (highPriority > 0) return `${highPriority} ponuda ima povisen prioritet prema rokovima ili decision score-u.`;
  return items.length > 0 ? "Nema kriticnih rokova u narednih 7 dana." : "Nema aktivnih pracenih ponuda.";
}

function mapAlertCard(row: SavedAlertRow): AlertCard {
  const quality = jsonObject(row.quality_stats);
  const structured = jsonObject(row.structured_query);
  return {
    id: row.id,
    name: row.name,
    enabled: row.enabled,
    frequency: row.frequency,
    qualityScore: numberFromUnknown(quality.score ?? quality.qualityScore, row.enabled ? 72 : 42),
    matchedCount: numberFromUnknown(quality.matched_count ?? quality.matchedCount ?? quality.triggers, 0),
    winsCount: numberFromUnknown(quality.wins_count ?? quality.winsCount ?? quality.wins, 0),
    lastTriggeredAt: stringOrNull(quality.last_triggered_at ?? quality.lastTriggeredAt),
    keywords: stringArrayFromUnknown(structured.keywords),
    cpvCodes: stringArrayFromUnknown(structured.cpv_codes ?? structured.cpvCodes ?? structured.cpv),
    authorities: stringArrayFromUnknown(structured.authorities ?? structured.organi ?? structured.authority),
    createdAt: row.created_at,
  };
}

function buildAlertSuggestions(company: DashboardCompany | null, alerts: AlertCard[]): AlertSuggestion[] {
  const existingText = alerts.map((alert) => `${alert.name} ${alert.keywords.join(" ")} ${alert.cpvCodes.join(" ")}`.toLowerCase()).join(" ");
  const suggestions: AlertSuggestion[] = [];

  for (const cpv of company?.cpv_codes ?? []) {
    const normalized = normalizeCpv(cpv);
    if (!normalized || existingText.includes(normalized)) continue;
    suggestions.push({
      title: `Alert za ${cpvLabel(normalized)}`,
      description: "CPV je vec u profilu firme, ali nema sacuvanog alerta koji ga eksplicitno prati.",
      source: "Profil firme",
    });
    if (suggestions.length >= 3) break;
  }

  for (const keyword of company?.keywords ?? []) {
    if (existingText.includes(keyword.toLowerCase())) continue;
    suggestions.push({
      title: `Alert za "${keyword}"`,
      description: "Kljucna rijec iz profila nije pokrivena trenutnim alertima.",
      source: "Profil firme",
    });
    if (suggestions.length >= 5) break;
  }

  return suggestions;
}

function filterUpcomingItems(items: PlannedProcurementItem[], filters: UpcomingFilters) {
  const search = filters.search?.trim().toLowerCase();
  return items.filter((item) => {
    if (search) {
      const haystack = [
        item.description,
        item.contract_type,
        item.cpv_code,
        item.contracting_authorities?.name,
        item.contracting_authorities?.city,
        item.contracting_authorities?.municipality,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    if (filters.cpv && !normalizeCpv(item.cpv_code)?.startsWith(filters.cpv)) return false;
    if (filters.organ && item.contracting_authorities?.name !== filters.organ) return false;
    if (filters.type && item.contract_type !== filters.type) return false;
    if (filters.year && (!item.planned_date || String(new Date(item.planned_date).getFullYear()) !== filters.year)) return false;
    if (filters.minValue !== undefined && Number(item.estimated_value ?? 0) < filters.minValue) return false;
    if (filters.maxValue !== undefined && Number(item.estimated_value ?? 0) > filters.maxValue) return false;

    return true;
  });
}

async function getAwardHistoryByAuthority(supabase: Client, authorityJibs: string[], limit: number) {
  const { data } = await supabase
    .from("award_decisions")
    .select(
      "id, portal_award_id, tender_id, award_date, contracting_authority_jib, winner_name, winner_jib, winning_price, estimated_value, discount_pct, total_bidders_count, procedure_type, procedure_name, contract_type, notice_id",
    )
    .in("contracting_authority_jib", authorityJibs)
    .order("award_date", { ascending: false })
    .limit(limit);

  const map = new Map<string, AwardDecisionRow[]>();
  for (const award of (data ?? []) as AwardDecisionRow[]) {
    if (!award.contracting_authority_jib) continue;
    const list = map.get(award.contracting_authority_jib) ?? [];
    list.push(award);
    map.set(award.contracting_authority_jib, list);
  }
  return map;
}

function buildPredictedWindow(item: PlannedProcurementItem, awards: AwardDecisionRow[]) {
  if (item.planned_date) {
    const planned = new Date(item.planned_date);
    const start = new Date(planned);
    start.setDate(start.getDate() - 30);
    const end = new Date(planned);
    end.setDate(end.getDate() + 45);
    return {
      label: `${formatDateBs(start.toISOString())} - ${formatDateBs(end.toISOString())}`,
      detail: "Procjena koristi planirani datum i tipicni pomak izmedju plana nabavke i objave tendera.",
    };
  }

  const months = awards
    .map((award) => (award.award_date ? new Date(award.award_date).getMonth() : null))
    .filter((month): month is number => month !== null);
  if (months.length > 0) {
    const month = mostCommon(months);
    const label = new Date(2026, month, 1).toLocaleDateString("bs-BA", { month: "long" });
    return {
      label: `Najcesce oko mjeseca: ${label}`,
      detail: "Procjena je izvedena iz historije dodjela istog narucioca.",
    };
  }

  return {
    label: "Nedovoljno podataka",
    detail: "Nema planiranog datuma ni historijskog uzorka za pouzdanu procjenu prozora objave.",
  };
}

export function predictRequiredDocuments(cpvCode: string | null | undefined) {
  const code = normalizeCpv(cpvCode) ?? "";
  if (code.startsWith("45")) {
    return ["Aktuelni izvod iz sudskog registra", "Reference slicnih radova", "Licenca/inzenjerska ovlastenja", "Plan sigurnosti i zastite na radu"];
  }
  if (code.startsWith("33") || code.startsWith("85")) {
    return ["Aktuelni izvod iz sudskog registra", "Dozvole za promet medicinske opreme", "Tehnicke specifikacije proizvoda", "Certifikati kvaliteta"];
  }
  if (code.startsWith("48") || code.startsWith("72") || code.startsWith("30")) {
    return ["Aktuelni izvod iz sudskog registra", "Reference IT projekata", "CV kljucnog tima", "Tehnicka ponuda i SLA"];
  }
  if (code.startsWith("60") || code.startsWith("34")) {
    return ["Aktuelni izvod iz sudskog registra", "Licenca za transport ili promet", "Dokaz o vozilima/opremi", "Polisa osiguranja"];
  }
  return ["Aktuelni izvod iz sudskog registra", "Poresko uvjerenje", "Dokaz tehnicke sposobnosti", "Reference za slicne isporuke"];
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])];
}

function mostCommon(values: number[]) {
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? values[0];
}

function jsonObject(value: Json | null | undefined): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function stringArrayFromUnknown(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => (typeof item === "string" ? item : "")).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function stringFromUnknown(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberFromUnknown(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
