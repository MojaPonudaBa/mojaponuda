import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription";
import {
  buildRecommendationContext,
  fetchRecommendedTenderCandidates,
  hasRecommendationSignals,
  scoreTenderRecommendation,
  type RecommendationTenderInput,
} from "@/lib/tender-recommendations";
import { TenderCard } from "@/components/tenders/tender-card";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AgencyClientTendersToggle } from "@/components/agency/agency-client-tenders-toggle";

const TOP_N = 10;

export default async function AgencyClientTendersPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const showAllBiH = sp.allBiH === "true";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { plan } = await getSubscriptionStatus(user.id, user.email);
  if (plan.id !== "agency") redirect("/dashboard");

  const { data: agencyClient } = await supabase
    .from("agency_clients")
    .select(`
      id, company_id,
      companies (
        id, name, industry, cpv_codes, keywords, operating_regions
      )
    `)
    .eq("id", id)
    .eq("agency_user_id", user.id)
    .maybeSingle();

  if (!agencyClient) notFound();

  const company = agencyClient.companies as {
    id: string; name: string; industry: string | null;
    cpv_codes: string[] | null; keywords: string[] | null; operating_regions: string[] | null;
  } | null;

  if (!company) notFound();

  const recommendationContext = buildRecommendationContext({
    industry: company.industry,
    keywords: company.keywords,
    cpv_codes: company.cpv_codes,
    operating_regions: company.operating_regions,
  });

  if (!hasRecommendationSignals(recommendationContext)) {
    return (
      <div className="space-y-6 max-w-[1200px] mx-auto">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">
            Tenderi — {company.name}
          </h1>
          <p className="mt-1.5 text-base text-slate-500">
            Preporučeni tenderi za ovog klijenta na osnovu profila firme.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <Sparkles className="size-8" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-slate-900">Profil nije dovoljno popunjen</h3>
          <p className="mb-6 max-w-md text-slate-500">
            Da bi sistem mogao preporučiti tendere, profil klijenta mora imati djelatnosti, lokaciju ili opis.
          </p>
          <Button asChild>
            <Link href={`/dashboard/agency/clients/${id}`}>Nazad na klijenta</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Fetch existing bids for this company to mark already-bid tenders
  const [{ data: existingBids }, candidates] = await Promise.all([
    supabase.from("bids").select("tender_id").eq("company_id", company.id),
    fetchRecommendedTenderCandidates<RecommendationTenderInput>(
      supabase,
      recommendationContext,
      {
        limit: 300,
        select: "id, title, deadline, estimated_value, contracting_authority, contracting_authority_jib, contract_type, raw_description, cpv_code, ai_analysis, authority_city, authority_municipality, authority_canton, authority_entity",
      }
    ),
  ]);

  const existingBidTenderIds = new Set((existingBids ?? []).map((b) => b.tender_id));

  // Score all candidates
  const allScored = candidates
    .map((tender) => scoreTenderRecommendation(tender, recommendationContext))
    .filter((s) => !existingBidTenderIds.has(s.tender.id))
    .filter((s) => s.score >= 2 && !s.negativeTitleMatches.length);

  // Sort by location priority (local first), then by score within each tier
  const sorted = [...allScored].sort((a, b) => {
    if (!showAllBiH && a.locationPriority !== b.locationPriority) {
      return a.locationPriority - b.locationPriority;
    }
    if (a.score !== b.score) return b.score - a.score;
    if (a.positiveSignalCount !== b.positiveSignalCount) return b.positiveSignalCount - a.positiveSignalCount;
    return new Date(a.tender.deadline ?? 0).getTime() - new Date(b.tender.deadline ?? 0).getTime();
  });

  const tenders = sorted.slice(0, TOP_N).map((s) => ({
    ...s.tender,
    score: s.score,
    reasons: s.reasons,
    locationScope: s.locationScope,
  }));

  const hasRegions = (company.operating_regions ?? []).length > 0;

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">
            Tenderi — {company.name}
          </h1>
          <p className="mt-1.5 text-base text-slate-500">
            Top {TOP_N} preporučenih tendera, sortirani po blizini lokacije klijenta.
          </p>
        </div>
        {hasRegions && (
          <AgencyClientTendersToggle clientId={id} showAllBiH={showAllBiH} />
        )}
      </div>

      {tenders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Sparkles className="size-8" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-slate-900">Nema preporučenih tendera</h3>
          <p className="max-w-md text-slate-500">
            Trenutno nema aktivnih tendera koji odgovaraju profilu ovog klijenta. Provjerite ponovo kasnije.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {tenders.map((tender) => (
            <TenderCard
              key={tender.id}
              tender={tender as any}
            />
          ))}
        </div>
      )}
    </div>
  );
}
