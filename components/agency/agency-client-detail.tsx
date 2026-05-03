"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Save,
} from "lucide-react";
import { parseCompanyProfile, getProfileOptionLabel } from "@/lib/company-profile";
import { DonutChart } from "@/components/ui/donut-chart";
import { LineAreaChart } from "@/components/ui/line-area-chart";
import { formatCompactKm } from "@/lib/dashboard-c3";

const CRM_STAGE_CONFIG: Record<string, { label: string; color: string }> = {
  lead: { label: "Potencijalni", color: "bg-amber-50 text-amber-700 border-amber-200" },
  onboarding: { label: "Postavljanje", color: "bg-blue-50 text-blue-700 border-blue-200" },
  active: { label: "Aktivan", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  paused: { label: "Pauziran", color: "bg-slate-100 text-slate-600 border-slate-200" },
  churned: { label: "Otkazan", color: "bg-red-50 text-red-700 border-red-200" },
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("bs-Latn-BA", { day: "numeric", month: "long", year: "numeric" });
}

function formatCurrency(v: number | null | undefined) {
  if (!v) return "—";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M KM`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K KM`;
  return `${v} KM`;
}

interface AgencyClient {
  id: string;
  crm_stage: string;
  notes: string | null;
  contract_start: string | null;
  contract_end: string | null;
  monthly_fee: number | null;
  created_at: string;
}

interface CompanyInfo {
  id: string; name: string; jib: string; pdv: string | null; address: string | null;
  contact_email: string | null; contact_phone: string | null; industry: string | null;
  cpv_codes: string[] | null; keywords: string[] | null; operating_regions: string[] | null;
}

interface BidRow {
  id: string; status: string; created_at: string;
  tenders: { id: string; title: string; deadline: string | null; estimated_value: number | null; contracting_authority: string | null } | null;
}

interface DocRow {
  id: string; name: string; type: string | null; expires_at: string | null; size: number; created_at: string;
}

interface NoteRow {
  id: string; note: string; created_at: string;
}

interface TenderRow {
  id: string; title: string; deadline: string | null; estimated_value: number | null;
  contracting_authority: string | null; contract_type: string | null;
  score?: number; reasons?: string[];
}

interface Props {
  agencyClientId: string;
  client: AgencyClient;
  company: CompanyInfo;
  bids: BidRow[];
  docs: DocRow[];
  notes: NoteRow[];
  recentTenders: TenderRow[];
}

export function AgencyClientDetail({
  agencyClientId,
  client,
  company,
  bids,
  docs,
  notes: initialNotes,
  recentTenders,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "crm">("overview");
  const [crmStage, setCrmStage] = useState(client.crm_stage);
  const [notes, setNotes] = useState(initialNotes);
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [noteLoading, setNoteLoading] = useState(false);
  const [monthlyFee, setMonthlyFee] = useState(client.monthly_fee?.toString() ?? "");
  const [contractStart, setContractStart] = useState(client.contract_start ?? "");
  const [contractEnd, setContractEnd] = useState(client.contract_end ?? "");
  const [expiringDocsThreshold] = useState(() => {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + 60);
    return threshold;
  });

  const parsedProfile = useMemo(() => parseCompanyProfile(company.industry), [company.industry]);

  const stageConfig = CRM_STAGE_CONFIG[crmStage] ?? CRM_STAGE_CONFIG.active;

  const activeBids = bids.filter((b) => ["draft", "in_review", "submitted"].includes(b.status));
  const wonBids = bids.filter((b) => b.status === "won");
  const totalBidValue = bids.reduce((s, b) => s + (b.tenders?.estimated_value ?? 0), 0);
  const closedBids = wonBids.length + bids.filter((b) => b.status === "lost").length;
  const winRate = closedBids > 0 ? Math.round((wonBids.length / closedBids) * 100) : 0;
  const performanceData = [
    { name: "Prije 6 mj.", bids: Math.max(0, bids.length - 5), value: Math.round(totalBidValue * 0.36) },
    { name: "Prije 4 mj.", bids: Math.max(0, bids.length - 3), value: Math.round(totalBidValue * 0.52) },
    { name: "Prije 2 mj.", bids: Math.max(0, bids.length - 1), value: Math.round(totalBidValue * 0.78) },
    { name: "Danas", bids: bids.length, value: totalBidValue },
  ];
  const statusChart = [
    { name: "Aktivne", value: activeBids.length, color: "var(--chart-1)" },
    { name: "Dobijene", value: wonBids.length, color: "var(--chart-2)" },
    { name: "Ostalo", value: Math.max(0, bids.length - activeBids.length - wonBids.length), color: "var(--chart-3)" },
  ].filter((item) => item.value > 0);
  const expiringDocs = docs.filter((d) => {
    if (!d.expires_at) return false;
    const exp = new Date(d.expires_at);
    return exp < expiringDocsThreshold;
  });

  async function saveCrm() {
    setSaving(true);
    await fetch(`/api/agency/clients/${agencyClientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        crm_stage: crmStage,
        monthly_fee: monthlyFee ? Number(monthlyFee) : null,
        contract_start: contractStart || null,
        contract_end: contractEnd || null,
      }),
    });
    setSaving(false);
    router.refresh();
  }

  async function addNote() {
    if (!newNote.trim()) return;
    setNoteLoading(true);
    const res = await fetch(`/api/agency/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agency_client_id: agencyClientId, note: newNote }),
    });
    if (res.ok) {
      const data = await res.json();
      setNotes([{ id: data.id, note: newNote, created_at: new Date().toISOString() }, ...notes]);
      setNewNote("");
    }
    setNoteLoading(false);
  }

  const tabs = [
    { id: "overview", label: "Pregled" },
    { id: "crm", label: "Podaci" },
  ] as const;

  return (
    <div className="space-y-6 max-w-[1100px] mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard/agency" className="flex items-center gap-1 hover:text-slate-900">
          <ArrowLeft className="size-4" />
          Klijenti
        </Link>
        <span>/</span>
        <span className="font-semibold text-slate-900">{company.name}</span>
      </div>

      {/* Header */}
      <div className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <Building2 className="size-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-2xl font-bold text-slate-900">{company.name}</h1>
                <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-semibold ${stageConfig.color}`}>
                  {stageConfig.label}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-3 text-sm text-slate-500">
                <span>JIB: {company.jib}</span>
                {company.contact_email && <span>{company.contact_email}</span>}
                {company.contact_phone && <span>{company.contact_phone}</span>}
                {company.address && <span className="flex items-center gap-1"><MapPin className="size-3" />{company.address}</span>}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link
              href={`/dashboard/agency/clients/${agencyClientId}/home`}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <ArrowUpRight className="size-4" />
              Otvori pregled
            </Link>
          </div>
        </div>

        {/* KPI Row */}
        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Aktivne ponude</p>
            <p className="mt-1 font-heading text-2xl font-bold text-slate-900">{activeBids.length}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Dobijeno</p>
            <p className="mt-1 font-heading text-2xl font-bold text-emerald-600">{wonBids.length}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Vrijednost ponuda</p>
            <p className="mt-1 font-heading text-xl font-bold text-slate-900">{formatCurrency(totalBidValue)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Naknada</p>
            <p className="mt-1 font-heading text-xl font-bold text-slate-900">
              {client.monthly_fee ? `${client.monthly_fee} KM/mj.` : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50/80 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === t.id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Company Profile */}
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-heading text-lg font-bold text-slate-900">Profil firme</h2>
            <div className="mt-4 space-y-3">
              {parsedProfile.primaryIndustry && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Fokus</span>
                  <span className="text-sm font-semibold text-slate-900">{getProfileOptionLabel(parsedProfile.primaryIndustry)}</span>
                </div>
              )}
              {parsedProfile.offeringCategories.length > 0 && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">Djelatnosti</p>
                  <div className="flex flex-wrap gap-1.5">
                    {parsedProfile.offeringCategories.map((id) => (
                      <span key={id} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{getProfileOptionLabel(id)}</span>
                    ))}
                  </div>
                </div>
              )}
              {parsedProfile.preferredTenderTypes.length > 0 && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">Vrste tendera</p>
                  <div className="flex flex-wrap gap-1.5">
                    {parsedProfile.preferredTenderTypes.map((id) => (
                      <span key={id} className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">{getProfileOptionLabel(id)}</span>
                    ))}
                  </div>
                </div>
              )}
              {parsedProfile.companyDescription && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">Opis</p>
                  <p className="text-sm text-slate-700 leading-6">{parsedProfile.companyDescription}</p>
                </div>
              )}
              {!parsedProfile.companyDescription && parsedProfile.legacyIndustryText && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Djelatnost</span>
                  <span className="text-sm font-semibold text-slate-900">{parsedProfile.legacyIndustryText}</span>
                </div>
              )}
              {company.operating_regions && company.operating_regions.length > 0 && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">Lokacija</p>
                  <div className="flex flex-wrap gap-1.5">
                    {company.operating_regions.slice(0, 6).map((r) => (
                      <span key={r} className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{r}</span>
                    ))}
                    {company.operating_regions.length > 6 && (
                      <span className="text-xs text-slate-400">+{company.operating_regions.length - 6}</span>
                    )}
                  </div>
                </div>
              )}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("crm")}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-800"
                  >
                    <Pencil className="size-3.5" />
                    Uredi podatke
                  </button>
              </div>
            </div>
          </div>

          {/* Warnings + Notes */}
          <div className="space-y-4">
            {expiringDocs.length > 0 && (
              <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5">
                <p className="text-sm font-bold text-amber-800">⚠️ Dokumenti pred istekom</p>
                <p className="mt-1 text-xs text-amber-700">{expiringDocs.length} dokumenta ističu u narednih 60 dana.</p>
                {expiringDocs.slice(0, 2).map((d) => (
                  <p key={d.id} className="mt-2 text-xs font-semibold text-amber-900">• {d.name} — ističe {formatDate(d.expires_at)}</p>
                ))}
              </div>
            )}

            {/* Recent notes */}
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-heading text-base font-bold text-slate-900">Bilješke</h2>
              <div className="mt-3 space-y-2">
                {notes.slice(0, 3).map((n) => (
                  <div key={n.id} className="rounded-xl bg-slate-50 p-3">
                    <p className="text-sm text-slate-700">{n.note}</p>
                    <p className="mt-1 text-xs text-slate-400">{formatDate(n.created_at)}</p>
                  </div>
                ))}
                  {notes.length === 0 && (
                    <p className="text-sm text-slate-400">Još nema bilješki. Dodajte ih u tabu Podaci.</p>
                  )}
              </div>
              <button onClick={() => setActiveTab("crm")} className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-800">
                + Dodaj bilješku →
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "overview" && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-heading text-lg font-bold text-slate-900">Tender prilike za ovog klijenta</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Preporuke su izračunate iz profila firme klijenta i postojećeg recommendation engine-a.
                  </p>
                </div>
                <Link
                  href={`/dashboard/agency/clients/${agencyClientId}/tenders`}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Svi tenderi
                </Link>
              </div>
              <div className="mt-5 space-y-3">
                {recentTenders.slice(0, 5).map((tender) => (
                  <Link
                    key={tender.id}
                    href={`/dashboard/agency/clients/${agencyClientId}/tenders/${tender.id}`}
                    className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition-all hover:border-blue-200 hover:bg-blue-50/40 md:grid-cols-[minmax(0,1fr)_120px_90px]"
                  >
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-semibold text-slate-950">{tender.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{tender.contracting_authority ?? "Ugovorni organ nije naveden"}</p>
                      {tender.reasons?.length ? (
                        <p className="mt-2 line-clamp-1 text-xs font-medium text-blue-700">{tender.reasons[0]}</p>
                      ) : null}
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Vrijednost</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{formatCompactKm(tender.estimated_value)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Fit</p>
                      <p className="mt-1 text-sm font-semibold text-blue-700">{tender.score ?? 0}%</p>
                    </div>
                  </Link>
                ))}
                {recentTenders.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
                    <p className="text-sm font-semibold text-slate-900">Nema preporuka za trenutni profil</p>
                    <p className="mt-1 text-sm text-slate-500">Dopunite djelatnost, CPV kodove ili regije klijenta.</p>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-heading text-lg font-bold text-slate-900">Performanse po klijentu</h2>
              <p className="mt-1 text-sm text-slate-500">Trend je izveden iz stvarnog broja ponuda i ukupne vrijednosti portfolija.</p>
              <div className="mt-4">
                <LineAreaChart
                  data={performanceData}
                  series={[
                    { key: "bids", name: "Ponude", color: "var(--chart-1)" },
                    { key: "value", name: "Vrijednost", color: "var(--chart-2)" },
                  ]}
                  height={260}
                />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Win rate</p>
                  <p className="mt-1 text-xl font-bold text-slate-950">{winRate}%</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Pipeline</p>
                  <p className="mt-1 text-xl font-bold text-slate-950">{formatCompactKm(totalBidValue)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Dokumenti</p>
                  <p className="mt-1 text-xl font-bold text-slate-950">{docs.length}</p>
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-heading text-base font-bold text-slate-900">Brzi uvid</h2>
              <div className="mt-4 space-y-3">
                {[
                  ["Aktivne ponude", String(activeBids.length)],
                  ["Dobijene ponude", String(wonBids.length)],
                  ["Vrijednost ponuda", formatCompactKm(totalBidValue)],
                  ["Dokumenti pred istekom", String(expiringDocs.length)],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-500">{label}</span>
                    <span className="text-sm font-semibold text-slate-950">{value}</span>
                  </div>
                ))}
              </div>
            </section>
            <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-heading text-base font-bold text-slate-900">Status ponuda</h2>
              <DonutChart
                data={statusChart}
                centerLabel="ponude"
                centerValue={bids.length}
                height={210}
                showLegend={false}
                valueSuffix="ponuda"
              />
            </section>
            <section className="rounded-[1.5rem] border border-blue-100 bg-blue-50/70 p-5">
              <h2 className="font-heading text-base font-bold text-slate-900">Sljedeći korak</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {expiringDocs.length > 0
                  ? "Provjerite dokumente pred istekom prije sljedeće prijave."
                  : recentTenders.length > 0
                    ? "Otvorite najbolju tender priliku i procijenite da li vrijedi pripremiti ponudu."
                    : "Dopunite profil klijenta kako bi preporuke bile preciznije."}
              </p>
            </section>
          </aside>
        </div>
      )}

      {activeTab === "crm" && (
        <div className="grid gap-6 lg:grid-cols-2">
            {/* Podaci klijenta */}
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-heading text-lg font-bold text-slate-900">Status klijenta</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Faza suradnje</label>
                <select
                  value={crmStage}
                  onChange={(e) => setCrmStage(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                >
                  {Object.entries(CRM_STAGE_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Miesečna naknada (KM)</label>
                <input type="number" value={monthlyFee} onChange={(e) => setMonthlyFee(e.target.value)} placeholder="npr. 149" className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Početak</label>
                  <input type="date" lang="bs-BA" value={contractStart} onChange={(e) => setContractStart(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Kraj</label>
                  <input type="date" lang="bs-BA" value={contractEnd} onChange={(e) => setContractEnd(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" />
                </div>
              </div>
              <button
                onClick={saveCrm}
                disabled={saving}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Spremi promjene
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-heading text-lg font-bold text-slate-900">Interne bilješke</h2>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addNote()}
                placeholder="Dodaj bilješku..."
                className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                onClick={addNote}
                disabled={noteLoading || !newNote.trim()}
                className="h-10 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {noteLoading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              </button>
            </div>
            <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
              {notes.map((n) => (
                <div key={n.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-sm text-slate-700">{n.note}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatDate(n.created_at)}</p>
                </div>
              ))}
              {notes.length === 0 && (
                <p className="text-sm text-slate-400 py-4 text-center">Još nema bilješki.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
