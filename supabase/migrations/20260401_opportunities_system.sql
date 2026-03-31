-- ============================================================
-- Opportunities & Legal Updates System
-- ============================================================

-- Unified opportunity model (poticaji + tenderi za SEO)
CREATE TABLE IF NOT EXISTS opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('tender', 'poticaj')),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  issuer text NOT NULL,
  category text,
  subcategory text,
  industry text,
  value numeric,
  deadline date,
  location text,
  requirements text,
  eligibility_signals text[],
  description text,
  source_url text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'draft')),
  -- SEO
  seo_title text,
  seo_description text,
  -- AI generated fields
  ai_summary text,
  ai_who_should_apply text,
  ai_difficulty text CHECK (ai_difficulty IN ('lako', 'srednje', 'tesko')),
  ai_risks text,
  ai_competition text,
  ai_generated_at timestamptz,
  -- Scoring
  quality_score integer DEFAULT 0,
  published boolean DEFAULT false,
  -- Source dedup
  external_id text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opportunities_type ON opportunities(type);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_published ON opportunities(published);
CREATE INDEX IF NOT EXISTS idx_opportunities_deadline ON opportunities(deadline);
CREATE INDEX IF NOT EXISTS idx_opportunities_category ON opportunities(category);
CREATE INDEX IF NOT EXISTS idx_opportunities_slug ON opportunities(slug);

-- Legal updates (zakoni, izmjene, vijesti)
CREATE TABLE IF NOT EXISTS legal_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('zakon', 'izmjena', 'vijest')),
  title text NOT NULL,
  summary text,
  source text NOT NULL,
  source_url text,
  published_date date,
  relevance_tags text[],
  external_id text UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legal_updates_type ON legal_updates(type);
CREATE INDEX IF NOT EXISTS idx_legal_updates_date ON legal_updates(published_date DESC);

-- Scraper run log
CREATE TABLE IF NOT EXISTS scraper_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  items_found integer DEFAULT 0,
  items_new integer DEFAULT 0,
  items_skipped integer DEFAULT 0,
  error text,
  ran_at timestamptz DEFAULT now()
);

-- User opportunity tracking (praćenje)
CREATE TABLE IF NOT EXISTS opportunity_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, opportunity_id)
);

CREATE INDEX IF NOT EXISTS idx_opportunity_follows_user ON opportunity_follows(user_id);

-- Page analytics (admin only)
CREATE TABLE IF NOT EXISTS page_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL,
  event text NOT NULL CHECK (event IN ('view', 'cta_click', 'signup', 'follow')),
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_analytics_path ON page_analytics(path);
CREATE INDEX IF NOT EXISTS idx_page_analytics_event ON page_analytics(event);
CREATE INDEX IF NOT EXISTS idx_page_analytics_created ON page_analytics(created_at DESC);

-- RLS policies
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraper_log ENABLE ROW LEVEL SECURITY;

-- Public read for published opportunities
CREATE POLICY "Public read published opportunities"
  ON opportunities FOR SELECT
  USING (published = true AND status = 'active');

-- Public read for legal updates
CREATE POLICY "Public read legal updates"
  ON legal_updates FOR SELECT
  USING (true);

-- Users can manage their own follows
CREATE POLICY "Users manage own follows"
  ON opportunity_follows FOR ALL
  USING (auth.uid() = user_id);

-- Analytics insert for anyone (anonymous tracking)
CREATE POLICY "Anyone can insert analytics"
  ON page_analytics FOR INSERT
  WITH CHECK (true);
