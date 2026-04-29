/**
 * Convenience type aliases over the regenerated Database type.
 * These match the shapes that existed before the Phase B regen.
 */
import type { Database } from "./database";

type Tables = Database["public"]["Tables"];
type Views = Database["public"]["Views"];
type Enums = Database["public"]["Enums"];

export type BidStatus = Enums["bid_status"];
export type ChecklistStatus = Enums["checklist_status"];

export type Company = Tables["companies"]["Row"];
export type CompanyInsert = Tables["companies"]["Insert"];
export type CompanyUpdate = Tables["companies"]["Update"];

export type Document = Tables["documents"]["Row"];
export type DocumentInsert = Tables["documents"]["Insert"];
export type DocumentUpdate = Tables["documents"]["Update"];

export type Tender = Tables["tenders"]["Row"];
export type TenderInsert = Tables["tenders"]["Insert"];
export type TenderUpdate = Tables["tenders"]["Update"];

export type Bid = Tables["bids"]["Row"];
export type BidInsert = Tables["bids"]["Insert"];
export type BidUpdate = Tables["bids"]["Update"];

export type BidChecklistItem = Tables["bid_checklist_items"]["Row"];
export type BidChecklistItemInsert = Tables["bid_checklist_items"]["Insert"];
export type BidChecklistItemUpdate = Tables["bid_checklist_items"]["Update"];

export type BidDocument = Tables["bid_documents"]["Row"];
export type BidDocumentInsert = Tables["bid_documents"]["Insert"];
export type BidDocumentUpdate = Tables["bid_documents"]["Update"];

export type Subscription = Tables["subscriptions"]["Row"];
export type SubscriptionInsert = Tables["subscriptions"]["Insert"];
export type SubscriptionUpdate = Tables["subscriptions"]["Update"];

export type PreparationCreditPurchase = Tables["preparation_credit_purchases"]["Row"];
export type PreparationCreditPurchaseInsert = Tables["preparation_credit_purchases"]["Insert"];
export type PreparationCreditPurchaseUpdate = Tables["preparation_credit_purchases"]["Update"];

export type PreparationConsumption = Tables["preparation_consumptions"]["Row"];
export type PreparationConsumptionInsert = Tables["preparation_consumptions"]["Insert"];
export type PreparationConsumptionUpdate = Tables["preparation_consumptions"]["Update"];

export type ContractingAuthority = Tables["contracting_authorities"]["Row"];
export type ContractingAuthorityInsert = Tables["contracting_authorities"]["Insert"];
export type ContractingAuthorityUpdate = Tables["contracting_authorities"]["Update"];

export type MarketCompany = Tables["market_companies"]["Row"];
export type MarketCompanyInsert = Tables["market_companies"]["Insert"];
export type MarketCompanyUpdate = Tables["market_companies"]["Update"];

export type AwardDecision = Tables["award_decisions"]["Row"];
export type AwardDecisionInsert = Tables["award_decisions"]["Insert"];
export type AwardDecisionUpdate = Tables["award_decisions"]["Update"];

export type PlannedProcurement = Tables["planned_procurements"]["Row"];
export type PlannedProcurementInsert = Tables["planned_procurements"]["Insert"];
export type PlannedProcurementUpdate = Tables["planned_procurements"]["Update"];

export type AdminPortalLeadNote = Tables["admin_portal_lead_notes"]["Row"];
export type AdminPortalLeadNoteInsert = Tables["admin_portal_lead_notes"]["Insert"];
export type AdminPortalLeadNoteUpdate = Tables["admin_portal_lead_notes"]["Update"];

export type DocumentWithExpiry = Views["documents_with_expiry"]["Row"];

export type AuthorityRequirementPattern = Tables["authority_requirement_patterns"]["Row"];
export type AuthorityRequirementPatternInsert = Tables["authority_requirement_patterns"]["Insert"];
export type AuthorityRequirementPatternUpdate = Tables["authority_requirement_patterns"]["Update"];

export type TenderDocUpload = Tables["tender_doc_uploads"]["Row"];
export type TenderDocUploadInsert = Tables["tender_doc_uploads"]["Insert"];
export type TenderDocUploadUpdate = Tables["tender_doc_uploads"]["Update"];
