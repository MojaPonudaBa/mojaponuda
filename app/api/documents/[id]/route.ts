import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Neautorizovan pristup." }, { status: 401 });
  }

  // Dohvati company korisnika
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!company) {
    return NextResponse.json({ error: "Firma nije pronađena." }, { status: 404 });
  }

  // Dohvati dokument i provjeri vlasništvo
  const { data: document } = await supabase
    .from("documents")
    .select("id, file_path, company_id")
    .eq("id", id)
    .single();

  if (!document || document.company_id !== company.id) {
    return NextResponse.json({ error: "Dokument nije pronađen." }, { status: 404 });
  }

  // Obriši iz Storage-a
  const { error: storageError } = await supabase.storage
    .from("documents")
    .remove([document.file_path]);

  if (storageError) {
    console.error("Storage delete error:", storageError);
  }

  // Obriši iz baze
  const { error: dbError } = await supabase
    .from("documents")
    .delete()
    .eq("id", id);

  if (dbError) {
    console.error("DB delete error:", dbError);
    return NextResponse.json(
      { error: "Greška pri brisanju dokumenta." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
