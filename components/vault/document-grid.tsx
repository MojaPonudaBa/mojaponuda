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
import { AlertTriangle } from "lucide-react";

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
    <div className="space-y-4">
      {/* Banner upozorenja za dokumente koji ističu */}
      {expiringDocs.length > 0 && (
        <div className="flex items-center gap-3 rounded-md border border-red-500/30 bg-red-500/10 p-4">
          <AlertTriangle className="size-5 shrink-0 text-red-400" />
          <div>
            <p className="text-sm font-medium text-red-400">
              {expiringDocs.length === 1
                ? "1 dokument ističe u narednih 30 dana"
                : `${expiringDocs.length} dokumenta ističu u narednih 30 dana`}
            </p>
            <p className="mt-0.5 text-xs text-red-400/70">
              {expiringDocs.map((d) => d.name).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Filteri */}
      <div className="flex flex-wrap gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Svi tipovi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Svi tipovi</SelectItem>
            {DOCUMENT_TYPES.map((dt) => (
              <SelectItem key={dt} value={dt}>
                {dt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={expiryFilter} onValueChange={setExpiryFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Svi statusi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Svi statusi</SelectItem>
            <SelectItem value="danger">Ističe (&lt; 30 dana)</SelectItem>
            <SelectItem value="warning">Upozorenje (30–60 dana)</SelectItem>
            <SelectItem value="ok">U redu (&gt; 60 dana)</SelectItem>
            <SelectItem value="none">Bez roka</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border py-16">
          <p className="text-sm text-muted-foreground">
            {documents.length === 0
              ? "Nemate dokumenata. Kliknite \"Dodaj dokument\" za početak."
              : "Nema dokumenata koji odgovaraju filteru."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((doc) => (
            <DocumentCard key={doc.id} document={doc} />
          ))}
        </div>
      )}
    </div>
  );
}
