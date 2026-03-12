import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Neautorizovan pristup." }, { status: 401 });
  }

  // Dohvati company_id korisnika
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!company) {
    return NextResponse.json(
      { error: "Firma nije pronađena." },
      { status: 404 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const name = formData.get("name") as string | null;
  const type = formData.get("type") as string | null;
  const expiresAt = formData.get("expires_at") as string | null;

  if (!file || !name) {
    return NextResponse.json(
      { error: "Naziv i fajl su obavezni." },
      { status: 400 }
    );
  }

  // Upload u Supabase Storage: {company_id}/{timestamp}_{filename}
  const timestamp = Date.now();
  const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${company.id}/${timestamp}_${sanitizedFilename}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    return NextResponse.json(
      { error: "Greška pri uploadu fajla." },
      { status: 500 }
    );
  }

  // Kreiraj zapis u bazi
  const { data: document, error: dbError } = await supabase
    .from("documents")
    .insert({
      company_id: company.id,
      name: name.trim(),
      type: type || null,
      file_path: storagePath,
      expires_at: expiresAt || null,
    })
    .select()
    .single();

  if (dbError) {
    console.error("DB insert error:", dbError);
    // Pokušaj obrisati uploadani fajl ako DB insert propadne
    await supabase.storage.from("documents").remove([storagePath]);
    return NextResponse.json(
      { error: "Greška pri spremanju dokumenta." },
      { status: 500 }
    );
  }

  return NextResponse.json({ document }, { status: 201 });
}
