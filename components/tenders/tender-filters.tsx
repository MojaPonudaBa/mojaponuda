"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, RotateCcw } from "lucide-react";

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
  const [valueMin, setValueMin] = useState(
    searchParams.get("value_min") || ""
  );
  const [valueMax, setValueMax] = useState(
    searchParams.get("value_max") || ""
  );

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (keyword.trim()) params.set("q", keyword.trim());
    if (contractType !== "all") params.set("contract_type", contractType);
    if (procedureType !== "all") params.set("procedure_type", procedureType);
    if (deadlineFrom) params.set("deadline_from", deadlineFrom);
    if (deadlineTo) params.set("deadline_to", deadlineTo);
    if (valueMin) params.set("value_min", valueMin);
    if (valueMax) params.set("value_max", valueMax);
    params.set("page", "1");
    router.push(`/dashboard/tenders?${params.toString()}`);
  }, [keyword, contractType, procedureType, deadlineFrom, deadlineTo, valueMin, valueMax, router]);

  function resetFilters() {
    setKeyword("");
    setContractType("all");
    setProcedureType("all");
    setDeadlineFrom("");
    setDeadlineTo("");
    setValueMin("");
    setValueMax("");
    router.push("/dashboard/tenders");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") applyFilters();
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Red 1: Keyword + tipovi */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[200px] flex-1 space-y-2">
          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Pretraga
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Ključna riječ u naslovu..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="rounded-xl border-slate-200 pl-9 text-sm focus-visible:ring-primary focus-visible:border-primary"
            />
          </div>
        </div>
        <div className="w-[160px] space-y-2">
          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Tip Ugovora
          </Label>
          <Select value={contractType} onValueChange={setContractType}>
            <SelectTrigger className="rounded-xl border-slate-200 text-sm focus:ring-primary focus:border-primary">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200">
              {CONTRACT_TYPES.map((ct) => (
                <SelectItem key={ct.value} value={ct.value} className="focus:bg-blue-50 focus:text-primary rounded-lg cursor-pointer">
                  {ct.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-[180px] space-y-2">
          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Procedura
          </Label>
          <Select value={procedureType} onValueChange={setProcedureType}>
            <SelectTrigger className="rounded-xl border-slate-200 text-sm focus:ring-primary focus:border-primary">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200">
              {PROCEDURE_TYPES.map((pt) => (
                <SelectItem key={pt.value} value={pt.value} className="focus:bg-blue-50 focus:text-primary rounded-lg cursor-pointer">
                  {pt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Red 2: Datumi + vrijednosti + dugmad */}
      <div className="flex flex-wrap items-end gap-4 border-t border-slate-100 pt-5 mt-2">
        <div className="w-[140px] space-y-2">
          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Rok od
          </Label>
          <Input
            type="date"
            value={deadlineFrom}
            onChange={(e) => setDeadlineFrom(e.target.value)}
            className="rounded-xl border-slate-200 text-sm focus-visible:ring-primary focus-visible:border-primary"
          />
        </div>
        <div className="w-[140px] space-y-2">
          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Rok do
          </Label>
          <Input
            type="date"
            value={deadlineTo}
            onChange={(e) => setDeadlineTo(e.target.value)}
            className="rounded-xl border-slate-200 text-sm focus-visible:ring-primary focus-visible:border-primary"
          />
        </div>
        <div className="w-[130px] space-y-2">
          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Min (KM)
          </Label>
          <Input
            type="number"
            placeholder="0"
            value={valueMin}
            onChange={(e) => setValueMin(e.target.value)}
            className="rounded-xl border-slate-200 text-sm focus-visible:ring-primary focus-visible:border-primary"
          />
        </div>
        <div className="w-[130px] space-y-2">
          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Max (KM)
          </Label>
          <Input
            type="number"
            placeholder="∞"
            value={valueMax}
            onChange={(e) => setValueMax(e.target.value)}
            className="rounded-xl border-slate-200 text-sm focus-visible:ring-primary focus-visible:border-primary"
          />
        </div>
        <div className="flex gap-3 flex-1 justify-end">
          <Button 
            variant="outline" 
            onClick={resetFilters} 
            title="Resetuj filtere"
            className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          >
            <RotateCcw className="size-4" />
          </Button>
          <Button 
            onClick={applyFilters} 
            className="rounded-xl bg-primary text-white hover:bg-blue-700 shadow-sm shadow-blue-500/20"
          >
            <Search className="mr-2 size-4" />
            Pretraži
          </Button>
        </div>
      </div>
    </div>
  );
}
