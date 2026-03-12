import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Provjeri da li korisnik ima companies zapis (za email-confirmed signup)
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: existingCompany } = await supabase
          .from("companies")
          .select("id")
          .eq("user_id", user.id)
          .single();

        // Ako nema firme, kreiraj je iz user_metadata
        if (!existingCompany) {
          const companyName =
            user.user_metadata?.company_name || "Moja firma";

          await supabase.from("companies").insert({
            user_id: user.id,
            name: companyName,
            jib: "",
          });

          return NextResponse.redirect(`${origin}/onboarding`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
