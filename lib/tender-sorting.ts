import type { RecommendationTenderInput } from "@/lib/tender-recommendations";
import type { Tender } from "@/types/database";

export type TenderSortOption =
  | "recommended"
  | "nearest"
  | "deadline_asc"
  | "deadline_desc"
  | "value_desc"
  | "value_asc"
  | "newest";

export interface SortableRecommendedTender<TTender extends RecommendationTenderInput> {
  tender: TTender;
  score: number;
  locationPriority: number;
  positiveSignalCount?: number;
}

function compareNullableNumber(
  first: number | null | undefined,
  second: number | null | undefined,
  direction: "asc" | "desc"
): number {
  const normalizedFirst = typeof first === "number" ? first : null;
  const normalizedSecond = typeof second === "number" ? second : null;

  if (normalizedFirst === null && normalizedSecond === null) {
    return 0;
  }

  if (normalizedFirst === null) {
    return 1;
  }

  if (normalizedSecond === null) {
    return -1;
  }

  return direction === "asc"
    ? normalizedFirst - normalizedSecond
    : normalizedSecond - normalizedFirst;
}

function compareNullableDate(
  first: string | null | undefined,
  second: string | null | undefined,
  direction: "asc" | "desc"
): number {
  const normalizedFirst = first ? new Date(first).getTime() : null;
  const normalizedSecond = second ? new Date(second).getTime() : null;

  if (normalizedFirst === null && normalizedSecond === null) {
    return 0;
  }

  if (normalizedFirst === null) {
    return 1;
  }

  if (normalizedSecond === null) {
    return -1;
  }

  return direction === "asc"
    ? normalizedFirst - normalizedSecond
    : normalizedSecond - normalizedFirst;
}

export function resolveTenderSort(
  value: string | null | undefined,
  tab: "recommended" | "all"
): TenderSortOption {
  const normalized = value?.trim() ?? "";

  switch (normalized) {
    case "nearest":
    case "deadline_asc":
    case "deadline_desc":
    case "value_desc":
    case "value_asc":
    case "newest":
      return normalized;
    case "recommended":
      return tab === "recommended" ? "recommended" : "deadline_asc";
    default:
      return tab === "recommended" ? "recommended" : "deadline_asc";
  }
}

export function sortRecommendedTenderItems<
  TItem extends SortableRecommendedTender<TTender>,
  TTender extends RecommendationTenderInput & { created_at?: string | null },
>(
  items: TItem[],
  sort: TenderSortOption
): TItem[] {
  const sorted = [...items];

  sorted.sort((first, second) => {
    if (sort === "nearest") {
      if (first.locationPriority !== second.locationPriority) {
        return first.locationPriority - second.locationPriority;
      }
      if (first.score !== second.score) {
        return second.score - first.score;
      }
    } else if (sort === "deadline_asc") {
      const deadlineCompare = compareNullableDate(
        first.tender.deadline,
        second.tender.deadline,
        "asc"
      );
      if (deadlineCompare !== 0) {
        return deadlineCompare;
      }
    } else if (sort === "deadline_desc") {
      const deadlineCompare = compareNullableDate(
        first.tender.deadline,
        second.tender.deadline,
        "desc"
      );
      if (deadlineCompare !== 0) {
        return deadlineCompare;
      }
    } else if (sort === "value_desc") {
      const valueCompare = compareNullableNumber(
        first.tender.estimated_value,
        second.tender.estimated_value,
        "desc"
      );
      if (valueCompare !== 0) {
        return valueCompare;
      }
    } else if (sort === "value_asc") {
      const valueCompare = compareNullableNumber(
        first.tender.estimated_value,
        second.tender.estimated_value,
        "asc"
      );
      if (valueCompare !== 0) {
        return valueCompare;
      }
    } else if (sort === "newest") {
      const createdCompare = compareNullableDate(
        first.tender.created_at,
        second.tender.created_at,
        "desc"
      );
      if (createdCompare !== 0) {
        return createdCompare;
      }
    }

    if (first.score !== second.score) {
      return second.score - first.score;
    }

    if ((first.positiveSignalCount ?? 0) !== (second.positiveSignalCount ?? 0)) {
      return (second.positiveSignalCount ?? 0) - (first.positiveSignalCount ?? 0);
    }

    if (first.locationPriority !== second.locationPriority) {
      return first.locationPriority - second.locationPriority;
    }

    return compareNullableDate(first.tender.deadline, second.tender.deadline, "asc");
  });

  return sorted;
}

export function sortStandardTenders<TTender extends Pick<Tender, "deadline" | "estimated_value" | "created_at">>(
  tenders: TTender[],
  sort: Exclude<TenderSortOption, "recommended" | "nearest"> | "recommended"
): TTender[] {
  const sorted = [...tenders];

  sorted.sort((first, second) => {
    if (sort === "value_desc") {
      const valueCompare = compareNullableNumber(
        first.estimated_value,
        second.estimated_value,
        "desc"
      );
      if (valueCompare !== 0) {
        return valueCompare;
      }
    } else if (sort === "value_asc") {
      const valueCompare = compareNullableNumber(
        first.estimated_value,
        second.estimated_value,
        "asc"
      );
      if (valueCompare !== 0) {
        return valueCompare;
      }
    } else if (sort === "deadline_desc") {
      const deadlineCompare = compareNullableDate(
        first.deadline,
        second.deadline,
        "desc"
      );
      if (deadlineCompare !== 0) {
        return deadlineCompare;
      }
    } else if (sort === "newest") {
      const createdCompare = compareNullableDate(
        first.created_at,
        second.created_at,
        "desc"
      );
      if (createdCompare !== 0) {
        return createdCompare;
      }
    } else {
      const deadlineCompare = compareNullableDate(
        first.deadline,
        second.deadline,
        "asc"
      );
      if (deadlineCompare !== 0) {
        return deadlineCompare;
      }
    }

    return compareNullableDate(first.created_at, second.created_at, "desc");
  });

  return sorted;
}
