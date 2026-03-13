import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isCompanyProfileComplete } from "@/lib/demo";
import { LandingPage } from "@/components/landing/landing-page";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: company } = await supabase
      .from("companies")
      .select("jib")
      .eq("user_id", user.id)
      .maybeSingle();

    if (isCompanyProfileComplete(company)) {
      redirect("/dashboard");
    }
  }

  return <LandingPage />;
}
