"use client";

import { useState } from "react";
import type { Document } from "@/types/database";
import { DocumentCard } from "@/components/vault/document-card";
import { ChevronDown, ChevronRight, FolderOpen, Building2 } from "lucide-react";

interface ClientFolder {
  clientName: string;
  agencyClientId: string;
  documents: Document[];
}

interface AgencyDocumentFoldersProps {
  folders: ClientFolder[];
}

export function AgencyDocumentFolders({ folders }: AgencyDocumentFoldersProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(folders.map((f) => f.agencyClientId))
  );

  function toggleFolder(id: string) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const totalDocs = folders.reduce((sum, f) => sum + f.documents.length, 0);

  if (folders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-24">
        <div className="flex size-16 items-center justify-center rounded-full bg-blue-50 text-blue-500 mb-4 shadow-sm shadow-blue-500/20">
          <FolderOpen className="size-6" />
        </div>
        <h3 className="text-lg font-heading font-bold text-slate-900 mb-2">
          Nema klijenata
        </h3>
        <p className="text-sm text-slate-500 text-center max-w-sm">
          Dodajte klijente u agencijski panel da biste upravljali njihovim dokumentima.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Ukupno {totalDocs} {totalDocs === 1 ? "dokument" : "dokumenata"} u {folders.length} {folders.length === 1 ? "folder" : "foldera"}
      </p>

      {folders.map((folder) => {
        const isExpanded = expandedFolders.has(folder.agencyClientId);

        return (
          <div
            key={folder.agencyClientId}
            className="rounded-[1.5rem] border border-slate-200 bg-white shadow-sm overflow-hidden"
          >
            {/* Folder header */}
            <button
              type="button"
              onClick={() => toggleFolder(folder.agencyClientId)}
              className="flex w-full items-center gap-3 px-6 py-4 text-left transition-colors hover:bg-slate-50"
            >
              {isExpanded ? (
                <ChevronDown className="size-4 shrink-0 text-slate-400" />
              ) : (
                <ChevronRight className="size-4 shrink-0 text-slate-400" />
              )}
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 border border-violet-100">
                <Building2 className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-heading text-base font-bold text-slate-900 truncate">
                  {folder.clientName}
                </p>
                <p className="text-xs text-slate-500">
                  {folder.documents.length} {folder.documents.length === 1 ? "dokument" : "dokumenata"}
                </p>
              </div>
            </button>

            {/* Folder contents */}
            {isExpanded && (
              <div className="border-t border-slate-100 px-6 py-5">
                {folder.documents.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">
                    Nema dokumenata za ovog klijenta.
                  </p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {folder.documents.map((doc) => (
                      <DocumentCard key={doc.id} document={doc} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
