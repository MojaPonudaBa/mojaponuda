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

function SummaryCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <Card className="border-slate-200/80 bg-white shadow-[0_18px_50px_-34px_rgba(15,23,42,0.28)]">
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
    <Card className="overflow-hidden border-slate-200/80 bg-white shadow-[0_20px_45px_-34px_rgba(15,23,42,0.22)]">
      <CardContent className="space-y-4 p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] xl:items-start">
          <div className="min-w-0 space-y-2">
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
              <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                score {lead.score}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
              <span>JIB: {lead.jib}</span>
              <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{lead.city ?? lead.municipality ?? "Lokacija nije dostupna"}</span>
              <span className="inline-flex items-center gap-1"><Building2 className="size-3.5" />{lead.mainAuthorityName ?? "Nema dominantnog naručioca"}</span>
            </div>
            <p className="text-sm leading-6 text-slate-600">{lead.reasons[0] ?? lead.recommendedAction}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
              <span>Zadnji kontakt: {formatDateTime(lead.lastContactedAt)}</span>
              <span>Bilješka ažurirana: {formatDateTime(lead.noteUpdatedAt)}</span>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Pobjede</p>
              <p className="mt-1 text-lg font-semibold text-slate-950">{lead.totalWinsCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Vrijednost</p>
              <p className="mt-1 text-lg font-semibold text-slate-950">{formatCurrency(lead.totalWonValue)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Zadnja aktivnost</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">{formatDateTime(lead.lastAwardDate)}</p>
            </div>
            <Button type="button" variant="outline" className="h-full min-h-[76px] rounded-2xl border-slate-200 bg-white px-4 py-3 text-sm font-medium" onClick={() => setExpanded((current) => !current)}>
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
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Zašto je lead zanimljiv</p>
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
                  <p className="mt-1 text-sm text-slate-600">Prikaz samo kvalitetno povezanih pobjeda iz javnih podataka.</p>
                </div>
                <Badge variant="outline" className="rounded-full border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                  {lead.recentWins.length} prikazano
                </Badge>
              </div>

              {lead.recentWins.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">
                  Nema dovoljno kvalitetnih i povezanih tender pobjeda u trenutno dostupnom periodu.
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
                Jednostavna lead lista za dnevni outreach
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Samo ono što trebaš za prodaju: ko je lead, zašto je zanimljiv, koji mu je status i koje su tvoje bilješke. Bez pipeline komplikacije.
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm text-slate-200">
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Admin račun</p>
            <p className="mt-2 font-semibold text-white">{adminEmail}</p>
            <p className="mt-1 text-xs text-slate-400">Ukupno leadova: {leads.length}</p>
          </div>
        </div>
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
