import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AwardDecision,
  Company,
  ContractingAuthority,
  Database,
  MarketCompany,
  PlannedProcurement,
  Tender,
} from "@/types/database";

const DAY_MS = 24 * 60 * 60 * 1000;

export type AdminLeadOutreachStatus = "new" | "contacted" | "converted" | "dead";
export type AdminPortalLeadTemperature = "Vruć lead" | "Dobar lead" | "Pratiti";

type AdminPortalLeadNoteRow = Database["public"]["Tables"]["admin_portal_lead_notes"]["Row"];

export interface AdminPortalLeadWin {
  id: string;
  tenderId: string | null;
  tenderTitle: string;
  contractingAuthority: string | null;
  awardDate: string | null;
  winningPrice: number | null;
  procedureType: string | null;
  contractType: string | null;
  portalUrl: string | null;
}

export interface AdminPortalLead {
  jib: string;
  companyName: string;
  portalCompanyId: string | null;
  city: string | null;
  municipality: string | null;
  totalBidsCount: number;
  totalWinsCount: number;
  totalWonValue: number;
  winRate: number | null;
  recentAwards180d: number;
  recentWonValue180d: number;
  lastAwardDate: string | null;
  lastWinningPrice: number | null;
  averageBidders: number | null;
  lastContractType: string | null;
  lastProcedureType: string | null;
  mainAuthorityName: string | null;
  mainAuthorityJib: string | null;
  mainAuthorityLocation: string | null;
  authorityPlannedCount90d: number;
  authorityPlannedValue90d: number;
  score: number;
  temperature: AdminPortalLeadTemperature;
  reasons: string[];
  recommendedAction: string;
  note: string;
  outreachStatus: AdminLeadOutreachStatus;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
  noteUpdatedAt: string | null;
  isTracked: boolean;
  recentWins: AdminPortalLeadWin[];
}

export interface AdminPortalLeadsData {
  generatedAt: string;
  totalCandidates: number;
  hotLeads: number;
  pipelineLeads: number;
  notContactedCount: number;
  leadsWithNotes: number;
  leads: AdminPortalLead[];
}

function normalizeJib(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "").trim();
}

function normalizeEntityName(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikePublicEntity(name: string | null | undefined): boolean {
  const normalized = normalizeEntityName(name);

  if (!normalized) {
    return false;
  }

  return [
    "javno preduzece",
    "javno poduzece",
    "ministarstvo",
    "opcina",
    "opstina",
    "grad ",
    "vlada",
    "zavod",
    "dom zdravlja",
    "bolnica",
    "univerzitet",
    "skola",
  ].some((keyword) => normalized.includes(keyword));
}

function getAuthorityName(
  authorityByJib: Map<string, Pick<ContractingAuthority, "id" | "name" | "jib" | "city" | "municipality" | "canton" | "entity" | "authority_type" | "activity_type">>,
  authorityJib: string | null | undefined
): string | null {
  const normalizedAuthorityJib = normalizeJib(authorityJib);

  if (!normalizedAuthorityJib) {
    return null;
  }

  return authorityByJib.get(normalizedAuthorityJib)?.name ?? null;
}

function hasReliableAwardContext(
  award: Pick<AwardDecision, "winner_jib" | "winner_name">,
  tender: Pick<Tender, "id" | "title" | "contracting_authority" | "portal_url"> | null,
  authorityName: string | null
): boolean {
  if (!normalizeJib(award.winner_jib) || looksLikePublicEntity(award.winner_name)) {
    return false;
  }

  return Boolean(tender || authorityName);
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function formatCompactCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M KM`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K KM`;
  }

  return `${Math.round(value)} KM`;
}

function getLocationLabel(city: string | null, municipality: string | null): string | null {
  if (city && municipality) {
    return `${city} · ${municipality}`;
  }

  return city ?? municipality ?? null;
}

function getAwardBaseDate(award: Pick<AwardDecision, "award_date" | "created_at">): string {
  return award.award_date ?? award.created_at;
}

