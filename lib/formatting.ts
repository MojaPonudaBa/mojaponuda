const bsCurrencyFormatter = new Intl.NumberFormat("bs-BA", {
  maximumFractionDigits: 0,
});

const bsDateFormatter = new Intl.DateTimeFormat("bs-BA", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatKM(value: number | null | undefined): string {
  const numericValue = Number(value ?? 0);
  return `${bsCurrencyFormatter.format(numericValue)} KM`;
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const parsed = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(parsed.getTime())) return "—";
  return `${bsDateFormatter.format(parsed)}.`;
}

export function formatRelativeDate(date: string | Date | null | undefined): string {
  if (!date) return "nedavno";
  const parsed = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(parsed.getTime())) return "nedavno";

  const diffMs = Date.now() - parsed.getTime();
  const absMs = Math.abs(diffMs);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (absMs < minute) return "upravo sada";
  if (absMs < hour) {
    const minutes = Math.max(1, Math.round(absMs / minute));
    return diffMs >= 0 ? `prije ${minutes} min` : `za ${minutes} min`;
  }
  if (absMs < day) {
    const hours = Math.max(1, Math.round(absMs / hour));
    const unit = hours === 1 ? "sat" : hours >= 2 && hours <= 4 ? "sata" : "sati";
    return diffMs >= 0 ? `prije ${hours} ${unit}` : `za ${hours} ${unit}`;
  }

  const days = Math.max(1, Math.round(absMs / day));
  const unit = days === 1 ? "dan" : "dana";
  return diffMs >= 0 ? `prije ${days} ${unit}` : `za ${days} ${unit}`;
}

export function formatChartValue(value: number | null | undefined): string {
  const numericValue = Number(value ?? 0);
  const absValue = Math.abs(numericValue);
  if (absValue >= 1_000_000_000) return `${(numericValue / 1_000_000_000).toFixed(1)}B`;
  if (absValue >= 1_000_000) return `${(numericValue / 1_000_000).toFixed(1)}M`;
  if (absValue >= 1_000) return `${Math.round(numericValue / 1_000)}K`;
  return String(Math.round(numericValue));
}
