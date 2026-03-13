import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isCompanyProfileComplete } from "@/lib/demo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileSettings } from "@/components/settings/profile-settings";
import { DangerZone } from "@/components/settings/danger-zone";
import { Building2, ShieldAlert } from "lucide-react";
import type { Company } from "@/types/database";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("companies")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const company = data as Company | null;

  if (!company) {
    redirect("/onboarding");
  }

  return (
    <div className="max-w-[1000px] mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">
          Postavke
        </h1>
        <p className="mt-2 text-base text-slate-500">
          Upravljajte profilom firme, postavkama pretrage i vašim računom.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-white border border-slate-200 p-1 h-auto rounded-xl">
          <TabsTrigger 
            value="profile" 
            className="rounded-lg px-4 py-2 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 font-medium"
          >
            <Building2 className="mr-2 size-4" />
            Profil firme
          </TabsTrigger>
          <TabsTrigger 
            value="account" 
            className="rounded-lg px-4 py-2 data-[state=active]:bg-red-50 data-[state=active]:text-red-700 font-medium text-slate-500 hover:text-slate-700"
          >
            <ShieldAlert className="mr-2 size-4" />
            Račun & Opasna zona
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="focus-visible:ring-0">
          <ProfileSettings 
            company={{
              id: company.id,
              name: company.name,
              jib: company.jib,
              pdv: company.pdv,
              address: company.address,
              contact_email: company.contact_email,
              contact_phone: company.contact_phone,
              cpv_codes: company.cpv_codes,
              keywords: company.keywords,
              operating_regions: company.operating_regions,
            }} 
          />
        </TabsContent>

        <TabsContent value="account" className="focus-visible:ring-0">
          <DangerZone />
        </TabsContent>
      </Tabs>
    </div>
  );
}
