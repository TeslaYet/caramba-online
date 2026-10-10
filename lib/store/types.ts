import type { GameState, RoomRecord, TeamId } from "@/lib/game/types";

export interface RoomPlayer {
  id: string;
  roomId: string;
  nickname: string;
  seatIndex: number;
  connected: boolean;
  ready: boolean;
  teamId?: TeamId | null;
  createdAt: number;
  updatedAt: number;
}

export interface Store {
  getRoomByCode(code: string): Promise<RoomRecord | null>;
  saveRoom(room: RoomRecord): Promise<void>;
  /** One start wins when several servers try to leave the lobby at once. */
  markRoomPlaying(roomId: string, gameId: string): Promise<void>;
  listPlayers(roomId: string): Promise<RoomPlayer[]>;
  savePlayer(player: RoomPlayer): Promise<void>;
  removePlayer(playerId: string): Promise<void>;
  getGame(gameId: string): Promise<GameState | null>;
  getGameByRoomId(roomId: string): Promise<GameState | null>;
  saveGame(game: GameState, expectedVersion?: number): Promise<void>;
  subscribe(roomCode: string, listener: () => void): () => void;
  publish(roomCode: string): Promise<void>;
}

export class StaleVersionError extends Error {
  constructor() {
    super("The game state has changed.");
    this.name = "StaleVersionError";
  }
}
