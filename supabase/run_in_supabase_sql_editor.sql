-- =================================================================
-- AGENCIJSKI SISTEM - SQL za pokretanje u Supabase SQL Editoru
-- Pokrenite JEDNOM u: Supabase Dashboard > SQL Editor
-- =================================================================

-- 1. Agency Clients tabela
CREATE TABLE IF NOT EXISTS public.agency_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  crm_stage TEXT DEFAULT 'active' CHECK (crm_stage IN ('lead', 'onboarding', 'active', 'paused', 'churned')),
  notes TEXT,
  contract_start DATE,
  contract_end DATE,
  monthly_fee NUMERIC(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agency_user_id, company_id)
);

-- 2. Agency Client Notes tabela
CREATE TABLE IF NOT EXISTS public.agency_client_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_client_id UUID NOT NULL REFERENCES public.agency_clients(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. RLS Policies
ALTER TABLE public.agency_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_client_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agency users can manage their own clients" ON public.agency_clients;
CREATE POLICY "Agency users can manage their own clients"
  ON public.agency_clients
  FOR ALL
  USING (agency_user_id = auth.uid())
  WITH CHECK (agency_user_id = auth.uid());

DROP POLICY IF EXISTS "Agency users can manage their client notes" ON public.agency_client_notes;
CREATE POLICY "Agency users can manage their client notes"
  ON public.agency_client_notes
  FOR ALL
  USING (
    agency_client_id IN (
      SELECT id FROM public.agency_clients WHERE agency_user_id = auth.uid()
    )
  )
  WITH CHECK (
    agency_client_id IN (
      SELECT id FROM public.agency_clients WHERE agency_user_id = auth.uid()
    )
  );

-- 4. Updated at trigger
CREATE OR REPLACE FUNCTION update_agency_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agency_clients_updated_at ON public.agency_clients;
CREATE TRIGGER agency_clients_updated_at
  BEFORE UPDATE ON public.agency_clients
  FOR EACH ROW EXECUTE FUNCTION update_agency_clients_updated_at();

-- 5. Dozvoliti agenciji Äitanje kompanija klijenata
DROP POLICY IF EXISTS "Agency can read managed client companies" ON public.companies;
CREATE POLICY "Agency can read managed client companies"
  ON public.companies
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR id IN (
      SELECT company_id FROM public.agency_clients WHERE agency_user_id = auth.uid()
    )
  );

-- 6. Pretplata za agencija@tendersistem.com test nalog
-- (Prethodno kreiran nalog u Auth, ovo dodaje pretplatu)
INSERT INTO public.subscriptions (
  user_id, status, lemonsqueezy_subscription_id, 
  lemonsqueezy_customer_id, lemonsqueezy_variant_id, current_period_end
)
SELECT 
  id, 'active', 'test_agency', 'cust_agency', 'agency', '2030-01-01'
FROM auth.users 
WHERE email = 'agencija@tendersistem.com'
AND NOT EXISTS (
  SELECT 1 FROM public.subscriptions WHERE user_id = auth.users.id
);

-- Provjeri rezultat
SELECT 'agency_clients table created' as status 
WHERE EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'agency_clients');

