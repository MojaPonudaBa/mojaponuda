import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Bid,
  Tender,
  BidChecklistItem,
  Document,
  BidStatus,
  Json,
} from "@/types/database";
import { TopBar } from "@/components/bids/workspace/top-bar";
import { BidWorkspaceLayout } from "@/components/bids/workspace/bid-workspace-client";
import { DocumentsPanel } from "@/components/bids/workspace/documents-panel";
import { NotesSection } from "@/components/bids/workspace/notes-section";
import { TenderDocUpload } from "@/components/bids/workspace/tender-doc-upload";
import { getSubscriptionStatus } from "@/lib/subscription";

function extractRiskFlags(aiAnalysis: Json | null): string[] {
  if (!aiAnalysis || typeof aiAnalysis !== "object" || Array.isArray(aiAnalysis)) return [];
  const analysis = aiAnalysis as Record<string, unknown>;
  if (Array.isArray(analysis.risk_flags)) {
    return analysis.risk_flags.filter((flag): flag is string => typeof flag === "string");
  }
  return [];
}

interface BidDocRow {
  id: string;
  document_id: string;
  documents: Document;
}

export default async function AgencyClientBidWorkspacePage({
  params,
}: {
  params: Promise<{ id: string; bidId: string }>;
}) {
  const { id: agencyClientId, bidId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { plan } = await getSubscriptionStatus(user.id, user.email, supabase);
  if (plan.id !== "agency") redirect("/dashboard");

  const { data: agencyClient } = await supabase
    .from("agency_clients")
    .select("id, company_id, companies(id, name)")
    .eq("id", agencyClientId)
    .eq("agency_user_id", user.id)
    .maybeSingle();

  if (!agencyClient) notFound();

  const company = agencyClient.companies as { id: string; name: string } | null;
  if (!company) notFound();

  const { data: bidData } = await supabase
    .from("bids")
    .select("*, tenders(*)")
    .eq("id", bidId)
    .single();

  const bid = bidData as (Bid & { tenders: Tender }) | null;

  if (!bid) {
    notFound();
  }

  if (bid.company_id !== company.id) {
    redirect(`/dashboard/agency/clients/${agencyClientId}/bids`);
  }

  const { data: checklistData } = await supabase
    .from("bid_checklist_items")
    .select("*")
    .eq("bid_id", bidId)
    .order("sort_order", { ascending: true });

  const checklistItems = (checklistData ?? []) as BidChecklistItem[];

  const { data: bidDocsData } = await supabase
    .from("bid_documents")
    .select("id, document_id, documents(*)")
    .eq("bid_id", bidId);

  const attachedDocs = ((bidDocsData ?? []) as BidDocRow[]).map((bidDocument) => ({
    id: bidDocument.id,
    document: bidDocument.documents,
  }));

  const { data: vaultData } = await supabase
    .from("documents")
    .select("*")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  const vaultDocuments = (vaultData ?? []) as Document[];

  const supabaseAdmin = createAdminClient();
  const { data: tenderDocData } = await supabaseAdmin
    .from("tender_doc_uploads")
    .select("id, file_name, file_size, content_type, page_count, status, ai_analysis, error_message, created_at")
    .eq("bid_id", bidId)
    .order("created_at", { ascending: false })
    .limit(1);

  const tenderDocUpload = tenderDocData?.[0] || null;
  const hasMissingItems = checklistItems.some((item) => item.status === "missing");
  const clientBase = `/dashboard/agency/clients/${agencyClientId}`;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <TopBar
        bidId={bidId}
        tenderTitle={bid.tenders.title}
        contractingAuthority={bid.tenders.contracting_authority}
        currentStatus={bid.status as BidStatus}
        initialRiskFlags={extractRiskFlags(bid.ai_analysis)}
        hasMissingItems={hasMissingItems}
        backHref={`${clientBase}/bids`}
        deleteRedirectHref={`${clientBase}/bids`}
      />

      <BidWorkspaceLayout
        bidId={bidId}
        checklistItems={checklistItems}
        vaultDocuments={vaultDocuments}
        tenderDocUpload={
          tenderDocUpload
            ? {
                file_name: tenderDocUpload.file_name,
                content_type: tenderDocUpload.content_type ?? null,
                status: tenderDocUpload.status,
              }
            : null
        }
        topContent={
          <TenderDocUpload
            bidId={bidId}
            existingUpload={
              tenderDocUpload
                ? {
                    id: tenderDocUpload.id,
                    file_name: tenderDocUpload.file_name,
                    status: tenderDocUpload.status,
                    page_count: tenderDocUpload.page_count,
                    ai_analysis: tenderDocUpload.ai_analysis,
                    error_message: tenderDocUpload.error_message,
                  }
                : null
            }
          />
        }
        notesSection={<NotesSection bidId={bidId} initialNotes={bid.notes || ""} />}
        documentsPanel={
          <DocumentsPanel bidId={bidId} attachedDocs={attachedDocs} vaultDocuments={vaultDocuments} />
        }
      />
    </div>
  );
}
