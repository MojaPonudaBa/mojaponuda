import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { KanbanBoard, type KanbanBid } from "@/components/bids/kanban-board";
import { Button } from "@/components/ui/button";
import { AIInsightBox } from "@/components/ui/ai-insight-box";
import { BarChart3, Download, Plus, Sparkles } from "lucide-react";
import {
  getTenderDecisionInsights,
  type TenderDecisionTender,
} from "@/lib/tender-decision";

export const dynamic = "force-dynamic";

export default async function PonudePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: company } = await supabase
    .from("companies")
    .select("id, jib, industry, keywords, cpv_codes, operating_regions")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!company) {
    return (
      <div className="mx-auto max-w-3xl py-20 text-center">
        <h1 className="text-2xl font-heading font-bold text-slate-900">Nema firme u profilu</h1>
        <p className="mt-2 text-slate-600">Završite onboarding da biste mogli pratiti ponude.</p>
        <Button asChild className="mt-6"><Link href="/onboarding">Nastavi onboarding</Link></Button>
      </div>
    );
  }

  // Fetch all bids for this company, join tender minimal fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anySupabase = supabase as any;
  const { data: rows } = await anySupabase
    .from("bids")
    .select(
      "id, status, bid_value, submission_deadline, created_at, kanban_position, tender_id, tenders(id, title, contracting_authority, contracting_authority_jib, deadline, estimated_value, contract_type, cpv_code, procedure_type, raw_description, ai_analysis, created_at)"
    )
    .eq("company_id", company.id)
    .order("kanban_position", { ascending: true })
    .order("created_at", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenderRows = ((rows ?? []) as any[])
    .map((r) => Array.isArray(r.tenders) ? r.tenders[0] : r.tenders)
    .filter(Boolean) as TenderDecisionTender[];
  const decisionInsights = await getTenderDecisionInsights(
    supabase,
    tenderRows,
    company
      ? {
          id: company.id,
          jib: company.jib,
          industry: company.industry,
          keywords: company.keywords,
          cpv_codes: company.cpv_codes,
          operating_regions: company.operating_regions,
        }
      : null,
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bids: KanbanBid[] = ((rows ?? []) as any[]).map((r) => {
    const t = Array.isArray(r.tenders) ? r.tenders[0] : r.tenders;
    const bidValue = r.bid_value ?? null;
    const submissionDeadline = r.submission_deadline ?? null;
    const insight = t ? decisionInsights.get(t.id) : null;
    return {
      id: r.id,
      status: r.status,
      tender_id: t?.id ?? r.tender_id,
      tender_title: t?.title ?? "(bez naslova)",
      authority_name: t?.contracting_authority ?? null,
      bid_value: bidValue,
      estimated_value: t?.estimated_value ?? null,
      deadline: submissionDeadline ?? t?.deadline ?? null,
      priority_score: insight?.priorityScore ?? null,
      win_probability:
        insight && insight.winProbability > 0 && insight.winConfidence !== "low"
          ? insight.winProbability
          : null,
      estimated_effort: insight?.estimatedEffort ?? null,
      recommendation: insight?.recommendationLabel ?? null,
    };
  });
  const activeValue = bids
    .filter((bid) => ["draft", "in_review", "submitted"].includes(bid.status))
    .reduce((sum, bid) => sum + (bid.bid_value ?? bid.estimated_value ?? 0), 0);
  const currentTime = new Date().getTime();
  const deadlineSoonCount = bids.filter((bid) => {
    if (!bid.deadline || ["won", "lost"].includes(bid.status)) return false;
    const days = Math.ceil((new Date(bid.deadline).getTime() - currentTime) / 86_400_000);
    return days >= 0 && days <= 14;
  }).length;
  const highPriorityCount = bids.filter((bid) => (bid.priority_score ?? 0) >= 70).length;

  return (
    <div className="mx-auto max-w-[1480px] space-y-6 px-2 py-4">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_30%),linear-gradient(180deg,#111827_0%,#0f172a_58%,#0b1120_100%)] p-6 text-white shadow-[0_35px_90px_-45px_rgba(2,6,23,0.92)] sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:52px_52px] [mask-image:radial-gradient(circle_at_top_left,#000_18%,transparent_75%)]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200">
              <BarChart3 className="size-3.5 text-emerald-300" />
              Pipeline kanban
            </span>
            <h1 className="mt-4 text-3xl font-heading font-bold text-white sm:text-4xl">
              Tok ponuda
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
              Pratite svaki projekat od nacrta do ishoda. Prevucite kartice između kolona; promjene se spremaju u Supabase.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" asChild className="rounded-xl bg-white/10 text-white hover:bg-white/15">
              <Link href="/dashboard/bids">Tabelarni prikaz</Link>
            </Button>
            <Button variant="secondary" className="rounded-xl bg-white/10 text-white hover:bg-white/15">
              <Download className="size-4" />
              Izvoz
            </Button>
            <Button asChild className="rounded-xl bg-blue-600 font-bold text-white hover:bg-blue-700">
              <Link href="/dashboard/tenders">
                <Plus className="size-4" />
                Nova ponuda
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {bids.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-slate-700">
            Još nemate ponuda. Otvorite tender i kliknite <em>Kreiraj ponudu</em>.
          </p>
          <Button asChild className="mt-4"><Link href="/dashboard/tenders">Pregledaj tendere</Link></Button>
        </div>
      ) : (
        <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_320px]">
          <KanbanBoard initialBids={bids} />
          <aside className="space-y-4 2xl:sticky 2xl:top-6 2xl:self-start">
            <AIInsightBox title="AI fokus za pipeline" variant="suggestion">
              <p>{highPriorityCount} ponuda ima prioritetni skor 70+ i treba dnevni follow-up.</p>
            </AIInsightBox>
            <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-heading text-base font-bold text-slate-950">Operativni uvidi</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <p className="flex items-center justify-between gap-3">
                  <span>Vrijednost aktivnih</span>
                  <span className="font-bold text-slate-950">{new Intl.NumberFormat("bs-BA", { maximumFractionDigits: 0 }).format(activeValue)} KM</span>
                </p>
                <p className="flex items-center justify-between gap-3">
                  <span>Rok do 14 dana</span>
                  <span className="font-bold text-amber-700">{deadlineSoonCount}</span>
                </p>
                <p className="flex items-center justify-between gap-3">
                  <span>AI visoki prioritet</span>
                  <span className="font-bold text-blue-700">{highPriorityCount}</span>
                </p>
              </div>
            </section>
            <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-purple-600" />
                <h2 className="font-heading text-base font-bold text-slate-950">Napomena</h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Pipeline koristi postojeći `bid_status` enum i `kanban_position`; nije dodana nova šesta status vrijednost bez migracije.
              </p>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
