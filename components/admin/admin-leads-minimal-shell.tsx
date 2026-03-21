"use client";

import { useMemo, useState } from "react";
import { Building2, ChevronDown, ChevronUp, ExternalLink, Landmark, MapPin, Save, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { AdminLeadOutreachStatus, AdminPortalLead, AdminPortalLeadsData } from "@/lib/admin-portal-leads";
import { cn } from "@/lib/utils";

interface AdminLeadsMinimalShellProps {
  data: AdminPortalLeadsData;
  adminEmail: string;
}

const statusOptions: Array<{ value: AdminLeadOutreachStatus | "all"; label: string }> = [
  { value: "all", label: "Svi" },
  { value: "new", label: "Novi" },
  { value: "contacted", label: "Kontaktiran" },
  { value: "converted", label: "Konvertovan" },
  { value: "dead", label: "Mrtav" },
];

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("bs-BA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("bs-BA", {
    style: "currency",
    currency: "BAM",
    maximumFractionDigits: 0,
  }).format(value);
}

function getStatusTone(status: AdminLeadOutreachStatus): string {
  switch (status) {
    case "contacted":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "converted":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "dead":
      return "border-slate-200 bg-slate-50 text-slate-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function getStatusLabel(status: AdminLeadOutreachStatus): string {
  switch (status) {
    case "contacted":
      return "Kontaktiran";
    case "converted":
      return "Konvertovan";
    case "dead":
      return "Mrtav";
    default:
      return "Novi";
  }
}

function getTemperatureTone(temperature: AdminPortalLead["temperature"]): string {
  switch (temperature) {
    case "Vruć lead":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "Dobar lead":
      return "border-blue-200 bg-blue-50 text-blue-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function SummaryCard({
  title,
  value,
  hint,
  tone = "default",
}: {
  title: string;
  value: string;
  hint: string;
  tone?: "default" | "emerald" | "blue" | "amber";
}) {
  const toneClasses = {
    default: "border-slate-200/80 bg-white",
    emerald: "border-emerald-200/80 bg-emerald-50/70",
    blue: "border-blue-200/80 bg-blue-50/70",
    amber: "border-amber-200/80 bg-amber-50/70",
  };

  return (
    <Card className={cn("shadow-[0_18px_50px_-34px_rgba(15,23,42,0.28)]", toneClasses[tone])}>
      <CardHeader className="pb-3">
        <CardDescription className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</CardDescription>
        <CardTitle className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-slate-600">{hint}</p>
      </CardContent>
    </Card>
  );
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("bs-BA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function LeadSignalCard({
  title,
  value,
  hint,
  tone = "default",
}: {
  title: string;
  value: string;
  hint: string;
  tone?: "default" | "emerald" | "blue" | "amber";
}) {
  const toneClasses = {
    default: "border-slate-200 bg-slate-50 text-slate-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    blue: "border-blue-200 bg-blue-50 text-blue-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
  };

  return (
    <div className={cn("min-w-0 rounded-2xl border px-3 py-3 text-sm", toneClasses[tone])}>
      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <p className="mt-1 break-words text-lg font-semibold leading-tight text-slate-950">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-600">{hint}</p>
    </div>
  );
}

function LeadRow({ lead, onSaved }: { lead: AdminPortalLead; onSaved: (lead: AdminPortalLead) => void }) {
  const [status, setStatus] = useState<AdminLeadOutreachStatus>(lead.outreachStatus);
  const [note, setNote] = useState(lead.note);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/portal-leads/${encodeURIComponent(lead.jib)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadName: lead.companyName,
          note,
          status,
          lastContactedAt: status === "contacted" && !lead.lastContactedAt ? new Date().toISOString() : lead.lastContactedAt,
          nextFollowUpAt: lead.nextFollowUpAt,
        }),
      });

      const payload = (await response.json()) as { lead?: AdminPortalLead; error?: string };
      if (!response.ok || !payload.lead) {
        throw new Error(payload.error ?? "Ne mogu sačuvati lead.");
      }

      onSaved(payload.lead);
      setMessage("Sačuvano");
      setTimeout(() => setMessage(null), 1500);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Greška pri snimanju.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card
      className={cn(
        "overflow-hidden bg-white shadow-[0_20px_45px_-34px_rgba(15,23,42,0.22)]",
        lead.temperature === "Vruć lead"
          ? "border-emerald-200/80"
          : lead.temperature === "Dobar lead"
            ? "border-blue-200/80"
            : "border-slate-200/80"
      )}
    >
      <CardContent className="space-y-4 p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] xl:items-start">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setExpanded((current) => !current)}
                className="inline-flex items-center gap-2 text-left text-lg font-semibold text-slate-950 transition hover:text-blue-700"
              >
                <span>{lead.companyName}</span>
                {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </button>
              <Badge variant="outline" className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold", getStatusTone(status))}>
                {getStatusLabel(status)}
              </Badge>
              <Badge variant="outline" className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold", getTemperatureTone(lead.temperature))}>
                {lead.temperature}
              </Badge>
              <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                score {lead.score}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
              <span>JIB: {lead.jib}</span>
              <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{lead.city ?? lead.municipality ?? "Lokacija nije dostupna"}</span>
              <span className="inline-flex items-center gap-1"><Building2 className="size-3.5" />{lead.mainAuthorityName ?? "Nema dominantnog naručioca"}</span>
            </div>
            <div
              className={cn(
                "rounded-2xl border px-4 py-3",
                lead.temperature === "Vruć lead"
                  ? "border-emerald-200 bg-emerald-50/70"
                  : lead.temperature === "Dobar lead"
                    ? "border-blue-200 bg-blue-50/70"
                    : "border-slate-200 bg-slate-50/70"
              )}
            >
              <p className="text-sm font-medium leading-6 text-slate-900">{lead.rationale}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{lead.reasons[0] ?? lead.recommendedAction}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Preporučeni pristup</p>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-900">{lead.recommendedAction}</p>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
              <span>Zadnji kontakt: {formatDateTime(lead.lastContactedAt)}</span>
              <span>Bilješka ažurirana: {formatDateTime(lead.noteUpdatedAt)}</span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <LeadSignalCard
              title="Potvrđene pobjede"
              value={String(lead.totalWinsCount)}
              hint="Broj pobjeda koje možemo povezati sa konkretnim portal dodjelama."
              tone="emerald"
            />
            <LeadSignalCard
              title="Vrijednost pobjeda"
              value={formatCurrency(lead.totalWonValue)}
              hint="Zbir potvrđenih vrijednosti iz dostupnih javnih dodjela."
              tone="emerald"
            />
            <LeadSignalCard
              title="Svježa aktivnost"
              value={lead.recentAwards180d > 0 ? `${lead.recentAwards180d} u 180 dana` : "Nema svježih"}
              hint={lead.lastAwardDate ? `Zadnja potvrđena pobjeda: ${formatDate(lead.lastAwardDate)}` : "Nema novije potvrđene pobjede u prikazanom periodu."}
              tone="amber"
            />
            <LeadSignalCard
              title="Pipeline naručioca"
              value={lead.authorityPlannedCount90d > 0 ? String(lead.authorityPlannedCount90d) : "Za sada nema"}
              hint={
                lead.authorityPlannedCount90d > 0
                  ? `${lead.mainAuthorityName ?? "Dominantni naručilac"} ima novi planirani pipeline u narednih 90 dana.`
                  : "Kod dominantnog naručioca trenutno ne vidimo novi planirani pipeline."
              }
              tone="blue"
            />
            <Button type="button" variant="outline" className="h-full min-h-[76px] rounded-2xl border-slate-200 bg-white px-3 py-3 text-sm font-medium sm:col-span-2 xl:col-span-1" onClick={() => setExpanded((current) => !current)}>
              {expanded ? "Sakrij profil" : "Otvori profil firme"}
            </Button>
          </div>
        </div>

        {expanded ? (
          <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Profil firme</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Firma</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">{lead.companyName}</p>
                    <p className="mt-1 text-xs text-slate-500">JIB: {lead.jib}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Lokacija</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">{lead.city ?? lead.municipality ?? "Nije dostupna"}</p>
                    <p className="mt-1 text-xs text-slate-500">Portal ID: {lead.portalCompanyId ?? "—"}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Dominantni naručilac</p>
                    <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-slate-950"><Landmark className="size-4 text-slate-500" />{lead.mainAuthorityName ?? "Nije prepoznat"}</p>
                    <p className="mt-1 text-xs text-slate-500">{lead.mainAuthorityLocation ?? "Lokacija nije dostupna"}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Tip postupka</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">{lead.lastProcedureType ?? "—"}</p>
                    <p className="mt-1 text-xs text-slate-500">{lead.lastContractType ?? "Tip ugovora nije dostupan"}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Zadnja potvrđena pobjeda</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">{formatDate(lead.lastAwardDate)}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {lead.lastWinningPrice !== null
                        ? `Vrijednost zadnje potvrđene pobjede: ${formatCurrency(lead.lastWinningPrice)}`
                        : "Vrijednost zadnje potvrđene pobjede nije dostupna."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Zašto je lead zanimljiv</p>
                <p className="mt-3 text-sm font-medium leading-6 text-slate-900">{lead.rationale}</p>
                <div className="mt-3 space-y-2 text-sm text-slate-700">
                  {lead.reasons.map((reason) => (
                    <p key={reason}>{reason}</p>
                  ))}
                </div>
                <p className="mt-4 text-sm font-medium text-slate-900">Preporuka: {lead.recommendedAction}</p>
              </div>
            </div>

            <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Dobijeni tenderi</p>
                  <p className="mt-1 text-sm text-slate-600">Prikaz svih potvrđenih pobjeda koje možemo povezati sa firmom i otvoriti iz dostupnih javnih podataka.</p>
                </div>
                <Badge variant="outline" className="rounded-full border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                  {lead.recentWins.length} / {lead.totalWinsCount} prikazano
                </Badge>
              </div>

              {lead.recentWins.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">
                  Za ovu firmu trenutno nemamo nijednu potvrđenu pobjedu koju možemo prikazati iz dostupnih portal podataka.
                </div>
              ) : (
                <div className="space-y-3">
                  {lead.recentWins.map((win) => (
                    <div key={win.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-950">{win.tenderTitle}</p>
                          <p className="mt-1 text-sm text-slate-600">{win.contractingAuthority ?? "Naručilac nije dostupan"}</p>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                            <span>Dodjela: {formatDate(win.awardDate)}</span>
                            <span>Postupak: {win.procedureType ?? "—"}</span>
                            <span>Ugovor: {win.contractType ?? "—"}</span>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                          <p className="text-sm font-semibold text-slate-950">{win.winningPrice ? formatCurrency(win.winningPrice) : "Vrijednost nije dostupna"}</p>
                          {win.portalUrl ? (
                            <a
                              href={win.portalUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 transition hover:text-blue-900"
                            >
                              Otvori tender
                              <ExternalLink className="size-3.5" />
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50/70 p-4 xl:grid-cols-[220px_1fr_132px] xl:items-start">
          <label className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as AdminLeadOutreachStatus)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            >
              {statusOptions.slice(1).map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Bilješke</span>
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={4}
              placeholder="Kratka bilješka: kako prići, šta reći, šta provjeriti..."
              className="min-h-[120px] rounded-2xl border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm"
            />
          </label>

          <div className="flex flex-col items-stretch gap-2 xl:self-end">
            <Button type="button" onClick={handleSave} disabled={saving} className="w-full">
              <Save className="size-4" />
              {saving ? "Snima..." : "Sačuvaj"}
            </Button>
            {message ? <span className="text-xs font-medium text-emerald-600">{message}</span> : null}
            {error ? <span className="text-xs font-medium text-rose-600">{error}</span> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminLeadsMinimalShell({ data, adminEmail }: AdminLeadsMinimalShellProps) {
  const [leads, setLeads] = useState(data.leads);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<AdminLeadOutreachStatus | "all">("all");

  const filteredLeads = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return leads.filter((lead) => {
      if (status !== "all" && lead.outreachStatus !== status) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [lead.companyName, lead.jib, lead.city, lead.municipality, lead.mainAuthorityName, lead.note, ...lead.reasons]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [leads, query, status]);

  function replaceLead(updatedLead: AdminPortalLead) {
    setLeads((current) => current.map((lead) => (lead.jib === updatedLead.jib ? updatedLead : lead)));
  }

  const counts = {
    new: leads.filter((lead) => lead.outreachStatus === "new").length,
    contacted: leads.filter((lead) => lead.outreachStatus === "contacted").length,
    converted: leads.filter((lead) => lead.outreachStatus === "converted").length,
    dead: leads.filter((lead) => lead.outreachStatus === "dead").length,
  };

  return (
    <div className="space-y-8 pb-4">
      <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-[linear-gradient(135deg,rgba(8,17,31,0.98)_0%,rgba(14,31,60,0.98)_50%,rgba(17,49,89,0.94)_100%)] p-8 text-white shadow-[0_45px_90px_-45px_rgba(2,6,23,0.88)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <Badge variant="outline" className="border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-100">
              Leads
            </Badge>
            <div className="space-y-3">
              <h1 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Projekcija najboljih potencijalnih klijenata za outreach
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Lista je rangirana samo po signalima koje možemo kvalitetno potvrditi iz portala javnih nabavki: stvarne dodjele, potvrđena vrijednost, svježina aktivnosti i naredni pipeline kod poznatih naručilaca.
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm text-slate-200">
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Procijenjeni potencijalni klijenti</p>
            <p className="mt-2 text-3xl font-semibold text-white">{data.totalCandidates}</p>
            <p className="mt-1 text-xs text-slate-400">Admin: {adminEmail}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Procijenjeni potencijalni klijenti" value={String(data.totalCandidates)} hint="Ukupan broj firmi koje su prošle filter zasnovan na potvrđenim portal signalima." tone="default" />
        <SummaryCard title="Vrući leadovi" value={String(leads.filter((lead) => lead.temperature === "Vruć lead").length)} hint="Najjači prioritet za prodajni kontakt." tone="emerald" />
        <SummaryCard title="Sa svježom aktivnošću" value={String(leads.filter((lead) => lead.recentAwards180d > 0).length)} hint="Firme sa bar jednom potvrđenom dodjelom u zadnjih 180 dana." tone="amber" />
        <SummaryCard title="Sa pipeline signalom" value={String(leads.filter((lead) => lead.authorityPlannedCount90d > 0).length)} hint="Firme čiji dominantni naručilac već ima nove planirane nabavke." tone="blue" />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Novi" value={String(counts.new)} hint="Leadovi bez obrade." />
        <SummaryCard title="Kontaktiran" value={String(counts.contacted)} hint="Javio si se i pratiš odgovor." />
        <SummaryCard title="Konvertovan" value={String(counts.converted)} hint="Leadovi koji su završili prodajom." />
        <SummaryCard title="Mrtav" value={String(counts.dead)} hint="Leadovi koje trenutno ne pratiš dalje." />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_24px_50px_-34px_rgba(15,23,42,0.24)]">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_260px]">
          <label className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Pretraga</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Firma, JIB, grad, razlog ili bilješka..."
                className="w-full rounded-2xl border border-slate-200 bg-white px-11 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
            </div>
          </label>
          <label className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as AdminLeadOutreachStatus | "all")}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="space-y-4">
        {filteredLeads.length === 0 ? (
          <Card className="border-dashed border-slate-200 bg-slate-50/70">
            <CardContent className="px-6 py-10 text-center text-sm text-slate-500">
              Nema leadova za odabrane filtere.
            </CardContent>
          </Card>
        ) : (
          filteredLeads.map((lead) => <LeadRow key={lead.jib} lead={lead} onSaved={replaceLead} />)
        )}
      </section>
    </div>
  );
}
