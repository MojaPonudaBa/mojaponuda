import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus, isAgencyPlan } from "@/lib/subscription";
import type { Document } from "@/types/database";
import { DocumentGrid } from "@/components/vault/document-grid";
import { AddDocumentModal } from "@/components/vault/add-document-modal";
import { DonutChart } from "@/components/ui/donut-chart";
import { formatBytes, getDocumentTypeChart } from "@/lib/dashboard-c3";
import { getExpiryStatus } from "@/lib/vault/constants";
import { Archive, Database, FileText, ShieldAlert } from "lucide-react";

export default async function AgencyClientDocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { plan } = await getSubscriptionStatus(user.id, user.email);
  if (!isAgencyPlan(plan)) redirect("/dashboard");

  const { data: agencyClient } = await supabase
    .from("agency_clients")
    .select("id, company_id, companies (id, name)")
    .eq("id", id)
    .eq("agency_user_id", user.id)
    .maybeSingle();

  if (!agencyClient) notFound();

  const company = agencyClient.companies as { id: string; name: string } | null;
  if (!company) notFound();

  const { data: documentsData } = await supabase
    .from("documents")
    .select("*")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  const documents = (documentsData ?? []) as Document[];
  const expiringCount = documents.filter((document) => ["danger", "warning"].includes(getExpiryStatus(document.expires_at))).length;
  const totalBytes = documents.reduce((sum, document) => sum + Number(document.size ?? 0), 0);
  const typeChart = getDocumentTypeChart(documents);
  const latestDocuments = documents.slice(0, 4);

  return (
    <div className="mx-auto max-w-[1360px] space-y-6">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_30%),linear-gradient(180deg,#111827_0%,#0f172a_58%,#0b1120_100%)] p-6 text-white shadow-[0_35px_90px_-45px_rgba(2,6,23,0.92)] sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:52px_52px] [mask-image:radial-gradient(circle_at_top_left,#000_18%,transparent_75%)]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200">
              <Database className="size-3.5 text-sky-300" aria-hidden="true" />
              Klijent dokumenti
            </span>
            <h1 className="mt-4 font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Dokumenti — {company.name}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
              Klijentski trezor sa rokovima, tipovima dokumenata i pregledom fajlova koji se koriste u ponudama.
            </p>
          </div>
          <AddDocumentModal />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { title: "Dokumenti", value: documents.length, description: "Ukupno za klijenta", icon: FileText, tone: "bg-blue-50 text-blue-600" },
          { title: "Pred istekom", value: expiringCount, description: "60 dana ili manje", icon: ShieldAlert, tone: "bg-amber-50 text-amber-600" },
          { title: "Tipovi", value: typeChart.length, description: "Kategorije dokumenata", icon: Archive, tone: "bg-purple-50 text-purple-600" },
          { title: "Storage", value: formatBytes(totalBytes), description: "Procjena po dokumentima", icon: Database, tone: "bg-cyan-50 text-cyan-600" },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.title} className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-1)] p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-[var(--text-secondary)]">{card.title}</p>
                  <p className="mt-1 text-2xl font-semibold tracking-normal text-[var(--text-primary)]">{card.value}</p>
                </div>
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-input)] ${card.tone}`}>
                  <Icon className="size-5" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-4 text-xs text-[var(--text-tertiary)]">{card.description}</p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <DocumentGrid documents={documents} />
        </div>

        <aside className="space-y-4">
          <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-heading text-base font-bold text-slate-900">Tipovi dokumenata</h2>
            <DonutChart data={typeChart} height={220} centerLabel="tipova" centerValue={typeChart.length} showLegend={false} valueSuffix="dokumenata" />
          </section>
          <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-heading text-base font-bold text-slate-900">Nedavno dodano</h2>
            <div className="mt-4 space-y-3">
              {latestDocuments.length > 0 ? latestDocuments.map((document) => (
                <div key={document.id} className="flex gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <FileText className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">{document.name}</p>
                    <p className="text-xs text-slate-500">{document.type || "Ostalo"}</p>
                  </div>
                </div>
              )) : (
                <p className="text-sm leading-6 text-slate-500">Još nema dokumenata za ovog klijenta.</p>
              )}
            </div>
          </section>
          <section className="rounded-[1.5rem] border border-amber-100 bg-amber-50/70 p-5">
            <h2 className="font-heading text-base font-bold text-slate-900">Upload napomena</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Upload koristi postojeći produkcijski API za dokumente i nije mijenjan u ovoj fazi.
            </p>
          </section>
        </aside>
      </section>
    </div>
  );
}
