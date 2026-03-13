// ============================================================
// BiH e-Procurement (EJN) OData API Client
// https://open.ejn.gov.ba
// ============================================================

const BASE_URL = process.env.EJN_API_BASE_URL || "https://open.ejn.gov.ba";
const PAGE_SIZE = 50;
const MAX_PAGES = 20;

// --- Normalized types (what our sync module expects) ---

export interface EjnProcurementNotice {
  NoticeId: string;
  Title: string;
  ContractingAuthorityName: string | null;
  ContractingAuthorityJib: string | null;
  Deadline: string | null;
  EstimatedValue: number | null;
  ContractType: string | null;
  ProcedureType: string | null;
  Status: string | null;
  NoticeUrl: string | null;
  Description: string | null;
}

export interface EjnAwardNotice {
  AwardId: string;
  NoticeId: string | null;
  ContractingAuthorityJib: string | null;
  WinnerName: string | null;
  WinnerJib: string | null;
  WinningPrice: number | null;
  EstimatedValue: number | null;
  TotalBiddersCount: number | null;
  ProcedureType: string | null;
  ContractType: string | null;
  AwardDate: string | null;
}

export interface EjnContractingAuthority {
  AuthorityId: string;
  Name: string;
  Jib: string;
  City: string | null;
  Entity: string | null;
  Canton: string | null;
  Municipality: string | null;
  AuthorityType: string | null;
  ActivityType: string | null;
}

export interface EjnSupplier {
  SupplierId: string | null;
  Name: string;
  Jib: string;
  City: string | null;
  Municipality: string | null;
}

export interface EjnPlannedProcurement {
  PlanId: string;
  ContractingAuthorityId: string | null;
  Description: string | null;
  EstimatedValue: number | null;
  PlannedDate: string | null;
  ContractType: string | null;
  CpvCode: string | null;
}

// --- OData pagination helper ---

interface ODataResponse<T> {
  value: T[];
  "@odata.nextLink"?: string;
  "@odata.count"?: number;
}

async function fetchODataPages<T>(
  endpoint: string,
  orderBy: string = "Id desc",
  filter?: string,
): Promise<T[]> {
  const all: T[] = [];
  let nextUrl: string | null = null;
  let skip = 0;
  let pages = 0;

  while (pages < MAX_PAGES) {
    const url = nextUrl ?? (() => {
      const params = new URLSearchParams({
        $top: String(PAGE_SIZE),
        $skip: String(skip),
        $orderby: orderBy,
      });

      if (filter) {
        params.set("$filter", filter);
      }

      return `${BASE_URL}${endpoint}?${params.toString()}`;
    })();

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `EJN API error: ${res.status} ${res.statusText} — ${endpoint} — ${text.slice(0, 200)}`
      );
    }

    const data: ODataResponse<T> = await res.json();
    const items = data.value ?? [];
    all.push(...items);

    pages++;

    const nextLink = data["@odata.nextLink"];
    if (nextLink) {
      nextUrl = nextLink.startsWith("http") ? nextLink : `${BASE_URL}${nextLink}`;
      continue;
    }

    if (items.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }

  return all;
}

// --- Contract type / procedure type translation ---

const CONTRACT_TYPE_MAP: Record<string, string> = {
  Goods: "Robe",
  Services: "Usluge",
  Works: "Radovi",
};

const PROCEDURE_TYPE_MAP: Record<string, string> = {
  OpenProcedure: "Otvoreni postupak",
  RestrictedProcedure: "Ograničeni postupak",
  NegotiatedProcedure: "Pregovarački postupak",
  CompetitiveRequest: "Konkurentski zahtjev",
  DirectAgreement: "Direktni sporazum",
  CompetitiveDialogue: "Konkurentski dijalog",
};

// --- Public API functions ---

