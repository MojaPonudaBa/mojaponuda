import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Tender } from "@/types/database";
import { TenderFilters } from "@/components/tenders/tender-filters";
import { TenderCard } from "@/components/tenders/tender-card";
import { Pagination } from "@/components/tenders/pagination";
import { Search } from "lucide-react";

const PAGE_SIZE = 20;

interface TendersPageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

async function TendersContent({ searchParams }: TendersPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const page = Math.max(1, parseInt(params.page || "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  // Build query
  let query = supabase
    .from("tenders")
    .select("*", { count: "exact" });

  // Keyword filter (title or description)
  if (params.q) {
    const kw = `%${params.q}%`;
    query = query.or(`title.ilike.${kw},raw_description.ilike.${kw}`);
  }

  // Contract type
  if (params.contract_type && params.contract_type !== "all") {
    query = query.ilike("contract_type", `%${params.contract_type}%`);
  }

  // Procedure type
  if (params.procedure_type && params.procedure_type !== "all") {
    query = query.ilike("procedure_type", `%${params.procedure_type}%`);
  }

  // Deadline range
  if (params.deadline_from) {
    query = query.gte("deadline", new Date(params.deadline_from).toISOString());
  }
  if (params.deadline_to) {
    query = query.lte("deadline", new Date(params.deadline_to + "T23:59:59").toISOString());
  }

  // Value range
  if (params.value_min) {
    query = query.gte("estimated_value", parseFloat(params.value_min));
  }
  if (params.value_max) {
    query = query.lte("estimated_value", parseFloat(params.value_max));
  }

  // Order + pagination
  const { data, count } = await query
    .order("deadline", { ascending: false, nullsFirst: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const tenders = (data ?? []) as Tender[];
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const hasFilters = !!(
    params.q ||
    (params.contract_type && params.contract_type !== "all") ||
    (params.procedure_type && params.procedure_type !== "all") ||
    params.deadline_from ||
    params.deadline_to ||
    params.value_min ||
    params.value_max
  );

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="font-mono text-xs text-muted-foreground">
          {totalCount} {totalCount === 1 ? "tender" : "tendera"}
          {hasFilters && " (filtrirano)"}
        </p>
      </div>

      {tenders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-20">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/5">
            <Search className="size-6 text-primary/40" />
          </div>
          <p className="mt-4 text-sm font-medium text-foreground/80">
            {hasFilters
              ? "Nema tendera koji odgovaraju filterima"
              : "Nema tendera u bazi"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {hasFilters
              ? "Pokušajte sa drugačijim filterima ili resetujte pretragu."
              : "Podaci se automatski sinhronizuju sa e-Nabavke portala."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tenders.map((tender) => (
            <TenderCard key={tender.id} tender={tender} />
          ))}
        </div>
      )}

      <div className="mt-6">
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          basePath="/dashboard/tenders"
        />
      </div>
    </>
  );
}

export default async function TendersPage(props: TendersPageProps) {
  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-6">
        <h2 className="text-2xl font-bold tracking-tight">Tenderi</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pretražite aktivne tendere iz BiH e-Procurement portala.
        </p>
      </div>

      <Suspense fallback={null}>
        <TenderFilters />
      </Suspense>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Učitavanje tendera...</p>
            </div>
          </div>
        }
      >
        <TendersContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
