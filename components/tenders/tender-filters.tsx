"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Filter,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const RECOMMENDED_SORT_OPTIONS = [
  { value: "nearest", label: "Najbliži firmi" },
  { value: "recommended", label: "Najrelevantniji" },
  { value: "deadline_asc", label: "Rok najskoriji" },
  { value: "deadline_desc", label: "Rok najdalji" },
  { value: "value_desc", label: "Najveća vrijednost" },
  { value: "value_asc", label: "Najmanja vrijednost" },
  { value: "newest", label: "Najnovije objavljeno" },
];

const ALL_TENDERS_SORT_OPTIONS = [
  { value: "nearest", label: "Najbliži firmi" },
  { value: "deadline_asc", label: "Rok najskoriji" },
  { value: "deadline_desc", label: "Rok najdalji" },
  { value: "value_desc", label: "Najveća vrijednost" },
  { value: "value_asc", label: "Najmanja vrijednost" },
  { value: "newest", label: "Najnovije objavljeno" },
];

function formatDateForDisplay(value: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return "";
  return `${day}/${month}/${year}`;
}

function formatDateDigits(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseDisplayDate(value: string) {
  if (!value) return "";
  const parts = value.split("/");
  if (parts.length !== 3) return "";

  const [dayRaw, monthRaw, yearRaw] = parts;
  if (dayRaw.length !== 2 || monthRaw.length !== 2 || yearRaw.length !== 4) return "";

  const day = Number(dayRaw);
  const month = Number(monthRaw);
  const year = Number(yearRaw);

  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) return "";
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";

  const candidate = new Date(year, month - 1, day);
  if (
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day
  ) {
    return "";
  }

  return `${yearRaw}-${monthRaw}-${dayRaw}`;
}

function LocalizedDateFilter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const [textValue, setTextValue] = useState(() => formatDateForDisplay(value));

  useEffect(() => {
    setTextValue(formatDateForDisplay(value));
  }, [value]);

  function handleTextChange(nextValue: string) {
    const formatted = formatDateDigits(nextValue);
    setTextValue(formatted);

    if (!formatted) {
      onChange("");
      return;
    }

    const parsed = parseDisplayDate(formatted);
    if (parsed) onChange(parsed);
  }

  function handleBlur() {
    if (!textValue.trim()) {
      setTextValue("");
      onChange("");
      return;
    }

    const parsed = parseDisplayDate(textValue);
    if (parsed) {
      setTextValue(formatDateForDisplay(parsed));
      onChange(parsed);
      return;
    }

    setTextValue(formatDateForDisplay(value));
  }

  function openPicker() {
    const picker = pickerRef.current;
    if (!picker) return;
    if (typeof picker.showPicker === "function") {
      picker.showPicker();
      return;
    }
    picker.focus();
    picker.click();
  }

  return (
    <div className="group flex h-11 min-w-[176px] items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.07] px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200">
          {label}
        </div>
        <Input
          type="text"
          inputMode="numeric"
          placeholder="dd/mm/yyyy"
          value={textValue}
          onChange={(event) => handleTextChange(event.target.value)}
          onBlur={handleBlur}
          className="h-5 border-0 bg-transparent px-0 py-0 text-sm font-medium text-white placeholder:text-slate-200/85 focus-visible:border-0 focus-visible:ring-0"
        />
      </div>
      <button
        type="button"
        onClick={openPicker}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
        aria-label={`${label} - otvori kalendar`}
      >
        <CalendarDays className="size-4" />
      </button>
      <input
        ref={pickerRef}
        type="date"
        lang="bs-BA"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}

