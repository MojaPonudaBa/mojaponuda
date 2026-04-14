"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  Bell,
  Building2,
  ChevronRight,
  Clock,
  FileText,
  Info,
  Plus,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { AddClientModal } from "./add-client-modal";

const DAY_IN_MS = 1000 * 60 * 60 * 24;
const GRANT_PREVIEW_REFERENCE_TIME = Date.now();

const CRM_STAGE_CONFIG: Record<string, { label: string; tone: string }> = {
  lead: { label: "Potencijalni", tone: "border-amber-500/30 bg-amber-500/10 text-amber-100" },
  onboarding: { label: "Postavljanje", tone: "border-sky-500/30 bg-sky-500/10 text-sky-100" },
  active: { label: "Aktivan", tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100" },
  paused: { label: "Pauziran", tone: "border-slate-500/30 bg-slate-500/10 text-slate-200" },
  churned: { label: "Otkazan", tone: "border-rose-500/30 bg-rose-500/10 text-rose-100" },
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
  critical: "border-rose-500/45 bg-rose-500/10 shadow-[0_0_24px_rgba(244,63,94,0.12)]",
  warning: "border-amber-500/35 bg-amber-500/10 shadow-[0_0_24px_rgba(245,158,11,0.08)]",
  info: "border-white/10 bg-white/5",
};

const SEVERITY_ICON_STYLES = {
  critical: "text-rose-400",
  warning: "text-amber-400",
  info: "text-sky-300",
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

interface GrantPreview {
  id: string;
  slug: string;
  type: string;
  title: string;
  issuer: string;
  deadline: string | null;
  value: number | null;
}

interface AgencyCRMDashboardProps {
  clients: AgencyClient[];
  bidsByCompany: Record<string, { total: number; won: number; active: number }>;
  docsByCompany: Record<string, number>;
  alertsByCompany: Record<string, AgencyAlert[]>;
  grants?: GrantPreview[];
}

export function AgencyCRMDashboard({
  clients,
  bidsByCompany,
  docsByCompany,
  alertsByCompany,
  grants = [],
}: AgencyCRMDashboardProps) {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const router = useRouter();

  const filtered = clients.filter((client) => {
    const name = client.companies?.name?.toLowerCase() ?? "";
    const jib = client.companies?.jib ?? "";
    const matchesSearch = !search || name.includes(search.toLowerCase()) || jib.includes(search);
    const matchesStage = !stageFilter || client.crm_stage === stageFilter;
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
  allAlerts.sort((left, right) => severityOrder[left.severity] - severityOrder[right.severity]);

  const criticalCount = allAlerts.filter((alert) => alert.severity === "critical").length;
  const warningCount = allAlerts.filter((alert) => alert.severity === "warning").length;
  const activeClientsCount = clients.filter((client) => client.crm_stage === "active").length;
  const onboardingClientsCount = clients.filter((client) => client.crm_stage === "onboarding").length;
  const totalMonthlyFees = clients.reduce((sum, client) => sum + (client.monthly_fee ?? 0), 0);
  const totalActiveBids = clients.reduce((sum, client) => {
    const companyId = client.companies?.id;
    return sum + (companyId ? bidsByCompany[companyId]?.active ?? 0 : 0);
  }, 0);

  const spotlightClients = filtered
    .map((client) => {
      const company = client.companies;
      const companyId = company?.id ?? "";
      const clientAlerts = companyId ? alertsByCompany[companyId] ?? [] : [];
      const criticalAlerts = clientAlerts.filter((alert) => alert.severity === "critical").length;
      const warningAlerts = clientAlerts.filter((alert) => alert.severity === "warning").length;
      const bids = companyId ? bidsByCompany[companyId] : undefined;
      const docs = companyId ? docsByCompany[companyId] ?? 0 : 0;
      return {
        client,
        criticalAlerts,
        warningAlerts,
        activeBids: bids?.active ?? 0,
        wonBids: bids?.won ?? 0,
        docs,
      };
    })
    .sort((left, right) => {
      if (right.criticalAlerts !== left.criticalAlerts) return right.criticalAlerts - left.criticalAlerts;
      if (right.activeBids !== left.activeBids) return right.activeBids - left.activeBids;
      return right.warningAlerts - left.warningAlerts;
    });

  return (
    <div className="mx-auto max-w-[1240px] space-y-6 xl:space-y-7">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_30%),linear-gradient(180deg,#111827_0%,#0f172a_58%,#0b1120_100%)] p-6 text-white shadow-[0_35px_90px_-45px_rgba(2,6,23,0.92)] sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:52px_52px] [mask-image:radial-gradient(circle_at_top_left,#000_18%,transparent_75%)]" />
        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_380px]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200">
                <Users className="size-3.5 text-sky-300" />
                Agencijski pregled
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="max-w-4xl font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[2.9rem]">
                Klijenti, upozorenja i važni zadaci na jednom mjestu.
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base lg:text-lg">
                Odmah vidite kome treba pažnja, gdje ima posla i kojeg klijenta vrijedi otvoriti prvo.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-5">
                <p className="text-sm font-medium text-slate-400">Aktivni klijenti</p>
                <p className="mt-2 font-heading text-3xl font-bold text-white">{activeClientsCount}</p>
                <p className="mt-2 text-sm text-slate-300">{onboardingClientsCount} u postavljanju</p>
              </div>
              <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-5">
                <p className="text-sm font-medium text-slate-400">Hitna upozorenja</p>
                <p className="mt-2 font-heading text-3xl font-bold text-white">{criticalCount}</p>
                <p className="mt-2 text-sm text-slate-300">{warningCount} dodatnih upozorenja</p>
              </div>
              <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-5">
              <p className="text-sm font-medium text-slate-400">Aktivne ponude</p>
              <p className="mt-2 font-heading text-3xl font-bold text-white">{totalActiveBids}</p>
              <p className="mt-2 text-sm text-slate-300">Ukupno preko svih klijenata</p>
              </div>
              <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-5">
              <p className="text-sm font-medium text-slate-400">Mjesečni iznos</p>
                <p className="mt-2 font-heading text-3xl font-bold text-white">{formatCurrency(totalMonthlyFees)}</p>
                <p className="mt-2 text-sm text-slate-300">{clients.length} ukupno klijenata</p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Brza akcija</p>
            <h2 className="mt-3 font-heading text-2xl font-bold text-white">Dodajte novog klijenta bez izlaska iz pregleda</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Novi klijent odmah dobija svoj pregled sa tenderima, ponudama, dokumentima i važnim obavijestima.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-6 inline-flex h-11 w-full items-center justify-between rounded-xl bg-white px-4 text-sm font-semibold text-slate-950 transition-all hover:bg-slate-100"
            >
              Dodaj klijenta
              <Plus className="size-4" />
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-[1.85rem] border border-slate-800 bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)] p-6 text-white shadow-[0_28px_65px_-42px_rgba(2,6,23,0.88)] lg:p-7">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Kontrola</p>
              <h2 className="mt-2 font-heading text-2xl font-bold text-white">Važna upozorenja</h2>
            </div>
            <Bell className="size-5 text-sky-300" />
          </div>
          <div className="mt-6 space-y-3">
            {allAlerts.length > 0 ? (
              allAlerts.slice(0, 6).map((alert, index) => {
                const typeConfig = ALERT_TYPE_CONFIG[alert.type];
                const Icon = typeConfig.icon;
                return (
                  <Link
                    key={`${alert.type}-${alert.bidId ?? alert.clientId ?? index}`}
                    href={alert.href}
                    className={`flex items-center gap-3.5 rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:bg-white/8 ${SEVERITY_STYLES[alert.severity]}`}
                  >
                    <Icon className={`size-5 shrink-0 ${SEVERITY_ICON_STYLES[alert.severity]}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {alert.companyName} · {typeConfig.label}
                      </p>
                      <p className="mt-1 text-[15px] font-semibold text-white">{alert.label}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">{alert.detail}</p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-slate-500" />
                  </Link>
                );
              })
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm leading-6 text-slate-300">
                Trenutno nema hitnih upozorenja. Ovdje će se pojaviti samo ono što traži reakciju.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[1.85rem] border border-slate-800 bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)] p-6 text-white shadow-[0_28px_65px_-42px_rgba(2,6,23,0.88)] lg:p-7">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Poticaji</p>
              <h2 className="mt-2 font-heading text-2xl font-bold text-white">Vrijedi otvoriti</h2>
            </div>
            <Sparkles className="size-5 text-emerald-300" />
          </div>
          <div className="mt-6 space-y-3">
            {grants.length > 0 ? (
              grants.map((grant) => {
                const slug = grant.slug.split("/").pop() ?? grant.slug;
                const daysLeft = grant.deadline
                  ? Math.ceil((new Date(grant.deadline).getTime() - GRANT_PREVIEW_REFERENCE_TIME) / DAY_IN_MS)
                  : null;
                const rowTone = daysLeft !== null && daysLeft <= 7
                  ? "border-rose-500/40 bg-rose-500/10"
                  : "border-white/10 bg-white/5";

                return (
                  <Link
                    key={grant.id}
                    href={`/prilike/${slug}`}
                    className={`block rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:bg-white/8 ${rowTone}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-[15px] font-semibold leading-6 text-white">{grant.title}</p>
                        <p className="mt-1 text-xs text-slate-400">{grant.issuer}</p>
                      </div>
                      <ArrowUpRight className="size-4 shrink-0 text-slate-500" />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                      {grant.deadline ? (
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-medium">
                          Rok {daysLeft !== null && daysLeft > 0 ? `${daysLeft} dana` : "uskoro"}
                        </span>
                      ) : null}
                      {grant.value ? (
                        <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 font-semibold text-emerald-200">
                          {formatCurrency(grant.value)}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm leading-6 text-slate-300">
                Trenutno nema objavljenih grantova. Čim se pojave nove prilike, vidjet ćete ih ovdje.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-[1.85rem] border border-slate-800 bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)] p-6 text-white shadow-[0_28px_65px_-42px_rgba(2,6,23,0.88)] lg:p-7">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Klijenti</p>
            <h2 className="mt-2 font-heading text-2xl font-bold text-white">Pregled klijenata</h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-[260px] flex-1">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Pretraži po imenu ili JIB-u"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-11 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-sky-400/40 focus:outline-none focus:ring-2 focus:ring-sky-400/15"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {([null, "lead", "onboarding", "active", "paused", "churned"] as const).map((stage) => (
                <button
                  key={stage ?? "all"}
                  onClick={() => setStageFilter(stage)}
                  className={`h-10 rounded-xl px-3.5 text-xs font-semibold transition-all ${
                    stageFilter === stage
                      ? "bg-white text-slate-950"
                      : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {stage === null ? "Svi" : CRM_STAGE_CONFIG[stage].label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {spotlightClients.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.03] py-16 text-center mt-6">
            <Users className="mx-auto mb-4 size-12 text-slate-500" />
            <p className="font-semibold text-white">{clients.length === 0 ? "Još nema klijenata" : "Nema rezultata pretrage"}</p>
            <p className="mt-2 text-sm text-slate-400">
              {clients.length === 0 ? "Dodajte prvog klijenta da otvorite agencijski pregled." : "Pokušajte drugu pretragu ili filter."}
            </p>
            {clients.length === 0 ? (
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-slate-950"
              >
                <Plus className="size-4" />
                Dodaj klijenta
              </button>
            ) : null}
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {spotlightClients.map(({ client, criticalAlerts, warningAlerts, activeBids, wonBids, docs }) => {
              const company = client.companies;
              if (!company) return null;
              const stageConfig = CRM_STAGE_CONFIG[client.crm_stage] ?? CRM_STAGE_CONFIG.active;
              const regions = company.operating_regions?.slice(0, 2).join(" · ");

              return (
                <Link
                  key={client.id}
                  href={`/dashboard/agency/clients/${client.id}`}
                  className="group block rounded-[1.4rem] border border-white/10 bg-white/5 p-5 transition-all hover:-translate-y-0.5 hover:bg-white/8"
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-100">
                        <Building2 className="size-5" />
                        {criticalAlerts > 0 ? (
                          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                            {criticalAlerts}
                          </span>
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-lg font-semibold text-white transition-colors group-hover:text-sky-200">
                            {company.name}
                          </p>
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${stageConfig.tone}`}>
                            {stageConfig.label}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          <span>JIB: {company.jib}</span>
                          {company.contact_email ? <span>{company.contact_email}</span> : null}
                          {regions ? <span>{regions}</span> : null}
                        </div>
                        {client.monthly_fee ? (
                          <p className="mt-2 text-sm font-semibold text-emerald-200">
                            {formatCurrency(client.monthly_fee)} / mj.
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl border border-white/10 bg-black/10 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Ponude</p>
                        <p className="mt-1 text-sm font-semibold text-white">{activeBids} aktivnih</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/10 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Ishod</p>
                        <p className="mt-1 text-sm font-semibold text-white">{wonBids} dobijeno</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/10 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Dokumenti</p>
                        <p className="mt-1 text-sm font-semibold text-white">{docs}</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/10 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Stanje</p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {criticalAlerts > 0 ? `${criticalAlerts} hitno` : warningAlerts > 0 ? `${warningAlerts} upozorenja` : "Stabilno"}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {showAddModal ? (
        <AddClientModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
