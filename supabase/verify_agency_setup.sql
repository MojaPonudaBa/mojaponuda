-- =================================================================
-- VERIFIKACIJA: Pokrenite ovo u Supabase SQL Editoru
-- da provjerite da li je sve krerano kako treba
-- =================================================================

-- 1. Provjera tabela
SELECT 
  tablename,
  CASE WHEN tablename IS NOT NULL THEN 'âœ… Postoji' ELSE 'âŒ Nedostaje' END as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('agency_clients', 'agency_client_notes')
ORDER BY tablename;

-- 2. Provjera RLS politika
SELECT 
  tablename,
  policyname,
  'âœ… Policy aktivan' as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('agency_clients', 'agency_client_notes', 'companies')
  AND policyname LIKE '%genc%'
ORDER BY tablename;

-- 3. Provjera da li agencija@tendersistem.com nalog postoji u Auth
SELECT 
  email,
  CASE WHEN id IS NOT NULL THEN 'âœ… Nalog postoji' ELSE 'âŒ Nalog ne postoji' END as auth_status
FROM auth.users 
WHERE email = 'agencija@tendersistem.com';

-- 4. Provjera pretplate za agencija@tendersistem.com
SELECT 
  u.email,
  s.status as subscription_status,
  s.lemonsqueezy_variant_id as plan,
  s.current_period_end,
  CASE WHEN s.id IS NOT NULL THEN 'âœ… Pretplata aktivna' ELSE 'âŒ Nema pretplate' END as sub_check
FROM auth.users u
LEFT JOIN public.subscriptions s ON s.user_id = u.id
WHERE u.email = 'agencija@tendersistem.com';

