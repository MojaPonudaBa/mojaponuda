export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      agency_client_notes: {
        Row: {
          agency_client_id: string
          created_at: string
          id: string
          note: string
        }
        Insert: {
          agency_client_id: string
          created_at?: string
          id?: string
          note: string
        }
        Update: {
          agency_client_id?: string
          created_at?: string
          id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_client_notes_agency_client_id_fkey"
            columns: ["agency_client_id"]
            isOneToOne: false
            referencedRelation: "agency_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_clients: {
        Row: {
          agency_user_id: string
          company_id: string
          contract_end: string | null
          contract_start: string | null
          created_at: string
          crm_stage: string | null
          id: string
          monthly_fee: number | null
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          agency_user_id: string
          company_id: string
          contract_end?: string | null
          contract_start?: string | null
          created_at?: string
          crm_stage?: string | null
          id?: string
          monthly_fee?: number | null
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          agency_user_id?: string
          company_id?: string
          contract_end?: string | null
          contract_start?: string | null
          created_at?: string
          crm_stage?: string | null
          id?: string
          monthly_fee?: number | null
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          screen_context: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          screen_context?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          screen_context?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_feedback: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          reason: string | null
          signal: string
          surface: string
          target_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          reason?: string | null
          signal: string
          surface: string
          target_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          reason?: string | null
          signal?: string
          surface?: string
          target_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_parse_cache: {
        Row: {
          created_at: string
          id: string
          input_hash: string
          input_text: string
          model: string
          parsed_query: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          input_hash: string
          input_text: string
          model?: string
          parsed_query?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          input_hash?: string
          input_text?: string
          model?: string
          parsed_query?: Json
          user_id?: string
        }
        Relationships: []
      }
      analytics_daily_insights: {
        Row: {
          company_id: string | null
          context_hash: string | null
          generated_at: string
          id: string
          insight_date: string
          insights: Json
          model: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          context_hash?: string | null
          generated_at?: string
          id?: string
          insight_date?: string
          insights?: Json
          model?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          context_hash?: string | null
          generated_at?: string
          id?: string
          insight_date?: string
          insights?: Json
          model?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_daily_insights_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      authority_cpv_stats: {
        Row: {
          authority_jib: string
          avg_bidders_count: number | null
          avg_discount_pct: number | null
          avg_winning_price: number | null
          bidders_sample_count: number
          cpv_code: string
          discount_sample_count: number
          max_winning_price: number | null
          min_winning_price: number | null
          price_sample_count: number
          tender_count: number
          unique_winner_count: number
          updated_at: string
        }
        Insert: {
          authority_jib: string
          avg_bidders_count?: number | null
          avg_discount_pct?: number | null
          avg_winning_price?: number | null
          bidders_sample_count?: number
          cpv_code: string
          discount_sample_count?: number
          max_winning_price?: number | null
          min_winning_price?: number | null
          price_sample_count?: number
          tender_count?: number
          unique_winner_count?: number
          updated_at?: string
        }
        Update: {
          authority_jib?: string
          avg_bidders_count?: number | null
          avg_discount_pct?: number | null
          avg_winning_price?: number | null
          bidders_sample_count?: number
          cpv_code?: string
          discount_sample_count?: number
          max_winning_price?: number | null
          min_winning_price?: number | null
          price_sample_count?: number
          tender_count?: number
          unique_winner_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      authority_requirement_patterns: {
        Row: {
          contracting_authority_jib: string
          created_at: string
          document_type: string
          id: string
          is_required: boolean
          tender_id: string | null
        }
        Insert: {
          contracting_authority_jib: string
          created_at?: string
          document_type: string
          id?: string
          is_required?: boolean
          tender_id?: string | null
        }
        Update: {
          contracting_authority_jib?: string
          created_at?: string
          document_type?: string
          id?: string
          is_required?: boolean
          tender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "authority_requirement_patterns_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      authority_stats: {
        Row: {
          authority_jib: string
          authority_name: string | null
          avg_bidders_count: number | null
          avg_contract_value: number | null
          avg_discount_pct: number | null
          bidders_sample_count: number
          discount_sample_count: number
          price_sample_count: number
          tender_count: number
          top_cpv_codes: string[]
          total_estimated_value: number
          unique_winner_count: number
          updated_at: string
        }
        Insert: {
          authority_jib: string
          authority_name?: string | null
          avg_bidders_count?: number | null
          avg_contract_value?: number | null
          avg_discount_pct?: number | null
          bidders_sample_count?: number
          discount_sample_count?: number
          price_sample_count?: number
          tender_count?: number
          top_cpv_codes?: string[]
          total_estimated_value?: number
          unique_winner_count?: number
          updated_at?: string
        }
        Update: {
          authority_jib?: string
          authority_name?: string | null
          avg_bidders_count?: number | null
          avg_contract_value?: number | null
          avg_discount_pct?: number | null
          bidders_sample_count?: number
          discount_sample_count?: number
          price_sample_count?: number
          tender_count?: number
          top_cpv_codes?: string[]
          total_estimated_value?: number
          unique_winner_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      award_decisions: {
        Row: {
          award_date: string | null
          contract_type: string | null
          contracting_authority_jib: string | null
          created_at: string
          discount_pct: number | null
          estimated_value: number | null
          id: string
          notice_id: string | null
          portal_award_id: string
          procedure_id: string | null
          procedure_name: string | null
          procedure_type: string | null
          tender_id: string | null
          total_bidders_count: number | null
          winner_jib: string | null
          winner_name: string | null
          winning_price: number | null
        }
        Insert: {
          award_date?: string | null
          contract_type?: string | null
          contracting_authority_jib?: string | null
          created_at?: string
          discount_pct?: number | null
          estimated_value?: number | null
          id?: string
          notice_id?: string | null
          portal_award_id: string
          procedure_id?: string | null
          procedure_name?: string | null
          procedure_type?: string | null
          tender_id?: string | null
          total_bidders_count?: number | null
          winner_jib?: string | null
          winner_name?: string | null
          winning_price?: number | null
        }
        Update: {
          award_date?: string | null
          contract_type?: string | null
          contracting_authority_jib?: string | null
          created_at?: string
          discount_pct?: number | null
          estimated_value?: number | null
          id?: string
          notice_id?: string | null
          portal_award_id?: string
          procedure_id?: string | null
          procedure_name?: string | null
          procedure_type?: string | null
          tender_id?: string | null
          total_bidders_count?: number | null
          winner_jib?: string | null
          winner_name?: string | null
          winning_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "award_decisions_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_checklist_items: {
        Row: {
          bid_id: string
          created_at: string
          description: string | null
          document_id: string | null
          document_type: string | null
          id: string
          page_number: number | null
          page_reference: string | null
          risk_note: string | null
          sort_order: number
          source_highlight_regions: Json | null
          source_page: number | null
          source_quote: string | null
          source_text: string | null
          status: Database["public"]["Enums"]["checklist_status"]
          tender_source_document_id: string | null
          title: string
        }
        Insert: {
          bid_id: string
          created_at?: string
          description?: string | null
          document_id?: string | null
          document_type?: string | null
          id?: string
          page_number?: number | null
          page_reference?: string | null
          risk_note?: string | null
          sort_order?: number
          source_highlight_regions?: Json | null
          source_page?: number | null
          source_quote?: string | null
          source_text?: string | null
          status?: Database["public"]["Enums"]["checklist_status"]
          tender_source_document_id?: string | null
          title: string
        }
        Update: {
          bid_id?: string
          created_at?: string
          description?: string | null
          document_id?: string | null
          document_type?: string | null
          id?: string
          page_number?: number | null
          page_reference?: string | null
          risk_note?: string | null
          sort_order?: number
          source_highlight_regions?: Json | null
          source_page?: number | null
          source_quote?: string | null
          source_text?: string | null
          status?: Database["public"]["Enums"]["checklist_status"]
          tender_source_document_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "bid_checklist_items_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_checklist_items_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_checklist_items_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents_with_expiry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_checklist_items_tender_source_document_id_fkey"
            columns: ["tender_source_document_id"]
            isOneToOne: false
            referencedRelation: "bid_tender_source_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_comments: {
        Row: {
          author_name: string | null
          bid_id: string
          body: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          author_name?: string | null
          bid_id: string
          body: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          author_name?: string | null
          bid_id?: string
          body?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bid_comments_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_documents: {
        Row: {
          bid_id: string
          checklist_item_name: string | null
          document_id: string
          id: string
          is_confirmed: boolean
        }
        Insert: {
          bid_id: string
          checklist_item_name?: string | null
          document_id: string
          id?: string
          is_confirmed?: boolean
        }
        Update: {
          bid_id?: string
          checklist_item_name?: string | null
          document_id?: string
          id?: string
          is_confirmed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "bid_documents_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents_with_expiry"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_tender_source_documents: {
        Row: {
          bid_id: string
          company_id: string
          created_at: string
          file_path: string
          id: string
          mime_type: string | null
          name: string
        }
        Insert: {
          bid_id: string
          company_id: string
          created_at?: string
          file_path: string
          id?: string
          mime_type?: string | null
          name: string
        }
        Update: {
          bid_id?: string
          company_id?: string
          created_at?: string
          file_path?: string
          id?: string
          mime_type?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "bid_tender_source_documents_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_tender_source_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bids: {
        Row: {
          ai_analysis: Json | null
          bid_value: number | null
          company_id: string
          created_at: string
          id: string
          kanban_position: number
          notes: string | null
          status: Database["public"]["Enums"]["bid_status"]
          submission_deadline: string | null
          submitted_at: string | null
          tender_id: string
          updated_at: string
        }
        Insert: {
          ai_analysis?: Json | null
          bid_value?: number | null
          company_id: string
          created_at?: string
          id?: string
          kanban_position?: number
          notes?: string | null
          status?: Database["public"]["Enums"]["bid_status"]
          submission_deadline?: string | null
          submitted_at?: string | null
          tender_id: string
          updated_at?: string
        }
        Update: {
          ai_analysis?: Json | null
          bid_value?: number | null
          company_id?: string
          created_at?: string
          id?: string
          kanban_position?: number
          notes?: string | null
          status?: Database["public"]["Enums"]["bid_status"]
          submission_deadline?: string | null
          submitted_at?: string | null
          tender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bids_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_ai_narratives: {
        Row: {
          authority_jib: string
          authority_name: string | null
          cache_week: string
          company_id: string
          context_hash: string | null
          generated_at: string
          id: string
          model: string
          narrative: Json
        }
        Insert: {
          authority_jib: string
          authority_name?: string | null
          cache_week?: string
          company_id: string
          context_hash?: string | null
          generated_at?: string
          id?: string
          model?: string
          narrative?: Json
        }
        Update: {
          authority_jib?: string
          authority_name?: string | null
          cache_week?: string
          company_id?: string
          context_hash?: string | null
          generated_at?: string
          id?: string
          model?: string
          narrative?: Json
        }
        Relationships: [
          {
            foreignKeyName: "buyer_ai_narratives_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          cpv_codes: string[] | null
          created_at: string
          id: string
          industry: string | null
          jib: string
          keywords: string[] | null
          name: string
          operating_regions: string[] | null
          pdv: string | null
          profile_embedded_at: string | null
          profile_embedding: string | null
          profile_text: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          cpv_codes?: string[] | null
          created_at?: string
          id?: string
          industry?: string | null
          jib: string
          keywords?: string[] | null
          name: string
          operating_regions?: string[] | null
          pdv?: string | null
          profile_embedded_at?: string | null
          profile_embedding?: string | null
          profile_text?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          cpv_codes?: string[] | null
          created_at?: string
          id?: string
          industry?: string | null
          jib?: string
          keywords?: string[] | null
          name?: string
          operating_regions?: string[] | null
          pdv?: string | null
          profile_embedded_at?: string | null
          profile_embedding?: string | null
          profile_text?: string | null
          user_id?: string
        }
        Relationships: []
      }
      company_authority_stats: {
        Row: {
          appearances: number
          authority_jib: string
          company_jib: string
          updated_at: string
          win_rate: number | null
          wins: number
        }
        Insert: {
          appearances?: number
          authority_jib: string
          company_jib: string
          updated_at?: string
          win_rate?: number | null
          wins?: number
        }
        Update: {
          appearances?: number
          authority_jib?: string
          company_jib?: string
          updated_at?: string
          win_rate?: number | null
          wins?: number
        }
        Relationships: []
      }
      company_cpv_stats: {
        Row: {
          appearances: number
          company_jib: string
          cpv_code: string
          updated_at: string
          win_rate: number | null
          wins: number
        }
        Insert: {
          appearances?: number
          company_jib: string
          cpv_code: string
          updated_at?: string
          win_rate?: number | null
          wins?: number
        }
        Update: {
          appearances?: number
          company_jib?: string
          cpv_code?: string
          updated_at?: string
          win_rate?: number | null
          wins?: number
        }
        Relationships: []
      }
      company_stats: {
        Row: {
          avg_discount_pct: number | null
          company_jib: string
          company_name: string | null
          top_authorities: string[]
          top_cpv_codes: string[]
          total_bids: number
          total_wins: number
          total_won_value: number
          updated_at: string
          win_rate: number | null
        }
        Insert: {
          avg_discount_pct?: number | null
          company_jib: string
          company_name?: string | null
          top_authorities?: string[]
          top_cpv_codes?: string[]
          total_bids?: number
          total_wins?: number
          total_won_value?: number
          updated_at?: string
          win_rate?: number | null
        }
        Update: {
          avg_discount_pct?: number | null
          company_jib?: string
          company_name?: string | null
          top_authorities?: string[]
          top_cpv_codes?: string[]
          total_bids?: number
          total_wins?: number
          total_won_value?: number
          updated_at?: string
          win_rate?: number | null
        }
        Relationships: []
      }
      contracting_authorities: {
        Row: {
          activity_type: string | null
          authority_type: string | null
          canton: string | null
          city: string | null
          created_at: string
          entity: string | null
          id: string
          jib: string
          municipality: string | null
          name: string
          portal_id: string
        }
        Insert: {
          activity_type?: string | null
          authority_type?: string | null
          canton?: string | null
          city?: string | null
          created_at?: string
          entity?: string | null
          id?: string
          jib: string
          municipality?: string | null
          name: string
          portal_id: string
        }
        Update: {
          activity_type?: string | null
          authority_type?: string | null
          canton?: string | null
          city?: string | null
          created_at?: string
          entity?: string | null
          id?: string
          jib?: string
          municipality?: string | null
          name?: string
          portal_id?: string
        }
        Relationships: []
      }
      cpv_opportunity_ai_cache: {
        Row: {
          cache_month: string
          company_id: string
          context_hash: string | null
          cpv_code: string
          generated_at: string
          id: string
          model: string
          recommendation: Json
        }
        Insert: {
          cache_month?: string
          company_id: string
          context_hash?: string | null
          cpv_code: string
          generated_at?: string
          id?: string
          model?: string
          recommendation?: Json
        }
        Update: {
          cache_month?: string
          company_id?: string
          context_hash?: string | null
          cpv_code?: string
          generated_at?: string
          id?: string
          model?: string
          recommendation?: Json
        }
        Relationships: [
          {
            foreignKeyName: "cpv_opportunity_ai_cache_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cpv_stats: {
        Row: {
          avg_bidders_count: number | null
          avg_discount_pct: number | null
          avg_estimated_value: number | null
          bidders_sample_count: number
          cpv_code: string
          discount_sample_count: number
          price_sample_count: number
          tender_count: number
          top_authorities: string[]
          unique_winner_count: number
          updated_at: string
        }
        Insert: {
          avg_bidders_count?: number | null
          avg_discount_pct?: number | null
          avg_estimated_value?: number | null
          bidders_sample_count?: number
          cpv_code: string
          discount_sample_count?: number
          price_sample_count?: number
          tender_count?: number
          top_authorities?: string[]
          unique_winner_count?: number
          updated_at?: string
        }
        Update: {
          avg_bidders_count?: number | null
          avg_discount_pct?: number | null
          avg_estimated_value?: number | null
          bidders_sample_count?: number
          cpv_code?: string
          discount_sample_count?: number
          price_sample_count?: number
          tender_count?: number
          top_authorities?: string[]
          unique_winner_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          company_id: string
          created_at: string
          expires_at: string | null
          file_path: string
          id: string
          name: string
          size: number | null
          type: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          expires_at?: string | null
          file_path: string
          id?: string
          name: string
          size?: number | null
          type?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          expires_at?: string | null
          file_path?: string
          id?: string
          name?: string
          size?: number | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ejn_credentials: {
        Row: {
          created_at: string
          last_validated_at: string | null
          last_validation_err: string | null
          last_validation_ok: boolean | null
          password_encrypted: string
          updated_at: string
          user_id: string
          username_encrypted: string
        }
        Insert: {
          created_at?: string
          last_validated_at?: string | null
          last_validation_err?: string | null
          last_validation_ok?: boolean | null
          password_encrypted: string
          updated_at?: string
          user_id: string
          username_encrypted: string
        }
        Update: {
          created_at?: string
          last_validated_at?: string | null
          last_validation_err?: string | null
          last_validation_ok?: boolean | null
          password_encrypted?: string
          updated_at?: string
          user_id?: string
          username_encrypted?: string
        }
        Relationships: []
      }
      legal_updates: {
        Row: {
          created_at: string | null
          external_id: string | null
          id: string
          published_date: string | null
          relevance_tags: string[] | null
          source: string
          source_url: string | null
          summary: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          external_id?: string | null
          id?: string
          published_date?: string | null
          relevance_tags?: string[] | null
          source: string
          source_url?: string | null
          summary?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string | null
          external_id?: string | null
          id?: string
          published_date?: string | null
          relevance_tags?: string[] | null
          source?: string
          source_url?: string | null
          summary?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      market_companies: {
        Row: {
          city: string | null
          created_at: string
          id: string
          jib: string
          municipality: string | null
          name: string
          portal_id: string | null
          total_bids_count: number
          total_wins_count: number
          total_won_value: number
          win_rate: number | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          jib: string
          municipality?: string | null
          name: string
          portal_id?: string | null
          total_bids_count?: number
          total_wins_count?: number
          total_won_value?: number
          win_rate?: number | null
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          jib?: string
          municipality?: string | null
          name?: string
          portal_id?: string | null
          total_bids_count?: number
          total_wins_count?: number
          total_won_value?: number
          win_rate?: number | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          channel: string
          enabled: boolean
          event_type: Database["public"]["Enums"]["notification_event_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          channel?: string
          enabled?: boolean
          event_type: Database["public"]["Enums"]["notification_event_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: string
          enabled?: boolean
          event_type?: Database["public"]["Enums"]["notification_event_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body_html: string | null
          body_text: string | null
          created_at: string
          dedup_key: string
          delivered_at: string | null
          event_type: Database["public"]["Enums"]["notification_event_type"]
          id: string
          payload: Json | null
          read_at: string | null
          subject: string
          user_id: string
        }
        Insert: {
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          dedup_key: string
          delivered_at?: string | null
          event_type: Database["public"]["Enums"]["notification_event_type"]
          id?: string
          payload?: Json | null
          read_at?: string | null
          subject: string
          user_id: string
        }
        Update: {
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          dedup_key?: string
          delivered_at?: string | null
          event_type?: Database["public"]["Enums"]["notification_event_type"]
          id?: string
          payload?: Json | null
          read_at?: string | null
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          ai_competition: string | null
          ai_content: string | null
          ai_difficulty: string | null
          ai_generated_at: string | null
          ai_risks: string | null
          ai_summary: string | null
          ai_who_should_apply: string | null
          category: string | null
          content_quality_score: number | null
          created_at: string | null
          deadline: string | null
          decision_support: Json | null
          description: string | null
          eligibility_signals: string[] | null
          external_id: string | null
          historical_context: Json | null
          id: string
          industry: string | null
          issuer: string
          location: string | null
          published: boolean | null
          quality_score: number | null
          requirements: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          source_url: string
          source_validated: boolean | null
          source_validated_at: string | null
          source_validation_error: string | null
          status: string
          subcategory: string | null
          title: string
          type: string
          updated_at: string | null
          value: number | null
        }
        Insert: {
          ai_competition?: string | null
          ai_content?: string | null
          ai_difficulty?: string | null
          ai_generated_at?: string | null
          ai_risks?: string | null
          ai_summary?: string | null
          ai_who_should_apply?: string | null
          category?: string | null
          content_quality_score?: number | null
          created_at?: string | null
          deadline?: string | null
          decision_support?: Json | null
          description?: string | null
          eligibility_signals?: string[] | null
          external_id?: string | null
          historical_context?: Json | null
          id?: string
          industry?: string | null
          issuer: string
          location?: string | null
          published?: boolean | null
          quality_score?: number | null
          requirements?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          source_url: string
          source_validated?: boolean | null
          source_validated_at?: string | null
          source_validation_error?: string | null
          status?: string
          subcategory?: string | null
          title: string
          type: string
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          ai_competition?: string | null
          ai_content?: string | null
          ai_difficulty?: string | null
          ai_generated_at?: string | null
          ai_risks?: string | null
          ai_summary?: string | null
          ai_who_should_apply?: string | null
          category?: string | null
          content_quality_score?: number | null
          created_at?: string | null
          deadline?: string | null
          decision_support?: Json | null
          description?: string | null
          eligibility_signals?: string[] | null
          external_id?: string | null
          historical_context?: Json | null
          id?: string
          industry?: string | null
          issuer?: string
          location?: string | null
          published?: boolean | null
          quality_score?: number | null
          requirements?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          source_url?: string
          source_validated?: boolean | null
          source_validated_at?: string | null
          source_validation_error?: string | null
          status?: string
          subcategory?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          value?: number | null
        }
        Relationships: []
      }
      opportunity_follows: {
        Row: {
          created_at: string | null
          id: string
          opportunity_id: string
          outcome: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          opportunity_id: string
          outcome?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          opportunity_id?: string
          outcome?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_follows_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      page_analytics: {
        Row: {
          created_at: string | null
          event: string
          id: string
          metadata: Json | null
          opportunity_id: string | null
          path: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event: string
          id?: string
          metadata?: Json | null
          opportunity_id?: string | null
          path: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event?: string
          id?: string
          metadata?: Json | null
          opportunity_id?: string | null
          path?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_analytics_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      planned_procurements: {
        Row: {
          contract_type: string | null
          contracting_authority_id: string | null
          cpv_code: string | null
          created_at: string
          description: string | null
          estimated_value: number | null
          id: string
          planned_date: string | null
          portal_id: string
        }
        Insert: {
          contract_type?: string | null
          contracting_authority_id?: string | null
          cpv_code?: string | null
          created_at?: string
          description?: string | null
          estimated_value?: number | null
          id?: string
          planned_date?: string | null
          portal_id: string
        }
        Update: {
          contract_type?: string | null
          contracting_authority_id?: string | null
          cpv_code?: string | null
          created_at?: string
          description?: string | null
          estimated_value?: number | null
          id?: string
          planned_date?: string | null
          portal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planned_procurements_contracting_authority_id_fkey"
            columns: ["contracting_authority_id"]
            isOneToOne: false
            referencedRelation: "contracting_authorities"
            referencedColumns: ["id"]
          },
        ]
      }
      preparation_consumptions: {
        Row: {
          bid_id: string
          billing_cycle_end: string | null
          billing_cycle_start: string | null
          company_id: string
          created_at: string
          id: string
          purchase_id: string | null
          source: string
          user_id: string
        }
        Insert: {
          bid_id: string
          billing_cycle_end?: string | null
          billing_cycle_start?: string | null
          company_id: string
          created_at?: string
          id?: string
          purchase_id?: string | null
          source: string
          user_id: string
        }
        Update: {
          bid_id?: string
          billing_cycle_end?: string | null
          billing_cycle_start?: string | null
          company_id?: string
          created_at?: string
          id?: string
          purchase_id?: string | null
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "preparation_consumptions_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: true
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preparation_consumptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preparation_consumptions_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "preparation_credit_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      preparation_credit_purchases: {
        Row: {
          agency_client_id: string | null
          company_id: string
          created_at: string
          credits_granted: number
          id: string
          lemonsqueezy_order_id: string | null
          lemonsqueezy_variant_id: string | null
          pack_id: string
          paid_at: string | null
          price_paid: number
          status: string
          user_id: string
        }
        Insert: {
          agency_client_id?: string | null
          company_id: string
          created_at?: string
          credits_granted: number
          id?: string
          lemonsqueezy_order_id?: string | null
          lemonsqueezy_variant_id?: string | null
          pack_id: string
          paid_at?: string | null
          price_paid?: number
          status?: string
          user_id: string
        }
        Update: {
          agency_client_id?: string | null
          company_id?: string
          created_at?: string
          credits_granted?: number
          id?: string
          lemonsqueezy_order_id?: string | null
          lemonsqueezy_variant_id?: string | null
          pack_id?: string
          paid_at?: string | null
          price_paid?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "preparation_credit_purchases_agency_client_id_fkey"
            columns: ["agency_client_id"]
            isOneToOne: false
            referencedRelation: "agency_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preparation_credit_purchases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_alerts: {
        Row: {
          created_at: string
          enabled: boolean
          frequency: string
          id: string
          name: string
          quality_stats: Json
          structured_query: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          frequency?: string
          id?: string
          name: string
          quality_stats?: Json
          structured_query?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          frequency?: string
          id?: string
          name?: string
          quality_stats?: Json
          structured_query?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scraper_log: {
        Row: {
          error: string | null
          id: string
          items_found: number | null
          items_new: number | null
          items_skipped: number | null
          ran_at: string | null
          source: string
        }
        Insert: {
          error?: string | null
          id?: string
          items_found?: number | null
          items_new?: number | null
          items_skipped?: number | null
          ran_at?: string | null
          source: string
        }
        Update: {
          error?: string | null
          id?: string
          items_found?: number | null
          items_new?: number | null
          items_skipped?: number | null
          ran_at?: string | null
          source?: string
        }
        Relationships: []
      }
      source_validation_log: {
        Row: {
          error: string | null
          expected_domain: string
          id: string
          opportunity_id: string
          redirect_chain: string[] | null
          source_url: string
          status_code: number | null
          valid: boolean
          validated_at: string | null
        }
        Insert: {
          error?: string | null
          expected_domain: string
          id?: string
          opportunity_id: string
          redirect_chain?: string[] | null
          source_url: string
          status_code?: number | null
          valid: boolean
          validated_at?: string | null
        }
        Update: {
          error?: string | null
          expected_domain?: string
          id?: string
          opportunity_id?: string
          redirect_chain?: string[] | null
          source_url?: string
          status_code?: number | null
          valid?: boolean
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "source_validation_log_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          lemonsqueezy_customer_id: string | null
          lemonsqueezy_subscription_id: string | null
          lemonsqueezy_variant_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          lemonsqueezy_customer_id?: string | null
          lemonsqueezy_subscription_id?: string | null
          lemonsqueezy_variant_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          lemonsqueezy_customer_id?: string | null
          lemonsqueezy_subscription_id?: string | null
          lemonsqueezy_variant_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      sync_log: {
        Row: {
          endpoint: string
          id: string
          last_sync_at: string | null
          ran_at: string
          records_added: number
          records_updated: number
        }
        Insert: {
          endpoint: string
          id?: string
          last_sync_at?: string | null
          ran_at?: string
          records_added?: number
          records_updated?: number
        }
        Update: {
          endpoint?: string
          id?: string
          last_sync_at?: string | null
          ran_at?: string
          records_added?: number
          records_updated?: number
        }
        Relationships: []
      }
      tender_decision_insights: {
        Row: {
          active_competitors: number
          authority_profile: Json
          average_bidders: number | null
          company_id: string
          competition_label: string
          competition_level: string
          computed_at: string
          data_quality: string
          estimated_effort: string
          expected_bidders_range: Json
          explanation: string
          key_reasons: Json
          match_score: number
          price_range: Json
          priority_score: number
          recommendation: string
          recommendation_label: string
          risk_indicators: Json
          risk_level: string
          source_version: string
          tender_id: string
          top_competitors: Json
          win_confidence: string
          win_probability: number
          winning_discount_range: Json
        }
        Insert: {
          active_competitors?: number
          authority_profile?: Json
          average_bidders?: number | null
          company_id: string
          competition_label?: string
          competition_level?: string
          computed_at?: string
          data_quality?: string
          estimated_effort?: string
          expected_bidders_range?: Json
          explanation?: string
          key_reasons?: Json
          match_score: number
          price_range?: Json
          priority_score?: number
          recommendation?: string
          recommendation_label?: string
          risk_indicators?: Json
          risk_level?: string
          source_version?: string
          tender_id: string
          top_competitors?: Json
          win_confidence?: string
          win_probability: number
          winning_discount_range?: Json
        }
        Update: {
          active_competitors?: number
          authority_profile?: Json
          average_bidders?: number | null
          company_id?: string
          competition_label?: string
          competition_level?: string
          computed_at?: string
          data_quality?: string
          estimated_effort?: string
          expected_bidders_range?: Json
          explanation?: string
          key_reasons?: Json
          match_score?: number
          price_range?: Json
          priority_score?: number
          recommendation?: string
          recommendation_label?: string
          risk_indicators?: Json
          risk_level?: string
          source_version?: string
          tender_id?: string
          top_competitors?: Json
          win_confidence?: string
          win_probability?: number
          winning_discount_range?: Json
        }
        Relationships: [
          {
            foreignKeyName: "tender_decision_insights_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_decision_insights_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_doc_uploads: {
        Row: {
          ai_analysis: Json | null
          bid_id: string
          content_type: string | null
          created_at: string | null
          error_message: string | null
          extracted_text: string | null
          file_name: string
          file_path: string
          file_size: number
          id: string
          page_count: number | null
          status: string
        }
        Insert: {
          ai_analysis?: Json | null
          bid_id: string
          content_type?: string | null
          created_at?: string | null
          error_message?: string | null
          extracted_text?: string | null
          file_name: string
          file_path: string
          file_size?: number
          id?: string
          page_count?: number | null
          status?: string
        }
        Update: {
          ai_analysis?: Json | null
          bid_id?: string
          content_type?: string | null
          created_at?: string | null
          error_message?: string | null
          extracted_text?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          page_count?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "tender_doc_uploads_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_relevance: {
        Row: {
          company_id: string
          confidence: number
          created_at: string
          id: string
          model_version: string
          score: number
          tender_id: string
        }
        Insert: {
          company_id: string
          confidence: number
          created_at?: string
          id?: string
          model_version?: string
          score: number
          tender_id: string
        }
        Update: {
          company_id?: string
          confidence?: number
          created_at?: string
          id?: string
          model_version?: string
          score?: number
          tender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tender_relevance_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_relevance_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      tenders: {
        Row: {
          ai_analysis: Json | null
          contract_type: string | null
          contracting_authority: string | null
          contracting_authority_jib: string | null
          cpv_code: string | null
          created_at: string
          deadline: string | null
          embedding: string | null
          estimated_value: number | null
          id: string
          portal_id: string
          portal_url: string | null
          procedure_type: string | null
          raw_description: string | null
          status: string | null
          title: string
        }
        Insert: {
          ai_analysis?: Json | null
          contract_type?: string | null
          contracting_authority?: string | null
          contracting_authority_jib?: string | null
          cpv_code?: string | null
          created_at?: string
          deadline?: string | null
          embedding?: string | null
          estimated_value?: number | null
          id?: string
          portal_id: string
          portal_url?: string | null
          procedure_type?: string | null
          raw_description?: string | null
          status?: string | null
          title: string
        }
        Update: {
          ai_analysis?: Json | null
          contract_type?: string | null
          contracting_authority?: string | null
          contracting_authority_jib?: string | null
          cpv_code?: string | null
          created_at?: string
          deadline?: string | null
          embedding?: string | null
          estimated_value?: number | null
          id?: string
          portal_id?: string
          portal_url?: string | null
          procedure_type?: string | null
          raw_description?: string | null
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      user_analytics: {
        Row: {
          created_at: string
          event_name: string
          id: string
          metadata: Json
          route: string | null
          target_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          metadata?: Json
          route?: string | null
          target_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          metadata?: Json
          route?: string | null
          target_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_onboarding: {
        Row: {
          completed_items: string[]
          computed_completion: Json
          confetti_shown_at: string | null
          dismissed_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_items?: string[]
          computed_completion?: Json
          confetti_shown_at?: string | null
          dismissed_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_items?: string[]
          computed_completion?: Json
          confetti_shown_at?: string | null
          dismissed_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          company_id: string | null
          display_preferences: Json
          notification_preferences: Json
          profile_preferences: Json
          recommendation_weights: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          display_preferences?: Json
          notification_preferences?: Json
          profile_preferences?: Json
          recommendation_weights?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          display_preferences?: Json
          notification_preferences?: Json
          profile_preferences?: Json
          recommendation_weights?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      watchlist_items: {
        Row: {
          company_id: string | null
          created_at: string
          entity_key: string
          entity_label: string | null
          entity_type: Database["public"]["Enums"]["watchlist_entity_type"]
          id: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          entity_key: string
          entity_label?: string | null
          entity_type: Database["public"]["Enums"]["watchlist_entity_type"]
          id?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          entity_key?: string
          entity_label?: string | null
          entity_type?: Database["public"]["Enums"]["watchlist_entity_type"]
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      documents_with_expiry: {
        Row: {
          company_id: string | null
          created_at: string | null
          expires_at: string | null
          file_path: string | null
          id: string | null
          is_expired: boolean | null
          name: string | null
          type: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          file_path?: string | null
          id?: string | null
          is_expired?: never
          name?: string | null
          type?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          file_path?: string | null
          id?: string | null
          is_expired?: never
          name?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_quality_score: {
        Args: {
          p_ai_content: string
          p_seo_description: string
          p_seo_title: string
          p_source_validated: boolean
        }
        Returns: number
      }
      match_tenders_by_embedding: {
        Args: {
          match_count?: number
          now_iso?: string
          query_embedding: string
        }
        Returns: {
          id: string
          similarity: number
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      bid_status: "draft" | "in_review" | "submitted" | "won" | "lost"
      checklist_status: "missing" | "attached" | "confirmed"
      notification_event_type:
        | "new_tender_watched_authority"
        | "new_tender_watched_cpv"
        | "competitor_downloaded_td"
        | "bid_deadline_7d"
        | "bid_deadline_2d"
        | "vault_document_expires_30d"
        | "vault_document_expires_7d"
        | "planned_procurement_watched_authority"
        | "planned_procurement_watched_cpv"
        | "competitor_new_award"
        | "decision_recommended_bid"
        | "decision_high_risk"
      watchlist_entity_type: "authority" | "cpv" | "company"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      bid_status: ["draft", "in_review", "submitted", "won", "lost"],
      checklist_status: ["missing", "attached", "confirmed"],
      notification_event_type: [
        "new_tender_watched_authority",
        "new_tender_watched_cpv",
        "competitor_downloaded_td",
        "bid_deadline_7d",
        "bid_deadline_2d",
        "vault_document_expires_30d",
        "vault_document_expires_7d",
        "planned_procurement_watched_authority",
        "planned_procurement_watched_cpv",
        "competitor_new_award",
        "decision_recommended_bid",
        "decision_high_risk",
      ],
      watchlist_entity_type: ["authority", "cpv", "company"],
    },
  },
} as const