export function TenderFilters({ basePath = "/dashboard/tenders" }: { basePath?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") === "all" ? "all" : "recommended";
  const sortOptions =
    activeTab === "recommended" ? RECOMMENDED_SORT_OPTIONS : ALL_TENDERS_SORT_OPTIONS;
  const defaultSort = "nearest";
  const initialSort =
    sortOptions.find((option) => option.value === searchParams.get("sort"))?.value ?? defaultSort;

  const [keyword, setKeyword] = useState(searchParams.get("q") || "");
  const [contractType, setContractType] = useState(
    searchParams.get("contract_type") || "all"
  );
  const [procedureType, setProcedureType] = useState(
    searchParams.get("procedure_type") || "all"
  );
  const [deadlineFrom, setDeadlineFrom] = useState(searchParams.get("deadline_from") || "");
  const [deadlineTo, setDeadlineTo] = useState(searchParams.get("deadline_to") || "");
  const [valueMin, setValueMin] = useState(searchParams.get("value_min") || "");
  const [valueMax, setValueMax] = useState(searchParams.get("value_max") || "");
  const [sort, setSort] = useState(initialSort);
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
    if (valueMin.trim()) params.set("value_min", valueMin.trim());
    if (valueMax.trim()) params.set("value_max", valueMax.trim());
    if (sort !== defaultSort) params.set("sort", sort);
    locations.forEach((location) => params.append("location", location));
    params.set("page", "1");
    router.push(`${basePath}?${params.toString()}`);
  }, [
    basePath,
    contractType,
    deadlineFrom,
    deadlineTo,
    defaultSort,
    keyword,
    locations,
    procedureType,
    router,
    searchParams,
    sort,
    valueMax,
    valueMin,
  ]);

  function resetFilters() {
    setKeyword("");
    setContractType("all");
    setProcedureType("all");
    setDeadlineFrom("");
    setDeadlineTo("");
    setValueMin("");
    setValueMax("");
    setSort(defaultSort);
    setLocations([]);

    const currentTab = searchParams.get("tab");
    const params = new URLSearchParams();
    if (currentTab) params.set("tab", currentTab);
    router.push(`${basePath}?${params.toString()}`);
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Enter") applyFilters();
  }

  const compactTriggerClassName =
    "h-11 min-w-[140px] rounded-2xl border-white/12 bg-white/[0.07] px-3 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:bg-white/[0.1] [&_span]:text-white [&_svg]:text-slate-300";
  const compactContentClassName =
    "rounded-2xl border border-slate-700 bg-slate-950 text-slate-100 shadow-2xl [&_[data-slot=select-item]]:text-slate-100 [&_[data-slot=select-item]_*]:text-inherit [&_[data-slot=select-item][data-highlighted]]:bg-white/10 [&_[data-slot=select-item][data-highlighted]]:text-white [&_[data-slot=select-item][data-highlighted]_*]:text-white [&_[data-slot=select-item][data-state=checked]]:text-white";
  const compactItemClassName = "rounded-xl px-3 py-2";
  const locationContentClassName =
    "rounded-2xl border border-slate-700 bg-slate-950 text-slate-100 shadow-2xl [&_[data-slot=command]]:bg-slate-950 [&_[data-slot=command]]:text-slate-100 [&_[data-slot=command-input-wrapper]]:border-b [&_[data-slot=command-input-wrapper]]:border-white/10 [&_[data-slot=command-input-wrapper]]:bg-slate-950 [&_[data-slot=command-group]]:text-slate-100 [&_[data-slot=command-group]_[cmdk-group-heading]]:text-slate-400 [&_[data-slot=command-input]]:text-slate-100 [&_[data-slot=command-input]::placeholder]:text-slate-500 [&_[data-slot=command-item]]:text-slate-100 [&_[data-slot=command-item]_*]:text-inherit [&_[data-slot=command-item][data-selected=true]]:bg-white/10 [&_[data-slot=command-item][data-selected=true]]:text-white [&_[data-slot=command-item][data-selected=true]_*]:text-white";

  return (
    <section className="mb-6 rounded-[1.7rem] border border-slate-800/90 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),transparent_26%),linear-gradient(180deg,#0f172a_0%,#111827_100%)] p-3.5 text-white shadow-[0_26px_60px_-40px_rgba(2,6,23,0.9)]">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-[1_1_340px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-300" />
          <Input
            placeholder="Pretraži naziv, naručioca ili opis tendera"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onKeyDown={handleKeyDown}
            className="h-11 rounded-2xl border-white/12 bg-white/[0.07] pl-10 text-sm font-medium text-white placeholder:text-slate-200/90 focus-visible:border-sky-400/40 focus-visible:ring-sky-400/20"
          />
        </div>

        <div className="min-w-[240px] flex-[1_1_280px]">
          <RegionMultiSelect
            selectedRegions={locations}
            onChange={setLocations}
            placeholder="Lokacija tendera"
            triggerClassName="min-h-[44px] rounded-2xl border-white/12 bg-white/[0.07] px-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:bg-white/[0.1]"
            contentClassName={locationContentClassName}
            chipClassName="border border-sky-500/20 bg-sky-500/10 text-sky-100"
            placeholderClassName="text-white"
          />
        </div>

        <Select value={contractType} onValueChange={setContractType}>
          <SelectTrigger className={compactTriggerClassName}>
            <SelectValue placeholder="Tip ugovora" />
          </SelectTrigger>
          <SelectContent className={compactContentClassName}>
            {CONTRACT_TYPES.map((item) => (
              <SelectItem key={item.value} value={item.value} className={compactItemClassName}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={procedureType} onValueChange={setProcedureType}>
          <SelectTrigger className={compactTriggerClassName}>
            <SelectValue placeholder="Procedura" />
          </SelectTrigger>
          <SelectContent className={compactContentClassName}>
            {PROCEDURE_TYPES.map((item) => (
              <SelectItem key={item.value} value={item.value} className={compactItemClassName}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className={compactTriggerClassName}>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="size-3.5 text-slate-200" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent className={compactContentClassName}>
            {sortOptions.map((item) => (
              <SelectItem key={item.value} value={item.value} className={compactItemClassName}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <LocalizedDateFilter label="Rok od" value={deadlineFrom} onChange={setDeadlineFrom} />
        <LocalizedDateFilter label="Rok do" value={deadlineTo} onChange={setDeadlineTo} />

        <div className="flex h-11 min-w-[146px] items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.07] px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200">
            KM od
          </span>
          <Input
            type="number"
            min="0"
            step="1000"
            value={valueMin}
            onChange={(event) => setValueMin(event.target.value)}
            placeholder="50000"
            className="h-9 border-0 bg-transparent px-0 text-sm font-medium text-white placeholder:text-slate-200/80 focus-visible:border-0 focus-visible:ring-0"
          />
        </div>

        <div className="flex h-11 min-w-[146px] items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.07] px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200">
            KM do
          </span>
          <Input
            type="number"
            min="0"
            step="1000"
            value={valueMax}
            onChange={(event) => setValueMax(event.target.value)}
            placeholder="500000"
            className="h-9 border-0 bg-transparent px-0 text-sm font-medium text-white placeholder:text-slate-200/80 focus-visible:border-0 focus-visible:ring-0"
          />
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={resetFilters}
            className="h-11 rounded-2xl border-white/12 bg-white/[0.07] px-4 text-sm font-semibold text-white hover:bg-white/[0.11] hover:text-white"
          >
            <RotateCcw className="mr-2 size-4" />
            Očisti
          </Button>
          <Button
            onClick={applyFilters}
            className="h-11 rounded-2xl bg-white px-5 text-sm font-semibold text-slate-950 hover:bg-slate-100"
          >
            <Filter className="mr-2 size-4" />
            Primijeni
          </Button>
        </div>
      </div>
    </section>
  );
}
