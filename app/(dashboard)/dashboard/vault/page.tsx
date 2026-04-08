import { redirect } from "next/navigation";
import { AddDocumentModal } from "@/components/vault/add-document-modal";
import { AgencyDocumentFolders } from "@/components/vault/agency-document-folders";
import { DocumentGrid } from "@/components/vault/document-grid";
import { getDemoDocuments, isCompanyProfileComplete, isDemoUser } from "@/lib/demo";
import { getSubscriptionStatus, isAgencyPlan } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";
import type { Company, Document } from "@/types/database";

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

    if (companyIds.length > 0) {
      const { data: docsData } = await supabase
        .from("documents")
        .select("*")
        .in("company_id", companyIds)
        .order("created_at", { ascending: false });

      allDocs = (docsData ?? []) as Array<Document & { company_id: string }>;
    }

    const folders = clientCompanies.map((client) => ({
      clientName: client.companyName,
      agencyClientId: client.agencyClientId,
      documents: allDocs.filter((document) => document.company_id === client.companyId),
    }));

    return (
      <div className="mx-auto max-w-[1200px] space-y-6">
        <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_30%),linear-gradient(180deg,#111827_0%,#0f172a_58%,#0b1120_100%)] p-6 text-white shadow-[0_35px_90px_-45px_rgba(2,6,23,0.92)] sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:52px_52px] [mask-image:radial-gradient(circle_at_top_left,#000_15%,transparent_75%)]" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-heading font-bold tracking-tight text-white sm:text-4xl">Dokumenti klijenata</h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                Dokumenti svih klijenata, organizovani po folderima i spremljeni u uredan premium pregled bez gužve i prelamanja.
              </p>
            </div>
            <AddDocumentModal />
          </div>
        </section>

        <AgencyDocumentFolders folders={folders} />
      </div>
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

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_30%),linear-gradient(180deg,#111827_0%,#0f172a_58%,#0b1120_100%)] p-6 text-white shadow-[0_35px_90px_-45px_rgba(2,6,23,0.92)] sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:52px_52px] [mask-image:radial-gradient(circle_at_top_left,#000_15%,transparent_75%)]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold tracking-tight text-white sm:text-4xl">Dokumenti</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
              Sigurni trezor za dokumente firme, sa preglednim statusima isteka i akcijama koje ostaju čiste i čitljive.
            </p>
          </div>
          <AddDocumentModal />
        </div>
      </section>

      <DocumentGrid documents={documents} />
    </div>
  );
}
