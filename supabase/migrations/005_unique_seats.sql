-- Two servers must not give the same chair to two players.
create unique index if not exists players_room_seat_idx
  on public.players (room_id, seat_index);
