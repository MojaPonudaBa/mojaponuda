"use client";

import { useState } from "react";
import type { Document } from "@/types/database";
import { DocumentCard } from "@/components/vault/document-card";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  FolderOpen,
} from "lucide-react";

interface ClientFolder {
  clientName: string;
  agencyClientId: string;
  documents: Document[];
}

interface AgencyDocumentFoldersProps {
  folders: ClientFolder[];
}

export function AgencyDocumentFolders({ folders }: AgencyDocumentFoldersProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(folders.map((folder) => folder.agencyClientId)));

  function toggleFolder(id: string) {
    setExpandedFolders((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const totalDocs = folders.reduce((sum, folder) => sum + folder.documents.length, 0);

  if (folders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-white/10 bg-white/5 py-24 text-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-full border border-white/10 bg-white/5">
          <FolderOpen className="size-6 text-slate-400" />
        </div>
        <h3 className="mb-2 text-lg font-heading font-bold text-white">Nema klijenata</h3>
        <p className="max-w-sm text-sm text-slate-400">
          Dodajte klijente u agencijski panel da biste upravljali njihovim dokumentima.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Ukupno {totalDocs} {totalDocs === 1 ? "dokument" : "dokumenata"} u {folders.length} {folders.length === 1 ? "folderu" : "foldera"}
      </p>

      {folders.map((folder) => {
        const isExpanded = expandedFolders.has(folder.agencyClientId);

        return (
          <section
            key={folder.agencyClientId}
            className="overflow-hidden rounded-[1.65rem] border border-slate-800 bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)] text-white shadow-[0_24px_60px_-42px_rgba(2,6,23,0.88)]"
          >
            <button
              type="button"
              onClick={() => toggleFolder(folder.agencyClientId)}
              className="flex w-full items-center gap-4 px-6 py-5 text-left transition-colors hover:bg-white/5"
            >
              {isExpanded ? (
                <ChevronDown className="size-4 shrink-0 text-slate-400" />
              ) : (
                <ChevronRight className="size-4 shrink-0 text-slate-400" />
              )}
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-violet-200">
                <Building2 className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-heading text-lg font-bold text-white">{folder.clientName}</p>
                <p className="text-sm text-slate-400">
                  {folder.documents.length} {folder.documents.length === 1 ? "dokument" : "dokumenata"}
                </p>
              </div>
            </button>

            {isExpanded ? (
              <div className="border-t border-white/10 px-6 py-5">
                {folder.documents.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">
                    Nema dokumenata za ovog klijenta.
                  </p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {folder.documents.map((document) => (
                      <DocumentCard key={document.id} document={document} />
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
