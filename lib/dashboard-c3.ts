import type { Document } from "@/types/db-aliases";
import { DOCUMENT_TYPES, getExpiryStatus } from "@/lib/vault/constants";

export const C3_CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

export interface VaultBidDocumentUsage {
  document_id: string;
  bid_id: string;
  checklist_item_name: string | null;
  tender_title: string | null;
}

export interface VaultClientFolder {
  agencyClientId: string;
  companyId: string;
  companyName: string;
  documents: Document[];
}

export interface VaultTenderGroup {
  tenderId: string;
  tenderTitle: string;
  count: number;
}

export interface VaultCategoryGroup {
  category: string;
  count: number;
}

export interface VaultRiskItem {
  id: string;
  title: string;
  detail: string;
  severity: "critical" | "warning" | "info";
  href: string;
  dueDate: string | null;
}

export interface VaultDashboardData {
  documents: Document[];
  usage: VaultBidDocumentUsage[];
  folders: VaultClientFolder[];
  tenderGroups: VaultTenderGroup[];
  categoryGroups: VaultCategoryGroup[];
  risks: VaultRiskItem[];
  isAgency: boolean;
  companyName: string;
}

export interface AgencyDashboardClient {
  id: string;
  status: string;
  crm_stage: string;
  notes: string | null;
  contract_start: string | null;
  contract_end: string | null;
  monthly_fee: number | null;
  created_at: string;
  updated_at: string;
  company_id: string;
  companies: {
    id: string;
    name: string;
    jib: string;
    industry: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    operating_regions: string[] | null;
    keywords: string[] | null;
    cpv_codes: string[] | null;
  } | null;
}

export interface AgencyAlert {
  type: "missing_docs" | "deadline_soon" | "doc_expiring" | "contract_expiring" | "inactive_client" | "submitted_no_update";
  label: string;
  detail: string;
  href: string;
  severity: "critical" | "warning" | "info";
  bidId?: string;
  clientId?: string;
}

export interface AgencyGrantPreview {
  id: string;
  slug: string;
  type: string;
  title: string;
  issuer: string;
  deadline: string | null;
  value: number | null;
}

export function formatKm(value: number | null | undefined) {
  if (!value) return "0 KM";
  return `${Math.round(Number(value)).toLocaleString("bs-BA")} KM`;
}

export function formatCompactKm(value: number | null | undefined) {
  const numeric = Number(value ?? 0);
  if (!numeric) return "0 KM";
  if (numeric >= 1_000_000) return `${(numeric / 1_000_000).toFixed(1)}M KM`;
  if (numeric >= 1_000) return `${Math.round(numeric / 1_000).toLocaleString("bs-BA")}K KM`;
  return `${Math.round(numeric).toLocaleString("bs-BA")} KM`;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("bs-BA", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatBytes(value: number | null | undefined) {
  const bytes = Number(value ?? 0);
  if (bytes <= 0) return "0 MB";
  const mb = bytes / 1024 / 1024;
  if (mb < 1024) return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

export function getDocumentExtension(document: Document) {
  const path = document.file_path || document.name;
  const extension = path.split(".").pop()?.toUpperCase() ?? "DOC";
  if (["PDF", "DOCX", "XLSX", "ZIP"].includes(extension)) return extension;
  return document.type?.split("/").pop()?.toUpperCase().slice(0, 4) || "DOC";
}

export function buildVaultCategoryGroups(documents: Document[]): VaultCategoryGroup[] {
  const counts = new Map<string, number>();
  for (const document of documents) {
    const category = document.type || "Ostalo";
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((left, right) => right.count - left.count);
}

export function buildVaultTenderGroups(usage: VaultBidDocumentUsage[]): VaultTenderGroup[] {
  const counts = new Map<string, VaultTenderGroup>();
  for (const item of usage) {
    const tenderId = item.bid_id;
    const current = counts.get(tenderId) ?? {
      tenderId,
      tenderTitle: item.tender_title || "Nepoznat tender",
      count: 0,
    };
    current.count += 1;
    counts.set(tenderId, current);
  }
  return [...counts.values()].sort((left, right) => right.count - left.count).slice(0, 10);
}

export function buildVaultRisks(documents: Document[], usage: VaultBidDocumentUsage[], baseHref: string): VaultRiskItem[] {
  const risks: VaultRiskItem[] = [];
  const usedDocumentIds = new Set(usage.map((item) => item.document_id));

  for (const document of documents) {
    const status = getExpiryStatus(document.expires_at);
    if (status === "danger" || status === "warning") {
      risks.push({
        id: `expiry-${document.id}`,
        title: document.name,
        detail: status === "danger" ? "Dokument je istekao ili ističe u narednih 30 dana." : "Dokument ističe u narednih 60 dana.",
        severity: status === "danger" ? "critical" : "warning",
        href: baseHref,
        dueDate: document.expires_at,
      });
    }
  }

  const unused = documents.filter((document) => !usedDocumentIds.has(document.id)).slice(0, 3);
  for (const document of unused) {
    risks.push({
      id: `unused-${document.id}`,
      title: document.name,
      detail: "Dokument nije povezan ni sa jednom ponudom kroz bid_documents.",
      severity: "info",
      href: baseHref,
      dueDate: null,
    });
  }

  return risks.slice(0, 8);
}

export function getDocumentTypeChart(documents: Document[]) {
  return DOCUMENT_TYPES.map((type, index) => ({
    name: type,
    value: documents.filter((document) => document.type === type).length,
    color: C3_CHART_COLORS[index % C3_CHART_COLORS.length],
  })).filter((item) => item.value > 0);
}

export function getAgencyStageLabel(stage: string | null | undefined) {
  if (stage === "lead") return "Potencijalni";
  if (stage === "onboarding") return "Onboarding";
  if (stage === "paused") return "Pauziran";
  if (stage === "churned") return "Otkazan";
  return "Aktivan";
}

export function getAgencyStageClasses(stage: string | null | undefined) {
  if (stage === "lead") return "border-amber-200 bg-amber-50 text-amber-700";
  if (stage === "onboarding") return "border-blue-200 bg-blue-50 text-blue-700";
  if (stage === "paused") return "border-slate-200 bg-slate-100 text-slate-600";
  if (stage === "churned") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export function getAgencyStatusChart(clients: AgencyDashboardClient[]) {
  const stages = ["active", "onboarding", "lead", "paused", "churned"];
  return stages
    .map((stage, index) => ({
      name: getAgencyStageLabel(stage),
      value: clients.filter((client) => (client.crm_stage || "active") === stage).length,
      color: C3_CHART_COLORS[index % C3_CHART_COLORS.length],
    }))
    .filter((item) => item.value > 0);
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
