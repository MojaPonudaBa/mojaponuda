import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus, isAgencyPlan } from "@/lib/subscription";
import { ProGate } from "@/components/subscription/pro-gate";
import { AgencyCRMDashboard } from "@/components/agency/agency-crm-dashboard";

export default async function AgencyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { isSubscribed, plan } = await getSubscriptionStatus(user.id, user.email);
  if (!isSubscribed) return <ProGate />;

  if (!isAgencyPlan(plan)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md rounded-[1.5rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-slate-100">
            <span className="text-3xl">🏢</span>
          </div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Agencijski paket</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Funkcije za vođenje klijenata dostupne su samo sa Agencijskim paketom. Vaš trenutni plan je <strong>{plan.name}</strong>.
          </p>
          <a
            href="/dashboard/subscription"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-6 text-sm font-semibold text-white transition-all hover:bg-blue-700"
          >
            Nadogradite paket
          </a>
        </div>
      </div>
    );
  }

  const { data: agencyClients } = await supabase
    .from("agency_clients")
    .select(`
      id, status, crm_stage, notes, contract_start, contract_end,
      monthly_fee, created_at, updated_at, company_id,
      companies (
        id, name, jib, industry, contact_email, contact_phone,
        operating_regions, keywords, cpv_codes
      )
    `)
    .eq("agency_user_id", user.id)
    .order("created_at", { ascending: false });

  const clients = (agencyClients ?? []) as Array<{
    id: string;
    status: string;
    crm_stage: string;
    notes: string | null;
    contract_start: string | null;
    contract_end: string | null;
    monthly_fee: number | null;
    created_at: string;
    updated_at: string;
    company_id: string;
    companies: {
      id: string;
      name: string;
      jib: string;
      industry: string | null;
      contact_email: string | null;
      contact_phone: string | null;
      operating_regions: string[] | null;
      keywords: string[] | null;
      cpv_codes: string[] | null;
    } | null;
  }>;

  const companyIds = clients.map((c) => c.company_id).filter(Boolean);

  const bidsByCompany: Record<string, { total: number; won: number; active: number }> = {};
  const docsByCompany: Record<string, number> = {};
  const alertsByCompany: Record<string, Array<{
    type: "missing_docs" | "deadline_soon" | "doc_expiring" | "contract_expiring" | "inactive_client" | "submitted_no_update";
    label: string;
    detail: string;
    href: string;
    severity: "critical" | "warning" | "info";
    bidId?: string;
    clientId?: string;
  }>> = {};

  if (companyIds.length > 0) {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const nowIso = now.toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { data: bidsData },
      { data: docsData },
      { data: activeBidsWithTenders },
      { data: expiringDocs },
      { data: checklistData },
    ] = await Promise.all([
      supabase.from("bids").select("company_id, status").in("company_id", companyIds),
      supabase.from("documents").select("company_id").in("company_id", companyIds),
      // Active bids with tender deadlines
      supabase
        .from("bids")
        .select("id, company_id, status, created_at, tenders(id, title, deadline)")
        .in("company_id", companyIds)
        .in("status", ["draft", "in_review", "submitted"])
        .order("created_at", { ascending: false }),
      // Expiring documents
      supabase
        .from("documents")
        .select("id, company_id, name, expires_at")
        .in("company_id", companyIds)
        .not("expires_at", "is", null)
        .lte("expires_at", in30Days)
        .gte("expires_at", nowIso),
      // Checklist items with missing status
      supabase
        .from("bid_checklist_items")
        .select("id, bid_id, title, status, document_type")
        .eq("status", "missing"),
    ]);

    // Build bid counts
    for (const bid of bidsData ?? []) {
      if (!bid.company_id) continue;
      if (!bidsByCompany[bid.company_id]) bidsByCompany[bid.company_id] = { total: 0, won: 0, active: 0 };
      bidsByCompany[bid.company_id].total++;
      if (bid.status === "won") bidsByCompany[bid.company_id].won++;
      if (["draft", "in_review", "submitted"].includes(bid.status)) bidsByCompany[bid.company_id].active++;
    }

    // Build doc counts
    for (const doc of docsData ?? []) {
      if (!doc.company_id) continue;
      docsByCompany[doc.company_id] = (docsByCompany[doc.company_id] ?? 0) + 1;
    }

    // Build missing checklist set per bid
    const missingByBid = new Map<string, string[]>();
    for (const item of checklistData ?? []) {
      if (!missingByBid.has(item.bid_id)) missingByBid.set(item.bid_id, []);
      missingByBid.get(item.bid_id)!.push(item.document_type ?? item.title);
    }

    // Build company → agencyClientId map
    const companyToClientId = new Map<string, string>();
    for (const c of clients) {
      if (c.companies?.id) companyToClientId.set(c.companies.id, c.id);
    }

    // Build alerts per company
    for (const bid of (activeBidsWithTenders ?? []) as Array<{
      id: string;
      company_id: string;
      status: string;
      created_at: string;
      tenders: { id: string; title: string; deadline: string | null } | null;
    }>) {
      if (!bid.company_id) continue;
      if (!alertsByCompany[bid.company_id]) alertsByCompany[bid.company_id] = [];
      const clientId = companyToClientId.get(bid.company_id) ?? "";
      const tenderTitle = bid.tenders?.title ?? "Nepoznat tender";
      const deadline = bid.tenders?.deadline;

      // Alert: missing checklist items
      const missing = missingByBid.get(bid.id) ?? [];
      if (missing.length > 0 && ["draft", "in_review"].includes(bid.status)) {
        alertsByCompany[bid.company_id].push({
          type: "missing_docs",
          label: tenderTitle,
          detail: `${missing.length} ${missing.length === 1 ? "dokument nedostaje" : "dokumenta nedostaju"} za predaju`,
          href: `/dashboard/bids/${bid.id}`,
          severity: "critical",
          bidId: bid.id,
          clientId,
        });
      }

      // Alert: deadline within 7 days
      if (deadline && deadline > nowIso && deadline <= in7Days) {
        const daysLeft = Math.ceil((new Date(deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        alertsByCompany[bid.company_id].push({
          type: "deadline_soon",
          label: tenderTitle,
          detail: daysLeft <= 1 ? "Rok je sutra ili danas" : `${daysLeft} dana do roka predaje`,
          href: `/dashboard/bids/${bid.id}`,
          severity: "critical",
          bidId: bid.id,
          clientId,
        });
      }

      // Alert: submitted bid with no update for 14+ days (possible result pending)
      if (bid.status === "submitted") {
        const submittedDaysAgo = Math.floor((now.getTime() - new Date(bid.created_at).getTime()) / (1000 * 60 * 60 * 24));
        if (submittedDaysAgo >= 14) {
          alertsByCompany[bid.company_id].push({
            type: "submitted_no_update",
            label: tenderTitle,
            detail: `Predano prije ${submittedDaysAgo} dana — ažurirajte ishod`,
            href: `/dashboard/bids/${bid.id}`,
            severity: "info",
            bidId: bid.id,
            clientId,
          });
        }
      }
    }

    // Alert: expiring documents
    for (const doc of (expiringDocs ?? []) as Array<{ id: string; company_id: string; name: string; expires_at: string }>) {
      if (!alertsByCompany[doc.company_id]) alertsByCompany[doc.company_id] = [];
      const clientId = companyToClientId.get(doc.company_id) ?? "";
      const daysLeft = Math.ceil((new Date(doc.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      alertsByCompany[doc.company_id].push({
        type: "doc_expiring",
        label: doc.name,
        detail: daysLeft <= 7 ? `Ističe za ${daysLeft} ${daysLeft === 1 ? "dan" : "dana"}` : `Ističe za ${daysLeft} dana`,
        href: `/dashboard/agency/clients/${clientId}/documents`,
        severity: daysLeft <= 7 ? "critical" : "warning",
        clientId,
      });
    }

    // Alert: contract expiring within 30 days
    for (const client of clients) {
      if (!client.contract_end) continue;
      if (client.contract_end > nowIso && client.contract_end <= in30Days) {
        const companyId = client.companies?.id;
        if (!companyId) continue;
        if (!alertsByCompany[companyId]) alertsByCompany[companyId] = [];
        const daysLeft = Math.ceil((new Date(client.contract_end).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        alertsByCompany[companyId].push({
          type: "contract_expiring",
          label: client.companies?.name ?? "Klijent",
          detail: `Ugovor ističe za ${daysLeft} ${daysLeft === 1 ? "dan" : "dana"}`,
          href: `/dashboard/agency/clients/${client.id}`,
          severity: daysLeft <= 7 ? "critical" : "warning",
          clientId: client.id,
        });
      }

      // Alert: active client with no bids in 30 days
      if (client.crm_stage === "active") {
        const companyId = client.companies?.id;
        if (!companyId) continue;
        const activeBids = bidsByCompany[companyId]?.active ?? 0;
        const lastActivity = client.updated_at;
        if (activeBids === 0 && lastActivity < thirtyDaysAgo) {
          if (!alertsByCompany[companyId]) alertsByCompany[companyId] = [];
          alertsByCompany[companyId].push({
            type: "inactive_client",
            label: client.companies?.name ?? "Klijent",
            detail: "Aktivan klijent bez otvorenih ponuda 30+ dana",
            href: `/dashboard/agency/clients/${client.id}/tenders`,
            severity: "info",
            clientId: client.id,
          });
        }
      }
    }
  }

  // Fetch latest grants for the agency dashboard
  const { data: grantsData } = await supabase
    .from("opportunities")
    .select("id, slug, type, title, issuer, deadline, value")
    .eq("published", true)
    .eq("type", "poticaj")
    .order("created_at", { ascending: false })
    .limit(5);

  const grants = (grantsData ?? []) as {
    id: string; slug: string; type: string; title: string;
    issuer: string; deadline: string | null; value: number | null;
  }[];

  return (
    <AgencyCRMDashboard
      clients={clients}
      bidsByCompany={bidsByCompany}
      docsByCompany={docsByCompany}
      alertsByCompany={alertsByCompany}
      grants={grants}
    />
  );
}
