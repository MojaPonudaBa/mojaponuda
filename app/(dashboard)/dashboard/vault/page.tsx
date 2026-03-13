import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDemoDocuments, isCompanyProfileComplete, isDemoUser } from "@/lib/demo";
import type { Company, Document } from "@/types/database";
import { DocumentGrid } from "@/components/vault/document-grid";
import { AddDocumentModal } from "@/components/vault/add-document-modal";

export default async function VaultPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const isDemoAccount = isDemoUser(user.email);
  const { data: companyData } = await supabase
    .from("companies")
    .select("id, jib")
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
            Trezor Dokumenata
          </h1>
          <p className="mt-1 text-base text-slate-500">
            Upravljajte dokumentima firme i pratite rokove isteka.
          </p>
        </div>
        <AddDocumentModal />
      </div>

      <DocumentGrid documents={documents} />
    </div>
  );
}
