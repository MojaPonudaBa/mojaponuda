// ============================================================
// BiH e-Procurement (EJN) OData API Client
// https://open.ejn.gov.ba
// ============================================================

const BASE_URL = process.env.EJN_API_BASE_URL || "https://open.ejn.gov.ba";
const PAGE_SIZE = 50;
const MAX_PAGES = 100;

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
  ProcedureId: string | null;
  NoticeId: string | null;
  ProcedureName: string | null;
  NoticeUrl: string | null;
  ContractingAuthorityName: string | null;
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

export interface EjnAwardedSupplierGroup {
  SupplierGroupId: string;
  LotId: string | null;
}

export interface EjnSupplierGroupSupplierLink {
  SupplierGroupId: string;
  SupplierId: string;
  IsLead: boolean;
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

// --- Retry helper ---

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxAttempts = 3,
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, options);

      // Don't retry client errors (4xx) — they won't resolve with a retry
      if (res.ok || (res.status >= 400 && res.status < 500)) {
        return res;
      }

      // 5xx — save error and retry after backoff
      lastError = new Error(`EJN HTTP ${res.status}`);
    } catch (error) {
      // Network / DNS error
      lastError = error;
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** (attempt - 1)));
    }
  }

  throw lastError;
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

    const res = await fetchWithRetry(url, {
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

function buildLastUpdatedFilter(lastSyncAt?: string | null): string | undefined {
  return lastSyncAt?.trim() ? `LastUpdated ge ${lastSyncAt}` : undefined;
}

function joinNonEmpty(parts: Array<string | null | undefined>): string | null {
  const normalized = parts.map((part) => part?.trim()).filter(Boolean);
  return normalized.length > 0 ? normalized.join("\n\n") : null;
}

function mapAwardNotice(r: Record<string, unknown>): EjnAwardNotice {
  const procedureOrNoticeId = r.ProcedureId ?? r.NoticeId ?? null;
  const procedureHref = procedureOrNoticeId ? `https://next.ejn.gov.ba/procedures/${String(procedureOrNoticeId)}/overview` : null;

  return {
    AwardId: String(r.Id ?? ""),
    ProcedureId: r.ProcedureId ? String(r.ProcedureId) : null,
    NoticeId: r.NoticeId ? String(r.NoticeId) : r.ProcedureId ? String(r.ProcedureId) : null,
    ProcedureName:
      typeof r.ProcedureName === "string"
        ? r.ProcedureName
        : typeof r.ProcedureNumber === "string"
          ? r.ProcedureNumber
          : null,
    NoticeUrl: procedureHref,
    ContractingAuthorityName: typeof r.ContractingAuthorityName === "string" ? r.ContractingAuthorityName : null,
    ContractingAuthorityJib: typeof r.ContractingAuthorityTaxNumber === "string" ? r.ContractingAuthorityTaxNumber : null,
    WinnerName: null,
    WinnerJib: null,
    WinningPrice: typeof r.Value === "number" ? r.Value : null,
    EstimatedValue:
      typeof r.EstimatedValueTotal === "number"
        ? r.EstimatedValueTotal
        : typeof r.HighestAcceptableOfferValue === "number"
          ? r.HighestAcceptableOfferValue
          : typeof r.LowestAcceptableOfferValue === "number"
            ? r.LowestAcceptableOfferValue
            : null,
    TotalBiddersCount:
      typeof r.NumberOfReceivedOffers === "number"
        ? r.NumberOfReceivedOffers
        : typeof r.NumberOfAcceptableOffers === "number"
          ? r.NumberOfAcceptableOffers
          : null,
    ProcedureType: PROCEDURE_TYPE_MAP[String(r.ProcedureType ?? "")] || (typeof r.ProcedureType === "string" ? r.ProcedureType : null),
    ContractType: CONTRACT_TYPE_MAP[String(r.ContractType ?? "")] || (typeof r.ContractType === "string" ? r.ContractType : null),
    AwardDate:
      typeof r.ContractDate === "string"
        ? r.ContractDate
        : typeof r.AwardDate === "string"
          ? r.AwardDate
          : null,
  };
}

function buildNumericIdFilter(fieldName: string, ids: string[]): string | undefined {
  const normalizedIds = ids.filter((id) => /^\d+$/.test(id));

  if (normalizedIds.length === 0) {
    return undefined;
  }

  return normalizedIds.map((id) => `${fieldName} eq ${id}`).join(" or ");
}

// --- Public API functions ---

export async function fetchProcurementNotices(
  lastSyncAt?: string | null
): Promise<EjnProcurementNotice[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await fetchODataPages<any>(
    "/ProcurementNotices",
    "Id desc",
    buildLastUpdatedFilter(lastSyncAt)
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
    NoticeUrl: r.Id ? `https://next.ejn.gov.ba/procedures/${r.Id}/overview` : null,
    Description: joinNonEmpty([
      r.AdditionalInformation,
      r.ParticipationRestrictions,
      r.ProfessionalActivity,
      r.EconomicAbility,
      r.TechnicalAbility,
      r.PaymentRequirements,
    ]),
  }));
}

