-- Entitlement source, Stripe linkage, consent records, and abuse reports.
-- The app still cannot grant entitlements unless the server secret is present.
-- Manual grants from the SQL editor remain available to postgres / service_role.

alter table public.profiles
  add column if not exists entitlement_source text not null default 'default',
  add column if not exists entitlement_expires_at timestamptz,
  add column if not exists stripe_customer_id text;

alter table public.profiles drop constraint if exists profiles_entitlement_source_check;
alter table public.profiles
  add constraint profiles_entitlement_source_check
  check (entitlement_source in ('default', 'manual', 'stripe'));

create unique index if not exists profiles_stripe_customer_idx
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

create table if not exists public.consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  advertising boolean not null,
  policy_version text not null,
  created_at timestamptz not null default now()
);

create index if not exists consent_records_user_idx
  on public.consent_records (user_id, created_at desc);

create table if not exists public.abuse_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid references public.profiles (id) on delete set null,
  room_code text not null,
  message_id text not null,
  excerpt text not null,
  reason text not null,
  created_at timestamptz not null default now(),
  constraint abuse_reports_excerpt_len check (char_length(excerpt) <= 240),
  constraint abuse_reports_reason_len check (char_length(reason) between 2 and 500)
);

create index if not exists abuse_reports_created_idx on public.abuse_reports (created_at desc);

create table if not exists public.stripe_events (
  id text primary key,
  received_at timestamptz not null default now()
);

alter table public.consent_records enable row level security;
alter table public.abuse_reports enable row level security;
alter table public.stripe_events enable row level security;

grant select, insert, update, delete on public.consent_records, public.abuse_reports, public.stripe_events to anon;

drop policy if exists consent_records_server_only on public.consent_records;
create policy consent_records_server_only on public.consent_records
  for all to anon
  using (private.request_authorized())
  with check (private.request_authorized());

drop policy if exists abuse_reports_server_only on public.abuse_reports;
create policy abuse_reports_server_only on public.abuse_reports
  for all to anon
  using (private.request_authorized())
  with check (private.request_authorized());

drop policy if exists stripe_events_server_only on public.stripe_events;
create policy stripe_events_server_only on public.stripe_events
  for all to anon
  using (private.request_authorized())
  with check (private.request_authorized());

create or replace function public.protect_profile()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.entitlement is distinct from 'FREE'
       and current_user not in ('postgres', 'supabase_admin', 'service_role')
       and not private.request_authorized() then
      raise exception 'New accounts start on the free plan.';
    end if;
    return new;
  end if;

  if (new.entitlement is distinct from old.entitlement
      or new.entitlement_source is distinct from old.entitlement_source
      or new.entitlement_expires_at is distinct from old.entitlement_expires_at
      or new.stripe_customer_id is distinct from old.stripe_customer_id)
     and current_user not in ('postgres', 'supabase_admin', 'service_role')
     and not private.request_authorized() then
    raise exception 'Entitlements are granted by the server or in the database.';
  end if;

  if (new.rating is distinct from old.rating
      or new.games_played is distinct from old.games_played
      or new.wins is distinct from old.wins)
     and not private.request_authorized()
     and current_user not in ('postgres', 'supabase_admin', 'service_role') then
    raise exception 'Match stats are updated by the server.';
  end if;

  return new;
end;
$$;
