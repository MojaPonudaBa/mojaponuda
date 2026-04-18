-- Embedding-based tender recommendation system
-- Idempotent: safe to re-run

create extension if not exists vector;

-- ── Tenders embedding column ──────────────────────────────────────────
alter table public.tenders add column if not exists embedding vector(1536);

-- ivfflat index with cosine distance (lists=100 is a reasonable starting point;
-- can be rebuilt with higher list count once the table grows significantly)
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'tenders_embedding_cos_idx'
  ) then
    execute 'create index tenders_embedding_cos_idx
             on public.tenders using ivfflat (embedding vector_cosine_ops)
             with (lists = 100)';
  end if;
end$$;

-- ── Companies profile embedding + free-text profile ───────────────────
alter table public.companies add column if not exists profile_embedding vector(1536);
alter table public.companies add column if not exists profile_text text;
alter table public.companies add column if not exists profile_embedded_at timestamptz;

-- ── tender_relevance cache table ──────────────────────────────────────
create table if not exists public.tender_relevance (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  tender_id uuid not null references public.tenders(id) on delete cascade,
  score smallint not null check (score between 1 and 10),
  confidence smallint not null check (confidence between 1 and 5),
  model_version text not null default 'gpt-4o-mini-v1',
  created_at timestamptz not null default now(),
  unique (company_id, tender_id)
);

create index if not exists tender_relevance_company_score_idx
  on public.tender_relevance (company_id, score desc);
create index if not exists tender_relevance_tender_idx
  on public.tender_relevance (tender_id);

-- RLS: service role bypasses; users only read own company relevance
alter table public.tender_relevance enable row level security;
drop policy if exists "tender_relevance_read_own" on public.tender_relevance;
create policy "tender_relevance_read_own"
  on public.tender_relevance
  for select
  using (
    company_id in (
      select id from public.companies where user_id = auth.uid()
    )
  );

-- ── RPC: similarity retrieval (no threshold, top_k only) ──────────────
create or replace function public.match_tenders_by_embedding(
  query_embedding vector(1536),
  match_count int default 200,
  now_iso timestamptz default now()
)
returns table (id uuid, similarity double precision)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.id,
    (1 - (t.embedding <=> query_embedding))::double precision as similarity
  from public.tenders t
  where t.embedding is not null
    and (t.deadline is null or t.deadline > now_iso)
  order by t.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function public.match_tenders_by_embedding(vector, int, timestamptz)
  to anon, authenticated, service_role;
