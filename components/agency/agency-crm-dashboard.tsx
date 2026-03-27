"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  Building2,
  ChevronRight,
  Clock,
  FileText,
  Info,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { AddClientModal } from "./add-client-modal";

const CRM_STAGE_CONFIG: Record<string, { label: string; color: string }> = {
  lead: { label: "Potencijalni", color: "bg-amber-50 text-amber-700 border-amber-200" },
  onboarding: { label: "Onboarding", color: "bg-blue-50 text-blue-700 border-blue-200" },
  active: { label: "Aktivan", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  paused: { label: "Pauziran", color: "bg-slate-100 text-slate-600 border-slate-200" },
  churned: { label: "Otkazan", color: "bg-red-50 text-red-700 border-red-200" },
};

const ALERT_TYPE_CONFIG: Record<string, { icon: typeof AlertTriangle; label: string }> = {
  missing_docs: { icon: FileText, label: "Nedostaju dokumenti" },
  deadline_soon: { icon: Clock, label: "Rok se bliži" },
  doc_expiring: { icon: FileText, label: "Dokument ističe" },
  contract_expiring: { icon: AlertTriangle, label: "Ugovor ističe" },
  inactive_client: { icon: Bell, label: "Nema aktivnosti" },
  submitted_no_update: { icon: Info, label: "Čeka ažuriranje" },
};

const SEVERITY_STYLES = {
  critical: "border-red-200 bg-red-50/60",
  warning: "border-amber-200 bg-amber-50/60",
  info: "border-slate-200 bg-slate-50/60",
};

const SEVERITY_ICON_STYLES = {
  critical: "text-red-500",
  warning: "text-amber-500",
  info: "text-slate-400",
};

function formatCurrency(value: number | null | undefined): string {
  if (!value) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M KM`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K KM`;
  return `${Math.round(value)} KM`;
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

interface AgencyClient {
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

interface AgencyCRMDashboardProps {
  clients: AgencyClient[];
  bidsByCompany: Record<string, { total: number; won: number; active: number }>;
  docsByCompany: Record<string, number>;
  alertsByCompany: Record<string, AgencyAlert[]>;
}

export function AgencyCRMDashboard({
  clients,
  bidsByCompany,
  docsByCompany,
  alertsByCompany,
}: AgencyCRMDashboardProps) {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const router = useRouter();

  const filtered = clients.filter((c) => {
    const name = c.companies?.name?.toLowerCase() ?? "";
    const jib = c.companies?.jib ?? "";
    const matchesSearch = !search || name.includes(search.toLowerCase()) || jib.includes(search);
    const matchesStage = !stageFilter || c.crm_stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  const severityOrder = { critical: 0, warning: 1, info: 2 };
  const allAlerts: Array<AgencyAlert & { companyName: string }> = [];
  for (const client of clients) {
    const companyId = client.companies?.id;
    if (!companyId) continue;
    for (const alert of alertsByCompany[companyId] ?? []) {
      allAlerts.push({ ...alert, companyName: client.companies?.name ?? "Klijent" });
    }
  }
  allAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const criticalCount = allAlerts.filter((a) => a.severity === "critical").length;
  const warningCount = allAlerts.filter((a) => a.severity === "warning").length;

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-900">Klijenti</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Svaki klijent ima potpuni tender profil, preporuke i dokumente.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition-all hover:bg-blue-700"
        >
          <Plus className="size-4" />
          Dodaj klijenta
        </button>
      </div>

      {allAlerts.length > 0 && (
        <div className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-red-50">
              <Bell className="size-4 text-red-500" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold text-slate-900">Alerti</h2>
              <p className="text-xs text-slate-500">
                {criticalCount > 0 && `${criticalCount} hitnih`}
                {criticalCount > 0 && warningCount > 0 && " · "}
                {warningCount > 0 && `${warningCount} upozorenja`}
                {criticalCount === 0 && warningCount === 0 && `${allAlerts.length} informacija`}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {allAlerts.map((alert, i) => {
              const typeConfig = ALERT_TYPE_CONFIG[alert.type];
              const Icon = typeConfig.icon;
              return (
                <Link
                  key={`${alert.type}-${alert.bidId ?? alert.clientId ?? i}`}
                  href={alert.href}
                  className={`flex items-center gap-4 rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-sm ${SEVERITY_STYLES[alert.severity]}`}
                >
                  <Icon className={`size-4 shrink-0 ${SEVERITY_ICON_STYLES[alert.severity]}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{alert.companyName}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-[11px] font-semibold text-slate-500">{typeConfig.label}</span>
                    </div>
                    <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">{alert.label}</p>
                    <p className="text-xs text-slate-500">{alert.detail}</p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-slate-300" />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Pretraži po imenu ili JIB-u..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {([null, "lead", "onboarding", "active", "paused", "churned"] as const).map((stage) => (
            <button
              key={stage ?? "all"}
              onClick={() => setStageFilter(stage)}
              className={`h-9 rounded-lg px-3 text-xs font-semibold transition-all ${stageFilter === stage ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
            >
              {stage === null ? "Svi" : CRM_STAGE_CONFIG[stage].label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
          <Users className="mx-auto mb-4 size-12 text-slate-300" />
          <p className="font-semibold text-slate-700">{clients.length === 0 ? "Još nema klijenata" : "Nema rezultata pretrage"}</p>
          <p className="mt-2 text-sm text-slate-500">{clients.length === 0 ? "Dodajte prvog klijenta da počnete." : "Pokušajte drugu pretragu ili filter."}</p>
          {clients.length === 0 && (
            <button onClick={() => setShowAddModal(true)} className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white">
              <Plus className="size-4" />
              Dodaj klijenta
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-[1.75rem] border border-slate-200/80 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/30 px-6 py-4">
            <p className="text-sm font-semibold text-slate-700">{filtered.length} {filtered.length === 1 ? "klijent" : "klijenata"}</p>
          </div>
          <div className="divide-y divide-slate-100">
            {filtered.map((client) => {
              const company = client.companies;
              if (!company) return null;
              const stageConfig = CRM_STAGE_CONFIG[client.crm_stage] ?? CRM_STAGE_CONFIG.active;
              const bids = bidsByCompany[company.id];
              const docs = docsByCompany[company.id] ?? 0;
              const clientAlerts = alertsByCompany[company.id] ?? [];
              const criticalAlerts = clientAlerts.filter((a) => a.severity === "critical").length;
              return (
                <Link key={client.id} href={`/dashboard/agency/clients/${client.id}`} className="group flex flex-col gap-4 px-6 py-5 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                      <Building2 className="size-5" />
                      {criticalAlerts > 0 && (
                        <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">{criticalAlerts}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 transition-colors group-hover:text-blue-700">{company.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>JIB: {company.jib}</span>
                        {company.contact_email && <><span>·</span><span>{company.contact_email}</span></>}
                        {client.monthly_fee && <><span>·</span><span className="font-semibold text-emerald-700">{formatCurrency(client.monthly_fee)}/mj.</span></>}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-semibold ${stageConfig.color}`}>{stageConfig.label}</span>
                    {bids && <span className="text-xs text-slate-500">{bids.active} aktivnih · {bids.won} dobijeno</span>}
                    <span className="text-xs text-slate-400">{docs} dok.</span>
                    <ChevronRight className="size-4 text-slate-300 transition-colors group-hover:text-blue-600" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {showAddModal && (
        <AddClientModal onClose={() => setShowAddModal(false)} onSuccess={() => { setShowAddModal(false); router.refresh(); }} />
      )}
    </div>
  );
}
