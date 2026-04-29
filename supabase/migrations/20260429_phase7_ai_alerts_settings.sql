-- Phase 7: AI caches, natural-language alerts, and settings persistence.

create extension if not exists pgcrypto;

create table if not exists public.cpv_opportunity_ai_cache (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  cpv_code text not null,
  cache_month date not null default date_trunc('month', now())::date,
  recommendation jsonb not null default '{}'::jsonb,
  context_hash text,
  model text not null default 'gpt-4o-mini',
  generated_at timestamptz not null default now(),
  unique (company_id, cpv_code, cache_month)
);

create table if not exists public.analytics_daily_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  insight_date date not null default current_date,
  insights jsonb not null default '[]'::jsonb,
  context_hash text,
  model text not null default 'gpt-4o-mini',
  generated_at timestamptz not null default now(),
  unique (user_id, insight_date)
);

create table if not exists public.alert_parse_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  input_hash text not null,
  input_text text not null,
  parsed_query jsonb not null default '{}'::jsonb,
  model text not null default 'gpt-4o-mini',
  created_at timestamptz not null default now(),
  unique (user_id, input_hash)
);

create table if not exists public.saved_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  structured_query jsonb not null default '{}'::jsonb,
  frequency text not null default 'daily' check (frequency in ('instant', 'daily', 'weekly')),
  enabled boolean not null default true,
  quality_stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  recommendation_weights jsonb not null default '{
    "industryFit": 25,
    "buyerHistory": 20,
    "similarProjects": 20,
    "tenderValue": 15,
    "deadline": 10,
    "competition": 10
  }'::jsonb,
  profile_preferences jsonb not null default '{}'::jsonb,
  notification_preferences jsonb not null default '{}'::jsonb,
  display_preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists cpv_opportunity_ai_cache_company_idx
  on public.cpv_opportunity_ai_cache (company_id, cache_month desc);

create index if not exists analytics_daily_insights_user_date_idx
  on public.analytics_daily_insights (user_id, insight_date desc);

create index if not exists saved_alerts_user_enabled_idx
  on public.saved_alerts (user_id, enabled, updated_at desc);

alter table public.cpv_opportunity_ai_cache enable row level security;
alter table public.analytics_daily_insights enable row level security;
alter table public.alert_parse_cache enable row level security;
alter table public.saved_alerts enable row level security;
alter table public.user_settings enable row level security;

drop policy if exists "cpv_opportunity_ai_cache_read_own_company" on public.cpv_opportunity_ai_cache;
create policy "cpv_opportunity_ai_cache_read_own_company"
  on public.cpv_opportunity_ai_cache for select
  using (
    company_id in (select id from public.companies where user_id = auth.uid())
    or company_id in (select company_id from public.agency_clients where agency_user_id = auth.uid())
  );

drop policy if exists "analytics_daily_insights_own" on public.analytics_daily_insights;
create policy "analytics_daily_insights_own"
  on public.analytics_daily_insights for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "alert_parse_cache_own" on public.alert_parse_cache;
create policy "alert_parse_cache_own"
  on public.alert_parse_cache for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "saved_alerts_own" on public.saved_alerts;
create policy "saved_alerts_own"
  on public.saved_alerts for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "user_settings_own" on public.user_settings;
create policy "user_settings_own"
  on public.user_settings for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- TODO: Move AI cache writes to service-role background jobs if the prompt
-- context expands beyond user-readable data.
