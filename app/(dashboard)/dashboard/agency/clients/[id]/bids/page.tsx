import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus, isAgencyPlan } from "@/lib/subscription";
import type { BidStatus } from "@/types/database";
import { BidsTable, type BidRow } from "@/components/bids/bids-table";
import { NewBidModal } from "@/components/bids/new-bid-modal";
import { Button } from "@/components/ui/button";

interface TenderRelation {
  id: string;
  title: string;
  contracting_authority: string | null;
  deadline: string | null;
}

interface CompanyRelation {
  id: string;
  name: string;
}

interface BidWithTender {
  id: string;
  status: BidStatus;
  created_at: string;
  tenders: TenderRelation | TenderRelation[] | null;
}

function normalizeBidTender(tender: TenderRelation | TenderRelation[] | null): TenderRelation | null {
  // Handle undefined explicitly
  if (tender === undefined) {
    return null;
  }
  
  // Handle null
  if (tender === null) {
    return null;
  }
  
  // Handle arrays (including empty arrays)
  if (Array.isArray(tender)) {
    const firstTender = tender[0];
    // Return null for empty arrays or if first element is not a valid object
    if (!firstTender || typeof firstTender !== 'object') {
      return null;
    }
    return firstTender;
  }
  
  // Handle non-object values (strings, numbers, etc.)
  if (typeof tender !== 'object') {
    return null;
  }
  
  // Return the tender object if it's valid
  return tender;
}

// Type guard to ensure bid has valid structure
function isValidBid(bid: BidWithTender): bid is BidWithTender & { tenders: TenderRelation | TenderRelation[] } {
  // Bid must have an id
  if (!bid.id) {
    return false;
  }
  
  // Tenders can be null (we'll handle that with normalizeBidTender)
  // But if tenders is defined, it should be an object or array
  if (bid.tenders !== null && bid.tenders !== undefined) {
    if (Array.isArray(bid.tenders)) {
      // If it's an array, it can be empty (we'll normalize to null)
      return true;
    }
    // If it's not an array, it should be an object with an id
    if (typeof bid.tenders === 'object' && 'id' in bid.tenders) {
      return true;
    }
    // Invalid structure
    return false;
  }
  
  // Null/undefined tenders are valid (we'll show fallback text)
  return true;
}

function normalizeCompanyRelation(company: CompanyRelation | CompanyRelation[] | null) {
  if (Array.isArray(company)) {
    return company[0] ?? null;
  }

  return company;
}

function AgencyClientBidsFallback() {
  return (
    <div className="space-y-8 max-w-[1200px] mx-auto">
      <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-6 text-slate-900 shadow-sm">
        <h1 className="text-2xl font-heading font-bold tracking-tight">
          Ponude trenutno nisu dostupne
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
          Došlo je do problema pri učitavanju ponuda za ovog klijenta. Vratite se
          na klijenta ili pokušajte ponovo za nekoliko trenutaka.
        </p>
        <div className="mt-5">
          <Button asChild className="rounded-xl bg-slate-950 text-white hover:bg-slate-800">
            <Link href="/dashboard/agency">Nazad na agenciju</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default async function AgencyClientBidsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { plan } = await getSubscriptionStatus(user.id, user.email, supabase);
    if (!isAgencyPlan(plan)) redirect("/dashboard");

    const { data: agencyClient, error: agencyClientError } = await supabase
      .from("agency_clients")
      .select("id, company_id, companies (id, name)")
      .eq("id", id)
      .eq("agency_user_id", user.id)
      .maybeSingle();

    if (agencyClientError) {
      console.error("Agency client bids page client lookup error:", agencyClientError);
      return <AgencyClientBidsFallback />;
    }

    if (!agencyClient) notFound();

    const company = normalizeCompanyRelation(
      agencyClient.companies as CompanyRelation | CompanyRelation[] | null
    );

    if (!company) notFound();

    try {
      const { data: bidsData, error: bidsError } = await supabase
        .from("bids")
        .select("id, status, created_at, tenders(id, title, contracting_authority, deadline)")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false });

      if (bidsError) {
        console.error("Agency client bids page - bids query error:", bidsError);
        throw bidsError;
      }

      console.log("Agency client bids page - raw bids data count:", bidsData?.length ?? 0);

      // Safely process bids with extra error handling
      const bids: BidRow[] = [];
      const rawBids = (bidsData as BidWithTender[] | null) ?? [];
      
      for (const bid of rawBids) {
        try {
          if (!isValidBid(bid)) {
            console.log("Filtered out invalid bid:", bid.id);
            continue;
          }
          
          const normalizedTender = normalizeBidTender(bid.tenders);
          bids.push({
            id: bid.id,
            status: bid.status,
            created_at: bid.created_at,
            tender: normalizedTender,
          });
        } catch (bidError) {
          console.error("Error processing bid:", bid.id, bidError);
          // Skip this bid and continue with others
          continue;
        }
      }

      console.log("Agency client bids page - processed bids count:", bids.length);

      const { data: tendersData, error: tendersError } = await supabase
        .from("tenders")
        .select("id, title, contracting_authority")
        .order("created_at", { ascending: false })
        .limit(500);

      if (tendersError) {
        throw tendersError;
      }

      const tenders = (tendersData ?? []) as Array<{
        id: string;
        title: string;
        contracting_authority: string | null;
      }>;

      return (
        <div className="space-y-8 max-w-[1200px] mx-auto">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">
                Ponude — {company.name}
              </h1>
              <p className="mt-1 text-base text-slate-500">
                Sve ponude ovog klijenta na jednom mjestu.
              </p>
            </div>
            <NewBidModal
              tenders={tenders}
              agencyClientId={id}
              bidPathBase={`/dashboard/agency/clients/${id}/bids`}
            />
          </div>

          <BidsTable
            bids={bids}
            basePath={`/dashboard/agency/clients/${id}/bids`}
          />
        </div>
      );
    } catch (error) {
      console.error("Agency client bids page error:", error);
      return <AgencyClientBidsFallback />;
    }
  } catch (error) {
    console.error("Agency client bids page - top level error:", error);
    return <AgencyClientBidsFallback />;
  }
}
