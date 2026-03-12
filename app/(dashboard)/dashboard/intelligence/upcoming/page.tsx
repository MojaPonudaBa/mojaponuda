import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription";
import { ProGate } from "@/components/subscription/pro-gate";
import { Calendar, TrendingUp } from "lucide-react";

function formatKM(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M KM`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K KM`;
  return `${value.toFixed(0)} KM`;
}

export default async function UpcomingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { isSubscribed } = await getSubscriptionStatus(user.id);
  if (!isSubscribed) return <ProGate />;

  const today = new Date().toISOString().split("T")[0];

  // Planirani tenderi — budući ili nedavni (zadnjih 30 dana)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const { data: planned } = await supabase
    .from("planned_procurements")
    .select("id, portal_id, description, estimated_value, planned_date, contract_type, cpv_code, contracting_authority_id, contracting_authorities(name, jib)")
    .gte("planned_date", thirtyDaysAgo)
    .order("planned_date", { ascending: true })
    .limit(100);

  interface PlannedRow {
    id: string;
    portal_id: string;
    description: string | null;
    estimated_value: number | null;
    planned_date: string | null;
    contract_type: string | null;
    cpv_code: string | null;
    contracting_authority_id: string | null;
    contracting_authorities: { name: string; jib: string } | null;
  }

  const items = (planned ?? []) as unknown as PlannedRow[];

  const upcoming = items.filter((p) => p.planned_date && p.planned_date >= today);
  const recent = items.filter((p) => p.planned_date && p.planned_date < today);

  const totalUpcomingValue = upcoming.reduce(
    (sum, p) => sum + (Number(p.estimated_value) || 0),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Planirani tenderi</h1>
        <p className="text-sm text-muted-foreground">
          Tenderi koji dolaze — prije nego su objavljeni. Podaci iz planova
          javnih nabavki.
        </p>
      </div>

      {/* Kartice */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-md border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Nadolazeći tenderi</p>
            <Calendar className="size-4 text-muted-foreground" />
          </div>
          <p className="mt-2 font-mono text-3xl font-bold">{upcoming.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Planirani za budućnost</p>
        </div>
        <div className="rounded-md border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Procijenjena vrijednost</p>
            <TrendingUp className="size-4 text-muted-foreground" />
          </div>
          <p className="mt-2 font-mono text-3xl font-bold">{formatKM(totalUpcomingValue)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Nadolazećih nabavki</p>
        </div>
      </div>

      {/* Nadolazeći */}
      <div className="rounded-md border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-serif text-lg font-bold">Nadolazeći</h2>
          <p className="text-xs text-muted-foreground">Planirani tenderi koji još nisu raspisani</p>
        </div>
        {upcoming.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nema planiranih tendera za budući period.
          </p>
        ) : (
          <div className="divide-y divide-border/50">
            {upcoming.map((p) => (
              <div key={p.id} className="px-5 py-4">
                <p className="text-sm font-medium">
                  {p.description || "Bez opisa"}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {p.contracting_authorities?.name && (
                    <span>{p.contracting_authorities.name}</span>
                  )}
                  {p.planned_date && (
                    <span className="font-mono">
                      Planirano: {new Date(p.planned_date).toLocaleDateString("bs-BA")}
                    </span>
                  )}
                  {p.estimated_value && (
                    <span className="font-mono text-primary">
                      {formatKM(Number(p.estimated_value))}
                    </span>
                  )}
                  {p.contract_type && (
                    <span className="rounded bg-secondary px-1.5 py-0.5">
                      {p.contract_type}
                    </span>
                  )}
                  {p.cpv_code && (
                    <span className="font-mono">CPV: {p.cpv_code}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Nedavno planirani (možda već raspisani) */}
      {recent.length > 0 && (
        <div className="rounded-md border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-serif text-lg font-bold">Nedavno planirani</h2>
            <p className="text-xs text-muted-foreground">
              Tenderi planirani u zadnjih 30 dana — možda već raspisani
            </p>
          </div>
          <div className="divide-y divide-border/50">
            {recent.map((p) => (
              <div key={p.id} className="px-5 py-4 opacity-70">
                <p className="text-sm font-medium">
                  {p.description || "Bez opisa"}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {p.contracting_authorities?.name && (
                    <span>{p.contracting_authorities.name}</span>
                  )}
                  {p.planned_date && (
                    <span className="font-mono">
                      Planirano: {new Date(p.planned_date).toLocaleDateString("bs-BA")}
                    </span>
                  )}
                  {p.estimated_value && (
                    <span className="font-mono">
                      {formatKM(Number(p.estimated_value))}
                    </span>
                  )}
                  {p.contract_type && (
                    <span className="rounded bg-secondary px-1.5 py-0.5">
                      {p.contract_type}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
