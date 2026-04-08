-- ============================================================
-- Opportunity Content Quality and Accuracy System
-- Migration: Add source validation, historical context, decision support
-- ============================================================

-- ── 1. Extend opportunities table with new columns ──────────────────────────────

-- Source validation fields
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS source_validated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_validation_error TEXT,
  ADD COLUMN IF NOT EXISTS source_validated_at TIMESTAMPTZ;

-- Enhanced AI content field (long-form SEO article)
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS ai_content TEXT;

-- Historical context and decision support (JSONB for flexibility)
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS historical_context JSONB,
  ADD COLUMN IF NOT EXISTS decision_support JSONB;

-- Content quality score (0-100)
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS content_quality_score INTEGER DEFAULT 0;

-- ── 2. Create source_validation_log table ──────────────────────────────

CREATE TABLE IF NOT EXISTS source_validation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  expected_domain TEXT NOT NULL,
  status_code INTEGER,
  valid BOOLEAN NOT NULL,
  error TEXT,
  redirect_chain TEXT[],
  validated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for source_validation_log
CREATE INDEX IF NOT EXISTS idx_source_validation_opportunity 
  ON source_validation_log(opportunity_id);

CREATE INDEX IF NOT EXISTS idx_source_validation_invalid 
  ON source_validation_log(valid) 
  WHERE valid = false;

CREATE INDEX IF NOT EXISTS idx_source_validation_recent
  ON source_validation_log(validated_at DESC);

-- ── 3. Create indexes for filtering ──────────────────────────────

-- Index for "deadline soon" filter (≤ 14 days)
-- Note: Cannot use NOW() in index predicate, so we index all deadlines and filter in queries
CREATE INDEX IF NOT EXISTS idx_opportunities_deadline_soon 
  ON opportunities(deadline) 
  WHERE status = 'active' AND published = true;

-- Index for high value filtering (supports percentile queries)
CREATE INDEX IF NOT EXISTS idx_opportunities_high_value 
  ON opportunities(value DESC NULLS LAST) 
  WHERE value IS NOT NULL AND status = 'active' AND published = true;

-- Index for difficulty filtering
CREATE INDEX IF NOT EXISTS idx_opportunities_difficulty
  ON opportunities(ai_difficulty)
  WHERE ai_difficulty IS NOT NULL AND status = 'active' AND published = true;

-- Index for quality score monitoring
CREATE INDEX IF NOT EXISTS idx_opportunities_quality_score
  ON opportunities(content_quality_score)
  WHERE published = true;

-- Index for source validation status
CREATE INDEX IF NOT EXISTS idx_opportunities_source_validated
  ON opportunities(source_validated)
  WHERE published = true;

-- ── 4. RLS policies for new tables ──────────────────────────────

ALTER TABLE source_validation_log ENABLE ROW LEVEL SECURITY;

-- Admin-only read access to validation logs
CREATE POLICY "Admin read source validation logs"
  ON source_validation_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Service role can insert validation logs
CREATE POLICY "Service role insert validation logs"
  ON source_validation_log FOR INSERT
  WITH CHECK (true);

-- ── 5. Add helpful comments ──────────────────────────────

COMMENT ON COLUMN opportunities.source_validated IS 'Whether source_url has been validated as accessible and matching expected domain';
COMMENT ON COLUMN opportunities.source_validation_error IS 'Error message if source validation failed';
COMMENT ON COLUMN opportunities.source_validated_at IS 'Timestamp of last source validation attempt';
COMMENT ON COLUMN opportunities.ai_content IS 'Long-form SEO-optimized article content (400-650 words)';
COMMENT ON COLUMN opportunities.historical_context IS 'JSONB: similar_calls_count, issuer_calls_count, category_trend, typical_frequency';
COMMENT ON COLUMN opportunities.decision_support IS 'JSONB: competition_level, success_probability, typical_mistakes, recommendation, reasoning';
COMMENT ON COLUMN opportunities.content_quality_score IS 'Quality score 0-100: source_validated(20) + ai_content(40) + SEO(40)';

COMMENT ON TABLE source_validation_log IS 'Log of source URL validation attempts for opportunities';
COMMENT ON COLUMN source_validation_log.expected_domain IS 'Expected domain pattern for the source (e.g., fmrpo.gov.ba)';
COMMENT ON COLUMN source_validation_log.redirect_chain IS 'Array of URLs if redirects were followed';

-- ── 6. Create helper function for quality score calculation ──────────────────────────────

CREATE OR REPLACE FUNCTION calculate_quality_score(
  p_source_validated BOOLEAN,
  p_ai_content TEXT,
  p_seo_title TEXT,
  p_seo_description TEXT
) RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
BEGIN
  -- Source validation: 20 points
  IF p_source_validated = true THEN
    score := score + 20;
  END IF;
  
  -- AI content completeness: 40 points
  IF p_ai_content IS NOT NULL AND LENGTH(p_ai_content) >= 400 THEN
    score := score + 40;
  ELSIF p_ai_content IS NOT NULL AND LENGTH(p_ai_content) >= 200 THEN
    score := score + 20;
  END IF;
  
  -- SEO optimization: 40 points
  IF p_seo_title IS NOT NULL AND LENGTH(p_seo_title) BETWEEN 30 AND 65 THEN
    score := score + 20;
  END IF;
  
  IF p_seo_description IS NOT NULL AND LENGTH(p_seo_description) BETWEEN 140 AND 155 THEN
    score := score + 20;
  END IF;
  
  RETURN score;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_quality_score IS 'Calculates content quality score (0-100) based on validation, AI content, and SEO';

-- ── 7. Create trigger to auto-update quality score ──────────────────────────────

CREATE OR REPLACE FUNCTION update_quality_score_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.content_quality_score := calculate_quality_score(
    NEW.source_validated,
    NEW.ai_content,
    NEW.seo_title,
    NEW.seo_description
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_quality_score ON opportunities;

CREATE TRIGGER trigger_update_quality_score
  BEFORE INSERT OR UPDATE OF source_validated, ai_content, seo_title, seo_description
  ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_quality_score_trigger();

COMMENT ON FUNCTION update_quality_score_trigger IS 'Trigger function to automatically update content_quality_score on changes';

