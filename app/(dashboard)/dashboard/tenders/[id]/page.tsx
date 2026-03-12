import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Tender, Company } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StartBidButton } from "@/components/tenders/start-bid-button";
import {
  ArrowLeft,
  Building2,
  Clock,
  Tag,
  FileText,
  ExternalLink,
  BarChart3,
} from "lucide-react";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("bs-BA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatValue(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return (
    new Intl.NumberFormat("bs-BA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value) + " KM"
  );
}

function getDeadlineColor(deadline: string | null): string {
  if (!deadline) return "text-muted-foreground";
  const diffDays = Math.ceil(
    (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays < 0) return "text-muted-foreground line-through";
  if (diffDays <= 7) return "text-red-400 font-bold";
  return "text-foreground";
}

export default async function TenderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Dohvati tender
  const { data: tenderData } = await supabase
    .from("tenders")
    .select("*")
    .eq("id", id)
    .single();

  const tender = tenderData as Tender | null;
  if (!tender) redirect("/dashboard/tenders");

  // Dohvati firmu korisnika
  const { data: companyData } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const company = companyData as Company | null;

  // Provjeri da li već postoji bid za ovaj tender
  let existingBidId: string | null = null;
  if (company) {
    const { data: existingBid } = await supabase
      .from("bids")
      .select("id")
      .eq("company_id", company.id)
      .eq("tender_id", id)
      .limit(1)
      .single();

    existingBidId = existingBid?.id ?? null;
  }

  // Historijat naručioca
  let authorityStats: {
    totalTenders: number;
    totalAwards: number;
    avgDiscount: number | null;
  } | null = null;

  if (tender.contracting_authority_jib) {
    const jib = tender.contracting_authority_jib;

    // Broj tendera ovog naručioca
    const { count: tenderCount } = await supabase
      .from("tenders")
      .select("id", { count: "exact", head: true })
      .eq("contracting_authority_jib", jib);

    // Odluke o dodjeli
    const { data: awards, count: awardCount } = await supabase
      .from("award_decisions")
      .select("discount_pct", { count: "exact" })
      .eq("contracting_authority_jib", jib);

    // Prosječni popust
    let avgDiscount: number | null = null;
    if (awards && awards.length > 0) {
      const discounts = awards
        .map((a) => a.discount_pct)
        .filter((d): d is number => d !== null && d !== undefined);
      if (discounts.length > 0) {
        avgDiscount =
          Math.round(
            (discounts.reduce((s, v) => s + v, 0) / discounts.length) * 100
          ) / 100;
      }
    }

    authorityStats = {
      totalTenders: tenderCount ?? 0,
      totalAwards: awardCount ?? 0,
      avgDiscount,
    };
  }

  return (
    <div className="space-y-6">
      {/* Navigacija nazad + akcija */}
      <div className="flex items-center justify-between">
        <Link href="/dashboard/tenders">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-4" />
            Nazad na tendere
          </Button>
        </Link>
        {company && (
          <StartBidButton tenderId={id} existingBidId={existingBidId} />
        )}
      </div>

      {/* Glavni podaci */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-xl leading-tight">{tender.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoItem
              icon={<Building2 className="size-4" />}
              label="Naručilac"
              value={tender.contracting_authority || "—"}
            />
            <InfoItem
              icon={<Clock className="size-4" />}
              label="Rok za ponude"
              value={formatDate(tender.deadline)}
              valueClassName={getDeadlineColor(tender.deadline)}
            />
            <InfoItem
              icon={<Tag className="size-4" />}
              label="Tip ugovora"
              value={tender.contract_type || "—"}
            />
            <InfoItem
              icon={<FileText className="size-4" />}
              label="Tip procedure"
              value={tender.procedure_type || "—"}
            />
            <InfoItem
              icon={<BarChart3 className="size-4" />}
              label="Procijenjena vrijednost"
              value={formatValue(tender.estimated_value)}
              valueClassName="font-mono"
            />
            <InfoItem
              icon={<Tag className="size-4" />}
              label="Status"
              value={tender.status || "—"}
            />
          </div>

          {tender.contracting_authority_jib && (
            <p className="font-mono text-xs text-muted-foreground">
              JIB naručioca: {tender.contracting_authority_jib}
            </p>
          )}

          {tender.portal_url && (
            <a
              href={tender.portal_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <ExternalLink className="size-3.5" />
              Pogledaj na EJN portalu
            </a>
          )}
        </CardContent>
      </Card>

      {/* Opis */}
      {tender.raw_description && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base">Opis tendera</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {tender.raw_description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Historijat naručioca */}
      {authorityStats && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base">
              Historijat naručioca
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                label="Ukupno tendera"
                value={String(authorityStats.totalTenders)}
              />
              <StatCard
                label="Odluke o dodjeli"
                value={String(authorityStats.totalAwards)}
              />
              <StatCard
                label="Prosječni popust"
                value={
                  authorityStats.avgDiscount !== null
                    ? `${authorityStats.avgDiscount}%`
                    : "—"
                }
                description="od procijenjene vrijednosti"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
  valueClassName,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className={`text-sm ${valueClassName || "text-foreground"}`}>{value}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description?: string;
}) {
  return (
    <div className="rounded-md border border-border p-3 text-center">
      <p className="font-mono text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {description && (
        <p className="mt-0.5 text-[10px] text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
