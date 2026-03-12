export const DOCUMENT_TYPES = [
  "Uvjerenje o registraciji",
  "Uvjerenje o porezu",
  "Uvjerenje o doprinosima",
  "Bankarska garancija",
  "Reference projekata",
  "Finansijski izvještaji",
  "CV ključnog osoblja",
  "Licenca",
  "Izjava",
  "Ostalo",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export type ExpiryStatus = "ok" | "warning" | "danger" | "none";

export function getExpiryStatus(expiresAt: string | null): ExpiryStatus {
  if (!expiresAt) return "none";

  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "danger";
  if (diffDays <= 30) return "danger";
  if (diffDays <= 60) return "warning";
  return "ok";
}

export function getExpiryColor(status: ExpiryStatus): string {
  switch (status) {
    case "ok":
      return "text-emerald-400";
    case "warning":
      return "text-amber-400";
    case "danger":
      return "text-red-400";
    case "none":
      return "text-muted-foreground";
  }
}

export function getExpiryBadgeClasses(status: ExpiryStatus): string {
  switch (status) {
    case "ok":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
    case "warning":
      return "border-amber-500/30 bg-amber-500/10 text-amber-400";
    case "danger":
      return "border-red-500/30 bg-red-500/10 text-red-400";
    case "none":
      return "border-border bg-muted text-muted-foreground";
  }
}

export function formatExpiryText(expiresAt: string | null): string {
  if (!expiresAt) return "Bez roka";

  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `Istekao prije ${Math.abs(diffDays)} dana`;
  if (diffDays === 0) return "Ističe danas";
  if (diffDays === 1) return "Ističe sutra";
  return `Ističe za ${diffDays} dana`;
}
