-- Phase 5: planned procurements and per-user tracking for early warning.
-- The Vite redesign reads this shape conceptually; the Next/Supabase app can
-- wire imports and notifications to these tables.

create table if not exists public.planned_procurements (
  id uuid primary key default gen_random_uuid(),
  item_description text,
  description text,
  ugovorni_organ_id uuid,
  contracting_authority_id uuid,
  year integer not null default extract(year from now())::integer,
  cpv_code text,
  procurement_type text,
  contract_type text,
  planned_value numeric,
  estimated_value numeric,
  planned_date date,
  source_url text,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint planned_procurements_description_present
    check (coalesce(item_description, description) is not null),
  constraint planned_procurements_type_check
    check (
      procurement_type is null
      or procurement_type in ('Services', 'Works', 'Supplies', 'Robe', 'Radovi', 'Usluge')
    )
);

create index if not exists idx_planned_procurements_year
  on public.planned_procurements(year);

create index if not exists idx_planned_procurements_planned_date
  on public.planned_procurements(planned_date);

create index if not exists idx_planned_procurements_cpv_date
  on public.planned_procurements(cpv_code, planned_date);

create index if not exists idx_planned_procurements_authority_date
  on public.planned_procurements(contracting_authority_id, planned_date);

drop trigger if exists planned_procurements_set_updated_at on public.planned_procurements;
create trigger planned_procurements_set_updated_at
  before update on public.planned_procurements
  for each row execute function public.set_updated_at();

alter table public.planned_procurements enable row level security;

drop policy if exists "planned_procurements_read_all" on public.planned_procurements;
create policy "planned_procurements_read_all"
  on public.planned_procurements for select
  using (true);

create table if not exists public.user_tracked_planned_procurements (
  user_id uuid not null references auth.users(id) on delete cascade,
  planned_procurement_id uuid not null references public.planned_procurements(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, planned_procurement_id)
);

create index if not exists idx_user_tracked_planned_procurements_user
  on public.user_tracked_planned_procurements(user_id, created_at desc);

create index if not exists idx_user_tracked_planned_procurements_plan
  on public.user_tracked_planned_procurements(planned_procurement_id);

alter table public.user_tracked_planned_procurements enable row level security;

drop policy if exists "tracked_planned_owner_all" on public.user_tracked_planned_procurements;
create policy "tracked_planned_owner_all"
  on public.user_tracked_planned_procurements for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter type notification_event_type add value if not exists 'planned_procurement_matched_tender';

-- TODO: Add the final tender-published trigger after the production tenders
-- schema is normalized for cpv_code + contracting_authority_id matching.
-- Existing scheduler already emits planned-procurement watchlist notifications
-- for watched authorities and CPV prefixes.
