"use client";

import { useMemo, useState } from "react";
import type { Document } from "@/types/database";
import { DOCUMENT_TYPES, getExpiryStatus } from "@/lib/vault/constants";
import { DocumentCard } from "@/components/vault/document-card";
import {
  AlertTriangle,
  Database,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DocumentGridProps {
  documents: Document[];
}

export function DocumentGrid({ documents }: DocumentGridProps) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [expiryFilter, setExpiryFilter] = useState("all");

  const expiringDocs = useMemo(
    () => documents.filter((document) => getExpiryStatus(document.expires_at) === "danger"),
    [documents],
  );

  const filtered = useMemo(() => {
    return documents.filter((document) => {
      if (typeFilter !== "all" && document.type !== typeFilter) return false;

      if (expiryFilter !== "all") {
        const status = getExpiryStatus(document.expires_at);
        if (expiryFilter === "danger" && status !== "danger") return false;
        if (expiryFilter === "warning" && status !== "warning") return false;
        if (expiryFilter === "ok" && status !== "ok") return false;
        if (expiryFilter === "none" && status !== "none") return false;
      }

      return true;
    });
  }, [documents, expiryFilter, typeFilter]);

  return (
    <div className="space-y-6">
      {expiringDocs.length > 0 ? (
        <div className="flex flex-col gap-4 rounded-[1.6rem] border border-rose-500/25 bg-rose-500/10 p-5 text-white shadow-[0_20px_45px_-32px_rgba(244,63,94,0.25)] sm:flex-row sm:items-center">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-300">
            <AlertTriangle className="size-6" />
          </div>
          <div>
            <p className="font-heading text-lg font-bold text-white">
              {expiringDocs.length === 1 ? "1 dokument ističe uskoro" : `${expiringDocs.length} dokumenta ističu uskoro`}
            </p>
            <p className="mt-1 text-sm text-rose-100/85">
              Obavezno ažurirajte: {expiringDocs.map((document) => document.name).join(", ")}
            </p>
          </div>
        </div>
      ) : null}

      <section className="rounded-[1.75rem] border border-slate-800 bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)] p-5 text-white shadow-[0_24px_60px_-42px_rgba(2,6,23,0.88)]">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Tip dokumenta
            </label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-11 rounded-2xl border-white/10 bg-white/5 text-sm text-white">
                <SelectValue placeholder="Svi tipovi" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-slate-700 bg-slate-950 text-slate-200">
                <SelectItem value="all" className="rounded-xl focus:bg-white/10 focus:text-white">Svi tipovi</SelectItem>
                {DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type} className="rounded-xl focus:bg-white/10 focus:text-white">
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Status isteka
            </label>
            <Select value={expiryFilter} onValueChange={setExpiryFilter}>
              <SelectTrigger className="h-11 rounded-2xl border-white/10 bg-white/5 text-sm text-white">
                <SelectValue placeholder="Svi statusi" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-slate-700 bg-slate-950 text-slate-200">
                <SelectItem value="all" className="rounded-xl focus:bg-white/10 focus:text-white">Svi statusi</SelectItem>
                <SelectItem value="danger" className="rounded-xl text-rose-200 focus:bg-white/10 focus:text-white">Kritično (&lt;30 dana)</SelectItem>
                <SelectItem value="warning" className="rounded-xl text-amber-200 focus:bg-white/10 focus:text-white">Upozorenje (30-60 dana)</SelectItem>
                <SelectItem value="ok" className="rounded-xl text-emerald-200 focus:bg-white/10 focus:text-white">U redu (&gt;60 dana)</SelectItem>
                <SelectItem value="none" className="rounded-xl focus:bg-white/10 focus:text-white">Bez roka</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-white/10 bg-white/5 py-24 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full border border-white/10 bg-white/5">
            <Database className="size-6 text-slate-400" />
          </div>
          <h3 className="mb-2 text-lg font-heading font-bold text-white">
            {documents.length === 0 ? "Vaš trezor je prazan" : "Nema rezultata za odabrane filtere"}
          </h3>
          <p className="max-w-sm text-sm text-slate-400">
            {documents.length === 0
              ? "Dodajte prvi dokument klikom na dugme iznad kako biste započeli."
              : "Pokušajte sa drugačijim filterima ili dodajte novi dokument."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((document) => (
            <DocumentCard key={document.id} document={document} />
          ))}
        </div>
      )}
    </div>
  );
}
