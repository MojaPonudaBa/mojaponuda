import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDemoDocuments, isCompanyProfileComplete, isDemoUser } from "@/lib/demo";
import { getSubscriptionStatus, isAgencyPlan } from "@/lib/subscription";
import type { Company, Document } from "@/types/database";
import { DocumentGrid } from "@/components/vault/document-grid";
import { AddDocumentModal } from "@/components/vault/add-document-modal";
import { AgencyDocumentFolders } from "@/components/vault/agency-document-folders";

export default async function VaultPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { plan } = await getSubscriptionStatus(user.id, user.email, supabase);
  const isAgency = isAgencyPlan(plan);
  const isDemoAccount = isDemoUser(user.email);

  // Agency: fetch documents across all client companies, grouped by client
  if (isAgency) {
    const { data: acRows } = await supabase
      .from("agency_clients")
      .select("id, company_id, companies (id, name)")
      .eq("agency_user_id", user.id)
      .order("created_at", { ascending: false });

    const clientCompanies = (acRows ?? []).map((row) => {
      const c = row.companies as { id: string; name: string } | null;
      return {
        agencyClientId: row.id,
        companyId: c?.id ?? row.company_id,
        companyName: c?.name ?? "Nepoznat",
      };
    });

    const companyIds = clientCompanies.map((c) => c.companyId);

    let allDocs: (Document & { company_id: string })[] = [];
    if (companyIds.length > 0) {
      const { data: docsData } = await supabase
        .from("documents")
        .select("*")
        .in("company_id", companyIds)
        .order("created_at", { ascending: false });

      allDocs = (docsData ?? []) as (Document & { company_id: string })[];
    }

    // Group into folders
    const folders = clientCompanies.map((client) => ({
      clientName: client.companyName,
      agencyClientId: client.agencyClientId,
      documents: allDocs.filter((d) => d.company_id === client.companyId),
    }));

    return (
      <div className="space-y-8 max-w-[1200px] mx-auto">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">
              Dokumenti klijenata
            </h1>
            <p className="mt-1 text-base text-slate-500">
              Dokumenti svih klijenata, organizovani po folderima. Svaki klijent ima svoj prostor.
            </p>
          </div>
          <AddDocumentModal />
        </div>

        <AgencyDocumentFolders folders={folders} />
      </div>
    );
  }

  // Regular user flow
  const { data: companyData } = await supabase
    .from("companies")
    .select("id, jib, industry, keywords")
    .eq("user_id", user.id)
    .maybeSingle();

  const company = companyData as Company | null;

  if (!isCompanyProfileComplete(company)) {
    redirect("/onboarding");
  }

  const resolvedCompany = company as Company;

  // Dohvati sve dokumente firme
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

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">
            Dokumenti
          </h1>
          <p className="mt-1 text-base text-slate-500">
            Ovdje čuvate dokumente firme i pratite rokove.
          </p>
        </div>
        <AddDocumentModal />
      </div>

      <DocumentGrid documents={documents} />
    </div>
  );
}
