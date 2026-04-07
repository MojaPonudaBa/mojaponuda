import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Company,
  Bid,
  Tender,
  BidChecklistItem,
  Document,
  BidStatus,
  Json,
  Subscription,
} from "@/types/database";
import { TopBar } from "@/components/bids/workspace/top-bar";
import { BidWorkspaceChecklist } from "@/components/bids/workspace/bid-workspace-client";
import { DocumentsPanel } from "@/components/bids/workspace/documents-panel";
import { NotesSection } from "@/components/bids/workspace/notes-section";
import { TenderDocUpload } from "@/components/bids/workspace/tender-doc-upload";
import { PaywallOverlay } from "@/components/subscription/paywall-overlay";
import { getSubscriptionStatus, isAgencyPlan } from "@/lib/subscription";

const MAX_FREE_BIDS = 3;

function extractRiskFlags(aiAnalysis: Json | null): string[] {
  if (!aiAnalysis || typeof aiAnalysis !== "object" || Array.isArray(aiAnalysis)) return [];
  const analysis = aiAnalysis as Record<string, unknown>;
  if (Array.isArray(analysis.risk_flags)) {
    return analysis.risk_flags.filter((f): f is string => typeof f === "string");
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

  // Dohvati firmu
  const { data: companyData } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const company = companyData as Company | null;
  if (!company) {
    const { plan } = await getSubscriptionStatus(user!.id, user!.email, supabase);
    if (isAgencyPlan(plan)) redirect("/dashboard/agency");
    redirect("/onboarding");
  }

  // Dohvati ponudu s tender podacima
  const { data: bidData } = await supabase
    .from("bids")
    .select("*, tenders(*)")
    .eq("id", id)
    .single();

  const bid = bidData as unknown as Bid & { tenders: Tender };

  if (!bid || bid.company_id !== company.id) {
    redirect("/dashboard/bids");
  }

  // Dohvati checklist stavke
  const { data: checklistData } = await supabase
    .from("bid_checklist_items")
    .select("*")
    .eq("bid_id", id)
    .order("sort_order", { ascending: true });

  const checklistItems = (checklistData ?? []) as BidChecklistItem[];

  // Dohvati priložene dokumente
  const { data: bidDocsData } = await supabase
    .from("bid_documents")
    .select("id, document_id, documents(*)")
    .eq("bid_id", id);

  const attachedDocs = ((bidDocsData ?? []) as BidDocRow[]).map((bd) => ({
    id: bd.id,
    document: bd.documents,
  }));

  // Dohvati sve vault dokumente firme (za modalne prozore)
  const { data: vaultData } = await supabase
    .from("documents")
    .select("*")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  const vaultDocuments = (vaultData ?? []) as Document[];

  // Dohvati tender dokumentaciju upload za ovaj bid
  const supabaseAdmin = createAdminClient();
  const { data: tenderDocData } = await supabaseAdmin
    .from("tender_doc_uploads")
    .select("id, file_name, file_size, content_type, page_count, status, ai_analysis, error_message, created_at")
    .eq("bid_id", id)
    .order("created_at", { ascending: false })
    .limit(1);

  const tenderDocUpload = tenderDocData?.[0] || null;

  // Provjera pretplate — paywall
  const { isSubscribed } = await getSubscriptionStatus(user.id, user.email);

  let showPaywall = false;
  let totalBids = 0;
  if (!isSubscribed) {
    const { count } = await supabase
      .from("bids")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id);
    totalBids = count ?? 0;
    showPaywall = totalBids > MAX_FREE_BIDS;
  }

  // Calculate missing items for TopBar warning
  const hasMissingItems = checklistItems.some(item => item.status === "missing");

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Gornji bar */}
      <TopBar
        bidId={id}
        tenderTitle={bid.tenders.title}
        contractingAuthority={bid.tenders.contracting_authority}
        currentStatus={bid.status as BidStatus}
        initialRiskFlags={extractRiskFlags(bid.ai_analysis)}
        isSubscribed={isSubscribed}
        hasMissingItems={hasMissingItems}
      />

      {showPaywall ? (
        <PaywallOverlay usedBids={totalBids} maxFreeBids={MAX_FREE_BIDS} />
      ) : (
        <>
          {/* Dva panela */}
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Lijevi panel: Checklist — 3/5 */}
            <div className="lg:col-span-3 space-y-6">
              {/* Tender dokumentacija upload */}
              <TenderDocUpload
                bidId={id}
                existingUpload={tenderDocUpload ? {
                  id: tenderDocUpload.id,
                  file_name: tenderDocUpload.file_name,
                  status: tenderDocUpload.status,
                  page_count: tenderDocUpload.page_count,
                  ai_analysis: tenderDocUpload.ai_analysis,
                  error_message: tenderDocUpload.error_message,
                } : null}
              />

              <BidWorkspaceChecklist
                bidId={id}
                checklistItems={checklistItems}
                vaultDocuments={vaultDocuments}
                tenderDocUpload={tenderDocUpload ? {
                  file_name: tenderDocUpload.file_name,
                  content_type: tenderDocUpload.content_type ?? null,
                  status: tenderDocUpload.status,
                } : null}
              />
              <NotesSection bidId={id} initialNotes={bid.notes || ""} />
            </div>

            {/* Desni panel: Dokumenti — 2/5 */}
            <div className="lg:col-span-2">
              <DocumentsPanel
                bidId={id}
                attachedDocs={attachedDocs}
                vaultDocuments={vaultDocuments}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
