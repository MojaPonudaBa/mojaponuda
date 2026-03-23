"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";
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
import { Search, RotateCcw, Filter } from "lucide-react";

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

export function TenderFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [keyword, setKeyword] = useState(searchParams.get("q") || "");
  const [contractType, setContractType] = useState(
    searchParams.get("contract_type") || "all"
  );
  const [procedureType, setProcedureType] = useState(
    searchParams.get("procedure_type") || "all"
  );
  const [deadlineFrom, setDeadlineFrom] = useState(
    searchParams.get("deadline_from") || ""
  );
  const [deadlineTo, setDeadlineTo] = useState(
    searchParams.get("deadline_to") || ""
  );
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
    locations.forEach((l) => params.append("location", l));
    params.set("page", "1");
    router.push(`/dashboard/tenders?${params.toString()}`);
  }, [keyword, contractType, procedureType, deadlineFrom, deadlineTo, locations, router, searchParams]);

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
    router.push(`/dashboard/tenders?${params.toString()}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") applyFilters();
  }

  return (
    <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm mb-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <Filter className="size-4 text-blue-500" />
        <h3 className="font-heading text-sm font-bold text-slate-900">Pretraga i filteri</h3>
      </div>

      {/* Row 1: keyword full width */}
      <div className="mb-4">
        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
          Pretraga po ključnoj riječi
        </Label>
        <div className="relative group">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Npr. računari, izgradnja puta, čišćenje..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-11 rounded-xl border-slate-200 pl-10 text-sm shadow-sm focus-visible:ring-primary focus-visible:border-primary transition-all"
          />
        </div>
      </div>

      {/* Row 2: dropdowns */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-[150px] max-w-[220px] space-y-2">
          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Tip ugovora
          </Label>
          <Select value={contractType} onValueChange={setContractType}>
            <SelectTrigger className="h-11 rounded-xl border-slate-200 text-sm shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200 shadow-xl">
              {CONTRACT_TYPES.map((ct) => (
                <SelectItem key={ct.value} value={ct.value} className="focus:bg-blue-50 focus:text-primary rounded-lg cursor-pointer py-2">
                  {ct.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[150px] max-w-[220px] space-y-2">
          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Procedura
          </Label>
          <Select value={procedureType} onValueChange={setProcedureType}>
            <SelectTrigger className="h-11 rounded-xl border-slate-200 text-sm shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200 shadow-xl">
              {PROCEDURE_TYPES.map((pt) => (
                <SelectItem key={pt.value} value={pt.value} className="focus:bg-blue-50 focus:text-primary rounded-lg cursor-pointer py-2">
                  {pt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[140px] space-y-2">
          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Rok od
          </Label>
          <Input
            type="date"
            value={deadlineFrom}
            onChange={(e) => setDeadlineFrom(e.target.value)}
            className="h-11 rounded-xl border-slate-200 text-sm shadow-sm focus-visible:ring-primary focus-visible:border-primary transition-all"
          />
        </div>
        <div className="flex-1 min-w-[140px] space-y-2">
          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Rok do
          </Label>
          <Input
            type="date"
            value={deadlineTo}
            onChange={(e) => setDeadlineTo(e.target.value)}
            className="h-11 rounded-xl border-slate-200 text-sm shadow-sm focus-visible:ring-primary focus-visible:border-primary transition-all"
          />
        </div>
      </div>

      {/* Row 3: location + action buttons always visible */}
      <div className="flex flex-wrap items-end gap-3 pt-4 border-t border-slate-50">
        <div className="flex-1 min-w-[220px] space-y-2">
          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Lokacija tendera
          </Label>
          <RegionMultiSelect selectedRegions={locations} onChange={setLocations} />
        </div>
        <div className="flex gap-2 self-end flex-shrink-0">
          <Button
            variant="outline"
            onClick={resetFilters}
            title="Resetuj sve filtere"
            className="h-11 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-bold px-4"
          >
            <RotateCcw className="mr-2 size-4" />
            Resetuj
          </Button>
          <Button
            onClick={applyFilters}
            className="h-11 rounded-xl bg-primary text-white hover:bg-blue-700 shadow-lg shadow-blue-500/25 font-bold px-6"
          >
            <Search className="mr-2 size-4" />
            Pretraži
          </Button>
        </div>
      </div>
    </div>
  );
}
