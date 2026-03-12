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
  { value: "Otvoreni postupak", label: "Otvoreni postupak" },
  { value: "Ograničeni postupak", label: "Ograničeni postupak" },
  { value: "Pregovarački postupak", label: "Pregovarački postupak" },
  { value: "Konkurentski zahtjev", label: "Konkurentski zahtjev" },
  { value: "Direktni sporazum", label: "Direktni sporazum" },
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
    <div className="space-y-4 rounded-xl border border-border bg-card p-5">
      {/* Red 1: Keyword + tipovi */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1 space-y-1.5">
          <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Pretraga
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              placeholder="Ključna riječ u naslovu ili opisu..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9"
            />
          </div>
        </div>
        <div className="w-[160px] space-y-1.5">
          <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Tip ugovora
          </Label>
          <Select value={contractType} onValueChange={setContractType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONTRACT_TYPES.map((ct) => (
                <SelectItem key={ct.value} value={ct.value}>
                  {ct.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-[180px] space-y-1.5">
          <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Procedura
          </Label>
          <Select value={procedureType} onValueChange={setProcedureType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROCEDURE_TYPES.map((pt) => (
                <SelectItem key={pt.value} value={pt.value}>
                  {pt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Red 2: Datumi + vrijednosti + dugmad */}
      <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
        <div className="w-[140px] space-y-1.5">
          <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Rok od
          </Label>
          <Input
            type="date"
            value={deadlineFrom}
            onChange={(e) => setDeadlineFrom(e.target.value)}
            className="font-mono text-xs"
          />
        </div>
        <div className="w-[140px] space-y-1.5">
          <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Rok do
          </Label>
          <Input
            type="date"
            value={deadlineTo}
            onChange={(e) => setDeadlineTo(e.target.value)}
            className="font-mono text-xs"
          />
        </div>
        <div className="w-[130px] space-y-1.5">
          <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Vrijednost od (KM)
          </Label>
          <Input
            type="number"
            placeholder="0"
            value={valueMin}
            onChange={(e) => setValueMin(e.target.value)}
            className="font-mono text-xs"
          />
        </div>
        <div className="w-[130px] space-y-1.5">
          <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Vrijednost do (KM)
          </Label>
          <Input
            type="number"
            placeholder="∞"
            value={valueMax}
            onChange={(e) => setValueMax(e.target.value)}
            className="font-mono text-xs"
          />
        </div>
        <Button onClick={applyFilters} className="shadow-sm shadow-primary/10">
          <Search className="size-4" />
          Pretraži
        </Button>
        <Button variant="outline" onClick={resetFilters} title="Resetuj filtere">
          <RotateCcw className="size-4" />
        </Button>
      </div>
    </div>
  );
}
