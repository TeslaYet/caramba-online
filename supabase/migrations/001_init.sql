create table if not exists rooms (
  id uuid primary key,
  code text unique not null,
  host_player_id text not null,
  status text not null,
  max_players integer not null default 8,
  game_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists players (
  id text primary key,
  room_id uuid not null references rooms(id) on delete cascade,
  nickname text not null,
  seat_index integer not null,
  connected boolean not null default true,
  ready boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists games (
  id text primary key,
  room_id uuid not null references rooms(id) on delete cascade,
  status text not null,
  round_number integer not null default 1,
  current_player_id text,
  state jsonb not null,
  version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists game_events (
  id text primary key,
  game_id text not null references games(id) on delete cascade,
  sequence_number integer not null,
  event_type text not null,
  actor_player_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists rooms_code_idx on rooms (code);
create index if not exists players_room_id_idx on players (room_id);
create index if not exists games_room_id_idx on games (room_id);
create index if not exists game_events_game_id_idx on game_events (game_id, sequence_number);

alter table rooms enable row level security;
alter table players enable row level security;
alter table games enable row level security;
alter table game_events enable row level security;

grant usage on schema public to postgres, anon, authenticated, service_role;
grant all privileges on table rooms, players, games, game_events to postgres, service_role;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms'
    ) then
      alter publication supabase_realtime add table rooms;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'players'
    ) then
      alter publication supabase_realtime add table players;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'games'
    ) then
      alter publication supabase_realtime add table games;
    end if;
  end if;
end $$;
