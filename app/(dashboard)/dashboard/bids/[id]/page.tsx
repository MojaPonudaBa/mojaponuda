import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
import { ChecklistPanel } from "@/components/bids/workspace/checklist-panel";
import { DocumentsPanel } from "@/components/bids/workspace/documents-panel";
import { NotesSection } from "@/components/bids/workspace/notes-section";
import { PaywallOverlay } from "@/components/subscription/paywall-overlay";
import { getSubscriptionStatus } from "@/lib/subscription";

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
  if (!company) redirect("/onboarding");

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

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Gornji bar */}
      <TopBar
        bidId={id}
        tenderTitle={bid.tenders.title}
        contractingAuthority={bid.tenders.contracting_authority}
        currentStatus={bid.status as BidStatus}
        initialRiskFlags={extractRiskFlags(bid.ai_analysis)}
      />

      {showPaywall ? (
        <PaywallOverlay usedBids={totalBids} maxFreeBids={MAX_FREE_BIDS} />
      ) : (
        <>
          {/* Dva panela */}
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Lijevi panel: Checklist — 3/5 */}
            <div className="lg:col-span-3 space-y-6">
              <ChecklistPanel
                bidId={id}
                items={checklistItems}
                vaultDocuments={vaultDocuments}
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