function isWithinDays(value: string | null | undefined, days: number): boolean {
  if (!value) {
    return false;
  }

  return Date.now() - new Date(value).getTime() <= days * DAY_MS;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeLeadStatus(value: string | null | undefined): AdminLeadOutreachStatus {
  switch ((value ?? "").trim().toLowerCase()) {
    case "contacted":
    case "kontaktiran":
    case "u_toku":
      return "contacted";
    case "converted":
    case "konvertovan":
      return "converted";
    case "dead":
    case "mrtav":
    case "pauza":
      return "dead";
    default:
      return "new";
  }
}

function getTemperature(score: number): AdminPortalLeadTemperature {
  if (score >= 70) {
    return "Vruć lead";
  }

  if (score >= 45) {
    return "Dobar lead";
  }

  return "Pratiti";
}

function getRecommendedAction(temperature: AdminPortalLeadTemperature, hasPipeline: boolean, recentAwards: number): string {
  if (temperature === "Vruć lead") {
    return hasPipeline
      ? "Kontaktirati prioritetno uz referencu na njihove svježe dodjele i planirane nabavke kod istih naručilaca."
      : "Kontaktirati prioritetno uz referencu na svježe dodjele i potrebu za boljom pripremom narednih ponuda.";
  }

  if (temperature === "Dobar lead") {
    return recentAwards > 0
      ? "Poslati personalizovan outreach sa fokusom na konkurentsku pripremu i kontrolu rizika prijave."
      : "Ubaciti u follow-up listu i javiti se kada dobiju novu svježu aktivnost na portalu.";
  }

  return "Držati na radaru i aktivirati outreach kada se pojavi nova dodjela ili pipeline signal.";
}

function buildLeadReasons(input: {
  recentAwards180d: number;
  totalWinsCount: number;
  totalWonValue: number;
  averageBidders: number | null;
  authorityPlannedCount90d: number;
  authorityPlannedValue90d: number;
  totalBidsCount: number;
  hasLocation: boolean;
  lastAwardDate: string | null;
}): string[] {
  const reasons: string[] = [];

  if (input.recentAwards180d >= 3) {
    reasons.push(`Ima ${input.recentAwards180d} dodjele u zadnjih 180 dana, što pokazuje aktivno prisustvo na portalu.`);
  } else if (input.recentAwards180d > 0) {
    reasons.push(`Ima ${input.recentAwards180d} svježe dodjele u zadnjih 180 dana.`);
  }

  if (input.totalWinsCount >= 10) {
    reasons.push(`Historijski ima ${input.totalWinsCount} dobijenih postupaka.`);
  } else if (input.totalWinsCount >= 3) {
    reasons.push(`Već ima dokazanu istoriju pobjeda na javnim nabavkama (${input.totalWinsCount}).`);
  }

  if (input.totalWonValue >= 100_000) {
    reasons.push(`Ukupno dobijena vrijednost od oko ${formatCompactCurrency(input.totalWonValue)} sugeriše ozbiljan komercijalni potencijal.`);
  }

  if (input.averageBidders !== null && input.averageBidders >= 3) {
    reasons.push(`Prosjek od ${input.averageBidders} ponuđača po dodjeli znači da djeluju u konkurentnom okruženju gdje risk-control alat ima smisla.`);
  }

  if (input.authorityPlannedCount90d > 0) {
    reasons.push(
      input.authorityPlannedValue90d > 0
        ? `Najčešći naručilac ima ${input.authorityPlannedCount90d} planiranih nabavki u narednom periodu (${formatCompactCurrency(input.authorityPlannedValue90d)}).`
        : `Najčešći naručilac ima ${input.authorityPlannedCount90d} planiranih nabavki u narednom periodu.`
    );
  }

  if (input.totalBidsCount >= 8) {
    reasons.push(`Ima široku aktivnost na portalu (${input.totalBidsCount} evidentiranih postupaka).`);
  }

  if (input.hasLocation) {
    reasons.push("Portal već daje osnovne identifikacione podatke firme za početni outreach research.");
  }

  if (input.lastAwardDate && isWithinDays(input.lastAwardDate, 60)) {
    reasons.push("Vrlo svježa aktivnost na portalu daje dobar povod za javljanje sada.");
  }

  return reasons.slice(0, 4);
}

function scoreLead(input: {
  recentAwards180d: number;
  totalWinsCount: number;
  totalWonValue: number;
  averageBidders: number | null;
  authorityPlannedCount90d: number;
  totalBidsCount: number;
  hasLocation: boolean;
  lastAwardDate: string | null;
}): number {
  let score = 0;

  score += Math.min(26, input.recentAwards180d * 8);
  score += input.totalWinsCount >= 10 ? 18 : input.totalWinsCount >= 5 ? 12 : input.totalWinsCount > 0 ? 6 : 0;
  score += input.totalWonValue >= 500_000 ? 20 : input.totalWonValue >= 100_000 ? 14 : input.totalWonValue >= 25_000 ? 8 : 0;
  score += input.totalBidsCount >= 12 ? 10 : input.totalBidsCount >= 6 ? 6 : input.totalBidsCount >= 3 ? 3 : 0;
  score += input.averageBidders !== null && input.averageBidders >= 4 ? 8 : input.averageBidders !== null && input.averageBidders >= 2 ? 4 : 0;
  score += Math.min(12, input.authorityPlannedCount90d * 3);
  score += input.hasLocation ? 4 : 0;
  score += input.lastAwardDate && isWithinDays(input.lastAwardDate, 60) ? 8 : input.lastAwardDate && isWithinDays(input.lastAwardDate, 180) ? 4 : 0;

  return clamp(score, 0, 100);
}

export async function loadAdminPortalLeadsData(): Promise<AdminPortalLeadsData> {
  const admin = createAdminClient();
  const now = Date.now();
  const awardCutoff = new Date(now - 365 * DAY_MS).toISOString().slice(0, 10);
  const plannedEnd = new Date(now + 90 * DAY_MS).toISOString().slice(0, 10);
  const plannedStart = new Date(now).toISOString().slice(0, 10);

  const [companiesResult, marketCompaniesResult, awardsResult, authoritiesResult, plannedResult, notesResult] = await Promise.all([
    admin.from("companies").select("jib, name"),
    admin
      .from("market_companies")
      .select("portal_id, name, jib, city, municipality, total_bids_count, total_wins_count, total_won_value, win_rate, created_at")
      .order("total_won_value", { ascending: false })
      .limit(400),
    admin
      .from("award_decisions")
      .select(
        "portal_award_id, tender_id, winner_name, winner_jib, winning_price, estimated_value, total_bidders_count, procedure_type, contract_type, award_date, created_at, contracting_authority_jib"
      )
      .gte("award_date", awardCutoff)
      .order("award_date", { ascending: false })
      .limit(5000),
    admin.from("contracting_authorities").select("id, name, jib, city, municipality, canton, entity, authority_type, activity_type"),
    admin
      .from("planned_procurements")
      .select("contracting_authority_id, estimated_value, planned_date, contract_type")
      .gte("planned_date", plannedStart)
      .lte("planned_date", plannedEnd),
    admin.from("admin_portal_lead_notes").select("lead_jib, lead_name, note, outreach_status, last_contacted_at, next_follow_up_at, updated_at"),
  ]);

  if (companiesResult.error) {
    throw new Error(`Ne mogu učitati postojeće klijente: ${companiesResult.error.message}`);
  }

  if (marketCompaniesResult.error) {
    throw new Error(`Ne mogu učitati portal firme: ${marketCompaniesResult.error.message}`);
  }

  if (awardsResult.error) {
    throw new Error(`Ne mogu učitati javne dodjele: ${awardsResult.error.message}`);
  }

  if (authoritiesResult.error) {
    throw new Error(`Ne mogu učitati naručioce: ${authoritiesResult.error.message}`);
  }

  if (plannedResult.error) {
    throw new Error(`Ne mogu učitati planirane nabavke: ${plannedResult.error.message}`);
  }

  const customerCompanies = (companiesResult.data ?? []) as Pick<Company, "jib" | "name">[];
  const marketCompanies = (marketCompaniesResult.data ?? []) as Pick<
    MarketCompany,
    "portal_id" | "name" | "jib" | "city" | "municipality" | "total_bids_count" | "total_wins_count" | "total_won_value" | "win_rate" | "created_at"
  >[];
  const awards = (awardsResult.data ?? []) as Pick<
    AwardDecision,
    | "portal_award_id"
    | "tender_id"
    | "winner_name"
    | "winner_jib"
    | "winning_price"
    | "estimated_value"
    | "total_bidders_count"
    | "procedure_type"
    | "contract_type"
    | "award_date"
    | "created_at"
    | "contracting_authority_jib"
  >[];
  const authorities = (authoritiesResult.data ?? []) as Pick<
    ContractingAuthority,
    "id" | "name" | "jib" | "city" | "municipality" | "canton" | "entity" | "authority_type" | "activity_type"
  >[];
  const planned = (plannedResult.data ?? []) as Pick<
    PlannedProcurement,
    "contracting_authority_id" | "estimated_value" | "planned_date" | "contract_type"
  >[];
  const notes = notesResult.error ? [] : ((notesResult.data ?? []) as AdminPortalLeadNoteRow[]);
  const tenderIds = [...new Set(awards.map((award) => award.tender_id).filter((value): value is string => Boolean(value)))];
  const tenders: Array<
    Pick<Tender, "id" | "title" | "contracting_authority" | "portal_url"> 
  > = [];

  for (const batch of chunkArray(tenderIds, 250)) {
    const { data, error } = await admin
      .from("tenders")
      .select("id, title, contracting_authority, portal_url")
      .in("id", batch);

    if (error) {
      throw new Error(`Ne mogu učitati tendere za lead pregled: ${error.message}`);
    }

    tenders.push(...((data ?? []) as Pick<Tender, "id" | "title" | "contracting_authority" | "portal_url">[]));
  }

  const existingCustomerJibs = new Set(customerCompanies.map((company) => normalizeJib(company.jib)).filter(Boolean));
  const notesByJib = new Map(notes.map((note) => [normalizeJib(note.lead_jib), note]));
  const authorityByJib = new Map(authorities.map((authority) => [normalizeJib(authority.jib), authority]));
  const authorityById = new Map(authorities.map((authority) => [authority.id, authority]));
  const authorityJibs = new Set(authorities.map((authority) => normalizeJib(authority.jib)).filter(Boolean));
  const authorityNames = new Set(authorities.map((authority) => normalizeEntityName(authority.name)).filter(Boolean));
  const plannedByAuthorityJib = new Map<string, Array<Pick<PlannedProcurement, "contracting_authority_id" | "estimated_value" | "planned_date" | "contract_type">>>();
  const awardsByWinnerJib = new Map<string, typeof awards>();
  const tendersById = new Map(tenders.map((tender) => [tender.id, tender]));

  for (const item of planned) {
    const authority = item.contracting_authority_id ? authorityById.get(item.contracting_authority_id) : null;
    const authorityJib = normalizeJib(authority?.jib);

    if (!authorityJib) {
      continue;
    }

    const bucket = plannedByAuthorityJib.get(authorityJib) ?? [];
    bucket.push(item);
    plannedByAuthorityJib.set(authorityJib, bucket);
  }

  for (const award of awards) {
    const winnerJib = normalizeJib(award.winner_jib);

    if (!winnerJib) {
      continue;
    }

    const bucket = awardsByWinnerJib.get(winnerJib) ?? [];
    bucket.push(award);
    awardsByWinnerJib.set(winnerJib, bucket);
  }

  const leads = marketCompanies
    .filter((company) => {
      const jib = normalizeJib(company.jib);
      const normalizedName = normalizeEntityName(company.name);

      if (
        !jib ||
        existingCustomerJibs.has(jib) ||
        authorityJibs.has(jib) ||
        (normalizedName && authorityNames.has(normalizedName)) ||
        looksLikePublicEntity(company.name)
      ) {
        return false;
      }

      return (company.total_wins_count ?? 0) > 0 || (company.total_bids_count ?? 0) >= 3;
    })
    .map<AdminPortalLead>((company) => {
      const jib = normalizeJib(company.jib);
      const companyAwards = (awardsByWinnerJib.get(jib) ?? []).sort(
        (a, b) => new Date(getAwardBaseDate(b)).getTime() - new Date(getAwardBaseDate(a)).getTime()
      );
      const reliableAwards = companyAwards.filter((award) => {
        const tender = award.tender_id ? tendersById.get(award.tender_id) ?? null : null;
        const authorityName = getAuthorityName(authorityByJib, award.contracting_authority_jib);

        return hasReliableAwardContext(award, tender, authorityName);
      });
      const recentAwards180d = reliableAwards.filter((award) => isWithinDays(getAwardBaseDate(award), 180));
      const biddersWithValue = reliableAwards.filter((award) => award.total_bidders_count !== null);
      const averageBidders = biddersWithValue.length
        ? Number(
            (
              biddersWithValue.reduce((sum, award) => sum + (award.total_bidders_count || 0), 0) / biddersWithValue.length
            ).toFixed(1)
          )
        : null;
      const lastAward = reliableAwards[0] ?? null;
      const recentWins: AdminPortalLeadWin[] = reliableAwards.slice(0, 6).map((award) => {
        const tender = award.tender_id ? tendersById.get(award.tender_id) ?? null : null;
        const authorityName = getAuthorityName(authorityByJib, award.contracting_authority_jib);

        return {
          id: award.portal_award_id,
          tenderId: award.tender_id,
          tenderTitle: tender?.title ?? "Naziv tendera nije dostupan",
          contractingAuthority: tender?.contracting_authority ?? authorityName,
          awardDate: getAwardBaseDate(award),
          winningPrice: Number(award.winning_price) || null,
          procedureType: award.procedure_type ?? null,
          contractType: award.contract_type ?? null,
          portalUrl: tender?.portal_url ?? null,
        };
      });
      const authorityCounts = new Map<string, number>();

      for (const award of recentAwards180d) {
        const authorityJib = normalizeJib(award.contracting_authority_jib);
        if (!authorityJib) {
          continue;
        }

        authorityCounts.set(authorityJib, (authorityCounts.get(authorityJib) ?? 0) + 1);
      }

      const mainAuthorityJib = [...authorityCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      const mainAuthority = mainAuthorityJib ? authorityByJib.get(mainAuthorityJib) ?? null : null;
      const authorityPlanned = mainAuthorityJib ? plannedByAuthorityJib.get(mainAuthorityJib) ?? [] : [];
      const authorityPlannedCount90d = authorityPlanned.length;
      const authorityPlannedValue90d = authorityPlanned.reduce(
        (sum, item) => sum + (Number(item.estimated_value) || 0),
        0
      );
      const totalWonValue = Number(company.total_won_value) || 0;
      const score = scoreLead({
        recentAwards180d: recentAwards180d.length,
        totalWinsCount: company.total_wins_count ?? 0,
        totalWonValue,
        averageBidders,
        authorityPlannedCount90d,
        totalBidsCount: company.total_bids_count ?? 0,
        hasLocation: Boolean(company.city || company.municipality),
        lastAwardDate: lastAward ? getAwardBaseDate(lastAward) : null,
      });
      const temperature = getTemperature(score);
      const reasons = buildLeadReasons({
        recentAwards180d: recentAwards180d.length,
        totalWinsCount: company.total_wins_count ?? 0,
        totalWonValue,
        averageBidders,
        authorityPlannedCount90d,
        authorityPlannedValue90d,
        totalBidsCount: company.total_bids_count ?? 0,
        hasLocation: Boolean(company.city || company.municipality),
        lastAwardDate: lastAward ? getAwardBaseDate(lastAward) : null,
      });
      const noteRow = notesByJib.get(jib) ?? null;
      const outreachStatus = normalizeLeadStatus(noteRow?.outreach_status ?? null);

      return {
        jib,
        companyName: company.name,
        portalCompanyId: company.portal_id ?? null,
        city: company.city ?? null,
        municipality: company.municipality ?? null,
        totalBidsCount: company.total_bids_count ?? 0,
        totalWinsCount: company.total_wins_count ?? 0,
        totalWonValue,
        winRate: company.win_rate ?? null,
        recentAwards180d: recentAwards180d.length,
        recentWonValue180d: recentAwards180d.reduce((sum, award) => sum + (Number(award.winning_price) || 0), 0),
        lastAwardDate: lastAward ? getAwardBaseDate(lastAward) : null,
        lastWinningPrice: lastAward ? Number(lastAward.winning_price) || 0 : null,
        averageBidders,
        lastContractType: lastAward?.contract_type ?? null,
        lastProcedureType: lastAward?.procedure_type ?? null,
        mainAuthorityName: mainAuthority?.name ?? null,
        mainAuthorityJib,
        mainAuthorityLocation: mainAuthority ? getLocationLabel(mainAuthority.city, mainAuthority.municipality) : null,
        authorityPlannedCount90d,
        authorityPlannedValue90d,
        score,
        temperature,
        reasons,
        recommendedAction: getRecommendedAction(temperature, authorityPlannedCount90d > 0, recentAwards180d.length),
        note: noteRow?.note ?? "",
        outreachStatus,
        lastContactedAt: noteRow?.last_contacted_at ?? null,
        nextFollowUpAt: noteRow?.next_follow_up_at ?? null,
        noteUpdatedAt: noteRow?.updated_at ?? null,
        isTracked: Boolean(
          (noteRow?.note && noteRow.note.trim().length > 0) ||
            outreachStatus !== "new" ||
            noteRow?.last_contacted_at ||
            noteRow?.next_follow_up_at
        ),
        recentWins,
      };
    })
    .sort((a, b) => {
      const scoreDiff = b.score - a.score;
      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      const recentDiff = b.recentAwards180d - a.recentAwards180d;
      if (recentDiff !== 0) {
        return recentDiff;
      }

      return b.totalWonValue - a.totalWonValue;
    })
    .slice(0, 120);

  return {
    generatedAt: new Date().toISOString(),
    totalCandidates: leads.length,
    hotLeads: leads.filter((lead) => lead.temperature === "Vruć lead").length,
    pipelineLeads: leads.filter((lead) => lead.authorityPlannedCount90d > 0).length,
    notContactedCount: leads.filter((lead) => lead.outreachStatus === "new").length,
    leadsWithNotes: leads.filter((lead) => lead.note.trim().length > 0).length,
    leads,
  };
}
