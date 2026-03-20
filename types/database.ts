export type BidStatus = "draft" | "in_review" | "submitted" | "won" | "lost";
export type ChecklistStatus = "missing" | "attached" | "confirmed";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          jib: string;
          pdv: string | null;
          address: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          industry: string | null;
          cpv_codes: string[] | null;
          keywords: string[] | null;
          operating_regions: string[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          jib: string;
          pdv?: string | null;
          address?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          industry?: string | null;
          cpv_codes?: string[] | null;
          keywords?: string[] | null;
          operating_regions?: string[] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          jib?: string;
          pdv?: string | null;
          address?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          industry?: string | null;
          cpv_codes?: string[] | null;
          keywords?: string[] | null;
          operating_regions?: string[] | null;
          created_at?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          type: string | null;
          file_path: string;
          expires_at: string | null;
          size: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          type?: string | null;
          file_path: string;
          expires_at?: string | null;
          size?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          type?: string | null;
          file_path?: string;
          expires_at?: string | null;
          size?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documents_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          }
        ];
      };
      tenders: {
        Row: {
          id: string;
          portal_id: string;
          title: string;
          contracting_authority: string | null;
          contracting_authority_jib: string | null;
          deadline: string | null;
          estimated_value: number | null;
          contract_type: string | null;
          cpv_code: string | null;
          procedure_type: string | null;
          status: string | null;
          portal_url: string | null;
          raw_description: string | null;
          ai_analysis: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          portal_id: string;
          title: string;
          contracting_authority?: string | null;
          contracting_authority_jib?: string | null;
          deadline?: string | null;
          estimated_value?: number | null;
          contract_type?: string | null;
          cpv_code?: string | null;
          procedure_type?: string | null;
          status?: string | null;
          portal_url?: string | null;
          raw_description?: string | null;
          ai_analysis?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          portal_id?: string;
          title?: string;
          contracting_authority?: string | null;
          contracting_authority_jib?: string | null;
          deadline?: string | null;
          estimated_value?: number | null;
          contract_type?: string | null;
          cpv_code?: string | null;
          procedure_type?: string | null;
          status?: string | null;
          portal_url?: string | null;
          raw_description?: string | null;
          ai_analysis?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      bids: {
        Row: {
          id: string;
          company_id: string;
          tender_id: string;
          status: BidStatus;
          ai_analysis: Json | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          tender_id: string;
          status?: BidStatus;
          ai_analysis?: Json | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          tender_id?: string;
          status?: BidStatus;
          ai_analysis?: Json | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bids_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bids_tender_id_fkey";
            columns: ["tender_id"];
            referencedRelation: "tenders";
            referencedColumns: ["id"];
          }
        ];
      };
      bid_checklist_items: {
        Row: {
          id: string;
          bid_id: string;
          title: string;
          description: string | null;
          status: ChecklistStatus;
          document_id: string | null;
          document_type: string | null;
          risk_note: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          bid_id: string;
          title: string;
          description?: string | null;
          status?: ChecklistStatus;
          document_id?: string | null;
          document_type?: string | null;
          risk_note?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          bid_id?: string;
          title?: string;
          description?: string | null;
          status?: ChecklistStatus;
          document_id?: string | null;
          document_type?: string | null;
          risk_note?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bid_checklist_items_bid_id_fkey";
            columns: ["bid_id"];
            referencedRelation: "bids";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bid_checklist_items_document_id_fkey";
            columns: ["document_id"];
            referencedRelation: "documents";
            referencedColumns: ["id"];
          }
        ];
      };
      bid_documents: {
        Row: {
          id: string;
          bid_id: string;
          document_id: string;
          checklist_item_name: string | null;
          is_confirmed: boolean;
        };
        Insert: {
          id?: string;
          bid_id: string;
          document_id: string;
          checklist_item_name?: string | null;
          is_confirmed?: boolean;
        };
        Update: {
          id?: string;
          bid_id?: string;
          document_id?: string;
          checklist_item_name?: string | null;
          is_confirmed?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "bid_documents_bid_id_fkey";
            columns: ["bid_id"];
            referencedRelation: "bids";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bid_documents_document_id_fkey";
            columns: ["document_id"];
            referencedRelation: "documents";
            referencedColumns: ["id"];
          }
        ];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          lemonsqueezy_customer_id: string | null;
          lemonsqueezy_subscription_id: string | null;
          lemonsqueezy_variant_id: string | null;
          status: string;
          current_period_end: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          lemonsqueezy_customer_id?: string | null;
          lemonsqueezy_subscription_id?: string | null;
          lemonsqueezy_variant_id?: string | null;
          status?: string;
          current_period_end?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          lemonsqueezy_customer_id?: string | null;
          lemonsqueezy_subscription_id?: string | null;
          lemonsqueezy_variant_id?: string | null;
          status?: string;
          current_period_end?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      contracting_authorities: {
        Row: {
          id: string;
          portal_id: string;
          name: string;
          jib: string;
          city: string | null;
          entity: string | null;
          canton: string | null;
          municipality: string | null;
          authority_type: string | null;
          activity_type: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          portal_id: string;
          name: string;
          jib: string;
          city?: string | null;
          entity?: string | null;
          canton?: string | null;
          municipality?: string | null;
          authority_type?: string | null;
          activity_type?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          portal_id?: string;
          name?: string;
          jib?: string;
          city?: string | null;
          entity?: string | null;
          canton?: string | null;
          municipality?: string | null;
          authority_type?: string | null;
          activity_type?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      market_companies: {
        Row: {
          id: string;
          portal_id: string | null;
          name: string;
          jib: string;
          city: string | null;
          municipality: string | null;
          total_bids_count: number;
          total_wins_count: number;
          total_won_value: number;
          win_rate: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          portal_id?: string | null;
          name: string;
          jib: string;
          city?: string | null;
          municipality?: string | null;
          total_bids_count?: number;
          total_wins_count?: number;
          total_won_value?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          portal_id?: string | null;
          name?: string;
          jib?: string;
          city?: string | null;
          municipality?: string | null;
          total_bids_count?: number;
          total_wins_count?: number;
          total_won_value?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      award_decisions: {
        Row: {
          id: string;
          portal_award_id: string;
          tender_id: string | null;
          contracting_authority_jib: string | null;
          winner_name: string | null;
          winner_jib: string | null;
          winning_price: number | null;
          estimated_value: number | null;
          discount_pct: number | null;
          total_bidders_count: number | null;
          procedure_type: string | null;
          contract_type: string | null;
          award_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          portal_award_id: string;
          tender_id?: string | null;
          contracting_authority_jib?: string | null;
          winner_name?: string | null;
          winner_jib?: string | null;
          winning_price?: number | null;
          estimated_value?: number | null;
          total_bidders_count?: number | null;
          procedure_type?: string | null;
          contract_type?: string | null;
          award_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          portal_award_id?: string;
          tender_id?: string | null;
          contracting_authority_jib?: string | null;
          winner_name?: string | null;
          winner_jib?: string | null;
          winning_price?: number | null;
          estimated_value?: number | null;
          total_bidders_count?: number | null;
          procedure_type?: string | null;
          contract_type?: string | null;
          award_date?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "award_decisions_tender_id_fkey";
            columns: ["tender_id"];
            referencedRelation: "tenders";
            referencedColumns: ["id"];
          }
        ];
      };
      planned_procurements: {
        Row: {
          id: string;
          portal_id: string;
          contracting_authority_id: string | null;
          description: string | null;
          estimated_value: number | null;
          planned_date: string | null;
          contract_type: string | null;
          cpv_code: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          portal_id: string;
          contracting_authority_id?: string | null;
          description?: string | null;
          estimated_value?: number | null;
          planned_date?: string | null;
          contract_type?: string | null;
          cpv_code?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          portal_id?: string;
          contracting_authority_id?: string | null;
          description?: string | null;
          estimated_value?: number | null;
          planned_date?: string | null;
          contract_type?: string | null;
          cpv_code?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "planned_procurements_contracting_authority_id_fkey";
            columns: ["contracting_authority_id"];
            referencedRelation: "contracting_authorities";
            referencedColumns: ["id"];
          }
        ];
      };
      authority_requirement_patterns: {
        Row: {
          id: string;
          contracting_authority_jib: string;
          document_type: string;
          tender_id: string | null;
          is_required: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          contracting_authority_jib: string;
          document_type: string;
          tender_id?: string | null;
          is_required?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          contracting_authority_jib?: string;
          document_type?: string;
          tender_id?: string | null;
          is_required?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "authority_requirement_patterns_tender_id_fkey";
            columns: ["tender_id"];
            referencedRelation: "tenders";
            referencedColumns: ["id"];
          }
        ];
      };
      sync_log: {
        Row: {
          id: string;
          endpoint: string;
          last_sync_at: string | null;
          records_added: number;
          records_updated: number;
          ran_at: string;
        };
        Insert: {
          id?: string;
          endpoint: string;
          last_sync_at?: string | null;
          records_added?: number;
          records_updated?: number;
          ran_at?: string;
        };
        Update: {
          id?: string;
          endpoint?: string;
          last_sync_at?: string | null;
          records_added?: number;
          records_updated?: number;
          ran_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      documents_with_expiry: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          type: string | null;
          file_path: string;
          expires_at: string | null;
          created_at: string;
          is_expired: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "documents_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Functions: Record<string, never>;
    Enums: {
      bid_status: BidStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}

// Convenience type aliases
export type Company = Database["public"]["Tables"]["companies"]["Row"];
export type CompanyInsert = Database["public"]["Tables"]["companies"]["Insert"];
export type CompanyUpdate = Database["public"]["Tables"]["companies"]["Update"];

export type Document = Database["public"]["Tables"]["documents"]["Row"];
export type DocumentInsert = Database["public"]["Tables"]["documents"]["Insert"];
export type DocumentUpdate = Database["public"]["Tables"]["documents"]["Update"];

export type Tender = Database["public"]["Tables"]["tenders"]["Row"];
export type TenderInsert = Database["public"]["Tables"]["tenders"]["Insert"];
export type TenderUpdate = Database["public"]["Tables"]["tenders"]["Update"];

export type Bid = Database["public"]["Tables"]["bids"]["Row"];
export type BidInsert = Database["public"]["Tables"]["bids"]["Insert"];
export type BidUpdate = Database["public"]["Tables"]["bids"]["Update"];

export type BidChecklistItem = Database["public"]["Tables"]["bid_checklist_items"]["Row"];
export type BidChecklistItemInsert = Database["public"]["Tables"]["bid_checklist_items"]["Insert"];
export type BidChecklistItemUpdate = Database["public"]["Tables"]["bid_checklist_items"]["Update"];

export type BidDocument = Database["public"]["Tables"]["bid_documents"]["Row"];
export type BidDocumentInsert = Database["public"]["Tables"]["bid_documents"]["Insert"];
export type BidDocumentUpdate = Database["public"]["Tables"]["bid_documents"]["Update"];

export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
export type SubscriptionInsert = Database["public"]["Tables"]["subscriptions"]["Insert"];
export type SubscriptionUpdate = Database["public"]["Tables"]["subscriptions"]["Update"];

export type ContractingAuthority = Database["public"]["Tables"]["contracting_authorities"]["Row"];
export type ContractingAuthorityInsert = Database["public"]["Tables"]["contracting_authorities"]["Insert"];
export type ContractingAuthorityUpdate = Database["public"]["Tables"]["contracting_authorities"]["Update"];

export type MarketCompany = Database["public"]["Tables"]["market_companies"]["Row"];
export type MarketCompanyInsert = Database["public"]["Tables"]["market_companies"]["Insert"];
export type MarketCompanyUpdate = Database["public"]["Tables"]["market_companies"]["Update"];

export type AwardDecision = Database["public"]["Tables"]["award_decisions"]["Row"];
export type AwardDecisionInsert = Database["public"]["Tables"]["award_decisions"]["Insert"];
export type AwardDecisionUpdate = Database["public"]["Tables"]["award_decisions"]["Update"];

export type PlannedProcurement = Database["public"]["Tables"]["planned_procurements"]["Row"];
export type PlannedProcurementInsert = Database["public"]["Tables"]["planned_procurements"]["Insert"];
export type PlannedProcurementUpdate = Database["public"]["Tables"]["planned_procurements"]["Update"];

export type DocumentWithExpiry = Database["public"]["Views"]["documents_with_expiry"]["Row"];

export type AuthorityRequirementPattern = Database["public"]["Tables"]["authority_requirement_patterns"]["Row"];
export type AuthorityRequirementPatternInsert = Database["public"]["Tables"]["authority_requirement_patterns"]["Insert"];
export type AuthorityRequirementPatternUpdate = Database["public"]["Tables"]["authority_requirement_patterns"]["Update"];
