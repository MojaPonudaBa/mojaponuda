"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Filter, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RegionMultiSelect } from "@/components/ui/region-multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CONTRACT_TYPES = [
  { value: "all", label: "Svi tipovi" },
  { value: "Robe", label: "Robe" },
  { value: "Usluge", label: "Usluge" },
  { value: "Radovi", label: "Radovi" },
];

const PROCEDURE_TYPES = [
  { value: "all", label: "Sve procedure" },
  { value: "Otvoreni postupak", label: "Otvoreni" },
  { value: "Ograničeni postupak", label: "Ograničeni" },
  { value: "Pregovarački postupak", label: "Pregovarački" },
  { value: "Konkurentski zahtjev", label: "Konkurentski" },
  { value: "Direktni sporazum", label: "Direktni" },
];

export function TenderFilters({ basePath = "/dashboard/tenders" }: { basePath?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [keyword, setKeyword] = useState(searchParams.get("q") || "");
  const [contractType, setContractType] = useState(searchParams.get("contract_type") || "all");
  const [procedureType, setProcedureType] = useState(searchParams.get("procedure_type") || "all");
  const [deadlineFrom, setDeadlineFrom] = useState(searchParams.get("deadline_from") || "");
  const [deadlineTo, setDeadlineTo] = useState(searchParams.get("deadline_to") || "");
  const [locations, setLocations] = useState<string[]>(searchParams.getAll("location"));

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    const currentTab = searchParams.get("tab");
    if (currentTab) params.set("tab", currentTab);
    if (keyword.trim()) params.set("q", keyword.trim());
    if (contractType !== "all") params.set("contract_type", contractType);
    if (procedureType !== "all") params.set("procedure_type", procedureType);
    if (deadlineFrom) params.set("deadline_from", deadlineFrom);
    if (deadlineTo) params.set("deadline_to", deadlineTo);
    locations.forEach((location) => params.append("location", location));
    params.set("page", "1");
    router.push(`${basePath}?${params.toString()}`);
  }, [basePath, contractType, deadlineFrom, deadlineTo, keyword, locations, procedureType, router, searchParams]);

  function resetFilters() {
    setKeyword("");
    setContractType("all");
    setProcedureType("all");
    setDeadlineFrom("");
    setDeadlineTo("");
    setLocations([]);
    const currentTab = searchParams.get("tab");
    const params = new URLSearchParams();
    if (currentTab) params.set("tab", currentTab);
    router.push(`${basePath}?${params.toString()}`);
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Enter") applyFilters();
  }

  return (
    <section className="mb-6 rounded-[1.75rem] border border-slate-800 bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)] p-6 text-white shadow-[0_28px_65px_-42px_rgba(2,6,23,0.88)]">
      <div className="mb-5 flex items-center gap-3 border-b border-white/10 pb-5">
        <div className="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sky-300">
          <Filter className="size-4" />
        </div>
        <div>
          <h3 className="font-heading text-lg font-bold text-white">Pretraga i filteri</h3>
          <p className="text-sm text-slate-400">Složeni tako da ostanu čitljivi i na desktopu i na manjim ekranima.</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2 lg:col-span-2">
          <Label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Ključna riječ
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <Input
              placeholder="Npr. računari, izgradnja puta, čišćenje..."
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={handleKeyDown}
              className="h-12 rounded-2xl border-white/10 bg-white/5 pl-10 text-sm text-white placeholder:text-slate-500 focus-visible:border-sky-400/40 focus-visible:ring-sky-400/20"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Tip ugovora
          </Label>
          <Select value={contractType} onValueChange={setContractType}>
            <SelectTrigger className="h-12 rounded-2xl border-white/10 bg-white/5 text-sm text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-slate-700 bg-slate-950 text-slate-200">
              {CONTRACT_TYPES.map((item) => (
                <SelectItem key={item.value} value={item.value} className="rounded-xl focus:bg-white/10 focus:text-white">
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Procedura
          </Label>
          <Select value={procedureType} onValueChange={setProcedureType}>
            <SelectTrigger className="h-12 rounded-2xl border-white/10 bg-white/5 text-sm text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-slate-700 bg-slate-950 text-slate-200">
              {PROCEDURE_TYPES.map((item) => (
                <SelectItem key={item.value} value={item.value} className="rounded-xl focus:bg-white/10 focus:text-white">
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Rok od
          </Label>
          <Input
            type="date"
            value={deadlineFrom}
            onChange={(event) => setDeadlineFrom(event.target.value)}
            className="h-12 rounded-2xl border-white/10 bg-white/5 text-sm text-white focus-visible:border-sky-400/40 focus-visible:ring-sky-400/20"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Rok do
          </Label>
          <Input
            type="date"
            value={deadlineTo}
            onChange={(event) => setDeadlineTo(event.target.value)}
            className="h-12 rounded-2xl border-white/10 bg-white/5 text-sm text-white focus-visible:border-sky-400/40 focus-visible:ring-sky-400/20"
          />
        </div>
      </div>

      <div className="mt-5 grid gap-4 border-t border-white/10 pt-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Lokacija tendera
          </Label>
          <RegionMultiSelect selectedRegions={locations} onChange={setLocations} />
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <Button
            variant="outline"
            onClick={resetFilters}
            className="h-12 rounded-2xl border-white/10 bg-white/5 px-5 text-sm font-semibold text-slate-200 hover:bg-white/10 hover:text-white"
          >
            <RotateCcw className="mr-2 size-4" />
            Resetuj
          </Button>
          <Button
            onClick={applyFilters}
            className="h-12 rounded-2xl bg-white px-6 text-sm font-semibold text-slate-950 hover:bg-slate-100"
          >
            <Search className="mr-2 size-4" />
            Pretraži
          </Button>
        </div>
      </div>
    </section>
  );
}
