-- ============================================================
-- MojaPonuda — Complete Database Schema
-- ============================================================

-- 1. ENUMS
-- ============================================================

CREATE TYPE bid_status AS ENUM ('draft', 'in_review', 'submitted', 'won', 'lost');

-- 2. TABLES
-- ============================================================

-- companies — firma koja koristi platformu
CREATE TABLE companies (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  jib           text NOT NULL UNIQUE,
  pdv           text,
  address       text,
  contact_email text,
  contact_phone text,
  industry      text,
  cpv_codes     text[] DEFAULT '{}',
  keywords      text[] DEFAULT '{}',
  operating_regions text[] DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- documents — document vault firme
CREATE TABLE documents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        text NOT NULL,
  type        text,
  file_path   text NOT NULL,
  expires_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- tenders — tenderi iz ejn.gov.ba (javni podaci)
CREATE TABLE tenders (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id                 text NOT NULL UNIQUE,
  title                     text NOT NULL,
  contracting_authority     text,
  contracting_authority_jib text,
  deadline                  timestamptz,
  estimated_value           numeric(15,2),
  contract_type             text,
  procedure_type            text,
  status                    text,
  portal_url                text,
  raw_description           text,
  created_at                timestamptz NOT NULL DEFAULT now()
);

-- bids — projekti pripreme ponuda
CREATE TABLE bids (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tender_id   uuid NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  status      bid_status NOT NULL DEFAULT 'draft',
  ai_analysis jsonb,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- bid_checklist_items — stavke checklista za pripremu ponude
CREATE TYPE checklist_status AS ENUM ('missing', 'attached', 'confirmed');

CREATE TABLE bid_checklist_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id        uuid NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
  title         text NOT NULL,
  description   text,
  status        checklist_status NOT NULL DEFAULT 'missing',
  document_id   uuid REFERENCES documents(id) ON DELETE SET NULL,
  risk_note     text,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- bid_documents — koji dokumenti su priloženi uz koju ponudu
CREATE TABLE bid_documents (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id              uuid NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
  document_id         uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  checklist_item_name text,
  is_confirmed        boolean NOT NULL DEFAULT false
);

-- subscriptions — Lemon Squeezy pretplate
CREATE TABLE subscriptions (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lemonsqueezy_customer_id      text,
  lemonsqueezy_subscription_id  text UNIQUE,
  lemonsqueezy_variant_id       text,
  status                        text NOT NULL DEFAULT 'inactive',
  current_period_end            timestamptz,
  created_at                    timestamptz NOT NULL DEFAULT now()
);

-- contracting_authorities — naručioci iz API-ja (javni podaci)
CREATE TABLE contracting_authorities (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id       text NOT NULL UNIQUE,
  name            text NOT NULL,
  jib             text NOT NULL UNIQUE,
  city            text,
  entity          text,
  canton          text,
  municipality    text,
  authority_type  text,
  activity_type   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- market_companies — firme koje učestvuju na tenderima (javni podaci)
CREATE TABLE market_companies (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id         text,
  name              text NOT NULL,
  jib               text NOT NULL UNIQUE,
  city              text,
  municipality      text,
  total_bids_count  integer NOT NULL DEFAULT 0,
  total_wins_count  integer NOT NULL DEFAULT 0,
  total_won_value   numeric(15,2) NOT NULL DEFAULT 0,
  win_rate          numeric(5,2) GENERATED ALWAYS AS (
    CASE WHEN total_bids_count > 0
      THEN round((total_wins_count::numeric / total_bids_count) * 100, 2)
      ELSE 0
    END
  ) STORED,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- award_decisions — odluke o dodjeli ugovora (javni podaci)
CREATE TABLE award_decisions (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_award_id           text NOT NULL UNIQUE,
  tender_id                 uuid REFERENCES tenders(id) ON DELETE SET NULL,
  contracting_authority_jib text,
  winner_name               text,
  winner_jib                text,
  winning_price             numeric(15,2),
  estimated_value           numeric(15,2),
  discount_pct              numeric(5,2) GENERATED ALWAYS AS (
    CASE WHEN estimated_value IS NOT NULL AND estimated_value > 0 AND winning_price IS NOT NULL
      THEN round(((estimated_value - winning_price) / estimated_value) * 100, 2)
      ELSE NULL
    END
  ) STORED,
  total_bidders_count       integer,
  procedure_type            text,
  contract_type             text,
  award_date                date,
  created_at                timestamptz NOT NULL DEFAULT now()
);

-- planned_procurements — planirani tenderi (javni podaci)
CREATE TABLE planned_procurements (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id                 text NOT NULL UNIQUE,
  contracting_authority_id  uuid REFERENCES contracting_authorities(id) ON DELETE SET NULL,
  description               text,
  estimated_value           numeric(15,2),
  planned_date              date,
  contract_type             text,
  cpv_code                  text,
  created_at                timestamptz NOT NULL DEFAULT now()
);

-- authority_requirement_patterns — učestalost dokumentacijskih zahtjeva po naručiocu
CREATE TABLE authority_requirement_patterns (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contracting_authority_jib  text NOT NULL,
  document_type              text NOT NULL,
  tender_id                  uuid REFERENCES tenders(id) ON DELETE SET NULL,
  is_required                boolean NOT NULL DEFAULT true,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contracting_authority_jib, document_type, tender_id)
);

-- sync_log — evidencija API sinhronizacije
CREATE TABLE sync_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint        text NOT NULL,
  last_sync_at    timestamptz,
  records_added   integer NOT NULL DEFAULT 0,
  records_updated integer NOT NULL DEFAULT 0,
  ran_at          timestamptz NOT NULL DEFAULT now()
);

-- documents_with_expiry — view za računanje is_expired dinamički
CREATE VIEW documents_with_expiry AS
SELECT *,
  (expires_at IS NOT NULL AND expires_at < now()) AS is_expired
FROM documents;

-- 3. INDEXES
-- ============================================================

-- companies
CREATE INDEX idx_companies_user_id ON companies(user_id);
CREATE INDEX idx_companies_jib ON companies(jib);

-- documents
CREATE INDEX idx_documents_company_id ON documents(company_id);
CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_expires_at ON documents(expires_at);

-- tenders
CREATE INDEX idx_tenders_portal_id ON tenders(portal_id);
CREATE INDEX idx_tenders_deadline ON tenders(deadline);
CREATE INDEX idx_tenders_status ON tenders(status);
CREATE INDEX idx_tenders_contracting_authority_jib ON tenders(contracting_authority_jib);
CREATE INDEX idx_tenders_contract_type ON tenders(contract_type);

-- bids
CREATE INDEX idx_bids_company_id ON bids(company_id);
CREATE INDEX idx_bids_tender_id ON bids(tender_id);
CREATE INDEX idx_bids_status ON bids(status);

-- bid_checklist_items
CREATE INDEX idx_bid_checklist_items_bid_id ON bid_checklist_items(bid_id);
CREATE INDEX idx_bid_checklist_items_document_id ON bid_checklist_items(document_id);

-- bid_documents
CREATE INDEX idx_bid_documents_bid_id ON bid_documents(bid_id);
CREATE INDEX idx_bid_documents_document_id ON bid_documents(document_id);

-- subscriptions
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- contracting_authorities
CREATE INDEX idx_contracting_authorities_jib ON contracting_authorities(jib);
CREATE INDEX idx_contracting_authorities_city ON contracting_authorities(city);

-- market_companies
CREATE INDEX idx_market_companies_jib ON market_companies(jib);
CREATE INDEX idx_market_companies_city ON market_companies(city);

-- award_decisions
CREATE INDEX idx_award_decisions_tender_id ON award_decisions(tender_id);
CREATE INDEX idx_award_decisions_winner_jib ON award_decisions(winner_jib);
CREATE INDEX idx_award_decisions_contracting_authority_jib ON award_decisions(contracting_authority_jib);
CREATE INDEX idx_award_decisions_award_date ON award_decisions(award_date);

-- planned_procurements
CREATE INDEX idx_planned_procurements_contracting_authority_id ON planned_procurements(contracting_authority_id);
CREATE INDEX idx_planned_procurements_planned_date ON planned_procurements(planned_date);
CREATE INDEX idx_planned_procurements_cpv_code ON planned_procurements(cpv_code);

-- authority_requirement_patterns
CREATE INDEX idx_arp_authority_jib ON authority_requirement_patterns(contracting_authority_jib);
CREATE INDEX idx_arp_document_type ON authority_requirement_patterns(document_type);
CREATE INDEX idx_arp_tender_id ON authority_requirement_patterns(tender_id);

-- sync_log
CREATE INDEX idx_sync_log_endpoint ON sync_log(endpoint);
CREATE INDEX idx_sync_log_ran_at ON sync_log(ran_at);

-- 4. ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracting_authorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE award_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE planned_procurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE authority_requirement_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

-- companies: korisnik vidi samo svoju firmu
CREATE POLICY "Users can view own company"
  ON companies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own company"
  ON companies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own company"
  ON companies FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own company"
  ON companies FOR DELETE
  USING (auth.uid() = user_id);

-- documents: korisnik vidi samo dokumente svoje firme
CREATE POLICY "Users can view own documents"
  ON documents FOR SELECT
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own documents"
  ON documents FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own documents"
  ON documents FOR UPDATE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own documents"
  ON documents FOR DELETE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- tenders: javni podaci — svi autentificirani korisnici mogu čitati
CREATE POLICY "Tenders are publicly readable"
  ON tenders FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage tenders"
  ON tenders FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- bids: korisnik vidi samo ponude svoje firme
CREATE POLICY "Users can view own bids"
  ON bids FOR SELECT
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own bids"
  ON bids FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own bids"
  ON bids FOR UPDATE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own bids"
  ON bids FOR DELETE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- bid_checklist_items: korisnik vidi samo stavke svojih ponuda
CREATE POLICY "Users can view own bid_checklist_items"
  ON bid_checklist_items FOR SELECT
  USING (bid_id IN (
    SELECT b.id FROM bids b
    JOIN companies c ON c.id = b.company_id
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own bid_checklist_items"
  ON bid_checklist_items FOR INSERT
  WITH CHECK (bid_id IN (
    SELECT b.id FROM bids b
    JOIN companies c ON c.id = b.company_id
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own bid_checklist_items"
  ON bid_checklist_items FOR UPDATE
  USING (bid_id IN (
    SELECT b.id FROM bids b
    JOIN companies c ON c.id = b.company_id
    WHERE c.user_id = auth.uid()
  ))
  WITH CHECK (bid_id IN (
    SELECT b.id FROM bids b
    JOIN companies c ON c.id = b.company_id
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own bid_checklist_items"
  ON bid_checklist_items FOR DELETE
  USING (bid_id IN (
    SELECT b.id FROM bids b
    JOIN companies c ON c.id = b.company_id
    WHERE c.user_id = auth.uid()
  ));

-- bid_documents: korisnik vidi samo bid_documents svojih ponuda
CREATE POLICY "Users can view own bid_documents"
  ON bid_documents FOR SELECT
  USING (bid_id IN (
    SELECT b.id FROM bids b
    JOIN companies c ON c.id = b.company_id
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own bid_documents"
  ON bid_documents FOR INSERT
  WITH CHECK (bid_id IN (
    SELECT b.id FROM bids b
    JOIN companies c ON c.id = b.company_id
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own bid_documents"
  ON bid_documents FOR UPDATE
  USING (bid_id IN (
    SELECT b.id FROM bids b
    JOIN companies c ON c.id = b.company_id
    WHERE c.user_id = auth.uid()
  ))
  WITH CHECK (bid_id IN (
    SELECT b.id FROM bids b
    JOIN companies c ON c.id = b.company_id
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own bid_documents"
  ON bid_documents FOR DELETE
  USING (bid_id IN (
    SELECT b.id FROM bids b
    JOIN companies c ON c.id = b.company_id
    WHERE c.user_id = auth.uid()
  ));

-- subscriptions: korisnik vidi samo svoju pretplatu
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription"
  ON subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
  ON subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
  ON subscriptions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- contracting_authorities: javni podaci
CREATE POLICY "Contracting authorities are publicly readable"
  ON contracting_authorities FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage contracting_authorities"
  ON contracting_authorities FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- market_companies: javni podaci
CREATE POLICY "Market companies are publicly readable"
  ON market_companies FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage market_companies"
  ON market_companies FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- award_decisions: javni podaci
CREATE POLICY "Award decisions are publicly readable"
  ON award_decisions FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage award_decisions"
  ON award_decisions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- planned_procurements: javni podaci
CREATE POLICY "Planned procurements are publicly readable"
  ON planned_procurements FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage planned_procurements"
  ON planned_procurements FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- authority_requirement_patterns: javni za čitanje, service_role za sve
CREATE POLICY "Authority patterns are publicly readable"
  ON authority_requirement_patterns FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert authority patterns"
  ON authority_requirement_patterns FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage authority_requirement_patterns"
  ON authority_requirement_patterns FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- sync_log: samo service_role
CREATE POLICY "Service role can manage sync_log"
  ON sync_log FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
