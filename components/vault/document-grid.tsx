"use client";

import { useState, useMemo } from "react";
import type { Document } from "@/types/database";
import { DOCUMENT_TYPES, getExpiryStatus } from "@/lib/vault/constants";
import { DocumentCard } from "@/components/vault/document-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Database } from "lucide-react";

interface DocumentGridProps {
  documents: Document[];
}

export function DocumentGrid({ documents }: DocumentGridProps) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [expiryFilter, setExpiryFilter] = useState("all");

  // Dokumenti koji ističu u 30 dana
  const expiringDocs = useMemo(
    () =>
      documents.filter((doc) => {
        const status = getExpiryStatus(doc.expires_at);
        return status === "danger";
      }),
    [documents]
  );

  // Filtrirani dokumenti
  const filtered = useMemo(() => {
    return documents.filter((doc) => {
      if (typeFilter !== "all" && doc.type !== typeFilter) return false;

      if (expiryFilter !== "all") {
        const status = getExpiryStatus(doc.expires_at);
        if (expiryFilter === "danger" && status !== "danger") return false;
        if (expiryFilter === "warning" && status !== "warning") return false;
        if (expiryFilter === "ok" && status !== "ok") return false;
        if (expiryFilter === "none" && status !== "none") return false;
      }

      return true;
    });
  }, [documents, typeFilter, expiryFilter]);

  return (
    <div className="space-y-6">
      {/* Banner upozorenja za dokumente koji ističu */}
      {expiringDocs.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
            <AlertTriangle className="size-6 animate-pulse" />
          </div>
          <div>
            <p className="font-heading text-base font-bold text-red-900">
              {expiringDocs.length === 1 ? "1 dokument ističe uskoro" : `${expiringDocs.length} dokumenta ističu uskoro`}
            </p>
            <p className="mt-1 text-sm text-red-700">
              Obavezno ažurirajte: {expiringDocs.map((d) => d.name).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Filteri */}
      <div className="flex flex-wrap gap-4 border-b border-slate-200 pb-6">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Tip Dokumenta
          </label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[240px] rounded-xl border-slate-200 bg-white text-sm focus:ring-primary focus:border-primary">
              <SelectValue placeholder="Svi tipovi" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200">
              <SelectItem value="all" className="focus:bg-blue-50 focus:text-primary rounded-lg cursor-pointer">Svi tipovi</SelectItem>
              {DOCUMENT_TYPES.map((dt) => (
                <SelectItem key={dt} value={dt} className="focus:bg-blue-50 focus:text-primary rounded-lg cursor-pointer">
                  {dt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Status Isteka
          </label>
          <Select value={expiryFilter} onValueChange={setExpiryFilter}>
            <SelectTrigger className="w-[240px] rounded-xl border-slate-200 bg-white text-sm focus:ring-primary focus:border-primary">
              <SelectValue placeholder="Svi statusi" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200">
              <SelectItem value="all" className="focus:bg-blue-50 focus:text-primary rounded-lg cursor-pointer">Svi statusi</SelectItem>
              <SelectItem value="danger" className="text-red-600 focus:bg-red-50 focus:text-red-700 rounded-lg cursor-pointer">Kritično (&lt;30 dana)</SelectItem>
              <SelectItem value="warning" className="text-amber-600 focus:bg-amber-50 focus:text-amber-700 rounded-lg cursor-pointer">Upozorenje (30-60 dana)</SelectItem>
              <SelectItem value="ok" className="text-emerald-600 focus:bg-emerald-50 focus:text-emerald-700 rounded-lg cursor-pointer">U redu (&gt;60 dana)</SelectItem>
              <SelectItem value="none" className="focus:bg-blue-50 focus:text-primary rounded-lg cursor-pointer">Bez roka</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-24">
          <div className="flex size-16 items-center justify-center rounded-full bg-blue-50 text-blue-500 mb-4 shadow-sm shadow-blue-500/20">
            <Database className="size-6" />
          </div>
          <h3 className="text-lg font-heading font-bold text-slate-900 mb-2">
            {documents.length === 0 ? "Vaš trezor je prazan" : "Nema rezultata za odabrane filtere"}
          </h3>
          <p className="text-sm text-slate-500 text-center max-w-sm">
            {documents.length === 0
              ? "Dodajte prvi dokument klikom na dugme iznad kako biste započeli."
              : "Pokušajte sa drugačijim filterima ili dodajte novi dokument."}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((doc) => (
            <DocumentCard key={doc.id} document={doc} />
          ))}
        </div>
      )}
    </div>
  );
}
