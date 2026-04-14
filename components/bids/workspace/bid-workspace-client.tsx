"use client";

import { useState, useCallback, type ReactNode } from "react";
import type { BidChecklistItem, Document } from "@/types/database";
import { ChecklistPanel } from "./checklist-panel";
import { TenderDocViewer } from "./tender-doc-viewer";
import { TenderDocFullViewer } from "./tender-doc-full-viewer";

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
}

export function BidWorkspaceLayout({
  bidId,
  checklistItems,
  vaultDocuments,
  tenderDocUpload,
  topContent,
  documentsPanel,
  notesSection,
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
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: Checklist — 3/5 */}
        <div className="lg:col-span-3 space-y-6">
          {topContent}
          <ChecklistPanel
            bidId={bidId}
            items={checklistItems}
            vaultDocuments={vaultDocuments}
            onViewPage={canView ? handleViewPage : undefined}
          />
          {notesSection}
        </div>

        {/* Right: PDF Viewer OR Documents — 2/5 */}
        <div className="lg:col-span-2">
          {viewerOpen && canView ? (
            <div className="sticky top-6 h-[calc(100vh-8rem)]">
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
