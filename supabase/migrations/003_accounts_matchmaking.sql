-- Accounts, matchmaking, ratings, and entitlements.
-- Game tables stay behind private.request_authorized().
-- Entitlements cannot be changed by the anon/authenticated API roles.

alter table public.rooms
  add column if not exists max_score integer not null default 100,
  add column if not exists reset_score integer not null default 50,
  add column if not exists mode text not null default 'private';

alter table public.rooms drop constraint if exists rooms_score_check;
alter table public.rooms
  add constraint rooms_score_check
  check (max_score between 20 and 500 and reset_score > 0 and reset_score < max_score);

alter table public.rooms drop constraint if exists rooms_mode_check;
alter table public.rooms
  add constraint rooms_mode_check
  check (mode in ('private', 'casual', 'ranked', 'practice'));

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  display_name text not null,
  avatar_url text,
  games_played integer not null default 0,
  wins integer not null default 0,
  rating integer not null default 1200,
  entitlement text not null default 'FREE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9_]{2,16}$'),
  constraint profiles_rating_range check (rating between 0 and 5000),
  constraint profiles_entitlement_check check (entitlement in ('FREE', 'AD_FREE', 'PREMIUM')),
  constraint profiles_avatar_https check (avatar_url is null or avatar_url ~ '^https://')
);

create index if not exists profiles_rating_idx on public.profiles (rating desc, wins desc);

create table if not exists public.match_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  player_id text not null,
  nickname text not null,
  mode text not null,
  status text not null default 'waiting',
  match_code text,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint match_queue_mode_check check (mode in ('casual', 'ranked')),
  constraint match_queue_status_check check (status in ('waiting', 'matched', 'cancelled'))
);

create unique index if not exists match_queue_one_waiting
  on public.match_queue (user_id)
  where status = 'waiting';

create index if not exists match_queue_waiting_idx
  on public.match_queue (mode, joined_at)
  where status = 'waiting';

create table if not exists public.match_results (
  game_id text not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  mode text not null,
  placement integer not null,
  rating_before integer,
  rating_after integer,
  delta integer not null default 0,
  season_id text,
  created_at timestamptz not null default now(),
  primary key (game_id, user_id)
);

create index if not exists match_results_user_idx on public.match_results (user_id, created_at desc);

create table if not exists public.friendships (
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null,
  created_at timestamptz not null default now(),
  primary key (requester_id, addressee_id),
  constraint friendships_distinct check (requester_id <> addressee_id),
  constraint friendships_status_check check (status in ('pending', 'accepted'))
);

create index if not exists friendships_addressee_idx on public.friendships (addressee_id);

alter table public.profiles enable row level security;
alter table public.match_queue enable row level security;
alter table public.match_results enable row level security;
alter table public.friendships enable row level security;

grant select on public.profiles to anon, authenticated;
grant insert, update, delete on public.profiles to anon;
grant select, insert, update, delete on public.match_queue, public.match_results, public.friendships to anon;

drop policy if exists profiles_public_read on public.profiles;
create policy profiles_public_read on public.profiles
  for select to anon, authenticated
  using (true);

drop policy if exists profiles_server_insert on public.profiles;
create policy profiles_server_insert on public.profiles
  for insert to anon
  with check (private.request_authorized());

drop policy if exists profiles_server_update on public.profiles;
create policy profiles_server_update on public.profiles
  for update to anon
  using (private.request_authorized())
  with check (private.request_authorized());

drop policy if exists profiles_server_delete on public.profiles;
create policy profiles_server_delete on public.profiles
  for delete to anon
  using (private.request_authorized());

drop policy if exists match_queue_server_only on public.match_queue;
create policy match_queue_server_only on public.match_queue
  for all to anon
  using (private.request_authorized())
  with check (private.request_authorized());

drop policy if exists match_results_server_only on public.match_results;
create policy match_results_server_only on public.match_results
  for all to anon
  using (private.request_authorized())
  with check (private.request_authorized());

drop policy if exists friendships_server_only on public.friendships;
create policy friendships_server_only on public.friendships
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
       and current_user not in ('postgres', 'supabase_admin', 'service_role') then
      raise exception 'New accounts start on the free plan.';
    end if;
    return new;
  end if;

  if new.entitlement is distinct from old.entitlement
     and current_user not in ('postgres', 'supabase_admin', 'service_role') then
    raise exception 'Entitlements are granted in the database, not by the app.';
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

revoke all on function public.protect_profile() from public;
grant execute on function public.protect_profile() to anon, authenticated, postgres, service_role;

drop trigger if exists profiles_protect on public.profiles;
create trigger profiles_protect
  before insert or update on public.profiles
  for each row execute function public.protect_profile();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_name text;
  clean text;
  label text;
begin
  raw_name := lower(coalesce(new.raw_user_meta_data->>'username', ''));
  if raw_name ~ '^[a-z0-9_]{2,16}$' then
    clean := raw_name;
  else
    clean := null;
  end if;

  if clean is null or exists (select 1 from public.profiles where username = clean) then
    clean := 'player_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;

  label := left(regexp_replace(coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), clean), '[[:cntrl:]]', '', 'g'), 24);

  begin
    insert into public.profiles (id, username, display_name)
    values (new.id, clean, label);
  exception
    when unique_violation then
      insert into public.profiles (id, username, display_name)
      values (new.id, 'player_' || substr(replace(new.id::text, '-', ''), 1, 8), label);
  end;

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
