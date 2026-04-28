import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { KanbanBoard, type KanbanBid } from "@/components/bids/kanban-board";
import { Button } from "@/components/ui/button";
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

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-2 py-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900 sm:text-3xl">
            Tok ponuda
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Pratite svaki projekat od nacrta do ishoda. Prevucite kartice između kolona.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link href="/dashboard/bids">Tabelarni prikaz</Link></Button>
          <Button asChild><Link href="/dashboard/tenders">+ Nova ponuda</Link></Button>
        </div>
      </div>

      {bids.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-slate-700">
            Još nemate ponuda. Otvorite tender i kliknite <em>Kreiraj ponudu</em>.
          </p>
          <Button asChild className="mt-4"><Link href="/dashboard/tenders">Pregledaj tendere</Link></Button>
        </div>
      ) : (
        <KanbanBoard initialBids={bids} />
      )}
    </div>
  );
}
