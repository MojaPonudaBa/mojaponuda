import { redirect } from "next/navigation";
import { VaultHubClient } from "@/components/dashboard/vault-hub-client";
import { getDemoDocuments, isCompanyProfileComplete, isDemoUser } from "@/lib/demo";
import { getSubscriptionStatus, isAgencyPlan } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";
import {
  buildVaultCategoryGroups,
  buildVaultRisks,
  buildVaultTenderGroups,
  type VaultBidDocumentUsage,
  type VaultClientFolder,
} from "@/lib/dashboard-c3";
import type { Company, Document } from "@/types/db-aliases";

export default async function VaultPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { plan } = await getSubscriptionStatus(user.id, user.email, supabase);
  const isAgency = isAgencyPlan(plan);
  const isDemoAccount = isDemoUser(user.email);

  if (isAgency) {
    const { data: acRows } = await supabase
      .from("agency_clients")
      .select("id, company_id, companies (id, name)")
      .eq("agency_user_id", user.id)
      .order("created_at", { ascending: false });

    const clientCompanies = (acRows ?? []).map((row) => {
      const company = row.companies as { id: string; name: string } | null;
      return {
        agencyClientId: row.id,
        companyId: company?.id ?? row.company_id,
        companyName: company?.name ?? "Nepoznat",
      };
    });

    const companyIds = clientCompanies.map((company) => company.companyId);
    let allDocs: Array<Document & { company_id: string }> = [];
    let usage: VaultBidDocumentUsage[] = [];

    if (companyIds.length > 0) {
      const [{ data: docsData }, { data: usageData }] = await Promise.all([
        supabase
          .from("documents")
          .select("*")
          .in("company_id", companyIds)
          .order("created_at", { ascending: false }),
        supabase
          .from("bid_documents")
          .select("document_id, bid_id, checklist_item_name, bids!inner(company_id, tenders(title))")
          .in("bids.company_id", companyIds),
      ]);

      allDocs = (docsData ?? []) as Array<Document & { company_id: string }>;
      usage = ((usageData ?? []) as Array<{
        document_id: string;
        bid_id: string;
        checklist_item_name: string | null;
        bids: { tenders: { title: string | null } | null } | null;
      }>).map((item) => ({
        document_id: item.document_id,
        bid_id: item.bid_id,
        checklist_item_name: item.checklist_item_name,
        tender_title: item.bids?.tenders?.title ?? null,
      }));
    }

    const folders: VaultClientFolder[] = clientCompanies.map((client) => ({
      companyName: client.companyName,
      agencyClientId: client.agencyClientId,
      companyId: client.companyId,
      documents: allDocs.filter((document) => document.company_id === client.companyId),
    }));

    return (
      <VaultHubClient
        data={{
          documents: allDocs,
          usage,
          folders,
          tenderGroups: buildVaultTenderGroups(usage),
          categoryGroups: buildVaultCategoryGroups(allDocs),
          risks: buildVaultRisks(allDocs, usage, "/dashboard/vault"),
          isAgency: true,
          companyName: "Agencijski klijenti",
        }}
      />
    );
  }

  const { data: companyData } = await supabase
    .from("companies")
    .select("id, jib, industry, keywords")
    .eq("user_id", user.id)
    .maybeSingle();

  const company = companyData as Company | null;
  if (!isCompanyProfileComplete(company)) redirect("/onboarding");

  const resolvedCompany = company as Company;
  const { data: documentsData } = await supabase
    .from("documents")
    .select("*")
    .eq("company_id", resolvedCompany.id)
    .order("created_at", { ascending: false });

  const documents = ((documentsData as Document[] | null) ?? []).length > 0
    ? ((documentsData as Document[] | null) ?? [])
    : isDemoAccount
      ? getDemoDocuments(resolvedCompany.id)
      : [];

  const { data: usageData } = await supabase
    .from("bid_documents")
    .select("document_id, bid_id, checklist_item_name, bids!inner(company_id, tenders(title))")
    .eq("bids.company_id", resolvedCompany.id);

  const usage: VaultBidDocumentUsage[] = ((usageData ?? []) as Array<{
    document_id: string;
    bid_id: string;
    checklist_item_name: string | null;
    bids: { tenders: { title: string | null } | null } | null;
  }>).map((item) => ({
    document_id: item.document_id,
    bid_id: item.bid_id,
    checklist_item_name: item.checklist_item_name,
    tender_title: item.bids?.tenders?.title ?? null,
  }));

  return (
    <VaultHubClient
      data={{
        documents,
        usage,
        folders: [],
        tenderGroups: buildVaultTenderGroups(usage),
        categoryGroups: buildVaultCategoryGroups(documents),
        risks: buildVaultRisks(documents, usage, "/dashboard/vault"),
        isAgency: false,
        companyName: "Moja firma",
      }}
    />
  );
}