export async function fetchProcurementNotices(
  _lastSyncAt?: string | null
): Promise<EjnProcurementNotice[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await fetchODataPages<any>(
    "/ProcurementNotices",
    "Id desc"
  );

  return raw.map((r) => ({
    NoticeId: String(r.Id ?? r.ProcedureId ?? ""),
    Title: r.ProcedureName || r.ProcedureNumber || "Bez naziva",
    ContractingAuthorityName: r.ContractingAuthorityName || null,
    ContractingAuthorityJib: r.ContractingAuthorityTaxNumber || null,
    Deadline: r.ApplicationDeadlineDateTime || null,
    EstimatedValue: r.EstimatedValueTotal ?? null,
    ContractType: CONTRACT_TYPE_MAP[r.ContractType] || r.ContractType || null,
    ProcedureType: PROCEDURE_TYPE_MAP[r.ProcedureType] || r.ProcedureType || null,
    Status: null,
    NoticeUrl: r.Id ? `https://www.ejn.gov.ba/Notice/${r.Id}` : null,
    Description: r.AdditionalInformation || null,
  }));
}

export async function fetchAwardNotices(
  lastSyncAt?: string | null
): Promise<EjnAwardNotice[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await fetchODataPages<any>(
    "/AwardNotices",
    "Id desc",
    lastSyncAt ? `Id gt ${lastSyncAt}` : undefined
  );

  return raw.map((r) => ({
    AwardId: String(r.Id ?? ""),
    NoticeId: r.ProcedureId ? String(r.ProcedureId) : null,
    ContractingAuthorityJib: r.ContractingAuthorityTaxNumber || null,
    WinnerName: null,
    WinnerJib: null,
    WinningPrice: null,
    EstimatedValue: r.EstimatedValueTotal ?? null,
    TotalBiddersCount: null,
    ProcedureType: PROCEDURE_TYPE_MAP[r.ProcedureType] || r.ProcedureType || null,
    ContractType: CONTRACT_TYPE_MAP[r.ContractType] || r.ContractType || null,
    AwardDate: r.AwardDate || null,
  }));
}

export async function fetchContractingAuthorities(
  lastSyncAt?: string | null
): Promise<EjnContractingAuthority[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await fetchODataPages<any>(
    "/ContractingAuthorities",
    "Id desc",
    lastSyncAt ? `Id gt ${lastSyncAt}` : undefined
  );

  return raw.map((r) => ({
    AuthorityId: String(r.Id ?? ""),
    Name: r.Name || "Nepoznato",
    Jib: r.TaxNumber || "",
    City: r.CityName || null,
    Entity: r.AdministrativeUnitType || null,
    Canton: r.AdministrativeUnitName || null,
    Municipality: null,
    AuthorityType: r.AuthorityType || null,
    ActivityType: r.ActivityTypeName || null,
  }));
}

export async function fetchSuppliers(
  lastSyncAt?: string | null
): Promise<EjnSupplier[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await fetchODataPages<any>(
    "/Suppliers",
    "Id desc",
    lastSyncAt ? `Id gt ${lastSyncAt}` : undefined
  );

  return raw.map((r) => ({
    SupplierId: String(r.Id ?? ""),
    Name: r.Name || "Nepoznato",
    Jib: r.TaxNumber || r.Jib || "",
    City: r.CityName || null,
    Municipality: null,
  }));
}

export async function fetchPlannedProcurements(
  lastSyncAt?: string | null
): Promise<EjnPlannedProcurement[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await fetchODataPages<any>(
    "/PlannedProcurements",
    "Id desc",
    lastSyncAt ? `Id gt ${lastSyncAt}` : undefined
  );

  return raw.map((r) => ({
    PlanId: String(r.Id ?? ""),
    ContractingAuthorityId: r.ContractingAuthorityId ? String(r.ContractingAuthorityId) : null,
    Description: r.Description || r.ProcurementSubject || null,
    EstimatedValue: r.EstimatedValueTotal ?? r.EstimatedValue ?? null,
    PlannedDate: r.InitiationDate || null,
    ContractType: CONTRACT_TYPE_MAP[r.ContractType] || r.ContractType || null,
    CpvCode: r.CpvCode || null,
  }));
}
