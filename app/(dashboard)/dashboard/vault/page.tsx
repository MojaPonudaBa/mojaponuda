import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  // Dohvati firmu korisnika
  const { data: companyData } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const company = companyData as Company | null;

  if (!company) {
    redirect("/onboarding");
  }

  // Dohvati sve dokumente firme
  const { data: documentsData } = await supabase
    .from("documents")
    .select("*")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  const documents = (documentsData as Document[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">
            Trezor Dokumenata
          </h1>
          <p className="mt-1.5 text-base text-slate-500">
            Upravljajte dokumentima firme i pratite rokove isteka.
          </p>
        </div>
        <AddDocumentModal />
      </div>

      <DocumentGrid documents={documents} />
    </div>
  );
}
