import type { GameState, RoomRecord } from "@/lib/game/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { StaleVersionError, type RoomPlayer, type Store } from "./types";

export class SupabaseStore implements Store {
  private readonly client = createAdminClient();

  async getRoomByCode(code: string): Promise<RoomRecord | null> {
    const { data, error } = await this.client
      .from("rooms")
      .select("*")
      .eq("code", code.toUpperCase())
      .maybeSingle();
    if (error) {
      throw error;
    }
    return data ? mapRoom(data) : null;
  }

  async saveRoom(room: RoomRecord): Promise<void> {
    const { error } = await this.client.from("rooms").upsert({
      id: room.id,
      code: room.code,
      host_player_id: room.hostPlayerId,
      status: room.status,
      max_players: room.maxPlayers,
      game_id: room.gameId,
      created_at: new Date(room.createdAt).toISOString(),
      updated_at: new Date(room.updatedAt).toISOString(),
    });
    if (error) {
      throw error;
    }
  }

  async listPlayers(roomId: string): Promise<RoomPlayer[]> {
    const { data, error } = await this.client
      .from("players")
      .select("*")
      .eq("room_id", roomId)
      .order("seat_index", { ascending: true });
    if (error) {
      throw error;
    }
    return (data ?? []).map(mapPlayer);
  }

  async savePlayer(player: RoomPlayer): Promise<void> {
    const { error } = await this.client.from("players").upsert({
      id: player.id,
      room_id: player.roomId,
      nickname: player.nickname,
      seat_index: player.seatIndex,
      connected: player.connected,
      ready: player.ready,
      created_at: new Date(player.createdAt).toISOString(),
      updated_at: new Date(player.updatedAt).toISOString(),
    });
    if (error) {
      throw error;
    }
  }

  async removePlayer(playerId: string): Promise<void> {
    const { error } = await this.client.from("players").delete().eq("id", playerId);
    if (error) {
      throw error;
    }
  }

  async getGame(gameId: string): Promise<GameState | null> {
    const { data, error } = await this.client
      .from("games")
      .select("state")
      .eq("id", gameId)
      .maybeSingle();
    if (error) {
      throw error;
    }
    return (data?.state as GameState | undefined) ?? null;
  }

  async getGameByRoomId(roomId: string): Promise<GameState | null> {
    const { data, error } = await this.client
      .from("games")
      .select("state")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      throw error;
    }
    return (data?.state as GameState | undefined) ?? null;
  }

  async saveGame(game: GameState, expectedVersion?: number): Promise<void> {
    if (expectedVersion !== undefined) {
      const { data, error } = await this.client
        .from("games")
        .select("version")
        .eq("id", game.id)
        .maybeSingle();
      if (error) {
        throw error;
      }
      if (data && data.version !== expectedVersion) {
        throw new StaleVersionError();
      }
    }

    const { error } = await this.client.from("games").upsert({
      id: game.id,
      room_id: game.roomId,
      status: game.status,
      round_number: game.roundNumber,
      current_player_id: game.currentPlayerId,
      state: game,
      version: game.version,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      throw error;
    }

    const lastEvent = game.events.at(-1);
    if (lastEvent) {
      await this.client.from("game_events").upsert({
        id: lastEvent.id,
        game_id: game.id,
        sequence_number: lastEvent.sequenceNumber,
        event_type: lastEvent.type,
        actor_player_id: lastEvent.actorPlayerId,
        payload: lastEvent.payload,
        created_at: new Date(lastEvent.timestamp).toISOString(),
      });
    }
  }

  subscribe(roomCode: string, listener: () => void): () => void {
    const channel = this.client
      .channel(`room:${roomCode.toUpperCase()}`)
      .on("broadcast", { event: "state" }, () => {
        listener();
      })
      .subscribe();

    return () => {
      void this.client.removeChannel(channel);
    };
  }

  async publish(roomCode: string): Promise<void> {
    const channel = this.client.channel(`room:${roomCode.toUpperCase()}`, {
      config: { broadcast: { ack: true } },
    });
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Realtime channel did not connect."));
      }, 8000);
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          clearTimeout(timeout);
          resolve();
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          clearTimeout(timeout);
          reject(new Error(`Realtime channel ${status.toLowerCase()}.`));
        }
      });
    });
    const result = await channel.send({
      type: "broadcast",
      event: "state",
      payload: { at: Date.now() },
    });
    await this.client.removeChannel(channel);
    if (result !== "ok") {
      throw new Error("Could not publish the room update.");
    }
  }
}

function mapRoom(row: Record<string, unknown>): RoomRecord {
  return {
    id: String(row.id),
    code: String(row.code),
    hostPlayerId: String(row.host_player_id),
    status: row.status as RoomRecord["status"],
    maxPlayers: Number(row.max_players),
    gameId: (row.game_id as string | null) ?? null,
    createdAt: new Date(String(row.created_at)).getTime(),
    updatedAt: new Date(String(row.updated_at)).getTime(),
  };
}

function mapPlayer(row: Record<string, unknown>): RoomPlayer {
  return {
    id: String(row.id),
    roomId: String(row.room_id),
    nickname: String(row.nickname),
    seatIndex: Number(row.seat_index),
    connected: Boolean(row.connected),
    ready: Boolean(row.ready),
    createdAt: new Date(String(row.created_at)).getTime(),
    updatedAt: new Date(String(row.updated_at)).getTime(),
  };
}
