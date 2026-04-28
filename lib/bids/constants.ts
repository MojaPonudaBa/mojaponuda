import type { BidStatus } from "@/types/database";

export const BID_STATUS_LABELS: Record<BidStatus, string> = {
  draft: "Nacrt",
  in_review: "U pripremi",
  submitted: "Predano",
  won: "Dobijeno",
  lost: "Izgubljeno",
};

export const BID_STATUS_CLASSES: Record<BidStatus, string> = {
  draft: "border-border bg-muted text-muted-foreground",
  in_review: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  submitted: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  won: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  lost: "border-red-500/30 bg-red-500/10 text-red-400",
};

export const BID_STATUSES: BidStatus[] = [
  "draft",
  "in_review",
  "submitted",
  "won",
  "lost",
];
