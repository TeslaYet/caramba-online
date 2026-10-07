import { EventEmitter } from "node:events";
import type { GameState, RoomRecord } from "@/lib/game/types";
import { StaleVersionError, type RoomPlayer, type Store } from "./types";

type MemoryShape = {
  rooms: Map<string, RoomRecord>;
  players: Map<string, RoomPlayer>;
  games: Map<string, GameState>;
  hub: EventEmitter;
};

function getMemory(): MemoryShape {
  const globalStore = globalThis as typeof globalThis & { __carambaMemory?: MemoryShape };
  if (!globalStore.__carambaMemory) {
    globalStore.__carambaMemory = {
      rooms: new Map(),
      players: new Map(),
      games: new Map(),
      hub: new EventEmitter(),
    };
    globalStore.__carambaMemory.hub.setMaxListeners(200);
  }
  return globalStore.__carambaMemory;
}

export class MemoryStore implements Store {
  private readonly db = getMemory();

  async getRoomByCode(code: string): Promise<RoomRecord | null> {
    return (
      [...this.db.rooms.values()].find((room) => room.code === code.toUpperCase()) ??
      null
    );
  }

  async saveRoom(room: RoomRecord): Promise<void> {
    this.db.rooms.set(room.id, room);
  }

  async markRoomPlaying(roomId: string, gameId: string): Promise<void> {
    const current = this.db.rooms.get(roomId);
    if (!current || current.status !== "LOBBY") {
      throw new StaleVersionError();
    }
    this.db.rooms.set(roomId, {
      ...current,
      status: "PLAYING",
      gameId,
      updatedAt: Date.now(),
    });
  }

  async listPlayers(roomId: string): Promise<RoomPlayer[]> {
    return [...this.db.players.values()]
      .filter((player) => player.roomId === roomId)
      .sort((a, b) => a.seatIndex - b.seatIndex);
  }

  async savePlayer(player: RoomPlayer): Promise<void> {
    this.db.players.set(player.id, player);
  }

  async removePlayer(playerId: string): Promise<void> {
    this.db.players.delete(playerId);
  }

  async getGame(gameId: string): Promise<GameState | null> {
    return this.db.games.get(gameId) ?? null;
  }

  async getGameByRoomId(roomId: string): Promise<GameState | null> {
    return (
      [...this.db.games.values()].find((game) => game.roomId === roomId) ?? null
    );
  }

  async saveGame(game: GameState, expectedVersion?: number): Promise<void> {
    const current = this.db.games.get(game.id);
    if (
      expectedVersion !== undefined &&
      current &&
      current.version !== expectedVersion
    ) {
      throw new StaleVersionError();
    }
    this.db.games.set(game.id, game);
    const room = [...this.db.rooms.values()].find((entry) => entry.id === game.roomId);
    if (room) {
      this.db.rooms.set(room.id, { ...room, gameId: game.id, updatedAt: Date.now() });
    }
  }

  subscribe(roomCode: string, listener: () => void): () => void {
    const event = `room:${roomCode.toUpperCase()}`;
    this.db.hub.on(event, listener);
    return () => {
      this.db.hub.off(event, listener);
    };
  }

  async publish(roomCode: string): Promise<void> {
    this.db.hub.emit(`room:${roomCode.toUpperCase()}`);
  }
}
