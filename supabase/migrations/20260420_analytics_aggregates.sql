-- Agregatne analitičke tablice za price prediction, win probability,
-- competitor intelligence, profile statistike i market overview.
--
-- Sve su popunjavaju backfill skriptom (`scripts/backfill-analytics.ts`)
-- i dnevnim cron jobom. Nikad se ne brišu — samo UPSERT.
--
-- Ključni izvori: public.award_decisions (pobjede + popusti),
-- public.tenders (broj objavljenih), public.market_companies (firme).

-- ─────────────────────────────────────────────────────────────────────
-- AUTHORITY STATS — po naručiocu (JIB)
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.authority_stats (
  authority_jib          text primary key,
  authority_name         text,
  tender_count           integer not null default 0,
  total_estimated_value  numeric(15,2) not null default 0,
  avg_contract_value     numeric(15,2),
  avg_bidders_count      numeric(6,2),
  avg_discount_pct       numeric(5,2),
  top_cpv_codes          text[] not null default '{}',
  updated_at             timestamptz not null default now()
);

create index if not exists idx_authority_stats_tender_count on public.authority_stats(tender_count desc);
create index if not exists idx_authority_stats_total_value on public.authority_stats(total_estimated_value desc);

-- ─────────────────────────────────────────────────────────────────────
-- CPV STATS — po CPV kodu
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.cpv_stats (
  cpv_code           text primary key,
  tender_count       integer not null default 0,
  avg_estimated_value numeric(15,2),
  avg_bidders_count  numeric(6,2),
  avg_discount_pct   numeric(5,2),
  top_authorities    text[] not null default '{}',   -- JIB-ovi
  updated_at         timestamptz not null default now()
);

create index if not exists idx_cpv_stats_tender_count on public.cpv_stats(tender_count desc);

-- ─────────────────────────────────────────────────────────────────────
-- AUTHORITY × CPV — osnova za price prediction
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.authority_cpv_stats (
  authority_jib      text not null,
  cpv_code           text not null,
  tender_count       integer not null default 0,
  avg_discount_pct   numeric(5,2),
  min_winning_price  numeric(15,2),
  max_winning_price  numeric(15,2),
  avg_winning_price  numeric(15,2),
  avg_bidders_count  numeric(6,2),
  updated_at         timestamptz not null default now(),
  primary key (authority_jib, cpv_code)
);

create index if not exists idx_auth_cpv_tender_count on public.authority_cpv_stats(tender_count desc);

-- ─────────────────────────────────────────────────────────────────────
-- COMPANY STATS — po firmi (JIB)
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.company_stats (
  company_jib        text primary key,
  company_name       text,
  total_bids         integer not null default 0,
  total_wins         integer not null default 0,
  win_rate           numeric(5,2),
  total_won_value    numeric(15,2) not null default 0,
  avg_discount_pct   numeric(5,2),
  top_cpv_codes      text[] not null default '{}',
  top_authorities    text[] not null default '{}',
  updated_at         timestamptz not null default now()
);

create index if not exists idx_company_stats_total_wins on public.company_stats(total_wins desc);
create index if not exists idx_company_stats_total_won_value on public.company_stats(total_won_value desc);

-- ─────────────────────────────────────────────────────────────────────
-- COMPANY × AUTHORITY — personalizovana win probability
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.company_authority_stats (
  company_jib    text not null,
  authority_jib  text not null,
  appearances    integer not null default 0,
  wins           integer not null default 0,
  win_rate       numeric(5,2),
  updated_at     timestamptz not null default now(),
  primary key (company_jib, authority_jib)
);

create index if not exists idx_ca_company on public.company_authority_stats(company_jib);
create index if not exists idx_ca_authority on public.company_authority_stats(authority_jib);

-- ─────────────────────────────────────────────────────────────────────
-- COMPANY × CPV — personalizovana win probability po kategoriji
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.company_cpv_stats (
  company_jib   text not null,
  cpv_code      text not null,
  appearances   integer not null default 0,
  wins          integer not null default 0,
  win_rate      numeric(5,2),
  updated_at    timestamptz not null default now(),
  primary key (company_jib, cpv_code)
);

create index if not exists idx_cc_company on public.company_cpv_stats(company_jib);
create index if not exists idx_cc_cpv on public.company_cpv_stats(cpv_code);

-- RLS — ove tablice su javne read-only za autentificirane korisnike.
-- Backfill/cron ide preko service role, pa ne treba write policy.
alter table public.authority_stats enable row level security;
alter table public.cpv_stats enable row level security;
alter table public.authority_cpv_stats enable row level security;
alter table public.company_stats enable row level security;
alter table public.company_authority_stats enable row level security;
alter table public.company_cpv_stats enable row level security;

drop policy if exists "authority_stats_read_all" on public.authority_stats;
create policy "authority_stats_read_all" on public.authority_stats for select using (auth.role() = 'authenticated');

drop policy if exists "cpv_stats_read_all" on public.cpv_stats;
create policy "cpv_stats_read_all" on public.cpv_stats for select using (auth.role() = 'authenticated');

drop policy if exists "auth_cpv_stats_read_all" on public.authority_cpv_stats;
create policy "auth_cpv_stats_read_all" on public.authority_cpv_stats for select using (auth.role() = 'authenticated');

drop policy if exists "company_stats_read_all" on public.company_stats;
create policy "company_stats_read_all" on public.company_stats for select using (auth.role() = 'authenticated');

drop policy if exists "company_authority_stats_read_all" on public.company_authority_stats;
create policy "company_authority_stats_read_all" on public.company_authority_stats for select using (auth.role() = 'authenticated');

drop policy if exists "company_cpv_stats_read_all" on public.company_cpv_stats;
create policy "company_cpv_stats_read_all" on public.company_cpv_stats for select using (auth.role() = 'authenticated');
