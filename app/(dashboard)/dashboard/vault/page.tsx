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
      <div className="flex items-center justify-between border-b border-border pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Trezor dokumenata</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Centralizirano upravljanje dokumentima. Upload, pregled i automatsko praćenje isteka.
          </p>
        </div>
        <AddDocumentModal />
      </div>

      <DocumentGrid documents={documents} />
    </div>
  );
}
