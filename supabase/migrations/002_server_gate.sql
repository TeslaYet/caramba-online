create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.server_auth (
  secret text primary key
);

create or replace function private.request_authorized()
returns boolean
language plpgsql
stable
security definer
set search_path = private
as $$
declare
  headers json;
  provided text;
begin
  begin
    headers := nullif(current_setting('request.headers', true), '')::json;
  exception
    when others then
      return false;
  end;

  if headers is null then
    return false;
  end if;

  provided := headers->>'x-caramba-secret';
  if provided is null or provided = '' then
    return false;
  end if;

  return exists (
    select 1 from private.server_auth where secret = provided
  );
end;
$$;

revoke all on function private.request_authorized() from public;
grant execute on function private.request_authorized() to anon, authenticated;

grant select, insert, update, delete on table public.rooms, public.players, public.games, public.game_events to anon;

drop policy if exists rooms_server_only on public.rooms;
create policy rooms_server_only on public.rooms
  for all to anon
  using (private.request_authorized())
  with check (private.request_authorized());

drop policy if exists players_server_only on public.players;
create policy players_server_only on public.players
  for all to anon
  using (private.request_authorized())
  with check (private.request_authorized());

drop policy if exists games_server_only on public.games;
create policy games_server_only on public.games
  for all to anon
  using (private.request_authorized())
  with check (private.request_authorized());

drop policy if exists game_events_server_only on public.game_events;
create policy game_events_server_only on public.game_events
  for all to anon
  using (private.request_authorized())
  with check (private.request_authorized());
