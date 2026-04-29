-- Sample counts for decision intelligence.
-- These counts let the app distinguish real evidence from weak averages.

alter table public.authority_stats
  add column if not exists price_sample_count integer not null default 0,
  add column if not exists discount_sample_count integer not null default 0,
  add column if not exists bidders_sample_count integer not null default 0,
  add column if not exists unique_winner_count integer not null default 0;

alter table public.cpv_stats
  add column if not exists price_sample_count integer not null default 0,
  add column if not exists discount_sample_count integer not null default 0,
  add column if not exists bidders_sample_count integer not null default 0,
  add column if not exists unique_winner_count integer not null default 0;

alter table public.authority_cpv_stats
  add column if not exists price_sample_count integer not null default 0,
  add column if not exists discount_sample_count integer not null default 0,
  add column if not exists bidders_sample_count integer not null default 0,
  add column if not exists unique_winner_count integer not null default 0;

create index if not exists idx_authority_stats_bidders_samples
  on public.authority_stats (bidders_sample_count desc);

create index if not exists idx_cpv_stats_bidders_samples
  on public.cpv_stats (bidders_sample_count desc);

create index if not exists idx_auth_cpv_stats_bidders_samples
  on public.authority_cpv_stats (bidders_sample_count desc);
