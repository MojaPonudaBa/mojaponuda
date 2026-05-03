import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveBidAccess } from "@/lib/bids/access";
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
import { PaywallOverlay } from "@/components/subscription/paywall-overlay";
import { getSubscriptionStatus, isAgencyPlan } from "@/lib/subscription";
import { BidComments, type BidComment } from "@/components/bids/bid-comments";
import { PreparationPlanCard } from "@/components/bids/preparation-plan-card";
import {
  getTenderDecisionInsights,
  type TenderDecisionTender,
} from "@/lib/tender-decision";

const MAX_FREE_BIDS = 3;

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

export default async function BidWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { plan, isSubscribed } = await getSubscriptionStatus(user.id, user.email, supabase);
  const access = await resolveBidAccess(supabase, user.id, id);

  if (!access) {
    if (isAgencyPlan(plan)) redirect("/dashboard/agency");
    redirect("/dashboard/bids");
  }

  if (access.agencyClientId) {
    redirect(`/dashboard/agency/clients/${access.agencyClientId}/bids/${id}`);
  }

  const { data: bidData } = await supabase
    .from("bids")
    .select("*, tenders(*)")
    .eq("id", id)
    .single();

  const bid = bidData as (Bid & { tenders: Tender | null }) | null;

  if (!bid || bid.company_id !== access.companyId) {
    redirect("/dashboard/bids");
  }

  const { data: companyData } = await supabase
    .from("companies")
    .select("id, jib, industry, keywords, cpv_codes, operating_regions")
    .eq("id", access.companyId)
    .maybeSingle();

  const { data: checklistData } = await supabase
    .from("bid_checklist_items")
    .select("*")
    .eq("bid_id", id)
    .order("sort_order", { ascending: true });

  const checklistItems = (checklistData ?? []) as BidChecklistItem[];

  const { data: bidDocsData } = await supabase
    .from("bid_documents")
    .select("id, document_id, documents(*)")
    .eq("bid_id", id);

  const attachedDocs = ((bidDocsData ?? []) as BidDocRow[]).map((bidDocument) => ({
    id: bidDocument.id,
    document: bidDocument.documents,
  }));

  const { data: vaultData } = await supabase
    .from("documents")
    .select("*")
    .eq("company_id", access.companyId)
    .order("created_at", { ascending: false });

  const vaultDocuments = (vaultData ?? []) as Document[];

  const supabaseAdmin = createAdminClient();
  const { data: tenderDocData } = await supabaseAdmin
    .from("tender_doc_uploads")
    .select("id, file_name, file_size, content_type, page_count, status, ai_analysis, error_message, created_at")
    .eq("bid_id", id)
    .order("created_at", { ascending: false })
    .limit(1);

  const tenderDocUpload = tenderDocData?.[0] || null;

  let showPaywall = false;
  let totalBids = 0;
  if (!isSubscribed) {
    const { count } = await supabase
      .from("bids")
      .select("id", { count: "exact", head: true })
      .eq("company_id", access.companyId);
    totalBids = count ?? 0;
    showPaywall = totalBids > MAX_FREE_BIDS;
  }

  const hasMissingItems = checklistItems.some((item) => item.status === "missing");

  // ── Bid komentari tima ───────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anySupabase = supabase as any;
  const { data: commentRows } = await anySupabase
    .from("bid_comments")
    .select("id, body, author_name, user_id, created_at")
    .eq("bid_id", id)
    .order("created_at", { ascending: true });
  const comments: BidComment[] = (commentRows ?? []) as BidComment[];

  // ── Price prediction na osnovu tendera ──────────────────────────────
  const missingChecklistCount = checklistItems.filter((item) => item.status === "missing").length;
  const decisionInsight =
    bid.tenders
      ? (await getTenderDecisionInsights(
          supabase,
          [bid.tenders as TenderDecisionTender],
          companyData
            ? {
                id: companyData.id,
                jib: companyData.jib,
                industry: companyData.industry,
                keywords: companyData.keywords,
                cpv_codes: companyData.cpv_codes,
                operating_regions: companyData.operating_regions,
              }
            : null,
        )).get(bid.tenders.id) ?? null
      : null;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <TopBar
        bidId={id}
        tenderTitle={bid.tenders?.title ?? "Tender nije dostupan"}
        contractingAuthority={bid.tenders?.contracting_authority ?? null}
        currentStatus={bid.status as BidStatus}
        initialRiskFlags={extractRiskFlags(bid.ai_analysis)}
        hasMissingItems={hasMissingItems}
      />

      <PreparationPlanCard
        tender={bid.tenders as TenderDecisionTender | null}
        insight={decisionInsight}
        checklistCount={checklistItems.length}
        missingChecklistCount={missingChecklistCount}
      />

      {showPaywall ? (
        <PaywallOverlay usedBids={totalBids} maxFreeBids={MAX_FREE_BIDS} />
      ) : (
        <BidWorkspaceLayout
          bidId={id}
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
              bidId={id}
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
          notesSection={<NotesSection bidId={id} initialNotes={bid.notes || ""} />}
          documentsPanel={
            <DocumentsPanel bidId={id} attachedDocs={attachedDocs} vaultDocuments={vaultDocuments} />
          }
          commentsSection={<BidComments bidId={id} comments={comments} currentUserId={user.id} />}
        />
      )}
    </div>
  );
}
