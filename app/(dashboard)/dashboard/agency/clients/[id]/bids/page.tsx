import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription";
import type { BidStatus } from "@/types/database";
import { BidsTable } from "@/components/bids/bids-table";
import { NewBidModal } from "@/components/bids/new-bid-modal";

interface BidWithTender {
  id: string;
  status: BidStatus;
  created_at: string;
  tenders: {
    id: string;
    title: string;
    contracting_authority: string | null;
    deadline: string | null;
  };
}

export default async function AgencyClientBidsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { plan } = await getSubscriptionStatus(user.id, user.email);
  if (plan.id !== "agency") redirect("/dashboard");

  const { data: agencyClient } = await supabase
    .from("agency_clients")
    .select("id, company_id, companies (id, name)")
    .eq("id", id)
    .eq("agency_user_id", user.id)
    .maybeSingle();

  if (!agencyClient) notFound();

  const company = agencyClient.companies as { id: string; name: string } | null;
  if (!company) notFound();

  const { data: bidsData } = await supabase
    .from("bids")
    .select("id, status, created_at, tenders(id, title, contracting_authority, deadline)")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  const bids = ((bidsData as BidWithTender[] | null) ?? []).map((b) => ({
    id: b.id,
    status: b.status,
    created_at: b.created_at,
    tender: b.tenders,
  }));

  const { data: tendersData } = await supabase
    .from("tenders")
    .select("id, title, contracting_authority")
    .order("created_at", { ascending: false })
    .limit(500);

  const tenders = (tendersData ?? []) as {
    id: string;
    title: string;
    contracting_authority: string | null;
  }[];

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
        getBidHref={(bid) => `/dashboard/agency/clients/${id}/bids/${bid.id}`}
      />
    </div>
  );
}
