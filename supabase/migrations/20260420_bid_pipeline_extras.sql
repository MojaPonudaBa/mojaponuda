-- Proširenje bid projekta dodatnim poljima potrebnim za Kanban pipeline,
-- timski rad i predikciju cijene prema Sena paritetu.

-- Iznos ponude (popunjava korisnik) i rok za predaju (duplikat tender.deadline
-- radi bržeg Kanban prikaza i mogućnosti override-a).
alter table public.bids
  add column if not exists bid_value numeric(15,2),
  add column if not exists submission_deadline timestamptz,
  add column if not exists submitted_at timestamptz,
  add column if not exists kanban_position integer not null default 0,
  add column if not exists updated_at timestamptz not null default now();

-- Trigger za automatski updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bids_set_updated_at on public.bids;
create trigger bids_set_updated_at
  before update on public.bids
  for each row execute function public.set_updated_at();

-- Komentari na bid projektu (tim)
create table if not exists public.bid_comments (
  id          uuid primary key default gen_random_uuid(),
  bid_id      uuid not null references public.bids(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  author_name text,
  body        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_bid_comments_bid_id on public.bid_comments(bid_id);
create index if not exists idx_bid_comments_created_at on public.bid_comments(created_at);

alter table public.bid_comments enable row level security;

-- Samo članovi firme koji imaju bid smiju čitati i pisati komentare.
drop policy if exists "bid_comments_select_own_company" on public.bid_comments;
create policy "bid_comments_select_own_company"
  on public.bid_comments for select
  using (
    exists (
      select 1 from public.bids b
      join public.companies c on c.id = b.company_id
      where b.id = bid_comments.bid_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "bid_comments_insert_own_company" on public.bid_comments;
create policy "bid_comments_insert_own_company"
  on public.bid_comments for insert
  with check (
    user_id = auth.uid() and
    exists (
      select 1 from public.bids b
      join public.companies c on c.id = b.company_id
      where b.id = bid_comments.bid_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "bid_comments_delete_own" on public.bid_comments;
create policy "bid_comments_delete_own"
  on public.bid_comments for delete
  using (user_id = auth.uid());
