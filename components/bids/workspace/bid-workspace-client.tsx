"use client";

import { useState, useCallback } from "react";
import type { BidChecklistItem, Document } from "@/types/database";
import { ChecklistPanel } from "./checklist-panel";
import { TenderDocViewer } from "./tender-doc-viewer";

interface BidWorkspaceClientProps {
  bidId: string;
  checklistItems: BidChecklistItem[];
  vaultDocuments: Document[];
  tenderDocUpload: {
    file_name: string;
    content_type: string | null;
    status: string;
  } | null;
}

export function BidWorkspaceChecklist({
  bidId,
  checklistItems,
  vaultDocuments,
  tenderDocUpload,
}: BidWorkspaceClientProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerPage, setViewerPage] = useState(1);
  const [viewerHighlight, setViewerHighlight] = useState<string | undefined>();

  const isPdf = tenderDocUpload?.content_type === "application/pdf" ||
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
      <ChecklistPanel
        bidId={bidId}
        items={checklistItems}
        vaultDocuments={vaultDocuments}
        onViewPage={canView ? handleViewPage : undefined}
      />

      {viewerOpen && canView && (
        <TenderDocViewer
          fileUrl={`/api/bids/${bidId}/tender-documentation/file`}
          fileName={tenderDocUpload.file_name}
          initialPage={viewerPage}
          highlightText={viewerHighlight}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </>
  );
}
