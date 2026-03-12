import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Company } from "@/types/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingForm } from "@/components/onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Dohvati firmu korisnika
  const { data } = await supabase
    .from("companies")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const company = data as Company | null;

  if (!company) {
    redirect("/login");
  }

  // Ako je firma već popunjena (ima JIB), preusmjeri na dashboard
  if (company.jib && company.jib.length > 0) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg">
        <Card className="border-border bg-card">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold tracking-tight">
              Dobrodošli na MojaPonuda<span className="text-primary">.ba</span>
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Popunite podatke o vašoj firmi da biste mogli koristiti platformu.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OnboardingForm companyId={company.id} companyName={company.name} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
