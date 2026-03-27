import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus, isAgencyPlan } from "@/lib/subscription";
import type { Company } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Search, Briefcase, FileText, ArrowRight } from "lucide-react";

interface ClientDashboardPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDashboardPage(props: ClientDashboardPageProps) {
  const params = await props.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { plan } = await getSubscriptionStatus(user.id, user.email, supabase);
  if (!isAgencyPlan(plan)) {
    redirect("/dashboard");
  }

  // Verify this agency client belongs to this user
  const { data: agencyClient } = await supabase
    .from("agency_clients")
    .select("id, company_id, companies (id, name, jib, industry, keywords, cpv_codes, operating_regions)")
    .eq("id", params.id)
    .eq("agency_user_id", user.id)
    .maybeSingle();

  if (!agencyClient) {
    redirect("/dashboard/agency");
  }

  const company = agencyClient.companies as Company | null;

  if (!company) {
    redirect("/dashboard/agency");
  }

  // Fetch summary counts
  const [{ count: bidsCount }, { count: documentsCount }] = await Promise.all([
    supabase
      .from("bids")
      .select("*", { count: "exact", head: true })
      .eq("company_id", company.id),
    supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("company_id", company.id),
  ]);

  const sections = [
    {
      title: "Tenderi",
      description: "Preporučeni tenderi za ovog klijenta",
      icon: Search,
      href: `/dashboard/client/${params.id}/tenders`,
      color: "blue",
    },
    {
      title: "Ponude",
      description: `${bidsCount ?? 0} ponuda`,
      icon: Briefcase,
      href: `/dashboard/client/${params.id}/bids`,
      color: "violet",
    },
    {
      title: "Dokumenti",
      description: `${documentsCount ?? 0} dokumenata`,
      icon: FileText,
      href: `/dashboard/client/${params.id}/vault`,
      color: "emerald",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">
          {company.name}
        </h1>
        <p className="mt-1 text-base text-slate-500">
          Kompletan dashboard za ovog klijenta - tenderi, ponude i dokumenti
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-slate-300"
          >
            <div className={`mb-4 flex size-12 items-center justify-center rounded-xl bg-${section.color}-50 text-${section.color}-600`}>
              <section.icon className="size-6" />
            </div>
            <h3 className="mb-1 text-lg font-heading font-bold text-slate-900">
              {section.title}
            </h3>
            <p className="text-sm text-slate-500">{section.description}</p>
            <ArrowRight className="absolute bottom-6 right-6 size-5 text-slate-400 transition-transform group-hover:translate-x-1" />
          </Link>
        ))}
      </div>
    </div>
  );
}
