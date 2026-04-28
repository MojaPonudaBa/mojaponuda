-- Decision intelligence cache + hot-path indexes.
-- The app should read these rows during navigation and leave expensive
-- historical calculations to backfill/post-sync jobs.

create extension if not exists pg_trgm;

create table if not exists public.tender_decision_insights (
  company_id uuid not null references public.companies(id) on delete cascade,
  tender_id uuid not null references public.tenders(id) on delete cascade,
  match_score integer not null check (match_score between 0 and 100),
  win_probability integer not null check (win_probability between 0 and 100),
  win_confidence text not null default 'low',
  price_range jsonb not null default '{}'::jsonb,
  winning_discount_range jsonb not null default '{}'::jsonb,
  competition_level text not null default 'unknown',
  competition_label text not null default 'Nema dovoljno podataka',
  expected_bidders_range jsonb not null default '{}'::jsonb,
  average_bidders numeric(8,2),
  active_competitors integer not null default 0,
  top_competitors jsonb not null default '[]'::jsonb,
  authority_profile jsonb not null default '{}'::jsonb,
  risk_indicators jsonb not null default '[]'::jsonb,
  risk_level text not null default 'medium',
  recommendation text not null default 'risky',
  recommendation_label text not null default 'Oprez',
  priority_score integer not null default 0 check (priority_score between 0 and 100),
  estimated_effort text not null default 'Nije procijenjeno',
  key_reasons jsonb not null default '[]'::jsonb,
  explanation text not null default 'Procjena nije dostupna.',
  data_quality text not null default 'low',
  source_version text not null default 'decision-v1',
  computed_at timestamptz not null default now(),
  primary key (company_id, tender_id)
);

create index if not exists tender_decision_insights_company_priority_idx
  on public.tender_decision_insights (company_id, priority_score desc, win_probability desc);

create index if not exists tender_decision_insights_tender_idx
  on public.tender_decision_insights (tender_id);

create index if not exists tender_decision_insights_company_computed_idx
  on public.tender_decision_insights (company_id, computed_at desc);

alter table public.tender_decision_insights enable row level security;

drop policy if exists "tender_decision_insights_read_own_company" on public.tender_decision_insights;
create policy "tender_decision_insights_read_own_company"
  on public.tender_decision_insights
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

-- Core tender-list hot paths
create index if not exists tenders_deadline_id_idx
  on public.tenders (deadline asc, id)
  where deadline is not null;

create index if not exists tenders_status_deadline_idx
  on public.tenders (status, deadline desc);

create index if not exists tenders_cpv_prefix_idx
  on public.tenders (left(regexp_replace(coalesce(cpv_code, ''), '[^0-9]', '', 'g'), 3))
  where cpv_code is not null;

create index if not exists tenders_authority_deadline_idx
  on public.tenders (contracting_authority_jib, deadline desc)
  where contracting_authority_jib is not null;

create index if not exists tenders_contract_type_deadline_idx
  on public.tenders (contract_type, deadline desc)
  where contract_type is not null;

-- Historical intelligence hot paths
create index if not exists award_decisions_authority_award_date_idx
  on public.award_decisions (contracting_authority_jib, award_date desc)
  where contracting_authority_jib is not null;

create index if not exists award_decisions_tender_bidders_idx
  on public.award_decisions (tender_id, total_bidders_count)
  where tender_id is not null;

create index if not exists award_decisions_winner_authority_idx
  on public.award_decisions (winner_jib, contracting_authority_jib)
  where winner_jib is not null and contracting_authority_jib is not null;

create index if not exists award_decisions_award_date_idx
  on public.award_decisions (award_date desc)
  where award_date is not null;

create index if not exists award_decisions_estimated_value_idx
  on public.award_decisions (estimated_value)
  where estimated_value is not null;

do $$
begin
  if to_regclass('public.tender_participants') is not null then
    create index if not exists tender_participants_company_idx
      on public.tender_participants (company_jib)
      where company_jib is not null;

    create index if not exists tender_participants_tender_idx
      on public.tender_participants (tender_id)
      where tender_id is not null;
  end if;
end $$;

create index if not exists contracting_authorities_city_trgm_idx
  on public.contracting_authorities using gin (city gin_trgm_ops)
  where city is not null;

create index if not exists contracting_authorities_municipality_trgm_idx
  on public.contracting_authorities using gin (municipality gin_trgm_ops)
  where municipality is not null;

create index if not exists contracting_authorities_canton_trgm_idx
  on public.contracting_authorities using gin (canton gin_trgm_ops)
  where canton is not null;

do $$
begin
  if to_regclass('public.planned_procurements') is not null then
    create index if not exists planned_procurements_authority_date_idx
      on public.planned_procurements (contracting_authority_id, planned_date desc)
      where contracting_authority_id is not null;

    create index if not exists planned_procurements_cpv_date_idx
      on public.planned_procurements (cpv_code, planned_date desc)
      where cpv_code is not null;
  end if;
end $$;

-- User/company navigation hot paths
create index if not exists companies_user_id_idx
  on public.companies (user_id);

create index if not exists bids_company_status_updated_idx
  on public.bids (company_id, status, updated_at desc);

create index if not exists bids_company_tender_idx
  on public.bids (company_id, tender_id);

create index if not exists tender_relevance_company_score_created_idx
  on public.tender_relevance (company_id, score desc, created_at desc);
