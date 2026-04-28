-- Continuous signal system: channel-aware preferences and richer event types.

alter type notification_event_type add value if not exists 'planned_procurement_watched_authority';
alter type notification_event_type add value if not exists 'planned_procurement_watched_cpv';
alter type notification_event_type add value if not exists 'competitor_new_award';
alter type notification_event_type add value if not exists 'decision_recommended_bid';
alter type notification_event_type add value if not exists 'decision_high_risk';

alter table public.notification_preferences
  add column if not exists channel text not null default 'in_app';

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.notification_preferences'::regclass
      and conname = 'notification_preferences_pkey'
  ) then
    alter table public.notification_preferences
      drop constraint notification_preferences_pkey;
  end if;
end $$;

alter table public.notification_preferences
  drop constraint if exists notification_preferences_channel_check;

alter table public.notification_preferences
  add constraint notification_preferences_channel_check
  check (channel in ('email', 'in_app'));

create unique index if not exists notification_preferences_user_event_channel_idx
  on public.notification_preferences(user_id, event_type, channel);

create index if not exists idx_planned_procurements_created_at
  on public.planned_procurements(created_at desc);

create index if not exists idx_planned_procurements_cpv_created
  on public.planned_procurements(cpv_code, created_at desc);

create index if not exists idx_award_decisions_winner_created
  on public.award_decisions(winner_jib, created_at desc);
