import type { Tender } from "@/types/database";

export interface TenderClientFilterValues {
  keyword?: string;
  contractType?: string;
  procedureType?: string;
  deadlineFrom?: string;
  deadlineTo?: string;
  valueMin?: string;
  valueMax?: string;
}

function normalizeValue(value?: string) {
  return value?.trim() ?? "";
}

function includesNormalized(source: string | null | undefined, needle: string) {
  if (!source) return false;
  return source.toLowerCase().includes(needle);
}

export function tenderMatchesClientFilters(
  tender: Pick<
    Tender,
    | "title"
    | "raw_description"
    | "contracting_authority"
    | "contract_type"
    | "procedure_type"
    | "deadline"
    | "estimated_value"
  >,
  filters: TenderClientFilterValues,
) {
  const keyword = normalizeValue(filters.keyword).toLowerCase();
  const contractType = normalizeValue(filters.contractType);
  const procedureType = normalizeValue(filters.procedureType);
  const deadlineFrom = normalizeValue(filters.deadlineFrom);
  const deadlineTo = normalizeValue(filters.deadlineTo);
  const valueMin = normalizeValue(filters.valueMin);
  const valueMax = normalizeValue(filters.valueMax);

  if (
    keyword &&
    ![
      tender.title,
      tender.raw_description,
      tender.contracting_authority,
    ].some((value) => includesNormalized(value, keyword))
  ) {
    return false;
  }

  if (
    contractType !== "" &&
    contractType !== "all" &&
    !(tender.contract_type ?? "").toLowerCase().includes(contractType.toLowerCase())
  ) {
    return false;
  }

  if (
    procedureType !== "" &&
    procedureType !== "all" &&
    !(tender.procedure_type ?? "").toLowerCase().includes(procedureType.toLowerCase())
  ) {
    return false;
  }

  if (deadlineFrom || deadlineTo) {
    if (!tender.deadline) return false;

    const deadlineTime = new Date(tender.deadline).getTime();
    if (Number.isNaN(deadlineTime)) return false;

    if (deadlineFrom) {
      const fromTime = new Date(deadlineFrom).getTime();
      if (!Number.isNaN(fromTime) && deadlineTime < fromTime) {
        return false;
      }
    }

    if (deadlineTo) {
      const toTime = new Date(`${deadlineTo}T23:59:59`).getTime();
      if (!Number.isNaN(toTime) && deadlineTime > toTime) {
        return false;
      }
    }
  }

  if (valueMin || valueMax) {
    const estimatedValue = Number(tender.estimated_value);
    if (!Number.isFinite(estimatedValue)) return false;

    if (valueMin) {
      const minValue = Number(valueMin);
      if (Number.isFinite(minValue) && estimatedValue < minValue) {
        return false;
      }
    }

    if (valueMax) {
      const maxValue = Number(valueMax);
      if (Number.isFinite(maxValue) && estimatedValue > maxValue) {
        return false;
      }
    }
  }

  return true;
}
