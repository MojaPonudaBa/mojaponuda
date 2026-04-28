"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
}

export function Pagination({ currentPage, totalPages, basePath }: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row">
      <div className="text-sm font-medium text-slate-500">
        Stranica <span className="font-semibold text-slate-950">{currentPage}</span> od{" "}
        <span className="font-semibold text-slate-950">{totalPages}</span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          variant="outline"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          className="h-11 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
        >
          <ChevronLeft className="mr-2 size-4" />
          Prethodna
        </Button>
        <Button
          variant="outline"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="h-11 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
        >
          Sljedeća
          <ChevronRight className="ml-2 size-4" />
        </Button>
      </div>
    </div>
  );
}
