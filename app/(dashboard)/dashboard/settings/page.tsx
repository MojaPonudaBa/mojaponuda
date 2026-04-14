import { redirect } from "next/navigation";
import { Building2, ShieldAlert, Users } from "lucide-react";
import { DangerZone } from "@/components/settings/danger-zone";
import { ProfileSettings } from "@/components/settings/profile-settings";
import { TeamSettings } from "@/components/settings/team-settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSubscriptionStatus, isAgencyPlan } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";
import type { Company } from "@/types/database";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const status = await getSubscriptionStatus(user.id, user.email, supabase);
  const isAgency = isAgencyPlan(status.plan);

  if (isAgency) {
    return (
      <div className="mx-auto max-w-[1000px] space-y-6">
        <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_30%),linear-gradient(180deg,#111827_0%,#0f172a_58%,#0b1120_100%)] p-6 text-white shadow-[0_35px_90px_-45px_rgba(2,6,23,0.92)] sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:52px_52px] [mask-image:radial-gradient(circle_at_top_left,#000_15%,transparent_75%)]" />
          <div className="relative">
              <h1 className="text-3xl font-heading font-bold tracking-tight text-white sm:text-4xl">Postavke agencije</h1>
              <p className="mt-2 text-sm leading-7 text-slate-300 sm:text-base">
                Ovdje uređujete postavke agencije i svog računa.
              </p>
          </div>
        </section>

        <Tabs defaultValue="team" className="space-y-5">
          <TabsList className="w-full justify-start sm:w-auto">
            <TabsTrigger value="team">
              <Users className="size-4" />
              Tim
            </TabsTrigger>
            <TabsTrigger value="account">
              <ShieldAlert className="size-4" />
              Račun i opasna zona
            </TabsTrigger>
          </TabsList>

          <TabsContent value="team" className="focus-visible:ring-0">
            <TeamSettings status={status} />
          </TabsContent>

          <TabsContent value="account" className="focus-visible:ring-0">
            <DangerZone />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  const { data } = await supabase
    .from("companies")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const company = data as Company | null;
  if (!company) redirect("/onboarding");

  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_30%),linear-gradient(180deg,#111827_0%,#0f172a_58%,#0b1120_100%)] p-6 text-white shadow-[0_35px_90px_-45px_rgba(2,6,23,0.92)] sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:52px_52px] [mask-image:radial-gradient(circle_at_top_left,#000_15%,transparent_75%)]" />
        <div className="relative">
          <h1 className="text-3xl font-heading font-bold tracking-tight text-white sm:text-4xl">Postavke</h1>
          <p className="mt-2 text-sm leading-7 text-slate-300 sm:text-base">
            Upravljajte profilom firme, timom i računom bez vizuelnog šuma i sa jasnim razmakom između sekcija.
          </p>
        </div>
      </section>

      <Tabs defaultValue="profile" className="space-y-5">
        <TabsList className="w-full justify-start sm:w-auto">
          <TabsTrigger value="profile">
            <Building2 className="size-4" />
            Profil firme
          </TabsTrigger>
          <TabsTrigger value="team">
            <Users className="size-4" />
            Tim
          </TabsTrigger>
          <TabsTrigger value="account">
            <ShieldAlert className="size-4" />
            Račun i opasna zona
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
              industry: company.industry,
              cpv_codes: company.cpv_codes,
              keywords: company.keywords,
              operating_regions: company.operating_regions,
            }}
          />
        </TabsContent>

        <TabsContent value="team" className="focus-visible:ring-0">
          <TeamSettings status={status} />
        </TabsContent>

        <TabsContent value="account" className="focus-visible:ring-0">
          <DangerZone />
        </TabsContent>
      </Tabs>
    </div>
  );
}
