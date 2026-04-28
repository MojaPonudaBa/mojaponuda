import type { RecommendationTenderInput } from "@/lib/tender-recommendations";
import {
  getAnchorCoords,
  getCoordsForPlace,
  haversineKm,
} from "@/lib/constants/municipality-coordinates";
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

export interface TenderWithComputedLocation {
  contracting_authority?: string | null;
  authority_city?: string | null;
  authority_municipality?: string | null;
  authority_canton?: string | null;
  locationPriority?: number | null;
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

function getLocationCandidates(tender: TenderWithComputedLocation): string[] {
  return [
    tender.authority_municipality,
    tender.authority_city,
    tender.authority_canton,
    tender.contracting_authority,
  ].filter((value): value is string => Boolean(value?.trim()));
}

export function computeTenderLocationPriority(
  tender: TenderWithComputedLocation,
  selectedRegions: string[]
): number {
  const anchor = getAnchorCoords(selectedRegions);
  if (!anchor) {
    return Number.POSITIVE_INFINITY;
  }

  let bestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of getLocationCandidates(tender)) {
    const direct = getCoordsForPlace(candidate);
    if (direct) {
      bestDistance = Math.min(
        bestDistance,
        haversineKm(anchor.lat, anchor.lng, direct.lat, direct.lng)
      );
      continue;
    }

    const pieces = candidate.split(/[\s,().\-–/]+/).filter((piece) => piece.length >= 4);
    for (let index = 0; index < pieces.length; index += 1) {
      const single = getCoordsForPlace(pieces[index]);
      if (single) {
        bestDistance = Math.min(
          bestDistance,
          haversineKm(anchor.lat, anchor.lng, single.lat, single.lng)
        );
      }

      if (index < pieces.length - 1) {
        const combined = getCoordsForPlace(`${pieces[index]} ${pieces[index + 1]}`);
        if (combined) {
          bestDistance = Math.min(
            bestDistance,
            haversineKm(anchor.lat, anchor.lng, combined.lat, combined.lng)
          );
        }
      }
    }
  }

  return bestDistance;
}

export function attachTenderLocationPriority<
  TTender extends TenderWithComputedLocation,
>(tenders: TTender[], selectedRegions: string[]): Array<TTender & { locationPriority: number }> {
  return tenders.map((tender) => ({
    ...tender,
    locationPriority:
      typeof tender.locationPriority === "number"
        ? tender.locationPriority
        : computeTenderLocationPriority(tender, selectedRegions),
  }));
}

export function resolveTenderSort(
  value: string | null | undefined,
  tab: "recommended" | "all"
): TenderSortOption {
  const normalized = value?.trim() ?? "";

  switch (normalized) {
    case "nearest":
      return tab === "recommended" ? "nearest" : "deadline_asc";
    case "deadline_asc":
    case "deadline_desc":
    case "value_desc":
    case "value_asc":
    case "newest":
      return normalized;
    case "recommended":
      return tab === "recommended" ? "recommended" : "deadline_asc";
    default:
      return tab === "recommended" ? "nearest" : "deadline_asc";
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

export function sortStandardTenders<
  TTender extends Pick<Tender, "deadline" | "estimated_value" | "created_at"> & {
    locationPriority?: number | null;
  },
>(
  tenders: TTender[],
  sort: TenderSortOption
): TTender[] {
  const sorted = [...tenders];

  sorted.sort((first, second) => {
    if (sort === "nearest") {
      const firstPriority =
        typeof first.locationPriority === "number" ? first.locationPriority : Number.POSITIVE_INFINITY;
      const secondPriority =
        typeof second.locationPriority === "number" ? second.locationPriority : Number.POSITIVE_INFINITY;

      if (firstPriority !== secondPriority) {
        return firstPriority - secondPriority;
      }
    } else if (sort === "value_desc") {
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

    const deadlineCompare = compareNullableDate(first.deadline, second.deadline, "asc");
    if (deadlineCompare !== 0) {
      return deadlineCompare;
    }

    return compareNullableDate(first.created_at, second.created_at, "desc");
  });

  return sorted;
}
