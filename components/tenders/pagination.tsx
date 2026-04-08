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
    <div className="flex flex-col items-center justify-between gap-4 rounded-[1.4rem] border border-slate-800 bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)] px-5 py-4 text-white shadow-[0_20px_45px_-30px_rgba(2,6,23,0.8)] sm:flex-row">
      <div className="text-sm font-medium text-slate-400">
        Stranica <span className="font-semibold text-white">{currentPage}</span> od{" "}
        <span className="font-semibold text-white">{totalPages}</span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          variant="outline"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-sm font-semibold text-slate-200 hover:bg-white/10 hover:text-white"
        >
          <ChevronLeft className="mr-2 size-4" />
          Prethodna
        </Button>
        <Button
          variant="outline"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-sm font-semibold text-slate-200 hover:bg-white/10 hover:text-white"
        >
          Sljedeća
          <ChevronRight className="ml-2 size-4" />
        </Button>
      </div>
    </div>
  );
}
