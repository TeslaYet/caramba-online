import type { RealtimeChannel } from "@supabase/supabase-js";
import type { GameState, RoomRecord } from "@/lib/game/types";
import { logSync } from "@/lib/server/sync-log";
import { createAdminClient } from "@/lib/supabase/admin";
import { StaleVersionError, type RoomPlayer, type Store } from "./types";

type RoomHub = {
  channel: RealtimeChannel | null;
  ready: Promise<void> | null;
  listeners: Set<() => void>;
  closeTimer: ReturnType<typeof setTimeout> | null;
};

export class SupabaseStore implements Store {
  private readonly client = createAdminClient();
  private readonly hubs = new Map<string, RoomHub>();

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
      max_score: room.maxScore,
      reset_score: room.resetScore,
      mode: room.mode,
      format: room.format ?? "individual",
      game_id: room.gameId,
      created_at: new Date(room.createdAt).toISOString(),
      updated_at: new Date(room.updatedAt).toISOString(),
    });
    if (error) {
      throw error;
    }
  }

  async markRoomPlaying(roomId: string, gameId: string): Promise<void> {
    const { data, error } = await this.client
      .from("rooms")
      .update({
        status: "PLAYING",
        game_id: gameId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", roomId)
      .eq("status", "LOBBY")
      .select("id");
    if (error) {
      throw error;
    }
    if (!data?.length) {
      throw new StaleVersionError();
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
      team_id: player.teamId ?? null,
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
    const row = {
      id: game.id,
      room_id: game.roomId,
      status: game.status,
      round_number: game.roundNumber,
      current_player_id: game.currentPlayerId,
      state: game,
      version: game.version,
      updated_at: new Date().toISOString(),
    };

    if (expectedVersion === undefined) {
      const { error } = await this.client.from("games").upsert(row);
      if (error) {
        throw error;
      }
    } else {
      const { data, error } = await this.client
        .from("games")
        .update(row)
        .eq("id", game.id)
        .eq("version", expectedVersion)
        .select("id");
      if (error) {
        throw error;
      }
      if (!data?.length) {
        throw new StaleVersionError();
      }
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
    const code = roomCode.toUpperCase();
    const hub = this.hubFor(code);
    hub.listeners.add(listener);
    void this.ensureHub(code).catch((error: unknown) => {
      logSync("subscribe_failed", {
        code,
        message: error instanceof Error ? error.message : "subscribe failed",
      });
    });
    return () => {
      hub.listeners.delete(listener);
      if (hub.listeners.size > 0) {
        return;
      }
      if (hub.closeTimer) {
        clearTimeout(hub.closeTimer);
      }
      hub.closeTimer = setTimeout(() => {
        if (hub.listeners.size > 0) {
          return;
        }
        const channel = hub.channel;
        hub.channel = null;
        hub.ready = null;
        hub.closeTimer = null;
        this.hubs.delete(code);
        if (channel) {
          void this.client.removeChannel(channel);
        }
      }, 30_000);
    };
  }

  async publish(roomCode: string): Promise<void> {
    const code = roomCode.toUpperCase();
    const started = Date.now();
    await this.ensureHub(code);
    const hub = this.hubFor(code);
    if (!hub.channel) {
      throw new Error("Realtime channel is not open.");
    }
    const result = await hub.channel.send({
      type: "broadcast",
      event: "state",
      payload: { at: Date.now() },
    });
    logSync("publish", { code, ms: Date.now() - started, result });
    if (result !== "ok") {
      hub.ready = null;
      hub.channel = null;
      throw new Error("Could not publish the room update.");
    }
  }

  private hubFor(code: string): RoomHub {
    const existing = this.hubs.get(code);
    if (existing) {
      return existing;
    }
    const created: RoomHub = {
      channel: null,
      ready: null,
      listeners: new Set(),
      closeTimer: null,
    };
    this.hubs.set(code, created);
    return created;
  }

  private ensureHub(code: string): Promise<void> {
    const hub = this.hubFor(code);
    if (hub.closeTimer) {
      clearTimeout(hub.closeTimer);
      hub.closeTimer = null;
    }
    if (hub.ready && hub.channel) {
      return hub.ready;
    }
    const channel = this.client.channel(`room:${code}`, {
      config: { broadcast: { ack: false, self: true } },
    });
    hub.channel = channel;
    hub.ready = new Promise<void>((resolve, reject) => {
      let settled = false;
      const timeout = setTimeout(() => {
        if (settled) {
          return;
        }
        settled = true;
        if (hub.channel === channel) {
          hub.channel = null;
          hub.ready = null;
        }
        reject(new Error("Realtime channel did not connect."));
      }, 8000);
      channel.on("broadcast", { event: "state" }, () => {
        for (const listener of hub.listeners) {
          listener();
        }
      });
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED" && !settled) {
          settled = true;
          clearTimeout(timeout);
          resolve();
          return;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          if (hub.channel === channel) {
            hub.channel = null;
            hub.ready = null;
          }
          if (!settled) {
            settled = true;
            clearTimeout(timeout);
            reject(new Error(`Realtime channel ${status.toLowerCase()}.`));
          } else if (hub.listeners.size > 0) {
            void this.ensureHub(code).catch(() => undefined);
          }
        }
      });
    });
    return hub.ready;
  }
}

function mapRoom(row: Record<string, unknown>): RoomRecord {
  return {
    id: String(row.id),
    code: String(row.code),
    hostPlayerId: String(row.host_player_id),
    status: row.status as RoomRecord["status"],
    maxPlayers: Number(row.max_players),
    maxScore: Number(row.max_score ?? 100),
    resetScore: Number(row.reset_score ?? 50),
    mode: (row.mode as RoomRecord["mode"]) ?? "private",
    format: row.format === "teams" ? "teams" : "individual",
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
    teamId: row.team_id === "A" || row.team_id === "B" ? row.team_id : null,
    createdAt: new Date(String(row.created_at)).getTime(),
    updatedAt: new Date(String(row.updated_at)).getTime(),
  };
}
