import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Provjeri autentifikaciju
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Niste prijavljeni." },
      { status: 401 }
    );
  }

  // 2. Dohvati firmu korisnika
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!company) {
    return NextResponse.json(
      { error: "Firma nije pronađena." },
      { status: 403 }
    );
  }

  // 3. Dohvati dokument
  const { data: document } = await supabase
    .from("documents")
    .select("id, file_path, company_id")
    .eq("id", id)
    .single();

  if (!document) {
    return NextResponse.json(
      { error: "Dokument nije pronađen." },
      { status: 404 }
    );
  }

  // 4. Provjeri vlasništvo
  if (document.company_id !== company.id) {
    return NextResponse.json(
      { error: "Nemate pristup ovom dokumentu." },
      { status: 403 }
    );
  }

  // 5. Generiraj signed URL (60 minuta)
  const { data: signedUrl, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(document.file_path, 60 * 60);

  if (error || !signedUrl) {
    return NextResponse.json(
      { error: "Greška pri generisanju linka." },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: signedUrl.signedUrl });
}