export async function fetchAwardNotices(
  lastSyncAt?: string | null
): Promise<EjnAwardNotice[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await fetchODataPages<any>(
    "/Awards",
    "Id desc",
    buildLastUpdatedFilter(lastSyncAt)
  );

  return raw.map((row) => mapAwardNotice(row as Record<string, unknown>));
}

export async function fetchAwardNoticesByIds(awardIds: string[]): Promise<EjnAwardNotice[]> {
  if (awardIds.length === 0) {
    return [];
  }

  const batches: string[][] = [];
  for (let index = 0; index < awardIds.length; index += 20) {
    batches.push(awardIds.slice(index, index + 20));
  }

  // OPT 6: Parallel batch requests instead of sequential for loop
  const batchResults = await Promise.all(
    batches.map(async (batch) => {
      const filter = buildNumericIdFilter("Id", batch);
      if (!filter) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = await fetchODataPages<any>("/Awards", "Id desc", filter);
      return raw.map((row) => mapAwardNotice(row as Record<string, unknown>));
    })
  );

  return batchResults.flat();
}

export async function fetchAwardedSupplierGroups(
  lastSyncAt?: string | null
): Promise<EjnAwardedSupplierGroup[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await fetchODataPages<any>(
    "/SupplierGroups",
    "Id desc",
    ["IsAwarded eq true", buildLastUpdatedFilter(lastSyncAt)].filter(Boolean).join(" and ")
  );

  return raw.map((r) => ({
    SupplierGroupId: String(r.Id ?? ""),
    LotId: r.LotId ? String(r.LotId) : null,
  }));
}

export async function fetchSupplierGroupSupplierLinks(
  supplierGroupIds: string[]
): Promise<EjnSupplierGroupSupplierLink[]> {
  if (supplierGroupIds.length === 0) {
    return [];
  }

  const batches: string[][] = [];
  for (let index = 0; index < supplierGroupIds.length; index += 10) {
    batches.push(supplierGroupIds.slice(index, index + 10));
  }

  // OPT 6: Parallel batch requests
  const batchResults = await Promise.all(
    batches.map(async (batch) => {
      const filter = batch
        .map((groupId) => `SupplierGroupId eq ${groupId}`)
        .join(" or ");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = await fetchODataPages<any>(
        "/SupplierGroupSupplierLinks",
        "Id desc",
        filter
      );

      return raw.map((r) => ({
        SupplierGroupId: String(r.SupplierGroupId ?? ""),
        SupplierId: String(r.SupplierId ?? ""),
        IsLead: Boolean(r.IsLead),
      }));
    })
  );

  return batchResults.flat();
}

export async function fetchContractingAuthorities(
  lastSyncAt?: string | null
): Promise<EjnContractingAuthority[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await fetchODataPages<any>(
    "/ContractingAuthorities",
    "Id desc",
    buildLastUpdatedFilter(lastSyncAt)
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
    buildLastUpdatedFilter(lastSyncAt)
  );

  return raw.map((r) => ({
    SupplierId: String(r.Id ?? ""),
    Name: r.Name || "Nepoznato",
    Jib: r.TaxNumber || r.Jib || "",
    City: r.CityName || null,
    Municipality: null,
  }));
}

export async function fetchSuppliersByIds(
  supplierIds: string[]
): Promise<EjnSupplier[]> {
  if (supplierIds.length === 0) {
    return [];
  }

  const batches: string[][] = [];
  for (let index = 0; index < supplierIds.length; index += 10) {
    batches.push(supplierIds.slice(index, index + 10));
  }

  // OPT 6: Parallel batch requests
  const batchResults = await Promise.all(
    batches.map(async (batch) => {
      const filter = batch.map((supplierId) => `Id eq ${supplierId}`).join(" or ");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = await fetchODataPages<any>(
        "/Suppliers",
        "Id desc",
        filter
      );

      return raw.map((r) => ({
        SupplierId: String(r.Id ?? ""),
        Name: r.Name || "Nepoznato",
        Jib: r.TaxNumber || r.Jib || "",
        City: r.CityName || null,
        Municipality: null,
      }));
    })
  );

  return batchResults.flat();
}

export async function fetchPlannedProcurements(
  lastSyncAt?: string | null
): Promise<EjnPlannedProcurement[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await fetchODataPages<any>(
    "/PlannedProcurements",
    "Id desc",
    buildLastUpdatedFilter(lastSyncAt)
  );

  return raw.map((r) => ({
    PlanId: String(r.Id ?? ""),
    ContractingAuthorityId: r.ContractingAuthorityId ? String(r.ContractingAuthorityId) : null,
    Description: r.Name || r.Description || r.ProcurementSubject || null,
    EstimatedValue: r.EstimatedValueTotal ?? r.EstimatedValue ?? null,
    PlannedDate: r.EstimatedProcedureStartDate || r.InitiationDate || null,
    ContractType: CONTRACT_TYPE_MAP[r.ContractType] || r.ContractType || null,
    CpvCode: r.MainCpvCodeName?.split(" - ")?.[0] || r.CpvCode || null,
  }));
}
