-- Test accounts: insert active subscriptions
-- (subscriptions table already exists in Supabase)

INSERT INTO public.subscriptions (user_id, status, lemonsqueezy_subscription_id, lemonsqueezy_customer_id, lemonsqueezy_variant_id, current_period_end)
SELECT id, 'active', 'test_basic', 'test_basic', 'basic', '2030-01-01'
FROM auth.users WHERE email = 'osnovni@mojaponuda.ba'
AND NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = auth.users.id);

INSERT INTO public.subscriptions (user_id, status, lemonsqueezy_subscription_id, lemonsqueezy_customer_id, lemonsqueezy_variant_id, current_period_end)
SELECT id, 'active', 'test_pro', 'test_pro', 'pro', '2030-01-01'
FROM auth.users WHERE email = 'puni@mojaponuda.ba'
AND NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = auth.users.id);

INSERT INTO public.subscriptions (user_id, status, lemonsqueezy_subscription_id, lemonsqueezy_customer_id, lemonsqueezy_variant_id, current_period_end)
SELECT id, 'active', 'test_agency', 'test_agency', 'agency', '2030-01-01'
FROM auth.users WHERE email = 'agencija@mojaponuda.ba'
AND NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = auth.users.id);
