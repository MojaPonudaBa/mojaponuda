"use client";

import { useState, useCallback, type ReactNode } from "react";
import type { BidChecklistItem, Document } from "@/types/database";
import { ChecklistPanel } from "./checklist-panel";
import { TenderDocViewer } from "./tender-doc-viewer";
import { TenderDocFullViewer } from "./tender-doc-full-viewer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BidWorkspaceLayoutProps {
  bidId: string;
  checklistItems: BidChecklistItem[];
  vaultDocuments: Document[];
  tenderDocUpload: {
    file_name: string;
    content_type: string | null;
    status: string;
  } | null;
  /** Rendered above the checklist (TenderDocUpload + NotesSection) */
  topContent?: ReactNode;
  /** The documents panel (shown when viewer is closed) */
  documentsPanel: ReactNode;
  /** Notes section (below checklist) */
  notesSection?: ReactNode;
  commentsSection?: ReactNode;
}

export function BidWorkspaceLayout({
  bidId,
  checklistItems,
  vaultDocuments,
  tenderDocUpload,
  topContent,
  documentsPanel,
  notesSection,
  commentsSection,
}: BidWorkspaceLayoutProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerPage, setViewerPage] = useState(1);
  const [viewerHighlight, setViewerHighlight] = useState<string | undefined>();
  const [fullViewerOpen, setFullViewerOpen] = useState(false);

  const isPdf =
    tenderDocUpload?.content_type === "application/pdf" ||
    tenderDocUpload?.file_name?.toLowerCase().endsWith(".pdf");

  const canView = tenderDocUpload?.status === "ready" && isPdf;

  const handleViewPage = useCallback(
    (pageNumber: number, highlightText?: string) => {
      if (!canView) return;
      setViewerPage(pageNumber);
      setViewerHighlight(highlightText);
      setViewerOpen(true);
    },
    [canView],
  );

  return (
    <>
      <Tabs defaultValue="overview" className="space-y-5">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="overview">Pregled</TabsTrigger>
          <TabsTrigger value="documents">Dokumenti</TabsTrigger>
          <TabsTrigger value="tasks">Zadaci</TabsTrigger>
          <TabsTrigger value="team">Tim</TabsTrigger>
          <TabsTrigger value="comments">Komentari</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-5 focus-visible:ring-0">
          {topContent}
          {notesSection}
          <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-heading text-lg font-bold text-slate-950">Pre-flight status</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Provjerite tendersku dokumentaciju, zadatke i priloge prije slanja ponude.
            </p>
          </section>
        </TabsContent>

        <TabsContent value="documents" className="focus-visible:ring-0">
          {documentsPanel}
        </TabsContent>

        <TabsContent value="tasks" className="focus-visible:ring-0">
          <div className="grid gap-5 xl:grid-cols-5 xl:gap-6">
            <div className="space-y-5 xl:col-span-3 xl:space-y-6">
              <ChecklistPanel
                bidId={bidId}
                items={checklistItems}
                vaultDocuments={vaultDocuments}
                onViewPage={canView ? handleViewPage : undefined}
              />
            </div>
            <div className="xl:col-span-2">
              {viewerOpen && canView ? (
                <div className="xl:sticky xl:top-6 xl:h-[calc(100vh-8rem)]">
                  <TenderDocViewer
                    fileUrl={`/api/bids/${bidId}/tender-documentation/file`}
                    fileName={tenderDocUpload.file_name}
                    pageNumber={viewerPage}
                    highlightText={viewerHighlight}
                    onClose={() => setViewerOpen(false)}
                    onPageChange={setViewerPage}
                    onOpenFull={() => setFullViewerOpen(true)}
                  />
                </div>
              ) : (
                documentsPanel
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="team" className="focus-visible:ring-0">
          <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-heading text-lg font-bold text-slate-950">Tim i odgovornosti</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Trenutna baza nema posebnu `bid_tasks` tabelu. Stavke iz checkliste služe kao operativni zadaci za pripremu ponude.
            </p>
          </section>
        </TabsContent>

        <TabsContent value="comments" className="focus-visible:ring-0">
          {commentsSection}
        </TabsContent>
      </Tabs>

      {/* Full-screen viewer with all checklist references */}
      {fullViewerOpen && canView && (
        <TenderDocFullViewer
          fileUrl={`/api/bids/${bidId}/tender-documentation/file`}
          fileName={tenderDocUpload.file_name}
          checklistItems={checklistItems}
          initialPage={viewerPage}
          onClose={() => setFullViewerOpen(false)}
        />
      )}
    </>
  );
}
