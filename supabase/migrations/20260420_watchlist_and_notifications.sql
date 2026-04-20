-- Watchlist: korisnik prati naručioce, CPV kodove i firme (konkurente).
-- Notifikacije: log svih obavještenja, preferencije po tipu, flag za delivery.

-- ─────────────────────────────────────────────────────────────────────
-- WATCHLIST
-- ─────────────────────────────────────────────────────────────────────

create type watchlist_entity_type as enum ('authority', 'cpv', 'company');

create table if not exists public.watchlist_items (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  company_id   uuid references public.companies(id) on delete cascade,
  entity_type  watchlist_entity_type not null,
  entity_key   text not null,  -- JIB za authority/company, CPV kod za cpv
  entity_label text,           -- čitljivo ime za prikaz
  created_at   timestamptz not null default now(),
  unique (user_id, entity_type, entity_key)
);

create index if not exists idx_watchlist_user on public.watchlist_items(user_id);
create index if not exists idx_watchlist_type_key on public.watchlist_items(entity_type, entity_key);

alter table public.watchlist_items enable row level security;

drop policy if exists "watchlist_owner_all" on public.watchlist_items;
create policy "watchlist_owner_all"
  on public.watchlist_items for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────
-- NOTIFICATION PREFERENCES
-- ─────────────────────────────────────────────────────────────────────

create type notification_event_type as enum (
  'new_tender_watched_authority',
  'new_tender_watched_cpv',
  'competitor_downloaded_td',
  'bid_deadline_7d',
  'bid_deadline_2d',
  'vault_document_expires_30d',
  'vault_document_expires_7d'
);

create table if not exists public.notification_preferences (
  user_id     uuid not null references auth.users(id) on delete cascade,
  event_type  notification_event_type not null,
  enabled     boolean not null default true,
  updated_at  timestamptz not null default now(),
  primary key (user_id, event_type)
);

alter table public.notification_preferences enable row level security;

drop policy if exists "notif_prefs_owner_all" on public.notification_preferences;
create policy "notif_prefs_owner_all"
  on public.notification_preferences for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────
-- NOTIFICATION LOG
-- Svaki email/push koji je poslat ili bi trebao biti poslat. Dedup po
-- (user_id, event_type, dedup_key) da se isti tender ne obavijesti dvaput.
-- ─────────────────────────────────────────────────────────────────────

create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  event_type   notification_event_type not null,
  dedup_key    text not null,
  subject      text not null,
  body_text    text,
  body_html    text,
  payload      jsonb,
  delivered_at timestamptz,
  read_at      timestamptz,
  created_at   timestamptz not null default now(),
  unique (user_id, event_type, dedup_key)
);

create index if not exists idx_notifications_user_created on public.notifications(user_id, created_at desc);
create index if not exists idx_notifications_undelivered on public.notifications(delivered_at) where delivered_at is null;

alter table public.notifications enable row level security;

drop policy if exists "notifications_owner_read" on public.notifications;
create policy "notifications_owner_read"
  on public.notifications for select
  using (user_id = auth.uid());

drop policy if exists "notifications_owner_update" on public.notifications;
create policy "notifications_owner_update"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────
-- eJN CREDENTIALS (enkriptirani, za auto TD download)
-- Šifrovanje koristimo pgcrypto. Ključ se drži u DB parametru
-- ili dolazi iz app-a (AES-256). Za sada spremamo kao base64-encrypted text.
-- ─────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

create table if not exists public.ejn_credentials (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  username_encrypted   text not null,
  password_encrypted   text not null,
  last_validated_at    timestamptz,
  last_validation_ok   boolean,
  last_validation_err  text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

drop trigger if exists ejn_creds_set_updated_at on public.ejn_credentials;
create trigger ejn_creds_set_updated_at
  before update on public.ejn_credentials
  for each row execute function public.set_updated_at();

alter table public.ejn_credentials enable row level security;

-- Bez SELECT policy-ja! Credentials se čitaju samo kroz service role.
-- Korisnik može samo upsert i delete preko server actiona.
drop policy if exists "ejn_creds_owner_write" on public.ejn_credentials;
create policy "ejn_creds_owner_write"
  on public.ejn_credentials for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
