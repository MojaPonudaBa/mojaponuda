CREATE TABLE IF NOT EXISTS public.subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status text NOT NULL,
    lemonsqueezy_id text,
    lemonsqueezy_variant_id text,
    renews_at timestamptz,
    current_period_end timestamptz NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own subscriptions
CREATE POLICY "Users can view own subscriptions" 
ON public.subscriptions
FOR SELECT USING (auth.uid() = user_id);

-- Assign subscriptions to the test accounts previously created
INSERT INTO public.subscriptions (user_id, status, lemonsqueezy_id, lemonsqueezy_variant_id, current_period_end)
SELECT id, 'active', 'test_basic', 'basic', '2030-01-01' FROM auth.users WHERE email = 'osnovni@mojaponuda.ba'
ON CONFLICT DO NOTHING;

INSERT INTO public.subscriptions (user_id, status, lemonsqueezy_id, lemonsqueezy_variant_id, current_period_end)
SELECT id, 'active', 'test_pro', 'pro', '2030-01-01' FROM auth.users WHERE email = 'puni@mojaponuda.ba'
ON CONFLICT DO NOTHING;

INSERT INTO public.subscriptions (user_id, status, lemonsqueezy_id, lemonsqueezy_variant_id, current_period_end)
SELECT id, 'active', 'test_agency', 'agency', '2030-01-01' FROM auth.users WHERE email = 'agencija@mojaponuda.ba'
ON CONFLICT DO NOTHING;
