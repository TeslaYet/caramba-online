-- Ranked queues remember the requested table size.
-- Private rooms can be individual or even team games, with one team per player.

alter table public.match_queue
  add column if not exists player_count integer;

alter table public.match_queue drop constraint if exists match_queue_player_count_check;
alter table public.match_queue
  add constraint match_queue_player_count_check
  check (player_count is null or player_count between 2 and 8);

create index if not exists match_queue_size_idx
  on public.match_queue (mode, player_count, joined_at)
  where status = 'waiting';

alter table public.rooms
  add column if not exists format text not null default 'individual';

alter table public.rooms drop constraint if exists rooms_format_check;
alter table public.rooms
  add constraint rooms_format_check
  check (format in ('individual', 'teams'));

alter table public.players
  add column if not exists team_id text;

alter table public.players drop constraint if exists players_team_check;
alter table public.players
  add constraint players_team_check
  check (team_id is null or team_id in ('A', 'B'));
