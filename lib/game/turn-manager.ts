import type { GameState, PlayerState } from "./types";

export function getActivePlayers(state: Pick<GameState, "players">): PlayerState[] {
  return state.players
    .filter((player) => !player.eliminated)
    .sort((a, b) => a.seatIndex - b.seatIndex);
}

export function getPlayer(
  state: Pick<GameState, "players">,
  playerId: string,
): PlayerState | undefined {
  return state.players.find((player) => player.id === playerId);
}

export function requirePlayer(state: Pick<GameState, "players">, playerId: string): PlayerState {
  const player = getPlayer(state, playerId);
  if (!player) {
    throw new Error("Player not found.");
  }
  return player;
}

export function chooseStartingPlayer(
  players: PlayerState[],
  randomInt: (maxExclusive: number) => number,
): PlayerState {
  const active = players.filter((player) => !player.eliminated);
  if (active.length === 0) {
    throw new Error("No active players available.");
  }
  const chosen = active[randomInt(active.length)];
  if (!chosen) {
    throw new Error("Failed to choose a starting player.");
  }
  return chosen;
}

export function getNextActivePlayer(
  state: Pick<GameState, "players">,
  currentPlayerId: string,
): PlayerState | null {
  const active = getActivePlayers(state);
  if (active.length === 0) {
    return null;
  }

  const currentIndex = active.findIndex((player) => player.id === currentPlayerId);
  if (currentIndex === -1) {
    return active[0] ?? null;
  }

  return active[(currentIndex + 1) % active.length] ?? null;
}

export function getPreviousActivePlayer(
  state: Pick<GameState, "players">,
  currentPlayerId: string,
): PlayerState | null {
  const active = getActivePlayers(state);
  if (active.length === 0) {
    return null;
  }

  const currentIndex = active.findIndex((player) => player.id === currentPlayerId);
  if (currentIndex === -1) {
    return active[active.length - 1] ?? null;
  }

  const previousIndex = (currentIndex - 1 + active.length) % active.length;
  return active[previousIndex] ?? null;
}

export function isGameOver(state: Pick<GameState, "players">): boolean {
  return getActivePlayers(state).length <= 1;
}

export function getWinner(state: Pick<GameState, "players">): PlayerState | null {
  const active = getActivePlayers(state);
  return active.length === 1 ? (active[0] ?? null) : null;
}

export function ranking(players: PlayerState[]): PlayerState[] {
  return [...players].sort((a, b) => {
    if (a.eliminated !== b.eliminated) {
      return a.eliminated ? 1 : -1;
    }
    return a.totalScore - b.totalScore;
  });
}
