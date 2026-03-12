import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Briefcase,
  Search,
  Award,
  AlertTriangle,
  ArrowRight,
  Clock,
  Plus,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { BidStatus, Document as DocType } from "@/types/database";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("bs-BA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function daysUntil(dateStr: string): number {
  return Math.ceil(
    (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
}

const STATUS_DOT: Record<string, string> = {
  draft: "bg-slate-400",
  in_review: "bg-amber-400",
  submitted: "bg-blue-400",
  won: "bg-emerald-400",
  lost: "bg-red-400",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Nacrt",
  in_review: "U pregledu",
  submitted: "Predato",
  won: "Pobijeđeno",
  lost: "Izgubljeno",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: company } = await supabase
    .from("companies")
    .select("id, name")
    .eq("user_id", user.id)
    .single();

  if (!company) redirect("/onboarding");

  const [
    { count: documentsCount },
    { count: bidsCount },
    { count: tendersCount },
    { count: awardsCount },
    { data: expiringDocs },
    { data: recentBids },
  ] = await Promise.all([
    supabase.from("documents").select("*", { count: "exact", head: true }).eq("company_id", company.id),
    supabase.from("bids").select("*", { count: "exact", head: true }).eq("company_id", company.id),
    supabase.from("tenders").select("*", { count: "exact", head: true }),
    supabase.from("award_decisions").select("*", { count: "exact", head: true }),
    supabase
      .from("documents")
      .select("id, name, type, expires_at")
      .eq("company_id", company.id)
      .not("expires_at", "is", null)
      .lte("expires_at", new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString())
      .gte("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: true })
      .limit(5),
    supabase
      .from("bids")
      .select("id, status, created_at, tenders(title, deadline)")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const stats: { title: string; value: number; icon: LucideIcon; accent: string }[] = [
    { title: "Dokumenti", value: documentsCount ?? 0, icon: FileText, accent: "text-blue-400" },
    { title: "Ponude", value: bidsCount ?? 0, icon: Briefcase, accent: "text-amber-400" },
    { title: "Tenderi", value: tendersCount ?? 0, icon: Search, accent: "text-emerald-400" },
    { title: "Odluke", value: awardsCount ?? 0, icon: Award, accent: "text-purple-400" },
  ];

  const expiring = (expiringDocs ?? []) as Pick<DocType, "id" | "name" | "type" | "expires_at">[];
  const bids = (recentBids ?? []) as {
    id: string;
    status: BidStatus;
    created_at: string;
    tenders: { title: string; deadline: string | null };
  }[];

  const now = new Date();
  const greeting =
    now.getHours() < 12
      ? "Dobro jutro"
      : now.getHours() < 18
      ? "Dobar dan"
      : "Dobra večer";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          {greeting}, {company.name.split(" ")[0]}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {now.toLocaleDateString("bs-BA", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            className="group relative overflow-hidden border-border bg-card transition-colors hover:border-primary/20"
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-medium text-muted-foreground">
                  {stat.title}
                </p>
                <div className="flex size-9 items-center justify-center rounded-lg bg-muted/50 transition-colors group-hover:bg-primary/10">
                  <stat.icon className={`size-4 ${stat.accent}`} />
                </div>
              </div>
              <p className="mt-3 font-mono text-3xl font-bold tracking-tight">
                {stat.value.toLocaleString("bs-BA")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Expiring Documents Alert */}
      {expiring.length > 0 && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-amber-300">
                  Dokumenti koji ističu
                </h3>
              </div>
              <Link href="/dashboard/vault">
                <Button variant="ghost" size="sm" className="h-7 text-xs text-amber-400 hover:text-amber-300">
                  Pogledaj sve
                  <ArrowRight className="ml-1 size-3" />
                </Button>
              </Link>
            </div>
            <div className="space-y-2">
              {expiring.map((doc) => {
                const days = daysUntil(doc.expires_at!);
                const urgent = days <= 14;
                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-md bg-background/40 px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="size-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{doc.name}</p>
                        {doc.type && (
                          <p className="text-[11px] text-muted-foreground">{doc.type}</p>
                        )}
                      </div>
                    </div>
                    <span
                      className={`rounded-md px-2 py-1 font-mono text-xs font-semibold ${
                        urgent
                          ? "bg-red-500/15 text-red-400"
                          : "bg-amber-500/15 text-amber-400"
                      }`}
                    >
                      {days === 0 ? "Danas" : days === 1 ? "Sutra" : `${days} dana`}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Recent Bids */}
        <Card className="border-border bg-card lg:col-span-3">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Nedavne ponude</h3>
              <Link href="/dashboard/bids">
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground">
                  Sve ponude
                  <ArrowRight className="ml-1 size-3" />
                </Button>
              </Link>
            </div>

            {bids.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10">
                <Briefcase className="size-8 text-muted-foreground/30" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Nemate ponuda
                </p>
                <Link href="/dashboard/tenders" className="mt-3">
                  <Button size="sm" variant="outline" className="h-8 text-xs">
                    <Search className="mr-1.5 size-3" />
                    Pretražite tendere
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-1">
                {bids.map((bid) => (
                  <Link
                    key={bid.id}
                    href={`/dashboard/bids/${bid.id}`}
                    className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50"
                  >
                    <span className={`size-2 shrink-0 rounded-full ${STATUS_DOT[bid.status]}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium group-hover:text-primary">
                        {bid.tenders?.title ?? "Tender"}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>{STATUS_LABEL[bid.status]}</span>
                        {bid.tenders?.deadline && (
                          <>
                            <span className="text-border">|</span>
                            <Clock className="size-3" />
                            <span>{formatDate(bid.tenders.deadline)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="size-3.5 text-muted-foreground/0 transition-all group-hover:text-muted-foreground" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-3 lg:col-span-2">
          <h3 className="text-sm font-semibold">Brze akcije</h3>
          <Link href="/dashboard/vault">
            <Card className="group cursor-pointer border-border bg-card transition-all hover:border-blue-500/30 hover:bg-blue-500/5">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 transition-colors group-hover:bg-blue-500/20">
                  <Plus className="size-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Upload dokumenta</p>
                  <p className="text-[11px] text-muted-foreground">
                    Dodajte dokument u trezor
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/tenders">
            <Card className="group cursor-pointer border-border bg-card transition-all hover:border-emerald-500/30 hover:bg-emerald-500/5">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 transition-colors group-hover:bg-emerald-500/20">
                  <Search className="size-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Pretražite tendere</p>
                  <p className="text-[11px] text-muted-foreground">
                    Pronađite prilike na portalu
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/intelligence">
            <Card className="group cursor-pointer border-border bg-card transition-all hover:border-purple-500/30 hover:bg-purple-500/5">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 transition-colors group-hover:bg-purple-500/20">
                  <TrendingUp className="size-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Tržišna inteligencija</p>
                  <p className="text-[11px] text-muted-foreground">
                    Analizirajte konkurenciju
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
