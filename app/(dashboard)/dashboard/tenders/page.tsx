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
    .select("*", { count: "exact" })
    .gt("deadline", new Date().toISOString());

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
        <p className="text-sm font-medium text-slate-500">
          Pronađeno {totalCount} {totalCount === 1 ? "tender" : "tendera"}
          {hasFilters && " (filtrirano)"}
        </p>
      </div>

      {tenders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-20">
          <div className="flex size-16 items-center justify-center rounded-full bg-blue-50 text-blue-500 mb-4 shadow-sm shadow-blue-500/20">
            <Search className="size-6" />
          </div>
          <h3 className="text-lg font-heading font-bold text-slate-900 mb-2">
            {hasFilters
              ? "Nema tendera koji odgovaraju filterima"
              : "Nema tendera u bazi"}
          </h3>
          <p className="text-sm text-slate-500 text-center max-w-sm">
            {hasFilters
              ? "Pokušajte sa drugačijim filterima ili resetujte pretragu."
              : "Podaci se automatski sinhronizuju sa e-Nabavke portala."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tenders.map((tender) => (
            <TenderCard key={tender.id} tender={tender} />
          ))}
        </div>
      )}

      <div className="mt-8">
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 tracking-tight">
            Tender Skener
          </h1>
          <p className="mt-1.5 text-base text-slate-500">
            Pretražite aktivne tendere iz BiH e-Procurement portala.
          </p>
        </div>
      </div>

      <Suspense fallback={null}>
        <TenderFilters />
      </Suspense>

      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center py-24">
            <div className="size-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary mb-4" />
            <p className="text-sm font-medium text-slate-500">Učitavanje tendera...</p>
          </div>
        }
      >
        <TendersContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
