export const BID_CHECKLIST_STATE_EVENT = "bid-checklist-state";

export interface BidChecklistStateDetail {
  bidId: string;
  totalCount: number;
  resolvedCount: number;
  missingCount: number;
  readyToFinish: boolean;
}
