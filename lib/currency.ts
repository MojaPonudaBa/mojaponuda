export function formatCurrencyKM(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }

  const roundedValue = Math.round(value);

  return `${new Intl.NumberFormat("bs-BA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(roundedValue)} KM`;
}
