CREATE TABLE IF NOT EXISTS public.preparation_credit_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agency_client_id uuid REFERENCES public.agency_clients(id) ON DELETE SET NULL,
  pack_id text NOT NULL,
  credits_granted integer NOT NULL CHECK (credits_granted > 0),
  price_paid numeric(10, 2) NOT NULL DEFAULT 0,
  lemonsqueezy_order_id text UNIQUE,
  lemonsqueezy_variant_id text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.preparation_consumptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bid_id uuid NOT NULL UNIQUE REFERENCES public.bids(id) ON DELETE CASCADE,
  purchase_id uuid REFERENCES public.preparation_credit_purchases(id) ON DELETE SET NULL,
  source text NOT NULL CHECK (source IN ('included', 'purchased', 'legacy_unlock', 'complimentary')),
  billing_cycle_start timestamptz,
  billing_cycle_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_preparation_credit_purchases_user_company
  ON public.preparation_credit_purchases(user_id, company_id);

CREATE INDEX IF NOT EXISTS idx_preparation_credit_purchases_status
  ON public.preparation_credit_purchases(status);

CREATE INDEX IF NOT EXISTS idx_preparation_consumptions_user_company
  ON public.preparation_consumptions(user_id, company_id);

CREATE INDEX IF NOT EXISTS idx_preparation_consumptions_purchase_id
  ON public.preparation_consumptions(purchase_id);

CREATE INDEX IF NOT EXISTS idx_preparation_consumptions_created_at
  ON public.preparation_consumptions(created_at);

ALTER TABLE public.preparation_credit_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preparation_consumptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own preparation credit purchases" ON public.preparation_credit_purchases;
CREATE POLICY "Users can view own preparation credit purchases"
  ON public.preparation_credit_purchases FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own preparation credit purchases" ON public.preparation_credit_purchases;
CREATE POLICY "Users can insert own preparation credit purchases"
  ON public.preparation_credit_purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own preparation credit purchases" ON public.preparation_credit_purchases;
CREATE POLICY "Users can update own preparation credit purchases"
  ON public.preparation_credit_purchases FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage preparation credit purchases" ON public.preparation_credit_purchases;
CREATE POLICY "Service role can manage preparation credit purchases"
  ON public.preparation_credit_purchases FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users can view own preparation consumptions" ON public.preparation_consumptions;
CREATE POLICY "Users can view own preparation consumptions"
  ON public.preparation_consumptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own preparation consumptions" ON public.preparation_consumptions;
CREATE POLICY "Users can insert own preparation consumptions"
  ON public.preparation_consumptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own preparation consumptions" ON public.preparation_consumptions;
CREATE POLICY "Users can delete own preparation consumptions"
  ON public.preparation_consumptions FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage preparation consumptions" ON public.preparation_consumptions;
CREATE POLICY "Service role can manage preparation consumptions"
  ON public.preparation_consumptions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
