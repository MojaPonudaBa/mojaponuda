-- Phase 6: weekly cached AI narratives for buyer-specific win/loss analysis.
-- The Vite redesign shell renders a deterministic fallback until the Next API
-- route is mounted behind the same origin.

create extension if not exists pgcrypto;

create table if not exists public.buyer_ai_narratives (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  authority_jib text not null,
  authority_name text,
  cache_week date not null default date_trunc('week', now())::date,
  narrative jsonb not null default '[]'::jsonb,
  model text not null default 'gpt-4o-mini',
  context_hash text,
  generated_at timestamptz not null default now(),
  unique (company_id, authority_jib, cache_week)
);

create index if not exists buyer_ai_narratives_company_week_idx
  on public.buyer_ai_narratives (company_id, cache_week desc);

create index if not exists buyer_ai_narratives_authority_idx
  on public.buyer_ai_narratives (authority_jib);

alter table public.buyer_ai_narratives enable row level security;

drop policy if exists "buyer_ai_narratives_read_own_company" on public.buyer_ai_narratives;
create policy "buyer_ai_narratives_read_own_company"
  on public.buyer_ai_narratives
  for select
  using (
    company_id in (
      select id from public.companies where user_id = auth.uid()
    )
    or company_id in (
      select ac.company_id
      from public.agency_clients ac
      where ac.agency_user_id = auth.uid()
    )
  );

drop policy if exists "buyer_ai_narratives_write_own_company" on public.buyer_ai_narratives;
create policy "buyer_ai_narratives_write_own_company"
  on public.buyer_ai_narratives
  for insert
  with check (
    company_id in (
      select id from public.companies where user_id = auth.uid()
    )
    or company_id in (
      select ac.company_id
      from public.agency_clients ac
      where ac.agency_user_id = auth.uid()
    )
  );

drop policy if exists "buyer_ai_narratives_update_own_company" on public.buyer_ai_narratives;
create policy "buyer_ai_narratives_update_own_company"
  on public.buyer_ai_narratives
  for update
  using (
    company_id in (
      select id from public.companies where user_id = auth.uid()
    )
    or company_id in (
      select ac.company_id
      from public.agency_clients ac
      where ac.agency_user_id = auth.uid()
    )
  )
  with check (
    company_id in (
      select id from public.companies where user_id = auth.uid()
    )
    or company_id in (
      select ac.company_id
      from public.agency_clients ac
      where ac.agency_user_id = auth.uid()
    )
  );

-- TODO: Move writes to service-role server route if narrative generation needs
-- richer private context than RLS-safe company and authority aggregates.
